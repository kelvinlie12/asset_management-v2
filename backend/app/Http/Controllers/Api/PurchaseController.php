<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePurchaseRequest;
use App\Http\Resources\PurchaseResource;
use App\Models\Asset;
use App\Models\Category;
use App\Models\Purchase;
use App\Support\ApiResponse;
use App\Support\UnitScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class PurchaseController extends Controller
{
    /**
     * Display a paginated, searchable list of purchases.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $perPage = min(max($perPage, 1), 100);

        $user = $request->user();

        $purchases = Purchase::query()
            ->with(['asset.room', 'asset.category'])
            ->when($user && ! UnitScope::bypasses($user) && $user->team_id, function ($query) use ($user) {
                $query->whereHas('asset', fn ($asset) => $asset->where('team_id', $user->team_id));
            })
            ->when($request->query('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('purchase_number', 'like', "%{$search}%")
                        ->orWhere('supplier', 'like', "%{$search}%")
                        ->orWhere('invoice_number', 'like', "%{$search}%")
                        ->orWhereHas('asset', function ($asset) use ($search) {
                            $asset->where('asset_code', 'like', "%{$search}%")
                                ->orWhere('name', 'like', "%{$search}%");
                        });
                });
            })
            ->orderByDesc('purchase_date')
            ->paginate($perPage)
            ->withQueryString();

        return ApiResponse::success(PurchaseResource::collection($purchases)->response()->getData(true), 'Data pembelian berhasil dimuat.');
    }

    /**
     * Store a purchase, create its asset, and record the purchase history.
     */
    public function store(StorePurchaseRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $proofPath = null;
        if ($request->hasFile('proof')) {
            $file = $request->file('proof');
            $ext = strtolower($file->guessExtension() ?: 'bin');
            $name = 'proof_'.md5(uniqid((string) random_int(0, PHP_INT_MAX), true)).'.'.$ext;
            $file->move(public_path('uploads/purchases'), $name);
            $proofPath = 'uploads/purchases/'.$name;
        }

        $user = $request->user();

        $purchase = DB::transaction(function () use ($validated, $proofPath, $user) {
            $categoryCode = ! empty($validated['category_id'])
                ? Category::query()->whereKey($validated['category_id'])->value('code')
                : null;

            $asset = Asset::create([
                'asset_code' => Asset::generateAssetCode($categoryCode, $validated['purchase_date']),
                'name' => $validated['name'],
                'category_id' => $validated['category_id'] ?? null,
                'room_id' => $validated['room_id'] ?? null,
                // A purchase always belongs to the buyer's own unit.
                'team_id' => UnitScope::resolveTeamId($user, null),
                'purchase_price' => $validated['amount'],
                'purchase_date' => $validated['purchase_date'],
                'purchase_receipt' => $validated['invoice_number'],
                'description' => $validated['notes'] ?? null,
                'condition' => Asset::CONDITION_GOOD,
                'usage_status' => Asset::USAGE_IN_STORAGE,
            ]);

            return Purchase::create([
                'purchase_number' => $this->nextPurchaseNumber(),
                'supplier' => $validated['supplier'],
                'invoice_number' => $validated['invoice_number'],
                'purchase_date' => $validated['purchase_date'],
                'amount' => $validated['amount'],
                'proof_path' => $proofPath,
                'notes' => $validated['notes'] ?? null,
                'asset_id' => $asset->id,
            ]);
        });

        return ApiResponse::created([
            'purchase' => new PurchaseResource($purchase->load(['asset.room', 'asset.category'])),
        ], 'Purchase recorded and asset created successfully.');
    }

    /**
     * Display the specified purchase.
     */
    public function show(Request $request, Purchase $purchase): JsonResponse
    {
        UnitScope::assertAccess($request->user(), $purchase->asset?->team_id);

        return ApiResponse::success([
            'purchase' => new PurchaseResource($purchase->load(['asset.room', 'asset.category'])),
        ]);
    }

    /**
     * Remove the specified purchase history record.
     */
    public function destroy(Request $request, Purchase $purchase): JsonResponse
    {
        UnitScope::assertAccess($request->user(), $purchase->asset?->team_id);

        if ($purchase->proof_path) {
            $path = public_path($purchase->proof_path);
            if (File::exists($path)) {
                File::delete($path);
            }
        }

        $purchase->delete();

        return ApiResponse::noContent('Purchase record deleted successfully.');
    }

    /**
     * Generate the next sequential purchase number (e.g. PCH-0001).
     */
    private function nextPurchaseNumber(): string
    {
        $max = (int) substr(Purchase::query()->where('purchase_number', 'like', 'PCH-%')->max('purchase_number') ?? '', 4);

        do {
            $number = 'PCH-'.str_pad(++$max, 4, '0', STR_PAD_LEFT);
        } while (Purchase::query()->where('purchase_number', $number)->exists());

        return $number;
    }
}