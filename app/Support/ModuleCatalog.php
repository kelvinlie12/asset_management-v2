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
     * Describe the catalogue for the client.
     *
     * @return list<array{key: string, label: string, description: string, default: bool}>
     */
    public static function toArray(): array
    {
        return array_map(
            static fn (string $key, array $module) => [
                'key' => $key,
                'label' => $module['label'],
                'description' => $module['description'],
                'default' => in_array($key, self::DEFAULT_OWNER_MODULES, true),
            ],
            array_keys(self::MODULES),
            self::MODULES
        );
    }
}