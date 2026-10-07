<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRoomRequest;
use App\Http\Requests\UpdateRoomRequest;
use App\Http\Resources\RoomResource;
use App\Models\Room;
use App\Support\ApiResponse;
use App\Support\UnitScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    /**
     * Display a paginated, searchable list of rooms.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $perPage = min(max($perPage, 1), 100);

        $rooms = UnitScope::apply(Room::query(), $request->user())
            ->with('team')
            ->withCount('assets')
            ->when($request->query('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('location', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($request->query('status'), function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($request->query('team_id'), function ($query, $teamId) {
                $query->where('team_id', $teamId);
            })
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return ApiResponse::success(RoomResource::collection($rooms)->response()->getData(true), 'Data ruangan berhasil dimuat.');
    }

    /**
     * Store a newly created room.
     */
    public function store(StoreRoomRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        // Every room belongs to one company. A unit-scoped user always creates
        // it for their own unit; the request has already forced that value.
        $teamId = $user && ! UnitScope::bypasses($user) && $user->team_id
            ? $user->team_id
            : ($validated['team_id'] ?? null);

        if (empty($teamId)) {
            return ApiResponse::error(
                'A room must belong to a unit.',
                ['team_id' => ['Pilih unit pemilik ruangan.']],
                422
            );
        }

        $room = Room::create([
            'name' => $validated['name'],
            'location' => $validated['location'] ?? null,
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? Room::STATUS_ACTIVE,
            'team_id' => $teamId,
        ]);

        return ApiResponse::created([
            'room' => new RoomResource($room->load('team')->loadCount('assets')),
        ], 'Room created successfully.');
    }

    /**
     * Display the specified room.
     */
    public function show(Request $request, Room $room): JsonResponse
    {
        UnitScope::assertAccess($request->user(), $room->team_id);

        return ApiResponse::success([
            'room' => new RoomResource($room->load('team')->loadCount('assets')),
        ]);
    }

    /**
     * Update the specified room.
     */
    public function update(UpdateRoomRequest $request, Room $room): JsonResponse
    {
        UnitScope::assertAccess($request->user(), $room->team_id);

        $data = $request->validated();

        // Scoped users may not hand a room to another company.
        if (! UnitScope::bypasses($request->user()) && $request->user()?->team_id) {
            $data['team_id'] = $request->user()->team_id;
        }

        // Moving a room to another unit leaves its assets behind: they carry
        // their own team_id, so keeping the room link would cross the boundary.
        if (array_key_exists('team_id', $data) && $data['team_id'] !== null && $data['team_id'] != $room->team_id) {
            $room->assets()->update(['room_id' => null]);
        }

        $room->update($data);

        return ApiResponse::success([
            'room' => new RoomResource($room->fresh()->load('team')->loadCount('assets')),
        ]);
    }

    /**
     * Remove the specified room.
     */
    public function destroy(Request $request, Room $room): JsonResponse
    {
        UnitScope::assertAccess($request->user(), $room->team_id);

        if ($room->assets()->exists()) {
            return ApiResponse::error('Cannot delete a room that still has assets.', ['room' => ['Ruangan masih memiliki aset.']], 422);
        }

        $room->delete();

        return ApiResponse::noContent('Room deleted successfully.');
    }
}
