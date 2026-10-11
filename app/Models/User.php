<?php

namespace App\Models;

use App\Support\AccessCatalog;
use App\Support\ModuleCatalog;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Collection;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Contracts\Permission as PermissionContract;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, Notifiable {
        // Keep the Spatie implementation reachable while a denied-permission
        // guard is layered on top of it.
        hasPermissionTo as protected spatieHasPermissionTo;
    }

    /**
     * Permissions that can never be revoked from a user.
     *
     * @var list<string>
     */
    public const MANDATORY_PERMISSIONS = [
        'profile.view',
        'profile.update',
        'profile.password',
    ];

    public const ROLE_SUPER_ADMIN = 'super_admin';
    public const ROLE_ADMIN = 'admin';
    public const ROLE_OWNER = 'owner';
    public const ROLE_STAFF = 'staff';
    public const ROLE_VIEWER = 'viewer';

    public const ROLES = [
        self::ROLE_SUPER_ADMIN,
        self::ROLE_ADMIN,
        self::ROLE_OWNER,
        self::ROLE_STAFF,
        self::ROLE_VIEWER,
    ];

    public const STATUS_ACTIVE = 'active';
    public const STATUS_INACTIVE = 'inactive';

    public const STATUSES = [
        self::STATUS_ACTIVE,
        self::STATUS_INACTIVE,
    ];

    /**
     * Default feature access seeded into a user when their role is assigned.
     *
     * A role is a job title only: it no longer carries any permission on the
     * Spatie role itself. Instead, the preset below is materialised as the
     * user's *direct* permissions (their Access Rights) at assignment time, so
     * every grant is visible and editable per user. A super admin's elevated
     * access comes from their identity (see the Gate::before hook), never from
     * a stored grant.
     *
     * @var array<string, list<string>>
     */
    public const ROLE_DEFAULT_ACCESS = [
        self::ROLE_VIEWER => [
            'profile.view',
            'profile.update',
            'profile.password',
        ],
        self::ROLE_STAFF => [
            'profile.view',
            'profile.update',
            'profile.password',
            'teams.view',
            'rooms.view',
            'categories.view',
            'assets.view',
            'purchases.view',
            'assignments.view',
            'transfers.view',
            'damages.view',
            'vehicles.view',
            'network.view',
        ],
        self::ROLE_ADMIN => [
            'profile.view',
            'profile.update',
            'profile.password',
            'users.view',
            'users.create',
            'users.update',
            'users.delete',
            'users.manage_access',
            'teams.view',
            'teams.create',
            'teams.update',
            'teams.delete',
            'rooms.view',
            'rooms.create',
            'rooms.update',
            'rooms.delete',
            'categories.view',
            'categories.create',
            'categories.update',
            'categories.delete',
            'assets.view',
            'assets.create',
            'assets.update',
            'assets.delete',
            'purchases.view',
            'purchases.create',
            'purchases.delete',
            'assignments.view',
            'assignments.create',
            'transfers.view',
            'transfers.create',
            'damages.view',
            'damages.create',
            'damages.update',
            'damages.delete',
            'vehicles.view',
            'vehicles.create',
            'vehicles.update',
            'vehicles.delete',
            'vehicle_taxes.view',
            'vehicle_taxes.create',
            'vehicle_taxes.update',
            'vehicle_taxes.delete',
            'suppliers.view',
            'suppliers.create',
            'suppliers.update',
            'suppliers.delete',
            'network.view',
            'network.create',
            'network.update',
            'network.delete',
            'audit_logs.view',
        ],
        // An owner starts with profile access only; the feature modules and
        // granular access of their unit are handed out per user.
        self::ROLE_OWNER => [
            'profile.view',
            'profile.update',
            'profile.password',
        ],
        self::ROLE_SUPER_ADMIN => [
            'profile.view',
            'profile.update',
            'profile.password',
        ],
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'avatar',
        'password',
        'role',
        'phone',
        'team_id',
        'status',
        'denied_permissions',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'denied_permissions' => 'array',
        ];
    }

    /**
     * Resolve the permission name behind a Spatie permission argument.
     */
    private function resolvePermissionName(mixed $permission): ?string
    {
        if ($permission instanceof PermissionContract) {
            return $permission->name;
        }

        return is_string($permission) ? $permission : null;
    }

    /**
     * Whether the permission has been explicitly revoked for this user.
     */
    public function isPermissionDenied(mixed $permission): bool
    {
        $name = $this->resolvePermissionName($permission);

        if ($name === null) {
            return false;
        }

        return in_array($name, $this->denied_permissions ?? [], true);
    }

    /**
     * Permission checks honour the per-user deny list.
     *
     * Spatie has no concept of a negative grant, so a permission taken away
     * from an individual user (while their role still grants it) is stored in
     * `denied_permissions` and subtracted here. The Gate, the `permission:`
     * middleware and `can()` all funnel through this method.
     *
     * @param  string|int|\Spatie\Permission\Contracts\Permission|\BackedEnum  $permission
     */
    public function hasPermissionTo($permission, $guardName = null): bool
    {
        if ($this->isPermissionDenied($permission)) {
            return false;
        }

        return $this->spatieHasPermissionTo($permission, $guardName);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === self::ROLE_SUPER_ADMIN;
    }

    /**
     * Owner of a single unit: full control, but limited to their own unit.
     */
    public function isOwner(): bool
    {
        return $this->role === self::ROLE_OWNER;
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, [self::ROLE_SUPER_ADMIN, self::ROLE_ADMIN, self::ROLE_OWNER], true);
    }

    public function isStaff(): bool
    {
        return in_array($this->role, [self::ROLE_SUPER_ADMIN, self::ROLE_ADMIN, self::ROLE_OWNER, self::ROLE_STAFF], true);
    }

    /**
     * Ensure the user's Spatie role matches the legacy `role` column.
     *
     * The Spatie role (the job title) carries no permissions of its own. When
     * the user has not been given any access yet, the role's default preset is
     * materialised as direct permissions so nobody is left locked out after the
     * role/permission split. Access already customised through the Access
     * Rights matrix is never overwritten.
     */
    public function syncRoleToSpatie(): void
    {
        $roleName = $this->role ?: self::ROLE_VIEWER;
        $role = \Spatie\Permission\Models\Role::findOrCreate($roleName, 'web');

        if (! $this->hasRole($roleName)) {
            $this->syncRoles([$role]);
        }

        $this->applyDefaultAccessWhenUnset();
    }

    /**
     * Seed the role's default access as direct grants if nothing is set yet.
     *
     * Once a user goes through the Access Rights matrix they always hold at
     * least the mandatory profile permissions directly, so this only ever fires
     * for a brand new or never-configured account.
     */
    private function applyDefaultAccessWhenUnset(): void
    {
        if ($this->permissions()->exists()) {
            return;
        }

        $defaults = self::ROLE_DEFAULT_ACCESS[$this->role]
            ?? self::ROLE_DEFAULT_ACCESS[self::ROLE_VIEWER];

        $this->syncPermissions($defaults);

        $this->unsetRelation('permissions');
        $this->unsetRelation('roles');
    }

    /**
     * List of permissions granted to the user through Spatie.
     *
     * Super admins receive every permission that exists in the system, so a
     * newly added permission is granted to them automatically.
     *
     * @return list<string>
     */
    public function getRoleAbilities(): array
    {
        $assigned = $this->getAllPermissions()->pluck('name');

        if ($this->isSuperAdmin()) {
            // A super admin bypasses every check, so denials never apply.
            return $assigned->merge(Permission::query()->pluck('name'))
                ->unique()
                ->values()
                ->all();
        }

        $denied = $this->denied_permissions ?? [];

        return $assigned
            ->unique()
            ->reject(static fn (string $name) => in_array($name, $denied, true))
            ->values()
            ->all();
    }

    /**
     * Apply a granular permission set to this user.
     *
     * The resulting permission set is independent from the user's role: every
     * permission the role already hands out but that is missing from the
     * desired set is recorded as denied, and every desired permission the role
     * does not provide is granted directly. This is what lets User A and User B
     * of the same role hold different access inside one unit.
     *
     * @param  list<string>  $permissions
     */
    public function syncAccessPermissions(array $permissions): void
    {
        $permissions = AccessCatalog::sanitize($permissions);
        $permissions = array_values(array_unique(array_merge(
            $permissions,
            self::MANDATORY_PERMISSIONS,
        )));

        // Access Rights are data-driven: granting a catalogue permission (for
        // example `users.manage_access`) from User Management has to work even
        // when the permissions table was never seeded, so missing rows are
        // created on the fly.
        $permissionModels = $this->ensurePermissionRowsExist($permissions);

        $rolePermissions = $this->getPermissionsViaRoles()->pluck('name')->all();

        $direct = array_values(array_diff($permissions, $rolePermissions));
        $denied = array_values(array_diff($rolePermissions, $permissions));

        // Hand Spatie the resolved models instead of names: `syncPermissions`
        // resolves strings through the registrar's permission cache, which can
        // be stale and still report a freshly-created permission as missing.
        $directModels = collect($direct)
            ->map(fn (string $name) => $permissionModels->get($name))
            ->filter()
            ->values();

        $this->syncPermissions($directModels);

        $this->forceFill(['denied_permissions' => $denied])->save();

        $this->unsetRelation('permissions');
        $this->unsetRelation('roles');
    }

    /**
     * Make sure every permission row exists before a Spatie permission sync.
     *
     * Spatie throws when a permission name has no row in the `permissions`
     * table, but access is purely data-driven today. Creating the missing
     * catalogue rows on the fly keeps User Management the single source of
     * truth: assigning a fresh permission works even before the seeder ran.
     *
     * @param  list<string>  $names
     * @return Collection<string, Permission>
     */
    private function ensurePermissionRowsExist(array $names): Collection
    {
        $guard = $this->getDefaultGuardName();

        foreach ($names as $name) {
            // Query the model directly: `findOrCreate` consults Spatie's cached
            // permission snapshot, which may be stale and hide a missing row.
            Permission::query()->firstOrCreate(
                ['name' => $name, 'guard_name' => $guard],
                ['name' => $name, 'guard_name' => $guard],
            );
        }

        // Fresh rows are invisible to the registrar's cached permission
        // snapshot, so throw it away before any Spatie sync runs.
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return Permission::query()
            ->where('guard_name', $guard)
            ->whereIn('name', $names)
            ->get()
            ->keyBy('name');
    }

    /**
     * The team that the user belongs to.
     *
     * @return BelongsTo<Team, $this>
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * The module keys this user currently has access to.
     *
     * A module counts as granted when every permission in its bundle is part
     * of the user's effective permission set. Super admins implicitly own
     * every module, so the catalogue is returned untouched for them.
     *
     * @return list<string>
     */
    public function getModuleKeys(): array
    {
        if ($this->isSuperAdmin()) {
            return ModuleCatalog::keys();
        }

        $effective = $this->getRoleAbilities();

        return array_values(array_filter(
            ModuleCatalog::keys(),
            static function (string $key) use ($effective) {
                foreach (ModuleCatalog::MODULES[$key]['permissions'] as $permission) {
                    if (! in_array($permission, $effective, true)) {
                        return false;
                    }
                }

                return true;
            }
        ));
    }

    /**
     * Replace this user's module grants with the given keys.
     *
     * @param  list<string>  $keys
     */
    public function syncModules(array $keys): void
    {
        $keys = ModuleCatalog::sanitizeKeys($keys);

        // Profile access is mandatory and must survive every module reset now
        // that roles no longer grant it.
        $permissions = array_values(array_unique(array_merge(
            ModuleCatalog::permissionsFor($keys),
            self::MANDATORY_PERMISSIONS,
        )));

        // Resolve to models rather than names so the sync never consults the
        // registrar's cache for a permission row that was just created.
        $models = $this->ensurePermissionRowsExist($permissions)->values();

        $this->syncPermissions($models);

        // A module preset supersedes any hand-tuned per-user overrides.
        if (! empty($this->denied_permissions)) {
            $this->forceFill(['denied_permissions' => []])->save();
        }

        $this->unsetRelation('permissions');
        $this->unsetRelation('roles');
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }
}
