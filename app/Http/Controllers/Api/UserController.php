<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AssignRoleRequest;
use App\Http\Requests\AssignTeamRequest;
use App\Http\Requests\ResetPasswordRequest;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserAccessRequest;
use App\Http\Requests\UpdateUserModulesRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Support\AccessCatalog;
use App\Support\ModuleCatalog;
use App\Support\UnitScope;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\PermissionRegistrar;


class UserController extends Controller
{
    private const ROLE_RANK = [
        User::ROLE_VIEWER => 1,
        User::ROLE_STAFF => 2,
        User::ROLE_OWNER => 3,
        User::ROLE_ADMIN => 4,
        User::ROLE_SUPER_ADMIN => 5,
    ];
    /**
     * Display a paginated, searchable list of users.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $perPage = (int) $request->query('per_page', 15);
        $perPage = min(max($perPage, 1), 100);

        $users = User::query()
            ->with('team');
        $user = $request->user();
        if (! UnitScope::bypasses($user) && $user?->team_id) {
            $users = $users->where('team_id', $user->team_id);
        }
        $users = $users
            ->when($request->query('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($request->query('role'), function ($query, $role) {
                $query->where('role', $role);
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

        return ApiResponse::success(UserResource::collection($users)->response()->getData(true), 'Data pengguna berhasil dimuat.');
    }

    /**
     * Store a newly created user.
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $validated = $request->validated();

        if (! $this->canSetRole($request->user(), $validated['role'])) {
            return ApiResponse::error('You are not allowed to assign this role.', null, 403);
        }

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'role' => $validated['role'],
            'team_id' => UnitScope::bypasses($request->user()) ? ($validated['team_id'] ?? null) : UnitScope::resolveTeamId($request->user(), $validated['team_id'] ?? null),
            'phone' => $validated['phone'] ?? null,
            'status' => $validated['status'] ?? User::STATUS_ACTIVE,
        ]);

        // Keep Spatie's role in sync with the newly assigned role.
        $user->syncRoleToSpatie();

        // A new owner starts from the minimal module set; a super admin can
        // widen it later without touching the role.
        if ($user->isOwner()) {
            $user->syncModules(ModuleCatalog::DEFAULT_OWNER_MODULES);
            app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        }

        return ApiResponse::created([
            'user' => new UserResource($user->load('team')),
        ], 'User created successfully.');
    }

    /**
     * Display the specified user.
     */
    public function show(Request $request, User $user): JsonResponse
    {
        $this->authorize('view', $user);
        UnitScope::assertAccess($request->user(), $user->team_id);

        return ApiResponse::success([
            'user' => new UserResource($user->load('team')),
        ]);
    }

    /**
     * Update the specified user.
     */
    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        UnitScope::assertAccess($request->user(), $user->team_id);

        $validated = $request->validated();

        if (isset($validated['role']) && ! $this->canSetRole($request->user(), $validated['role'])) {
            return ApiResponse::error('You are not allowed to assign this role.', null, 403);
        }

        if (array_key_exists('password', $validated) && empty($validated['password'])) {
            unset($validated['password']);
        }

        if (! UnitScope::bypasses($request->user())) {
            // Non-superadmin are locked to their own unit.
            $validated['team_id'] = $request->user()?->team_id ?: $user->team_id;
        } elseif (! array_key_exists('team_id', $validated)) {
            // Keep the existing unit when a superadmin omits the field.
            unset($validated['team_id']);
        }

        $user->update($validated);

        // If the role changed, keep Spatie's role in sync.
        if (isset($validated['role'])) {
            $user->syncRoleToSpatie();

            // Becoming an owner starts from the default module set, because
            // the previous role's permissions are no longer a menu the owner
            // should inherit.
            if ($user->isOwner()) {
                $user->syncModules(ModuleCatalog::DEFAULT_OWNER_MODULES);
            }

            app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        }

