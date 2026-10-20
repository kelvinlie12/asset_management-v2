<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreWorkTeamRequest;
use App\Http\Requests\UpdateWorkTeamRequest;
use App\Http\Resources\WorkTeamResource;
use App\Models\WorkTeam;
use App\Support\ApiResponse;
use App\Support\UnitScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkTeamController extends Controller
{
    /**
     * Display a paginated, searchable list of teams.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $perPage = min(max($perPage, 1), 100);

        $workTeams = UnitScope::apply(WorkTeam::query(), $request->user())
            ->with('team')
            ->withCount('assets')
            ->when($request->query('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($request->query('status'), function ($query, $status) {
                $query->where('status', $status);
            })
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return ApiResponse::success(WorkTeamResource::collection($workTeams)->response()->getData(true), 'Data tim berhasil dimuat.');
    }

    /**
     * Store a newly created team.
     */
    public function store(StoreWorkTeamRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        // A unit-scoped user always creates a team for their own unit; the
        // request has already forced that value. A super admin may leave it
        // empty to add to the shared/global list.
        $teamId = $user && ! UnitScope::bypasses($user) && $user->team_id
            ? $user->team_id
            : ($validated['team_id'] ?? null);

        $workTeam = WorkTeam::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? WorkTeam::STATUS_ACTIVE,
            'team_id' => $teamId,
        ]);

        return ApiResponse::created([
            'work_team' => new WorkTeamResource($workTeam->load('team')->loadCount('assets')),
        ], 'Team created successfully.');
    }

    /**
     * Display the specified team.
     */
    public function show(Request $request, WorkTeam $workTeam): JsonResponse
    {
        UnitScope::assertAccess($request->user(), $workTeam->team_id);

        return ApiResponse::success([
            'work_team' => new WorkTeamResource($workTeam->load('team')->loadCount('assets')),
        ]);
    }

    /**
     * Update the specified team.
     */
    public function update(UpdateWorkTeamRequest $request, WorkTeam $workTeam): JsonResponse
    {
        UnitScope::assertAccess($request->user(), $workTeam->team_id);

        $data = $request->validated();

        // Scoped users may not hand a team to another company.
        if (! UnitScope::bypasses($request->user()) && $request->user()?->team_id) {
            $data['team_id'] = $request->user()->team_id;
        }

        $workTeam->update($data);

        return ApiResponse::success([
            'work_team' => new WorkTeamResource($workTeam->fresh()->load('team')->loadCount('assets')),
        ], 'Team updated successfully.');
    }

    /**
     * Remove the specified team.
     */
    public function destroy(Request $request, WorkTeam $workTeam): JsonResponse
    {
        UnitScope::assertAccess($request->user(), $workTeam->team_id);

        if ($workTeam->assets()->exists()) {
            return ApiResponse::error('Cannot delete a team that still has assets.', ['work_team' => ['Tim masih digunakan oleh aset.']], 422);
        }

        $workTeam->delete();

        return ApiResponse::noContent('Team deleted successfully.');
    }
}
