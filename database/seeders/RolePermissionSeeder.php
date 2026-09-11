<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    private const GUARD = 'web';

    /**
     * All application permissions.
     *
     * @var list<string>
     */
    private const PERMISSIONS = [
        // Profile
        'profile.view',
        'profile.update',
        'profile.password',
        // User management
        'user.manage',
        // System
        'system.manage',
        // Role management (RBAC module)
        'roles.view',
        'roles.create',
        'roles.update',
        'roles.delete',
        // Permission management (RBAC module)
        'permissions.view',
        'permissions.create',
        'permissions.update',
        'permissions.delete',
        // Team management
        'teams.view',
        'teams.create',
        'teams.update',
        'teams.delete',
        // Room (Ruangan) management
        'rooms.view',
        'rooms.create',
        'rooms.update',
        'rooms.delete',
        // Category (Kategori Barang) management
        'categories.view',
        'categories.create',
        'categories.update',
        'categories.delete',
        // Asset (Barang) management
        'assets.view',
        'assets.create',
        'assets.update',
        'assets.delete',
        // Purchase (Pembelian Barang) management
        'purchases.view',
        'purchases.create',
        'purchases.delete',
        // Asset Assignment (Penempatan Barang)
        'assignments.view',
        'assignments.create',
        // Asset Transfer (Mutasi Barang)
        'transfers.view',
        'transfers.create',
        // Asset Damage Report (Barang Rusak)
        'damages.view',
        'damages.create',
        'damages.update',
        'damages.delete',
        // Vehicle Asset (Motor)
        'vehicles.view',
        'vehicles.create',
        'vehicles.update',
        'vehicles.delete',
        // Vehicle Tax (Pajak Kendaraan)
        'vehicle_taxes.view',
        'vehicle_taxes.create',
        'vehicle_taxes.update',
        'vehicle_taxes.delete',
        // Supplier / Vendor
        'suppliers.view',
        'suppliers.create',
        'suppliers.update',
        'suppliers.delete',
        // Audit log (Log Aktivitas)
        'audit_logs.view',
    ];

    /**
     * Permissions granted per role.
     *
     * @var array<string, list<string>>
     */
    private const ROLE_PERMISSIONS = [
        User::ROLE_VIEWER => [
            'profile.view',
        ],
        User::ROLE_STAFF => [
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
        ],
        User::ROLE_ADMIN => [
            'profile.view',
            'profile.update',
            'profile.password',
            'user.manage',
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
            'audit_logs.view',
        ],
        User::ROLE_SUPER_ADMIN => self::PERMISSIONS,
    ];

    public function run(): void
    {
        // Use firstOrCreate (bypasses the Spatie registrar cache) so the seeder
        // stays idempotent even when the cached permission snapshot is stale.
        $permissionModels = collect(self::PERMISSIONS)->mapWithKeys(
            fn (string $name) => [$name => Permission::firstOrCreate(
                ['name' => $name, 'guard_name' => self::GUARD],
                ['name' => $name, 'guard_name' => self::GUARD],
            )]
        );

        foreach (self::ROLE_PERMISSIONS as $roleName => $rolePermissionNames) {
            $role = Role::findOrCreate($roleName, self::GUARD);
            $role->permissions()->sync(
                $permissionModels->only($rolePermissionNames)->map->id->values()->all()
            );
        }

        // Ensure legacy users are linked to a matching Spatie role.
        User::query()->each(function (User $user) {
            $user->syncRoleToSpatie();
        });

        // Drop the cached snapshot so subsequent lookups see the current rows.
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
