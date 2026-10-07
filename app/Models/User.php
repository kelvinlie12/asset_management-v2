<?php

namespace App\Models;

use App\Support\ModuleCatalog;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, Notifiable;

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
        ];
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
            $assigned = $assigned->merge(
                Permission::query()->pluck('name')
            );
        }

        return $assigned->unique()->values()->all();
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

        $this->unsetRelation('permissions');
        $this->unsetRelation('roles');
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }
}