        return ApiResponse::success([
            'user' => new UserResource($user->fresh()->load('team')),
        ], 'User updated successfully.');
    }

    /**
     * Remove the specified user.
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->authorize('delete', $user);
        UnitScope::assertAccess($request->user(), $user->team_id);

        $user->tokens()->delete();
        $user->delete();

        return ApiResponse::noContent('User deleted successfully.');
    }

    /**
     * Roles an owner may hand out inside their own unit.
     *
     * An owner runs a company, so they staff their unit with admins, staff and
     * viewers. They may never mint another owner or a super admin, since those
     * carry authority beyond a single unit.
     */
    private const OWNER_ASSIGNABLE_ROLES = [
        User::ROLE_ADMIN,
        User::ROLE_STAFF,
        User::ROLE_VIEWER,
    ];

    /**
     * Roles only a super admin may hand out.
     *
     * These carry authority beyond a unit: an owner receives feature modules
     * from a super admin, and an admin outranks a unit. A plain rank comparison
     * is not enough here, because "admin is above owner" would still let an
     * admin mint new owners and new admins.
     */
    private const SUPER_ADMIN_ONLY_ROLES = [
        User::ROLE_OWNER,
        User::ROLE_ADMIN,
        User::ROLE_SUPER_ADMIN,
    ];

    /**
     * Determine whether the given acting user is allowed to set the target role.
     *
     * A super admin can create any role. An owner can staff their own unit with
     * admins, staff and viewers. Everyone else who holds `users.create` is
     * limited to staff and viewer, so an admin can staff a unit without gaining
     * the ability to hand out company ownership.
     */
    private function canSetRole(User $actor, string $role): bool
    {
        if (! array_key_exists($role, self::ROLE_RANK)) {
            return false;
        }

        if ($actor->isSuperAdmin()) {
            return true;
        }

        if ($actor->isOwner()) {
            return in_array($role, self::OWNER_ASSIGNABLE_ROLES, true);
        }

        if (in_array($role, self::SUPER_ADMIN_ONLY_ROLES, true)) {
            return false;
        }

        return self::ROLE_RANK[$role] < self::ROLE_RANK[$actor->role];
    }

    /**
     * List the modules a super admin can hand to an owner.
     */
    public function moduleCatalog(Request $request): JsonResponse
    {
        if (! $request->user()?->isSuperAdmin()) {
            return ApiResponse::error('You are not allowed to manage module access.', null, 403);
        }

        return ApiResponse::success([
            'modules' => ModuleCatalog::toArray(),
            'defaults' => ModuleCatalog::DEFAULT_OWNER_MODULES,
        ]);
    }

    /**
     * Replace the set of modules a given user can reach.
     *
     * Menus are permission driven, so this is what makes one owner see a
     * different sidebar from another. Super admins are rejected: they bypass
     * every check anyway, so a grant list would be misleading.
     */
    public function updateModules(UpdateUserModulesRequest $request, User $user): JsonResponse
    {
        if ($user->isSuperAdmin()) {
            return ApiResponse::error('Super admin always has access to every module.', null, 422);
        }

        $user->syncModules($request->moduleKeys());

        // Permission changes invalidate the cached ability snapshot and any
        // token that was minted with the previous menu set.
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        $user->tokens()->delete();

        return ApiResponse::success([
            'user' => new UserResource($user->fresh()->load('team')),
        ], 'Module access updated successfully.');
    }

    /**
     * Describe the access matrix of a single user inside a unit.
     *
     * Returns the menu catalogue, the permissions the target user currently
     * holds, the permissions the acting user is allowed to grant (their own
     * ceiling, so nobody can escalate above themselves) and whether the matrix
     * may be edited at all.
     */
    public function showAccess(Request $request, User $user): JsonResponse
    {
        $this->authorize('view', $user);
        UnitScope::assertAccess($request->user(), $user->team_id);

        $actor = $request->user();

        return ApiResponse::success([
            'target' => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => $user->role,
                'role_label' => ucwords(str_replace('_', ' ', $user->role)),
                'team_id' => $user->team_id,
            ],
            'catalog' => AccessCatalog::toArray(),
            'actions' => AccessCatalog::ACTIONS,
            'permissions' => $user->getRoleAbilities(),
            'grantable' => $this->grantablePermissions($actor),
            'editable' => $actor->can('manageAccess', $user),
        ]);
    }

    /**
     * The feature permissions the acting user may hand out.
     *
     * A super admin can grant anything. A unit owner distributes exactly the
     * modules a super admin entrusted to them, so their staff can only ever
     * reach what the owner has been given. Anyone else is capped at what they
     * hold themselves.
     *
     * @return list<string>
     */
    private function grantablePermissions(User $actor): array
    {
        if ($actor->isSuperAdmin()) {
            return AccessCatalog::permissionNames();
        }

        if ($actor->isOwner()) {
            return AccessCatalog::grantablesForHeldModules($actor->getRoleAbilities());
        }

        return $actor->getRoleAbilities();
    }

    /**
     * Replace the access matrix of a single user.
     *
     * The submitted set becomes the user's effective feature permissions,
     * regardless of their role. A unit-scoped actor may only change permissions
     * within their own ceiling; anything outside it is left untouched so an
     * owner cannot downgrade access they do not administer.
     */
    public function updateAccess(UpdateUserAccessRequest $request, User $user): JsonResponse
    {
        UnitScope::assertAccess($request->user(), $user->team_id);

        $actor = $request->user();
        $desired = $request->permissionNames();

        if (! $actor->isSuperAdmin()) {
            $grantable = $this->grantablePermissions($actor);
            $untouchable = array_values(array_diff($user->getRoleAbilities(), $grantable));

            $desired = array_values(array_unique(array_merge(
                array_intersect($desired, $grantable),
                $untouchable,
            )));
        }

        $user->syncAccessPermissions($desired);

        // Permissions changed, so cached abilities and existing tokens are stale.
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $user->tokens()->delete();

        return ApiResponse::success([
            'user' => new UserResource($user->fresh()->load('team')),
        ], 'Hak akses pengguna berhasil diperbarui.');
    }

    /**
     * Assign a role to the specified user.
     */
    public function assignRole(AssignRoleRequest $request, User $user): JsonResponse
    {
        UnitScope::assertAccess($request->user(), $user->team_id);

        $role = $request->validated('role');

        if (! $this->canSetRole($request->user(), $role)) {
            return ApiResponse::error('You are not allowed to assign this role.', null, 403);
        }

        $user->update([
            'role' => $role,
        ]);

        // Keep Spatie's role in sync with the legacy role column.
        $user->syncRoleToSpatie();

        // Role change may alter token abilities; force a fresh login.
        $user->tokens()->delete();

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        $user->tokens()->delete();

        return ApiResponse::success([
            'user' => new UserResource($user->fresh()->load('team')),
        ], 'Role assigned successfully.');
    }

    /**
     * Assign a team to the specified user.
     */
    public function assignTeam(AssignTeamRequest $request, User $user): JsonResponse
    {
        UnitScope::assertAccess($request->user(), $user->team_id);

        $user->update([
            'team_id' => UnitScope::bypasses($request->user())
                ? $request->validated('team_id')
                : ($request->user()?->team_id ?: $user->team_id),
        ]);

        return ApiResponse::success([
            'user' => new UserResource($user->fresh()->load('team')),
        ], 'Team assigned successfully.');
    }

    /**
     * Reset the specified user's password.
     */
    public function resetPassword(ResetPasswordRequest $request, User $user): JsonResponse
    {
        UnitScope::assertAccess($request->user(), $user->team_id);

        $user->update([
            'password' => $request->validated('password'),
        ]);

        $user->tokens()->delete();

        return ApiResponse::noContent('Password reset successfully.');
    }

    /**
     * Deactivate (disable) the specified user.
     */
    public function deactivate(Request $request, User $user): JsonResponse
    {
        $this->authorize('deactivate', $user);
        UnitScope::assertAccess($request->user(), $user->team_id);

        $user->update([
            'status' => User::STATUS_INACTIVE,
        ]);

        // Revoke the user's sessions so they are immediately logged out.
        $user->tokens()->delete();

        return ApiResponse::success([
            'user' => new UserResource($user->fresh()->load('team')),
        ], 'User deactivated successfully.');
    }

    /**
     * Activate (enable) the specified user.
     */
    public function activate(Request $request, User $user): JsonResponse
    {
        $this->authorize('activate', $user);
        UnitScope::assertAccess($request->user(), $user->team_id);

        $user->update([
            'status' => User::STATUS_ACTIVE,
        ]);

        return ApiResponse::success([
            'user' => new UserResource($user->fresh()->load('team')),
        ], 'User activated successfully.');
    }
}
