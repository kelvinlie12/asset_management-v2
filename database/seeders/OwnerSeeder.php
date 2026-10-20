<?php

namespace Database\Seeders;

use App\Models\Asset;
use App\Models\Category;
use App\Models\NetworkNode;
use App\Models\Room;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\PermissionRegistrar;

class OwnerSeeder extends Seeder
{
    /**
     * Seed 3 unit owners, each owning its own unit with initial assets.
     *
     * Every owner gets a dedicated unit (Team), a room for that unit, and a
     * small starter set of assets, vehicles-free, that are already owned by
     * the unit so the unit scoping is immediately visible in the UI.
     */
    public function run(): void
    {
        $owners = [
            [
                'name' => 'Budi Santoso',
                'email' => 'owner.budi@example.com',
                'unit' => [
                    'name' => 'Unit Teknik',
                    'slug' => 'unit-teknik',
                    'description' => 'Unit technique: jaringan, perangkat keras, dan instalasi.',
                ],
                'room' => [
                    'name' => 'Ruang Unit Teknik',
                    'location' => 'Lantai 2',
                    'description' => 'Ruang kerja unit teknik.',
                ],
                'assets' => [
                    ['AST-OWN-TKN-01', 'Fiber Optic Patch Panel', 'CAT-IT', 12500000, 'GOOD', 'IN_STORAGE'],
                    ['AST-OWN-TKN-02', 'Switch Managed 24 Port', 'CAT-IT', 8900000, 'GOOD', 'IN_USE'],
                    ['AST-OWN-TKN-03', 'Rack Server Rakitan', 'CAT-IT', 22000000, 'GOOD', 'IN_USE'],
                    ['AST-OWN-TKN-04', 'Kabel LAN Cat6 (roll)', 'CAT-IT', 1750000, 'GOOD', 'IN_STORAGE'],
                ],
                // Teknik: mengurus perangkat keras dan jaringan.
                'modules' => ['assets', 'damages', 'network', 'users'],
            ],
            [
                'name' => 'Siti Rahma',
                'email' => 'owner.siti@example.com',
                'unit' => [
                    'name' => 'Unit Operasional',
                    'slug' => 'unit-operasional',
                    'description' => 'Unit operasional: distribusi, logistik, dan lapangan.',
                ],
                'room' => [
                    'name' => 'Ruang Unit Operasional',
                    'location' => 'Lantai 1',
                    'description' => 'Ruang kerja unit operasional.',
                ],
                'assets' => [
                    ['AST-OWN-OPR-01', 'Truck Box pending', 'CAT-FUR', 65000000, 'GOOD', 'IN_USE'],
                    ['AST-OWN-OPR-02', 'Handheld Scanner', 'CAT-IT', 3400000, 'GOOD', 'IN_USE'],
                    ['AST-OWN-OPR-03', 'Alat Ukur Meteran', 'CAT-LAIN', 1200000, 'GOOD', 'IN_STORAGE'],
                    ['AST-OWN-OPR-04', 'Tangga Lipat 4 Meter', 'CAT-LAIN', 900000, 'DAMAGED', 'IN_STORAGE'],
                ],
                // Operasional: distribusi, mutasi barang, dan kendaraan.
                'modules' => ['assets', 'damages', 'purchases', 'transfers', 'vehicles', 'users'],
            ],
            [
                'name' => 'Andi Wijaya',
                'email' => 'owner.andi@example.com',
                'unit' => [
                    'name' => 'Unit Keuangan',
                    'slug' => 'unit-keuangan',
                    'description' => 'Unit keuangan: administrasi, pelaporan, dan akuntansi.',
                ],
                'room' => [
                    'name' => 'Ruang Unit Keuangan',
                    'location' => 'Lantai 3',
                    'description' => 'Ruang kerja unit keuangan.',
                ],
                'assets' => [
                    ['AST-OWN-KEU-01', 'Mesin EDC BCA', 'CAT-IT', 2100000, 'GOOD', 'IN_USE'],
                    ['AST-OWN-KEU-02', 'Printer Canon Kasir', 'CAT-ELE', 4500000, 'GOOD', 'IN_USE'],
                    ['AST-OWN-KEU-03', 'Lemari Arsip', 'CAT-FUR', 3200000, 'GOOD', 'IN_STORAGE'],
                    ['AST-OWN-KEU-04', 'Laptop Akuntansi', 'CAT-IT', 13200000, 'GOOD', 'IN_STORAGE'],
                ],
                // Keuangan: administrasi, pembelian, dan vendor.
                'modules' => ['assets', 'damages', 'purchases', 'categories', 'users'],
            ],
        ];

        foreach ($owners as $data) {
            $team = Team::query()->updateOrCreate(
                ['slug' => $data['unit']['slug']],
                [
                    'name' => $data['unit']['name'],
                    'description' => $data['unit']['description'],
                    'status' => 'active',
                ]
            );

            $room = Room::query()->updateOrCreate(
                // Keyed by unit so every owner keeps its own room.
                ['name' => $data['room']['name'], 'team_id' => $team->id],
                [
                    'location' => $data['room']['location'],
                    'description' => $data['room']['description'],
                    'status' => 'active',
                    'is_storage' => false,
                ]
            );

            $owner = User::query()->updateOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'password' => 'password',
                    'role' => User::ROLE_OWNER,
                    'team_id' => $team->id,
                    'status' => User::STATUS_ACTIVE,
                ]
            );

            $owner->syncRoleToSpatie();

            // Each owner gets a menu tailored to the work of their unit, so
            // the per-owner module grants are visible right after seeding.
            $owner->syncModules($data['modules']);

            foreach ($data['assets'] as [$code, $name, $categoryCode, $price, $condition, $usage]) {
                $asset = Asset::query()->updateOrCreate(
                    ['asset_code' => $code],
                    [
                        'name' => $name,
                        'category_id' => Category::query()->where('code', $categoryCode)->first()?->id,
                        'team_id' => $team->id,
                        'room_id' => $room->id,
                        'purchase_price' => $price,
                        'purchase_date' => fake()->dateTimeBetween('-2 years', '-1 month')->format('Y-m-d'),
                        'purchase_receipt' => 'RCPT-'.$code,
                        'description' => 'Aset awal unit '.$team->name.'.',
                        'condition' => $condition,
                        'usage_status' => $usage,
                        'assigned_user_id' => $usage === Asset::USAGE_IN_USE ? $owner->id : null,
                    ]
                );
            }
        }

        // Module grants write to the permission tables; drop the cached
        // snapshot so the freshly seeded abilities are picked up immediately.
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
