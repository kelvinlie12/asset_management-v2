<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreVehicleRequest;
use App\Http\Requests\UpdateVehicleRequest;
use App\Http\Resources\TeamResource;
use App\Http\Resources\VehicleResource;
use App\Models\Team;
use App\Models\VehicleAsset;
use App\Support\ApiResponse;
use App\Support\UnitScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VehicleController extends Controller
{
    /**
     * Display a paginated, searchable list of vehicle assets.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $perPage = min(max($perPage, 1), 100);

        $vehicles = UnitScope::apply(VehicleAsset::query(), $request->user())
            ->with(['team', 'room', 'assignedUser', 'supplier'])
            ->when($request->query('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('asset_code', 'like', "%{$search}%")
                        ->orWhere('brand', 'like', "%{$search}%")
                        ->orWhere('model', 'like', "%{$search}%")
                        ->orWhere('plate_number', 'like', "%{$search}%")
                        ->orWhere('engine_number', 'like', "%{$search}%")
                        ->orWhere('chassis_number', 'like', "%{$search}%");
                });
            })
            ->when($request->query('condition'), function ($query, $condition) {
                $query->where('condition', $condition);
            })
            ->when($request->query('usage_status'), function ($query, $usageStatus) {
                $query->where('usage_status', $usageStatus);
            })
            ->when($request->query('team_id'), function ($query, $teamId) {
                $query->where('team_id', $teamId);
            })
            ->when($request->query('room_id'), function ($query, $roomId) {
                $query->where('room_id', $roomId);
            })
            ->when($request->query('tax_status'), function ($query, $taxStatus) {
                $today = now()->startOfDay();
                $inSeven = $today->copy()->addDays(7);
                $inThirty = $today->copy()->addDays(30);
                switch ($taxStatus) {
                    case 'paid':
                        $query->where('tax_status', VehicleAsset::TAX_PAID);
                        break;
                    case 'overdue':
                        $query->where(function ($q) use ($today) {
                            $q->where('tax_status', '!=', VehicleAsset::TAX_PAID)
                                ->whereNotNull('tax_due_date')
                                ->whereDate('tax_due_date', '<', $today);
                        });
                        break;
                    case 'due_7':
                        $query->where('tax_status', '!=', VehicleAsset::TAX_PAID)
                            ->whereNotNull('tax_due_date')
                            ->whereDate('tax_due_date', '>=', $today)
                            ->whereDate('tax_due_date', '<=', $inSeven);
                        break;
                    case 'soon':
                        $query->where('tax_status', '!=', VehicleAsset::TAX_PAID)
                            ->whereNotNull('tax_due_date')
                            ->whereDate('tax_due_date', '>', $inSeven)
                            ->whereDate('tax_due_date', '<=', $inThirty);
                        break;
                    case 'safe':
                        $query->where(function ($q) use ($today, $inThirty) {
                            $q->whereNull('tax_due_date')
                                ->orWhereDate('tax_due_date', '>', $inThirty);
                        })->orWhere('tax_status', VehicleAsset::TAX_PAID);
                        break;
                }
            })
            ->orderBy('asset_code')
            ->paginate($perPage)
            ->withQueryString();

        return ApiResponse::success(VehicleResource::collection($vehicles)->response()->getData(true), 'Data kendaraan berhasil dimuat.');
    }

    /**
     * Summarise the vehicle fleet of every company the caller may see.
     *
     * Each unit owns its vehicles outright, so this answers "which unit has
     * which vehicles" in one call: a super admin gets a row per unit, while a
     * unit-scoped user only ever gets their own.
     */
    public function unitSummary(Request $request): JsonResponse
    {
        $user = $request->user();
        $today = now()->startOfDay();

        $teams = Team::query()
            ->when(! UnitScope::bypasses($user) && $user?->team_id, fn ($query) => $query->whereKey($user->team_id))
            ->orderBy('name')
            ->get();

        $counts = VehicleAsset::query()
            ->whereNotNull('team_id')
            ->whereIn('team_id', $teams->pluck('id'))
            ->selectRaw('team_id, count(*) as total')
            ->selectRaw("sum(case when tax_status = '".VehicleAsset::TAX_PAID."' then 1 else 0 end) as paid")
            ->selectRaw("sum(case when tax_status != '".VehicleAsset::TAX_PAID."'
                and tax_due_date is not null and tax_due_date < ? then 1 else 0 end) as overdue", [$today])
            ->selectRaw("sum(case when tax_status != '".VehicleAsset::TAX_PAID."'
                and tax_due_date is not null and tax_due_date between ? and ? then 1 else 0 end) as due_soon",
            [$today, $today->copy()->addDays(7)])
            ->groupBy('team_id')
            ->get()
            ->keyBy('team_id');

        $units = $teams->map(function (Team $team) use ($counts) {
            $row = $counts->get($team->id);

            return [
                'team' => new TeamResource($team),
                'total' => (int) ($row->total ?? 0),
                'tax_paid' => (int) ($row->paid ?? 0),
                'tax_overdue' => (int) ($row->overdue ?? 0),
                'tax_due_soon' => (int) ($row->due_soon ?? 0),
            ];
        })->values();

        return ApiResponse::success(['units' => $units]);
    }

    /**
     * Store a newly created vehicle asset.
     */
    public function store(StoreVehicleRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $validated['team_id'] = UnitScope::resolveTeamId($request->user(), $validated['team_id'] ?? null);

        // A vehicle has to belong to a company: unit-scoped users are pinned to
        // their own unit above, but a super admin can post without one, which
        // would leave the vehicle invisible to every unit owner.
        if (empty($validated['team_id'])) {
            return ApiResponse::error('A unit is required so the vehicle belongs to a company.', null, 422);
        }

        if (empty($validated['asset_code'])) {
            $validated['asset_code'] = $this->nextVehicleCode();
        }

        $validated['tax_status'] = $validated['tax_status'] ?? VehicleAsset::TAX_UNPAID;

        if ($request->hasFile('photo')) {
            $validated['photo'] = $request->file('photo')->store('vehicle_photos', 'public');
        }

        $vehicle = VehicleAsset::create($validated);

        return ApiResponse::created([
            'vehicle' => new VehicleResource($vehicle->load(['team', 'room', 'assignedUser', 'supplier'])),
        ], 'Vehicle asset created successfully.');
    }

    /**
     * Display the specified vehicle asset.
     */
    public function show(Request $request, VehicleAsset $vehicle): JsonResponse
    {
        UnitScope::assertAccess($request->user(), $vehicle->team_id);

        return ApiResponse::success([
            'vehicle' => new VehicleResource($vehicle->load(['team', 'room', 'assignedUser', 'supplier'])),
        ]);
    }

    /**
     * Update the specified vehicle asset.
     */
    public function update(UpdateVehicleRequest $request, VehicleAsset $vehicle): JsonResponse
    {
        UnitScope::assertAccess($request->user(), $vehicle->team_id);

        $data = $request->validated();
        if (! UnitScope::bypasses($request->user())) {
            $data['team_id'] = $request->user()?->team_id ?: $vehicle->team_id;
        } elseif (empty($data['team_id'])) {
            // Never detach a vehicle from its company by posting a blank unit.
            unset($data['team_id']);
        }

        // Handing a vehicle to another company invalidates its placement: the
        // room and the assigned user both belong to the previous unit, so
        // keeping them would leave the record pointing across units.
        if (array_key_exists('team_id', $data) && $data['team_id'] != $vehicle->team_id) {
            $data['room_id'] = null;
            $data['assigned_user_id'] = null;
        }

        if ($request->hasFile('photo')) {
            $request->validate(['photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048']]);
            $vehicle->photo = $request->file('photo')->store('vehicle_photos', 'public');
        }

        $vehicle->update($data);

        return ApiResponse::success([
            'vehicle' => new VehicleResource($vehicle->fresh()->load(['team', 'room', 'assignedUser', 'supplier'])),
        ], 'Vehicle asset updated successfully.');
    }

    /**
     * Generate the next sequential vehicle code (e.g. VHC-007).
     */
    public function generateCode(): JsonResponse
    {
        return ApiResponse::success([
            'asset_code' => $this->nextVehicleCode(),
        ], 'Vehicle code generated.');
    }

    /**
     * Remove the specified vehicle asset.
     */
    public function destroy(Request $request, VehicleAsset $vehicle): JsonResponse
    {
        UnitScope::assertAccess($request->user(), $vehicle->team_id);

        $vehicle->delete();

        return ApiResponse::noContent('Vehicle asset deleted successfully.');
    }

    /**
     * Generate the next sequential vehicle code (e.g. VHC-007).
     */
    private function nextVehicleCode(): string
    {
        $max = (int) substr(VehicleAsset::query()->where('asset_code', 'like', 'VHC-%')->max('asset_code') ?? '', 4);

        do {
            $code = 'VHC-'.str_pad(++$max, 3, '0', STR_PAD_LEFT);
        } while (VehicleAsset::query()->where('asset_code', $code)->exists());

        return $code;
    }
}
