<?php

namespace Database\Seeders;

use App\Models\Asset;
use App\Models\NetworkNode;
use App\Models\Room;
use App\Models\Team;
use Illuminate\Database\Seeder;

class NetworkNodeSeeder extends Seeder
{
    /**
     * Seed FTTH sites, network assets, and their node topology.
     *
     * Roughly mirrors what POST /network-nodes does: assets start in the
     * warehouse (GOOD/IN_STORAGE) and installing them as a node moves the
     * asset to the site and marks it IN_USE.
     */
    public function run(): void
    {
        // FTTH nodes are the engineering unit's work, so the sites and the
        // network gear belong to that unit. Without a unit the seeded nodes
        // would be invisible to every scoped user.
        $teamId = Team::query()->where('slug', 'unit-teknik')->value('id');

        $warehouse = Room::query()->where('is_storage', true)->where('team_id', $teamId)->orderBy('id')->first()
            ?? Room::query()->create([
                'name' => 'Gudang',
                'location' => 'Gudang Lantai 1',
                'description' => 'Gudang / storage untuk penyimpanan barang.',
                'status' => 'active',
                'is_storage' => true,
                'team_id' => $teamId,
            ]);

        $sites = [];
        foreach ($this->siteDefinitions() as $site) {
            $sites[$site['name']] = Room::query()->updateOrCreate(
                ['name' => $site['name'], 'team_id' => $teamId],
                $site,
            );
        }

        $createAsset = function (string $code, string $name, string $category = 'CAT-IT') use ($warehouse, $teamId): Asset {
            return Asset::query()->updateOrCreate(
                ['asset_code' => $code],
                [
                    'name' => $name,
                    'team_id' => $teamId,
                    'room_id' => $warehouse->id,
                    'description' => 'Perangkat jaringan FTTH.',
                    'purchase_price' => fake()->randomFloat(2, 800000, 25000000),
                    'purchase_date' => fake()->dateTimeBetween('-3 years', '-1 month')->format('Y-m-d'),
                    'purchase_receipt' => 'RCPT-NET-'.$code,
                    'category_id' => \App\Models\Category::query()->where('code', $category)->first()?->id,
                    'condition' => Asset::CONDITION_GOOD,
                    'usage_status' => Asset::USAGE_IN_STORAGE,
                ],
            );
        };

        $install = function (Asset $asset, Room $site, array $node, ?NetworkNode $parent = null): NetworkNode {
            $node['asset_id'] = $asset->id;
            $node['room_id'] = $site->id;
            $node['parent_id'] = $parent?->id;

            $model = NetworkNode::query()->updateOrCreate(
                ['asset_id' => $asset->id],
                $node,
            );

            $model->asset()->update([
                'usage_status' => Asset::USAGE_IN_USE,
                'room_id' => $site->id,
            ]);

            return $model;
        };

        // ---- Site Tower A ----
        $siteA = $sites['Site Tower A'];
        $oltA = $install($createAsset('AST-NET-001', 'OLT Huawei MA5608T'), $siteA, [
            'node_type' => NetworkNode::TYPE_OLT,
            'label' => 'OLT Site A',
            'pon_port' => 'PON 0/1/2',
            'splitter_ratio' => '1:8',
            'port_capacity' => 8,
            'port_used' => 8,
            'customer_count' => 48,
            'area' => 'Kel. Sukamaju',
            'status' => NetworkNode::STATUS_ACTIVE,
        ]);

        $odcA = $install($createAsset('AST-NET-002', 'ODC Outdoor Cabinet 288 Core'), $siteA, [
            'node_type' => NetworkNode::TYPE_ODC,
            'label' => 'ODC Site A',
            'pon_port' => 'PON 0',
            'splitter_ratio' => '1:4',
            'port_capacity' => 4,
            'port_used' => 4,
            'customer_count' => 32,
            'area' => 'Kel. Sukamaju',
            'status' => NetworkNode::STATUS_ACTIVE,
            'notes' => 'Pelanggan di sekitar RT 01 - RT 04.',
        ], $oltA);

        $odpA1 = $install($createAsset('AST-NET-003', 'ODP Outdoor 8 Port'), $siteA, [
            'node_type' => NetworkNode::TYPE_ODP,
            'label' => 'ODP Sukamaju - RT 01',
            'pon_port' => 'PON 0',
            'splitter_ratio' => '1:8',
            'port_capacity' => 8,
            'port_used' => 8,
            'customer_count' => 8,
            'area' => 'RT 01',
            'status' => NetworkNode::STATUS_ACTIVE,
        ], $odcA);

        $odpA2 = $install($createAsset('AST-NET-004', 'ODP Outdoor 8 Port'), $siteA, [
            'node_type' => NetworkNode::TYPE_ODP,
            'label' => 'ODP Sukamaju - RT 02',
            'pon_port' => 'PON 0',
            'splitter_ratio' => '1:8',
            'port_capacity' => 8,
            'port_used' => 8,
            'customer_count' => 8,
            'area' => 'RT 02',
            'status' => NetworkNode::STATUS_ACTIVE,
        ], $odcA);

        $odpA3 = $install($createAsset('AST-NET-005', 'ODP Outdoor 8 Port'), $siteA, [
            'node_type' => NetworkNode::TYPE_ODP,
            'label' => 'ODP Sukamaju - RT 03',
            'pon_port' => 'PON 0',
            'splitter_ratio' => '1:8',
            'port_capacity' => 8,
            'port_used' => 6,
            'customer_count' => 6,
            'area' => 'RT 03',
            'status' => NetworkNode::STATUS_ACTIVE,
        ], $odcA);

        $odpA4 = $install($createAsset('AST-NET-006', 'ODP Outdoor 8 Port'), $siteA, [
            'node_type' => NetworkNode::TYPE_ODP,
            'label' => 'ODP Sukamaju - RT 04',
            'pon_port' => 'PON 0',
            'splitter_ratio' => '1:8',
            'port_capacity' => 8,
            'port_used' => 6,
            'customer_count' => 6,
            'area' => 'RT 04',
            'status' => NetworkNode::STATUS_MAINTENANCE,
            'notes' => 'Gangguan link, sedang dalam penanganan.',
        ], $odcA);

        // ---- Site Tower B ----
        $siteB = $sites['Site Tower B'];
        $oltB = $install($createAsset('AST-NET-007', 'OLT ZTE C320'), $siteB, [
            'node_type' => NetworkNode::TYPE_OLT,
            'label' => 'OLT Site B',
            'pon_port' => 'PON 0/1',
            'splitter_ratio' => '1:4',
            'port_capacity' => 4,
            'port_used' => 4,
            'customer_count' => 22,
            'area' => 'Kel. Harapan Baru',
            'status' => NetworkNode::STATUS_ACTIVE,
        ]);

        $odcB = $install($createAsset('AST-NET-008', 'ODC Outdoor Cabinet 144 Core'), $siteB, [
            'node_type' => NetworkNode::TYPE_ODC,
            'label' => 'ODC Site B',
            'pon_port' => 'PON 1',
            'splitter_ratio' => '1:4',
            'port_capacity' => 4,
            'port_used' => 3,
            'customer_count' => 18,
            'area' => 'Kel. Harapan Baru',
            'status' => NetworkNode::STATUS_ACTIVE,
        ], $oltB);

        $odpB1 = $install($createAsset('AST-NET-009', 'ODP Outdoor 8 Port'), $siteB, [
            'node_type' => NetworkNode::TYPE_ODP,
            'label' => 'ODP Harapan Baru - Blok A',
            'pon_port' => 'PON 1',
            'splitter_ratio' => '1:8',
            'port_capacity' => 8,
            'port_used' => 8,
            'customer_count' => 8,
            'area' => 'Blok A',
            'status' => NetworkNode::STATUS_ACTIVE,
        ], $odcB);

        $odpB2 = $install($createAsset('AST-NET-010', 'ODP Outdoor 8 Port'), $siteB, [
            'node_type' => NetworkNode::TYPE_ODP,
            'label' => 'ODP Harapan Baru - Blok B',
            'pon_port' => 'PON 1',
            'splitter_ratio' => '1:8',
            'port_capacity' => 8,
            'port_used' => 5,
            'customer_count' => 5,
            'area' => 'Blok B',
            'status' => NetworkNode::STATUS_ACTIVE,
        ], $odcB);

        $odpB3 = $install($createAsset('AST-NET-011', 'ODP Outdoor 8 Port'), $siteB, [
            'node_type' => NetworkNode::TYPE_ODP,
            'label' => 'ODP Harapan Baru - Blok C',
            'pon_port' => 'PON 1',
            'splitter_ratio' => '1:8',
            'port_capacity' => 8,
            'port_used' => 5,
            'customer_count' => 5,
            'area' => 'Blok C',
            'status' => NetworkNode::STATUS_INACTIVE,
            'notes' => 'Belum ada pelanggan aktif.',
        ], $odcB);

        // Some customer (ONT) nodes under ODP A-1.
        $ontLabels = ['Ahmad Basuki', 'Siti Rahayu', 'Budi Santoso', 'Dewi Lestari'];
        $ontRxp = [-18.2, -21.5, -23.1, -19.8];
        foreach ($ontLabels as $i => $customerName) {
            $install($createAsset('AST-NET-01'.($i + 2), "ONT FiberHome AN5506-04"), $siteA, [
                'node_type' => NetworkNode::TYPE_ONT,
                'label' => "ONT $customerName",
                'pon_port' => 'PON 0',
                'port_capacity' => 1,
                'port_used' => 1,
                'customer_count' => 1,
                'rx_power_dbm' => $ontRxp[$i],
                'area' => 'RT 01 / RT 02',
                'status' => NetworkNode::STATUS_ACTIVE,
                'notes' => "Pelanggan: $customerName.",
            ], $odpA1);
        }

        // One spare router at Site B for flavor.
        $install($createAsset('AST-NET-016', 'Router MikroTik CCR1036'), $siteB, [
            'node_type' => NetworkNode::TYPE_ROUTER,
            'label' => 'Router Core Site B',
            'pon_port' => null,
            'splitter_ratio' => null,
            'port_capacity' => 36,
            'port_used' => 12,
            'customer_count' => 0,
            'area' => 'Kel. Harapan Baru',
            'status' => NetworkNode::STATUS_ACTIVE,
        ], $oltB);

        // Keep one eligible spare asset in the warehouse (not installed).
        Asset::query()->updateOrCreate(
            ['asset_code' => 'AST-NET-017'],
            [
                'name' => 'ODP Outdoor 8 Port (Cadangan)',
                'team_id' => $teamId,
                'room_id' => $warehouse->id,
                'description' => 'ODP cadangan siap dipasang.',
                'purchase_price' => 2500000,
                'purchase_date' => now()->subMonths(2)->format('Y-m-d'),
                'purchase_receipt' => 'RCPT-NET-AST-NET-017',
                'category_id' => \App\Models\Category::query()->where('code', 'CAT-IT')->first()?->id,
                'condition' => Asset::CONDITION_GOOD,
                'usage_status' => Asset::USAGE_IN_STORAGE,
            ],
        );
    }

    /**
     * @return array<int, array{name: string, location: string, description: string, status: string, is_storage: bool}>
     */
    private function siteDefinitions(): array
    {
        return [
            [
                'name' => 'Site Tower A',
                'location' => 'Jl. Raya Sukamaju No. 10',
                'description' => 'Site FTTH menara A.',
                'status' => 'active',
                'is_storage' => false,
            ],
            [
                'name' => 'Site Tower B',
                'location' => 'Jl. Harapan Baru No. 22',
                'description' => 'Site FTTH menara B.',
                'status' => 'active',
                'is_storage' => false,
            ],
            [
                'name' => 'Site Tower C',
                'location' => 'Jl. Pemuda No. 5',
                'description' => 'Site FTTH menara C (baru).',
                'status' => 'inactive',
                'is_storage' => false,
            ],
        ];
    }
}