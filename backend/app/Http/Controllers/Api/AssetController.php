<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAssetRequest;
use App\Http\Requests\UpdateAssetRequest;
use App\Http\Resources\AssetResource;
use App\Models\Asset;
use App\Models\AssetDamage;
use App\Models\Category;
use App\Models\Purchase;
use App\Models\Room;
use App\Support\ApiResponse;
use App\Support\UnitScope;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class AssetController extends Controller
{
    /**
     * Generate a unique asset code.
     *
     * Format: KODE-BULAN-TAHUN-URUT (e.g. "ITE-10-2026-001"). The category and
     * placement date come from the query string; without a category the legacy
     * "AST-001" sequence is returned. The suggested next sequence is returned
     * too, so the form can prefill the number the user may still edit.
     */
    public function generateCode(Request $request): JsonResponse
    {
        $categoryId = $request->query('category_id');
        $placementDate = $request->query('placement_date');

        $categoryCode = null;
        if ($categoryId) {
            // Scoped to the user's own unit, so a code cannot be suggested from
            // another company's category.
            $categoryCode = UnitScope::apply(Category::query(), $request->user())
                ->whereKey($categoryId)
                ->value('code');
        }

        $sequence = Asset::nextAssetSequence($categoryCode, $placementDate);

        return ApiResponse::success([
            'asset_code' => Asset::buildAssetCode($categoryCode, $placementDate, $sequence),
            'sequence' => $sequence,
            'category_code' => $categoryCode,
        ], 'Asset code generated.');
    }

    /**
     * Display a paginated, searchable list of assets.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $perPage = min(max($perPage, 1), 100);

        $assets = UnitScope::apply(
            Asset::query()
                ->with(['room', 'category', 'team', 'workTeam', 'assignedUser'])
                ->when($request->query('search'), function ($query, $search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('asset_code', 'like', "%{$search}%")
                            ->orWhere('name', 'like', "%{$search}%")
                            ->orWhere('description', 'like', "%{$search}%");
                    });
                })
                ->when($request->query('condition'), function ($query, $condition) {
                    $query->where('condition', $condition);
                })
                ->when($request->query('usage_status'), function ($query, $usageStatus) {
                    $query->where('usage_status', $usageStatus);
                })
                ->when($request->query('category_id'), function ($query, $categoryId) {
                    $query->where('category_id', $categoryId);
                })
                ->when($request->query('room_id'), function ($query, $roomId) {
                    $query->where('room_id', $roomId);
                })
                ->when($request->query('team_id'), function ($query, $teamId) {
                    $query->where('team_id', $teamId);
                })
                ->when($request->query('assigned_user_id'), function ($query, $userId) {
                    $query->where('assigned_user_id', $userId);
                })
                ->orderBy('asset_code'),
            $request->user()
        )
            ->paginate($perPage)
            ->withQueryString();

        return ApiResponse::success(AssetResource::collection($assets)->response()->getData(true), 'Data asset berhasil dimuat.');
    }

    /**
     * Store a newly created asset.
     */
    public function store(StoreAssetRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['team_id'] = UnitScope::resolveTeamId($request->user(), $data['team_id'] ?? null);

        if ($request->hasFile('photo')) {
            $data['photo'] = $this->storeFile($request->file('photo'), 'uploads/assets/photos');
        }
        if ($request->hasFile('purchase_receipt')) {
            $data['purchase_receipt'] = $this->storeFile($request->file('purchase_receipt'), 'uploads/assets/receipts');
        }

        $asset = $this->createAsset($data);

        DB::transaction(fn () => $this->syncConditionRecords($asset, null, $request));

        return ApiResponse::created([
            'asset' => new AssetResource($asset->fresh()->load($this->relations())),
        ], 'Asset created successfully.');
    }

    /**
     * Persist a new asset, retrying with a regenerated code if two requests
     * race for the same code (the unique index rejects the loser).
     */
    private function createAsset(array $data): Asset
    {
        $attempts = 5;

        for ($attempt = 1; ; $attempt++) {
            try {
                return DB::transaction(static fn () => Asset::create($data));
            } catch (QueryException $e) {
                if ($attempt >= $attempts || ! $this->isDuplicateAssetCode($e)) {
                    throw $e;
                }
                $data['asset_code'] = Asset::generateAssetCode();
            }
        }
    }

    private function isDuplicateAssetCode(QueryException $e): bool
    {
        return str_contains($e->getMessage(), 'asset_code');
    }

    /**
     * Display the specified asset with its full history.
     */
    public function show(Request $request, Asset $asset): JsonResponse
    {
        UnitScope::assertAccess($request->user(), $asset->team_id);

        return ApiResponse::success([
            'asset' => new AssetResource($asset->load($this->relations())),
        ]);
    }

    /**
     * Update the specified asset.
     */
    public function update(UpdateAssetRequest $request, Asset $asset): JsonResponse
    {
        UnitScope::assertAccess($request->user(), $asset->team_id);

        $data = $request->validated();
        if (! UnitScope::bypasses($request->user())) {
            $data['team_id'] = $request->user()?->team_id ?: $asset->team_id;
        }

        // Network assets are managed by the FTTH module: they cannot be moved
        // back to the warehouse, marked as damaged, or relocated via Asset Master.
        if ($asset->hasNetworkNode()) {
            if (($data['condition'] ?? null) === Asset::CONDITION_DAMAGED) {
                return ApiResponse::error(
                    'Aset yang terpasang sebagai node jaringan tidak boleh ditandai rusak (DAMAGED). Hapus node jaringan terlebih dahulu.',
                    null,
                    422,
                );
            }
            if (($data['usage_status'] ?? null) === Asset::USAGE_IN_STORAGE) {
                return ApiResponse::error(
                    'Aset yang terpasang sebagai node jaringan tidak boleh dikembalikan ke gudang (IN_STORAGE) lewat Asset Master. Hapus node jaringan terlebih dahulu.',
                    null,
                    422,
                );
            }
            if (array_key_exists('room_id', $data) && ! empty($data['room_id']) && (int) $data['room_id'] !== (int) $asset->networkNode->room_id) {
                return ApiResponse::error(
                    'Lokasi aset yang terpasang sebagai node jaringan mengikuti node (site). Pindahkan lewat modul Jaringan FTTH.',
                    null,
                    422,
                );
            }
        }

        if ($request->hasFile('photo')) {
            $this->deleteFile($asset->photo);
            $data['photo'] = $this->storeFile($request->file('photo'), 'uploads/assets/photos');
        }
        if ($request->hasFile('purchase_receipt')) {
            $this->deleteFile($asset->purchase_receipt);
            $data['purchase_receipt'] = $this->storeFile($request->file('purchase_receipt'), 'uploads/assets/receipts');
        }

        $previousCondition = $asset->condition;

        $asset->update($data);

        DB::transaction(function () use ($asset, $previousCondition, $request) {
            $this->syncConditionRecords($asset->fresh(), $previousCondition, $request);
        });

        return ApiResponse::success([
            'asset' => new AssetResource($asset->fresh()->load($this->relations())),
        ], 'Asset updated successfully.');
    }

    /**
     * Remove the specified asset.
     */
    public function destroy(Request $request, Asset $asset): JsonResponse
    {
        UnitScope::assertAccess($request->user(), $asset->team_id);

        if ($asset->hasNetworkNode()) {
            return ApiResponse::error(
                'Aset ini terpasang sebagai node jaringan dan tidak dapat dihapus. Hapus node jaringan (Jaringan FTTH) terlebih dahulu.',
                null,
                422,
            );
        }

        $this->deleteFile($asset->photo);
        $this->deleteFile($asset->purchase_receipt);

        $asset->delete();

        return ApiResponse::noContent('Asset deleted successfully.');
    }

    /**
     * Eager-loaded relations used for asset resources with history.
     */
    private function relations(): array
    {
        return [
            'room',
            'category',
            'team',
            'workTeam',
            'assignedUser',
            'purchases',
            'assignments',
            'transfers',
            'damages',
            'networkNode',
        ];
    }

    /**
     * Mirror an asset's condition into the modules that own that state:
     * a new item shows up in Pembayaran and a damaged one in Barang Rusak.
     */
    private function syncConditionRecords(Asset $asset, ?string $previousCondition, Request $request): void
    {
        if ($asset->condition === Asset::CONDITION_NEW && $previousCondition !== Asset::CONDITION_NEW) {
            // Only ever file a single purchase record for one asset.
            if (! $asset->purchases()->exists()) {
                $this->recordPurchase($asset);
            }
        }

        if ($asset->condition === Asset::CONDITION_DAMAGED && $previousCondition !== Asset::CONDITION_DAMAGED) {
            $this->recordDamage($asset, $request);
        }
    }

    /**
     * Record a purchase entry for an asset marked as new.
     */
    private function recordPurchase(Asset $asset): void
    {
        Purchase::create([
            'purchase_number' => $this->nextPurchaseNumber(),
            'supplier' => null,
            'invoice_number' => null,
            'purchase_date' => $asset->purchase_date?->toDateString() ?? now()->toDateString(),
            'amount' => $asset->purchase_price ?? 0,
            'proof_path' => null,
            'notes' => $asset->description,
            'asset_id' => $asset->id,
        ]);
    }

    /**
     * Record a damage report for an asset marked as damaged and send the asset
     * to the warehouse, matching the behaviour of the Barang Rusak module.
     */
    private function recordDamage(Asset $asset, Request $request): void
    {
        $warehouse = Room::query()
            ->where('is_storage', true)
            ->orderBy('id')
            ->first();

        AssetDamage::create([
            'asset_id' => $asset->id,
            'room_id' => $asset->room_id ?? $warehouse?->id,
            'damage_date' => now()->toDateString(),
            'user_id' => null,
            'responsible_id' => null,
            'description' => $asset->description ?: 'Aset ditandai rusak dari Data Aset.',
            'photo_path' => null,
            'notes' => null,
            'performed_by_id' => $request->user()?->id,
        ]);

        $asset->update([
            'condition' => Asset::CONDITION_DAMAGED,
            'usage_status' => Asset::USAGE_IN_STORAGE,
            'room_id' => $warehouse?->id ?? $asset->room_id,
            'assigned_user_id' => null,
        ]);
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

    /**
     * Move an uploaded file into the public uploads directory.
     */
    private function storeFile($file, string $directory): string
    {
        $ext = strtolower($file->guessExtension() ?: 'bin');
        $name = 'asset_'.md5(uniqid((string) random_int(0, PHP_INT_MAX), true)).'.'.$ext;
        $file->move(public_path($directory), $name);

        return $directory.'/'.$name;
    }

    /**
     * Remove a stored file if it exists under the public directory.
     */
    private function deleteFile(?string $path): void
    {
        if (! $path) {
            return;
        }
        $fullPath = public_path($path);
        if (File::exists($fullPath)) {
            File::delete($fullPath);
        }
    }
}
