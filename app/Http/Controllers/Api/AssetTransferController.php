<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAssetTransferRequest;
use App\Http\Resources\AssetTransferResource;
use App\Models\Asset;
use App\Models\AssetTransfer;
use App\Support\ApiResponse;
use App\Support\UnitScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AssetTransferController extends Controller
{
    /**
     * Display a paginated, searchable transfer history.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $perPage = min(max($perPage, 1), 100);

        $user = $request->user();

        $transfers = AssetTransfer::query()
            // A transfer is visible when the user's unit is either side of it.
            ->when($user && ! UnitScope::bypasses($user) && $user->team_id, function ($query) use ($user) {
                $query->where(function ($q) use ($user) {
                    $q->where('from_team_id', $user->team_id)
                        ->orWhere('to_team_id', $user->team_id);
                });
            })
            ->with(['asset.room', 'asset.category', 'fromTeam', 'toTeam', 'fromRoom', 'toRoom', 'fromUser', 'toUser', 'performedBy'])
            ->when($request->query('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereHas('asset', function ($asset) use ($search) {
                        $asset->where('asset_code', 'like', "%{$search}%")
                            ->orWhere('name', 'like', "%{$search}%");
                    })->orWhere('reason', 'like', "%{$search}%")
                        ->orWhere('transfer_date', 'like', "%{$search}%")
                        ->orWhereHas('performedBy', function ($user) use ($search) {
                            $user->where('name', 'like', "%{$search}%");
                        });
                });
            })
            ->when($request->query('asset_id'), function ($query, $assetId) {
                $query->where('asset_id', $assetId);
            })
            ->orderByDesc('transfer_date')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        return ApiResponse::success(AssetTransferResource::collection($transfers)->response()->getData(true), 'Data mutasi aset berhasil dimuat.');
    }

    /**
     * Record a transfer with its full before/after history.
     */
    public function store(StoreAssetTransferRequest $request): JsonResponse
    {
        $validated = $request->validated();

$asset = Asset::query()->findOrFail($validated['asset_id']);
        UnitScope::assertAccess($request->user(), $asset->team_id);

        // Network assets are managed by the FTTH module and cannot be moved.
        if ($asset->hasNetworkNode()) {
            throw ValidationException::withMessages([
                'asset_id' => 'Aset yang terpasang sebagai node jaringan tidak dapat dipindahkan lewat Asset Master. Kelola melalui modul Jaringan FTTH.',
            ]);
        }

        // A damaged asset must remain in storage without a responsible party.
        if ($asset->condition === Asset::CONDITION_DAMAGED
            && (($validated['to_user_id'] ?? null) || ($validated['to_team_id'] ?? null))) {
            throw ValidationException::withMessages([
                'asset_id' => 'A damaged asset cannot be transferred to a team or a user. Only storage room moves are allowed.',
            ]);
        }

        $transfer = DB::transaction(function () use ($validated, $asset, $request) {
            $transfer = AssetTransfer::create([
                'asset_id' => $asset->id,
                'transfer_date' => $validated['transfer_date'],
                'from_team_id' => $asset->team_id,
                'to_team_id' => $validated['to_team_id'] ?? null,
                'from_room_id' => $asset->room_id,
                'to_room_id' => $validated['to_room_id'] ?? null,
                'from_user_id' => $asset->assigned_user_id,
                'to_user_id' => $validated['to_user_id'] ?? null,
                'reason' => $validated['reason'] ?? null,
                'performed_by_id' => $request->user()?->id,
            ]);

            $asset->update([
                'team_id' => $validated['to_team_id'] ?? $asset->team_id,
                'room_id' => $validated['to_room_id'] ?? $asset->room_id,
                'assigned_user_id' => $validated['to_user_id'] ?? $asset->assigned_user_id,
            ]);

            return $transfer;
        });

        return ApiResponse::created([
            'transfer' => new AssetTransferResource(
                $transfer->load(['asset.room', 'asset.category', 'fromTeam', 'toTeam', 'fromRoom', 'toRoom', 'fromUser', 'toUser', 'performedBy'])
            ),
        ], 'Asset transferred successfully.');
    }

    /**
     * Display the specified transfer history record.
     */
    public function show(Request $request, AssetTransfer $assetTransfer): JsonResponse
    {
        UnitScope::assertTransferAccess($request->user(), $assetTransfer->from_team_id, $assetTransfer->to_team_id);

        return ApiResponse::success([
            'transfer' => new AssetTransferResource(
                $assetTransfer->load(['asset.room', 'asset.category', 'fromTeam', 'toTeam', 'fromRoom', 'toRoom', 'fromUser', 'toUser', 'performedBy'])
            ),
        ]);
    }

public function update(Request $request, AssetTransfer $assetTransfer): JsonResponse
{
    $validated = $request->validate([
        'asset_id' => ['required', 'integer', 'exists:assets,id'],
        'transfer_date' => ['required', 'date'],
        'to_team_id' => ['nullable', 'integer', 'exists:teams,id'],
        'to_room_id' => ['nullable', 'integer', 'exists:rooms,id'],
        'to_user_id' => ['nullable', 'integer', 'exists:users,id'],
        'reason' => ['nullable', 'string', 'max:1000'],
    ]);
 
$asset = Asset::query()->findOrFail($validated['asset_id']);
        UnitScope::assertAccess($request->user(), $asset->team_id);

        if ($asset->hasNetworkNode()) {
        throw ValidationException::withMessages([
            'asset_id' => 'Aset yang terpasang sebagai node jaringan tidak dapat dipindahkan lewat Asset Master. Kelola melalui modul Jaringan FTTH.',
        ]);
    }

    if ($asset->condition === Asset::CONDITION_DAMAGED
        && (($validated['to_user_id'] ?? null) || ($validated['to_team_id'] ?? null))) {
        throw ValidationException::withMessages([
            'asset_id' => 'A damaged asset cannot be transferred to a team or a user. Only storage room moves are allowed.',
        ]);
    }
 
    $assetTransfer = DB::transaction(function () use ($validated, $asset, $assetTransfer) {
        $isLatestForAsset = AssetTransfer::query()
            ->where('asset_id', $assetTransfer->asset_id)
            ->where(function ($q) use ($assetTransfer) {
                $q->where('id', '>', $assetTransfer->id)
                    ->orWhere(function ($q2) use ($assetTransfer) {
                        $q2->where('id', $assetTransfer->id);
                    });
            })
            ->where('id', '!=', $assetTransfer->id)
            ->doesntExist();
 
        $assetTransfer->update([
            'asset_id' => $asset->id,
            'transfer_date' => $validated['transfer_date'],
            'to_team_id' => $validated['to_team_id'] ?? null,
            'to_room_id' => $validated['to_room_id'] ?? null,
            'to_user_id' => $validated['to_user_id'] ?? null,
            'reason' => $validated['reason'] ?? null,
        ]);
 
        if ($isLatestForAsset) {
            $asset->update([
                'team_id' => $validated['to_team_id'] ?? null,
                'room_id' => $validated['to_room_id'] ?? null,
                'assigned_user_id' => $validated['to_user_id'] ?? null,
            ]);
        }
 
        return $assetTransfer;
    });
 
    return ApiResponse::success([
        'transfer' => new AssetTransferResource(
            $assetTransfer->load(['asset.room', 'asset.category', 'fromTeam', 'toTeam', 'fromRoom', 'toRoom', 'fromUser', 'toUser', 'performedBy'])
        ),
    ], 'Transfer updated successfully.');
}
 
/**
 * Delete a transfer record.
 *
 * If this was the most recent transfer for its asset, the asset's current
 * placement is rolled back to this transfer's "from" values (the state
 * before this transfer happened).
 */
public function destroy(Request $request, AssetTransfer $assetTransfer): JsonResponse
{
    UnitScope::assertTransferAccess($request->user(), $assetTransfer->from_team_id, $assetTransfer->to_team_id);

    DB::transaction(function () use ($assetTransfer) {
        $isLatestForAsset = AssetTransfer::query()
            ->where('asset_id', $assetTransfer->asset_id)
            ->where('id', '>', $assetTransfer->id)
            ->doesntExist();
 
        if ($isLatestForAsset) {
            $asset = Asset::query()->find($assetTransfer->asset_id);
            if ($asset) {
                $asset->update([
                    'team_id' => $assetTransfer->from_team_id,
                    'room_id' => $assetTransfer->from_room_id,
                    'assigned_user_id' => $assetTransfer->from_user_id,
                ]);
            }
        }
 
        $assetTransfer->delete();
    });
 
    return ApiResponse::success(null, 'Transfer deleted successfully.');
}

}