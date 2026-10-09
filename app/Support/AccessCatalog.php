<?php

namespace App\Support;

/**
 * Catalogue of the per-user access matrix.
 *
 * A unit's owner or admin configures an individual user by walking the menu
 * (group) down to the feature and then ticking the actions (view, create,
 * update, delete) that user may perform. Every action maps to a Spatie
 * permission name, which is what actually authorises the API request.
 *
 * Profile permissions and `system.manage` are intentionally absent: everyone
 * keeps access to their own profile, and system management is reserved for a
 * super admin.
 */
class AccessCatalog
{
    /**
     * Fixed order in which actions are rendered on the client.
     *
     * @var list<string>
     */
    public const ACTIONS = ['view', 'create', 'update', 'delete'];

    /**
     * Menus, each holding the features (permission bundles) they expose.
     *
     * @var list<array{key: string, label: string, features: list<array{key: string, label: string, actions: array<string, string>}>}>
     */
    public const GROUPS = [
        [
            'key' => 'assets',
            'label' => 'Aset & Inventaris',
            'features' => [
                [
                    'key' => 'assets',
                    'label' => 'Data Aset',
                    'actions' => [
                        'view' => 'assets.view',
                        'create' => 'assets.create',
                        'update' => 'assets.update',
                        'delete' => 'assets.delete',
                    ],
                ],
                [
                    'key' => 'assignments',
                    'label' => 'Penempatan Barang',
                    'actions' => [
                        'view' => 'assignments.view',
                        'create' => 'assignments.create',
                    ],
                ],
                [
                    'key' => 'purchases',
                    'label' => 'Pembelian',
                    'actions' => [
                        'view' => 'purchases.view',
                        'create' => 'purchases.create',
                        'delete' => 'purchases.delete',
                    ],
                ],
                [
                    'key' => 'transfers',
                    'label' => 'Mutasi Barang',
                    'actions' => [
                        'view' => 'transfers.view',
                        'create' => 'transfers.create',
                    ],
                ],
                [
                    'key' => 'damages',
                    'label' => 'Barang Rusak',
                    'actions' => [
                        'view' => 'damages.view',
                        'create' => 'damages.create',
                        'update' => 'damages.update',
                        'delete' => 'damages.delete',
                    ],
                ],
                [
                    'key' => 'categories',
                    'label' => 'Kategori Barang',
                    'actions' => [
                        'view' => 'categories.view',
                        'create' => 'categories.create',
                        'update' => 'categories.update',
                        'delete' => 'categories.delete',
                    ],
                ],
            ],
        ],
        [
            'key' => 'vehicles',
            'label' => 'Kendaraan',
            'features' => [
                [
                    'key' => 'vehicles',
                    'label' => 'Data Kendaraan',
                    'actions' => [
                        'view' => 'vehicles.view',
                        'create' => 'vehicles.create',
                        'update' => 'vehicles.update',
                        'delete' => 'vehicles.delete',
                    ],
                ],
                [
                    'key' => 'vehicle_taxes',
                    'label' => 'Pajak Kendaraan',
                    'actions' => [
                        'view' => 'vehicle_taxes.view',
                        'create' => 'vehicle_taxes.create',
                        'update' => 'vehicle_taxes.update',
                        'delete' => 'vehicle_taxes.delete',
                    ],
                ],
            ],
        ],
        [
            'key' => 'network',
            'label' => 'Jaringan FTTH',
            'features' => [
                [
                    'key' => 'network',
                    'label' => 'Node Jaringan',
                    'actions' => [
                        'view' => 'network.view',
                        'create' => 'network.create',
                        'update' => 'network.update',
                        'delete' => 'network.delete',
                    ],
                ],
            ],
        ],
        [
            'key' => 'organization',
            'label' => 'Organisasi',
            'features' => [
                [
                    'key' => 'teams',
                    'label' => 'Unit / Perusahaan',
                    'actions' => [
                        'view' => 'teams.view',
                        'create' => 'teams.create',
                        'update' => 'teams.update',
                        'delete' => 'teams.delete',
                    ],
                ],
                [
                    'key' => 'rooms',
                    'label' => 'Ruang',
                    'actions' => [
                        'view' => 'rooms.view',
                        'create' => 'rooms.create',
                        'update' => 'rooms.update',
                        'delete' => 'rooms.delete',
                    ],
                ],
                [
                    'key' => 'suppliers',
                    'label' => 'Supplier',
                    'actions' => [
                        'view' => 'suppliers.view',
                        'create' => 'suppliers.create',
                        'update' => 'suppliers.update',
                        'delete' => 'suppliers.delete',
                    ],
                ],
                [
                    'key' => 'users',
                    'label' => 'Pengguna Unit',
                    'actions' => [
                        'view' => 'users.view',
                        'create' => 'users.create',
                        'update' => 'users.update',
                        'delete' => 'users.delete',
                    ],
                ],
            ],
        ],
        [
            'key' => 'system',
            'label' => 'Sistem',
            'features' => [
                [
                    'key' => 'roles',
                    'label' => 'Peran',
                    'actions' => [
                        'view' => 'roles.view',
                        'create' => 'roles.create',
                        'update' => 'roles.update',
                        'delete' => 'roles.delete',
                    ],
                ],
                [
                    'key' => 'permissions',
                    'label' => 'Izin',
                    'actions' => [
                        'view' => 'permissions.view',
                        'create' => 'permissions.create',
                        'update' => 'permissions.update',
                        'delete' => 'permissions.delete',
                    ],
                ],
                [
                    'key' => 'audit_logs',
                    'label' => 'Log Aktivitas',
                    'actions' => [
                        'view' => 'audit_logs.view',
                    ],
                ],
            ],
        ],
    ];

