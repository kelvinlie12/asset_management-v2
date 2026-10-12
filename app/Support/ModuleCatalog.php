<?php

namespace App\Support;

/**
 * Catalogue of grantable feature modules.
 *
 * Menus are derived from permissions, so a "module" is nothing more than a
 * named bundle of permissions that a super admin can hand to (or take away
 * from) an individual owner. Bundles are additive: selecting several modules
 * unions their permissions, and removing a module drops every permission that
 * only that module contributed.
 *
 * Read-only views that are projections of the asset table (Dashboard, Storage,
 * Reports) intentionally have no bundle of their own. They follow whatever
 * the `assets` module grants, which keeps the default owner menu down to
 * Asset Data, Storage and Damaged Items.
 */
class ModuleCatalog
{
    /**
     * Grantable modules, keyed by the value sent from the client.
     *
     * @var array<string, array{label: string, description: string, permissions: list<string>}>
     */
    public const MODULES = [
        'assets' => [
            'label' => 'Aset',
            'description' => 'Data aset, penempatan barang, dashboard, penyimpanan, dan laporan.',
            'permissions' => [
                'assets.view',
                'assets.create',
                'assets.update',
                'assets.delete',
                'assignments.view',
                'assignments.create',
            ],
        ],
        'damages' => [
            'label' => 'Barang Rusak',
            'description' => 'Pelaporan dan pengelolaan barang rusak unit.',
            'permissions' => [
                'damages.view',
                'damages.create',
                'damages.update',
                'damages.delete',
            ],
        ],
        'purchases' => [
            'label' => 'Pembelian',
            'description' => 'Pencatatan pembelian barang unit.',
            'permissions' => [
                'purchases.view',
                'purchases.create',
                'purchases.delete',
            ],
        ],
        'transfers' => [
            'label' => 'Mutasi Barang',
            'description' => 'Pemindahan aset antar ruang atau unit.',
            'permissions' => [
                'transfers.view',
                'transfers.create',
            ],
        ],
        'categories' => [
            'label' => 'Kategori Barang',
            'description' => 'Master kategori barang.',
            'permissions' => [
                'categories.view',
                'categories.create',
                'categories.update',
                'categories.delete',
            ],
        ],
        'vehicles' => [
            'label' => 'Kendaraan',
            'description' => 'Aset kendaraan dan pajak kendaraan.',
            'permissions' => [
                'vehicles.view',
                'vehicles.create',
                'vehicles.update',
                'vehicles.delete',
                'vehicle_taxes.view',
                'vehicle_taxes.create',
                'vehicle_taxes.update',
                'vehicle_taxes.delete',
            ],
        ],
        'suppliers' => [
            'label' => 'Supplier',
            'description' => 'Master supplier atau vendor.',
            'permissions' => [
                'suppliers.view',
                'suppliers.create',
                'suppliers.update',
                'suppliers.delete',
            ],
        ],
        'network' => [
            'label' => 'Jaringan FTTH',
            'description' => 'Topologi dan node jaringan.',
            'permissions' => [
                'network.view',
                'network.create',
                'network.update',
                'network.delete',
            ],
        ],
        'rooms' => [
            'label' => 'Ruang',
            'description' => 'Data ruang milik unit.',
            'permissions' => [
                'rooms.view',
                'rooms.create',
                'rooms.update',
                'rooms.delete',
            ],
        ],
        'teams' => [
            'label' => 'Unit',
            'description' => 'Melihat dan mengubah profil unit sendiri. Ruangan dikelola sendiri lewat modul Ruangan.',
            'permissions' => [
                'teams.view',
                // Only the unit profile. Attaching rooms to a unit no longer
                // exists: a room belongs to exactly one unit and is created by
                // that unit through the rooms module.
                'teams.update',
            ],
        ],
        'users' => [
            'label' => 'Pengguna Unit',
            'description' => 'Mengelola pengguna di dalam unit sendiri.',
            'permissions' => [
                'users.view',
                'users.create',
                'users.update',
                'users.delete',
                'users.manage_access',
            ],
        ],
        'audit_logs' => [
            'label' => 'Log Aktivitas',
            'description' => 'Riwayat aktivitas unit.',
            'permissions' => [
                'audit_logs.view',
            ],
        ],
    ];

