<?php

namespace Database\Seeders;

use App\Models\User;
use App\Support\ModuleCatalog;
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
        'users.view',
        'users.create',
        'users.update',
        'users.delete',
        'users.manage_access',
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
        // FTTH Network (Jaringan FTTH)
        'network.view',
        'network.create',
        'network.update',
        'network.delete',
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
            'profile.update',
            'profile.password',
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
            'network.view',
        ],
        User::ROLE_ADMIN => [
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
    ];

    public function run(): void
    {
        // Use firstOrCreate (bypasses the Spatie registrar cache) so the seeder
        // stays idempotent even when the cached permission snapshot is stale.
        collect(self::PERMISSIONS)->each(fn (string $name) => Permission::firstOrCreate(
            ['name' => $name, 'guard_name' => self::GUARD],
            ['name' => $name, 'guard_name' => self::GUARD],
        ));

        // A role is a job title only: it must not carry any permission itself.
        foreach (User::ROLES as $roleName) {
            Role::findOrCreate($roleName, self::GUARD)->permissions()->sync([]);
        }

        // Ensure legacy users are linked to a matching Spatie role and have
        // their role's default access materialised as direct grants (safe: an
        // already customised matrix is left untouched).
        User::query()->each(function (User $user) {
            $user->syncRoleToSpatie();
        });

        // Owners whose access is still empty fall back to the default module
        // set; a super admin can still widen or clear it from the UI.
        User::query()
            ->where('role', User::ROLE_OWNER)
            ->each(function (User $user) {
                $features = array_diff($user->getRoleAbilities(), User::MANDATORY_PERMISSIONS);

                if (empty($features)) {
                    $user->syncModules(ModuleCatalog::DEFAULT_OWNER_MODULES);
                }
            });

        // Drop the cached snapshot so subsequent lookups see the current rows.
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
