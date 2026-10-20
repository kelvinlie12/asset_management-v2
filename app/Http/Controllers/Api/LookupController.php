<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\Category;
use App\Models\Room;
use App\Models\Team;
use App\Models\User;
use App\Models\WorkTeam;
use App\Support\ApiResponse;
use App\Support\UnitScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Dropdown data for forms.
 *
 * Asset forms need category, room, unit and user pickers, but an owner may not
 * hold the `categories.view`, `rooms.view`, `teams.view` or `users.view`
 * permissions those pickers would normally require. Serving the four lists from
 * one endpoint gated on `assets.view` keeps the asset module self-sufficient,
 * so trimming an owner's modules never leaves the pages they can still open in
 * a broken state.
 */
class LookupController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $unitScoped = ! UnitScope::bypasses($user) && $user?->team_id;

        // team_id travels with the categories, rooms and people so a super admin's
        // forms can keep every picker limited to the unit currently selected.
        $categories = Category::query()
            ->where('status', 'active')
            ->when($unitScoped, fn ($q) => $q->where('team_id', $user->team_id))
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'team_id']);

        // team_id travels with the rooms and people so a super admin's forms can
        // keep the placement pickers limited to the unit currently selected.
        $rooms = Room::query()
            ->when($unitScoped, fn ($q) => $q->where('team_id', $user->team_id))
            ->orderBy('name')
            ->get(['id', 'name', 'is_storage', 'team_id']);

        $teams = Team::query()
            ->when($unitScoped, fn ($q) => $q->whereKey($user->team_id))
            ->orderBy('name')
            ->get(['id', 'name', 'slug']);

        $people = User::query()
            ->where('status', User::STATUS_ACTIVE)
            ->when($unitScoped, fn ($q) => $q->where('team_id', $user->team_id))
            ->orderBy('name')
            ->get(['id', 'name', 'role', 'team_id']);

        // Working groups the asset can be marked as used by.
        $workTeams = WorkTeam::query()
            ->where('status', WorkTeam::STATUS_ACTIVE)
            ->when($unitScoped, fn ($q) => $q->where('team_id', $user->team_id))
            ->orderBy('name')
            ->get(['id', 'name', 'team_id']);

        $assets = Asset::query()
            ->when($unitScoped, fn ($q) => $q->where('team_id', $user->team_id))
            ->orderBy('name')
            ->get(['id', 'name', 'asset_code']);

        return ApiResponse::success([
            'categories' => $categories,
            'rooms' => $rooms,
            'teams' => $teams,
            'users' => $people,
            'assets' => $assets,
            'work_teams' => $workTeams,
        ]);
    }
}