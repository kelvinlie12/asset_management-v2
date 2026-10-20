<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTeamRequest;
use App\Http\Requests\UpdateTeamRequest;
use App\Http\Resources\TeamResource;
use App\Models\Team;
use App\Support\ApiResponse;
use App\Support\UnitScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;

class TeamController extends Controller
{
    /** Directory (relative to the public path) that holds unit logos. */
    private const LOGO_DIR = 'uploads/teams';

    /**
     * Display a paginated, searchable list of teams.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $perPage = min(max($perPage, 1), 100);

        $user = $request->user();

        $teams = Team::query()
            ->withCount('users')
            ->withCount('rooms')
            ->when($request->query('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($request->query('status'), function ($query, $status) {
                $query->where('status', $status);
            })
            ->orderBy('name');

        // Non-superadmins only see their own unit (team).
        if (! UnitScope::bypasses($user) && $user?->team_id) {
            $teams->where('id', $user->team_id);
        }

        $teams = $teams->paginate($perPage)->withQueryString();

        return ApiResponse::success(TeamResource::collection($teams)->response()->getData(true), 'Data tim berhasil dimuat.');
    }

    /**
     * Store a newly created team.
     *
     * A new unit starts with no rooms on purpose: rooms belong to a single
     * company and are created by that unit's own users later.
     */
    public function store(StoreTeamRequest $request): JsonResponse
    {
        // Only superadmins may create new units.
        if (! UnitScope::bypasses($request->user())) {
            return ApiResponse::error('Hanya superadmin yang dapat membuat unit baru.', null, 403);
        }

        $validated = $request->validated();

        $team = Team::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? Team::STATUS_ACTIVE,
            'logo' => $request->hasFile('logo') ? $this->storeLogo($request->file('logo')) : null,
        ]);

        return ApiResponse::created([
            'team' => new TeamResource($team->loadCount('users')->loadCount('rooms')),
        ], 'Team created successfully.');
    }

    /**
     * Display the specified team.
     */
    public function show(Request $request, Team $team): JsonResponse
    {
        UnitScope::assertAccess($request->user(), $team->id);

        return ApiResponse::success([
            'team' => new TeamResource($team->loadCount('users')->loadCount('rooms')),
        ]);
    }

    /**
     * Update the specified team.
     */
    public function update(UpdateTeamRequest $request, Team $team): JsonResponse
    {
        UnitScope::assertAccess($request->user(), $team->id);

        $data = collect($request->validated())->except(['logo', 'remove_logo'])->all();

        if ($request->boolean('remove_logo')) {
            $this->deleteLogo($team->logo);
            $data['logo'] = null;
        } elseif ($request->hasFile('logo')) {
            $this->deleteLogo($team->logo);
            $data['logo'] = $this->storeLogo($request->file('logo'));
        }

        $team->update($data);

        return ApiResponse::success([
            'team' => new TeamResource($team->fresh()->loadCount('users')->loadCount('rooms')),
        ], 'Team updated successfully.');
    }

    /**
     * Remove the specified team.
     */
    public function destroy(Request $request, Team $team): JsonResponse
    {
        UnitScope::assertAccess($request->user(), $team->id);

        if ($team->users()->exists()) {
            return ApiResponse::error('Cannot delete a team that still has members.', ['team' => ['Tim masih memiliki anggota.']], 422);
        }

        // The unit's own rooms go with it; nothing else points at a deleted unit.
        $team->rooms()->update(['team_id' => null]);

        $this->deleteLogo($team->logo);

        $team->delete();

        return ApiResponse::noContent('Team deleted successfully.');
    }

    /**
     * Move an uploaded logo into the public teams directory.
     */
    private function storeLogo(UploadedFile $file): string
    {
        $directory = public_path(self::LOGO_DIR);
        File::ensureDirectoryExists($directory);

        $ext = strtolower($file->guessExtension() ?: 'png');
        $name = 'logo_'.md5(uniqid((string) random_int(0, PHP_INT_MAX), true)).'.'.$ext;
        $file->move($directory, $name);

        return self::LOGO_DIR.'/'.$name;
    }

    /**
     * Remove a stored logo, but only a file that lives in the teams folder.
     */
    private function deleteLogo(?string $path): void
    {
        if (! $path || ! str_starts_with($path, self::LOGO_DIR.'/')) {
            return;
        }

        $fullPath = public_path($path);
        if (File::exists($fullPath)) {
            File::delete($fullPath);
        }
    }
}