    /**
     * Flatten the catalogue into the list of permission names it controls.
     *
     * @return list<string>
     */
    public static function permissionNames(): array
    {
        $names = [];

        foreach (self::GROUPS as $group) {
            foreach ($group['features'] as $feature) {
                foreach ($feature['actions'] as $permission) {
                    $names[$permission] = true;
                }
            }
        }

        return array_keys($names);
    }

    public static function has(string $permission): bool
    {
        return in_array($permission, self::permissionNames(), true);
    }

    /**
     * Permissions a unit owner may hand out to their staff.
     *
     * An owner administers exactly the modules a super admin entrusted to them.
     * A module is grantable as soon as the owner personally holds any action
     * inside it, and then the whole module (every feature and action) can be
     * passed down to the staff of their unit. The roles/permissions
     * administrators stay with a super admin no matter what.
     *
     * @param  list<string>  $held  the actor's effective permission names
     * @return list<string>
     */
    public static function grantablesForHeldModules(array $held): array
    {
        $held = array_flip($held);
        $names = [];

        foreach (self::GROUPS as $group) {
            foreach ($group['features'] as $feature) {
                if (in_array($feature['key'], ['roles', 'permissions'], true)) {
                    continue;
                }

                $ownsModule = false;

                foreach ($feature['actions'] as $permission) {
                    if (isset($held[$permission])) {
                        $ownsModule = true;
                    }
                }

                if (! $ownsModule) {
                    continue;
                }

                foreach ($feature['actions'] as $permission) {
                    $names[$permission] = true;
                }
            }
        }

        return array_keys($names);
    }

    /**
     * Keep only the permissions this catalogue knows how to grant.
     *
     * @param  list<string>  $permissions
     * @return list<string>
     */
    public static function sanitize(array $permissions): array
    {
        $known = self::permissionNames();

        return array_values(array_unique(array_filter(
            $permissions,
            static fn ($permission) => is_string($permission) && in_array($permission, $known, true)
        )));
    }

    /**
     * Describe the catalogue for the client.
     *
     * @return list<array<string, mixed>>
     */
    public static function toArray(): array
    {
        return self::GROUPS;
    }
}