    /**
     * Modules a freshly created owner receives unless told otherwise.
     *
     * @var list<string>
     */
    public const DEFAULT_OWNER_MODULES = [
        'assets',
        'damages',
        // Every company manages the staff of its own unit.
        'users',
    ];

    /**
     * @return list<string>
     */
    public static function keys(): array
    {
        return array_keys(self::MODULES);
    }

    public static function has(string $key): bool
    {
        return array_key_exists($key, self::MODULES);
    }

    /**
     * Unknown keys are ignored so a stale client cannot grant nonsense.
     *
     * @param  list<string>  $keys
     * @return list<string>
     */
    public static function sanitizeKeys(array $keys): array
    {
        return array_values(array_unique(array_filter(
            $keys,
            static fn ($key) => is_string($key) && self::has($key)
        )));
    }

    /**
     * Flatten the selected modules into the permission names to grant.
     *
     * @param  list<string>  $keys
     * @return list<string>
     */
    public static function permissionsFor(array $keys): array
    {
        $permissions = [];

        foreach (self::sanitizeKeys($keys) as $key) {
            foreach (self::MODULES[$key]['permissions'] as $permission) {
                $permissions[$permission] = true;
            }
        }

        return array_keys($permissions);
    }

    /**
     * The permissions of a module that may be handed down by a unit owner.
     *
     * A couple of permissions (for example `users.manage_access`) are reserved
     * for a super admin, so they never travel with the module when an owner
     * passes it to their staff.
     *
     * @return list<string>
     */
    public static function delegatablePermissions(string $key): array
    {
        if (! self::has($key)) {
            return [];
        }

        return array_values(array_filter(
            self::MODULES[$key]['permissions'],
            static fn (string $permission) => ! in_array($permission, AccessCatalog::NOT_DELEGATABLE, true)
        ));
    }

    /**
     * The modules a user effectively reaches, given their permissions.
     *
     * A module counts as reached as soon as the user holds any of its
     * delegatable permissions: a menu follows a single view grant, so a partial
     * module is still "on" for that user.
     *
     * @param  list<string>  $abilities
     * @return list<string>
     */
    public static function heldBy(array $abilities): array
    {
        $held = array_flip($abilities);

        return array_values(array_filter(
            self::keys(),
            static function (string $key) use ($held): bool {
                foreach (self::delegatablePermissions($key) as $permission) {
                    if (isset($held[$permission])) {
                        return true;
                    }
                }

                return false;
            }
        ));
    }

    /**
     * The modules a user may hand down to others.
     *
     * Same rule as {@see heldBy()}: owning any action inside a module opens the
     * whole module for delegation. A super admin is handled by the caller.
     *
     * @param  list<string>  $abilities
     * @return list<string>
     */
    public static function grantableBy(array $abilities): array
    {
        return self::heldBy($abilities);
    }

    /**
     * Describe the catalogue for the Access Rights screen.
     *
     * @param  list<string>  $selected  module keys the target currently holds
     * @param  list<string>  $grantable  module keys the actor may hand out
     * @return list<array{key: string, label: string, description: string, default: bool, selected: bool, grantable: bool}>
     */
    public static function describe(array $selected, array $grantable): array
    {
        return array_map(
            static fn (string $key, array $module) => [
                'key' => $key,
                'label' => $module['label'],
                'description' => $module['description'],
                'default' => in_array($key, self::DEFAULT_OWNER_MODULES, true),
                'selected' => in_array($key, $selected, true),
                'grantable' => in_array($key, $grantable, true),
            ],
            array_keys(self::MODULES),
            self::MODULES
        );
    }
}