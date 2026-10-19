<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAssetRequest;
use App\Http\Requests\UpdateAssetRequest;
use App\Http\Resources\AssetResource;
use App\Models\Asset;
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
     */
    public function generateCode(): JsonResponse
    {
        return ApiResponse::success([
            'asset_code' => Asset::generateAssetCode(),
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
                ->with(['room', 'category', 'team', 'assignedUser'])
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

        return ApiResponse::created([
            'asset' => new AssetResource($asset->load($this->relations())),
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

        $asset->update($data);

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
            'assignedUser',
            'purchases',
            'assignments',
            'transfers',
            'damages',
            'networkNode',
        ];
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
