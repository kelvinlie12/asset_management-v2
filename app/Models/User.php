<?php

namespace App\Models;

use App\Support\AccessCatalog;
use App\Support\ModuleCatalog;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Contracts\Permission as PermissionContract;
use Spatie\Permission\Models\Permission;
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
     * Permission map for each role.
     *
     * @var array<string, list<string>>
     */
    public const ROLE_PERMISSIONS = [
        self::ROLE_VIEWER => [
            'profile.view',
            'profile.update',
            'profile.password',
        ],
        self::ROLE_STAFF => [
            'profile.view',
            'profile.update',
            'profile.password',
        ],
        self::ROLE_ADMIN => [
            'profile.view',
            'profile.update',
            'profile.password',
            'users.view',
            'users.create',
            'users.update',
            'users.delete',
        ],
        // Owners only receive the profile permissions from the role itself;
        // every feature module is granted per user by a super admin.
        self::ROLE_OWNER => [
            'profile.view',
            'profile.update',
            'profile.password',
        ],
        self::ROLE_SUPER_ADMIN => [
            'profile.view',
            'profile.update',
            'profile.password',
            'users.view',
            'users.create',
            'users.update',
            'users.delete',
            'system.manage',
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
     * Creates the Spatie role if it does not yet exist, then reassigns it.
     */
    public function syncRoleToSpatie(): void
    {
        $roleName = $this->role ?: self::ROLE_VIEWER;
        $role = \Spatie\Permission\Models\Role::findOrCreate($roleName, 'web');

        if (! $this->hasRole($roleName)) {
            $this->syncRoles([$role]);
        }
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

        $rolePermissions = $this->getPermissionsViaRoles()->pluck('name')->all();

        $direct = array_values(array_diff($permissions, $rolePermissions));
        $denied = array_values(array_diff($rolePermissions, $permissions));

        $this->syncPermissions($direct);
        $this->forceFill(['denied_permissions' => $denied])->save();

        $this->unsetRelation('permissions');
        $this->unsetRelation('roles');
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

        $this->syncPermissions(ModuleCatalog::permissionsFor($keys));

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
