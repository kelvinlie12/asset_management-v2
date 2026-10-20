<?php

namespace Database\Seeders;

use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\AssetDamage;
use App\Models\AssetTransfer;
use App\Models\Category;
use App\Models\NetworkNode;
use App\Models\Purchase;
use App\Models\Room;
use App\Models\Team;
use App\Models\VehicleAsset;
use App\Models\VehicleTax;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;

/**
 * Bulk dummy data for the existing modules.
 *
 * The other seeders ship a small, curated demo dataset. This seeder floods the
 * same modules with a larger, Faker-driven volume so pagination, filtering,
 * sorting, the dashboard, and the unit scoping can all be exercised: assets,
 * purchases, placements, transfers, damage reports, vehicles (+ tax history),
 * and FTTH network nodes.
 *
 * It is meant to be run after the base seeders because it reuses the units,
 * rooms, and categories they create. It is idempotent: everything it owns is
 * prefixed (`AST-DMY-`, `VHC-DMY-`, `PCH-DMY-`), so re-running it first clears
 * its own previous rows and then rebuilds them instead of duplicating.
 */
class BulkDummySeeder extends Seeder
{
    /** Assets generated for every unit with a room. */
    private const ASSETS_PER_TEAM = 12;

    /** Motorcycles generated for every unit. */
    private const VEHICLES_PER_TEAM = 3;

    /** Purchase history rows generated for every unit. */
    private const PURCHASES_PER_TEAM = 6;

    /** FTTH sites generated for every unit that owns a site room. */
    private const NETWORK_SITES_PER_TEAM = 2;

    private const NETWORK_ODP_PER_SITE = 2;

    private const NETWORK_ONT_PER_ODP = 2;

    /**
     * Base asset names; a model suffix is appended to keep them distinct.
     *
     * @var list<string>
     */
    private const ASSET_NAMES = [
        'Laptop', 'Desktop PC', 'Monitor LED', 'Proyektor', 'Printer Laser',
        'Scanner Dokumen', 'Router', 'Switch 24 Port', 'Access Point', 'UPS 1000VA',
        'Kursi Office', 'Meja Kerja', 'Lemari Arsip', 'AC Split', 'Kamera CCTV',
        'Handheld Radio', 'Genset Portable', 'Fingerprint Reader', 'Barcode Scanner',
        'Mesin Absensi', 'Whiteboard', 'Filing Cabinet', 'Telepon IP', 'Server Rack',
        'NAS Storage', 'Firewall Appliance', 'Kabel Roll Cat6', 'Tangga Aluminium',
        'Alat Ukur Digital', 'Bor Listrik', 'Mesin Fotokopi', 'Panel Listrik',
        'Pompa Air', 'Trolley Barang', 'Sound System', 'Mic Conference',
    ];

    /**
     * Motorcycle catalog keyed by brand.
     *
     * @var array<string, list<string>>
     */
    private const VEHICLE_CATALOG = [
        'Honda' => ['Vario 160', 'Beat CBS', 'PCX 160', 'Supra X 125', 'ADV 160'],
        'Yamaha' => ['NMAX 155', 'Aerox 155', 'Mio Gear', 'Fazzio', 'Jupiter MX'],
        'Suzuki' => ['Satria F150', 'Nex II', 'Address', 'V-Strom 250'],
        'Kawasaki' => ['Ninja 250', 'KLX 150', 'W175'],
    ];

    /** @var list<string> */
    private const PLATE_REGIONS = ['B', 'D', 'F', 'L', 'N', 'AB', 'BE', 'BK'];

    /** @var list<string> */
    private const PLATE_SUFFIXES = ['ABC', 'XYZ', 'KLM', 'MNO', 'PQR', 'STU', 'VWX', 'YZA'];

    public function run(): void
    {
        $teams = Team::query()->orderBy('id')->get();

        if ($teams->isEmpty()) {
            $this->command?->warn('BulkDummySeeder: no units found, run the base seeders first.');

            return;
        }

        $globalCategories = Category::query()->whereNull('team_id')->get();

        $this->clearPreviousDummyRows();

        foreach ($teams as $team) {
            $categories = $this->ensureCategories($team, $globalCategories);
            $rooms = $this->ensureRooms($team);

            $assets = $this->seedAssets($team, $categories, $rooms);

            $this->seedPurchases($team, $assets);
            $this->seedAssignments($team, $assets);
            $this->seedDamages($team, $assets);
            $this->seedVehicles($team, $rooms);
            $this->seedNetworkNodes($team, $categories, $rooms);
        }

        $this->seedTransfers($teams);
    }

    /**
     * Remove the rows this seeder generated on a previous run so re-running it
     * never duplicates data.
     */
    private function clearPreviousDummyRows(): void
    {
        $assetIds = Asset::query()->where('asset_code', 'like', 'AST-DMY-%')->pluck('id');

        if ($assetIds->isNotEmpty()) {
            AssetAssignment::query()->whereIn('asset_id', $assetIds)->delete();
            AssetDamage::query()->whereIn('asset_id', $assetIds)->delete();
            AssetTransfer::query()->whereIn('asset_id', $assetIds)->delete();
            NetworkNode::query()->whereIn('asset_id', $assetIds)->delete();
        }

        Purchase::query()->where('purchase_number', 'like', 'PCH-DMY-%')->delete();

        $vehicleIds = VehicleAsset::query()->where('asset_code', 'like', 'VHC-DMY-%')->pluck('id');
        if ($vehicleIds->isNotEmpty()) {
            VehicleTax::query()->whereIn('vehicle_id', $vehicleIds)->delete();
            VehicleAsset::query()->whereIn('id', $vehicleIds)->delete();
        }
    }

    /**
     * Give a unit the standard category list when it does not own one yet.
     *
     * @param  Collection<int, Category>  $globalCategories
     * @return Collection<int, Category>
     */
    private function ensureCategories(Team $team, Collection $globalCategories): Collection
    {
        $owned = Category::query()->where('team_id', $team->id)->get();

        if ($owned->isNotEmpty() || $globalCategories->isEmpty()) {
            return $owned;
        }

        foreach ($globalCategories as $global) {
            Category::query()->firstOrCreate(
                ['team_id' => $team->id, 'code' => $global->code],
                [
                    'name' => $global->name,
                    'description' => $global->description,
                    'status' => $global->status,
                ],
            );
        }

        return Category::query()->where('team_id', $team->id)->get();
    }

    /**
     * Make sure every unit owns at least one work room and one storage room so
     * its assets have a home.
     *
     * @return Collection<int, Room>
     */
    private function ensureRooms(Team $team): Collection
    {
        $rooms = Room::query()->where('team_id', $team->id)->get();

        if ($rooms->where('is_storage', false)->isEmpty()) {
            Room::query()->firstOrCreate(
                ['name' => 'Ruang Kerja '.$team->name, 'team_id' => $team->id],
                [
                    'location' => 'Lantai 1',
                    'description' => 'Ruang kerja unit '.$team->name.'.',
                    'status' => Room::STATUS_ACTIVE,
                    'is_storage' => false,
                ],
            );
        }

        if ($rooms->where('is_storage', true)->isEmpty()) {
            Room::query()->firstOrCreate(
                ['name' => 'Gudang '.$team->name, 'team_id' => $team->id],
                [
                    'location' => 'Lantai 1',
                    'description' => 'Gudang unit '.$team->name.'.',
                    'status' => Room::STATUS_ACTIVE,
                    'is_storage' => true,
                ],
            );
        }

        return Room::query()->where('team_id', $team->id)->get();
    }

    /**
     * @param  Collection<int, Category>  $categories
     * @param  Collection<int, Room>  $rooms
     * @return Collection<int, Asset>
     */
    private function seedAssets(Team $team, Collection $categories, Collection $rooms): Collection
    {
        $storageRooms = $rooms->where('is_storage', true)->values();
        $workRooms = $rooms->where('is_storage', false)->values();
        $members = $team->users()->pluck('id');
        $assets = collect();

        for ($i = 1; $i <= self::ASSETS_PER_TEAM; $i++) {
            $inUse = fake()->boolean(60);
            $damaged = fake()->boolean(15);

            $room = $inUse
                ? ($workRooms->isNotEmpty() ? $workRooms->random() : $rooms->random())
                : ($storageRooms->isNotEmpty() ? $storageRooms->random() : $rooms->random());

            $purchaseDate = fake()->dateTimeBetween('-3 years', '-2 months');

            $assets->push(Asset::query()->updateOrCreate(
                ['asset_code' => sprintf('AST-DMY-%d-%03d', $team->id, $i)],
                [
                    'name' => ucfirst(fake()->randomElement(self::ASSET_NAMES)).' '.strtoupper(fake()->bothify('?#-###')),
                    'category_id' => $categories->isNotEmpty() ? $categories->random()->id : null,
                    'team_id' => $team->id,
                    'room_id' => $room->id,
                    'purchase_price' => fake()->randomFloat(2, 750000, 45000000),
                    'purchase_date' => $purchaseDate->format('Y-m-d'),
                    'placement_date' => $inUse ? fake()->dateTimeBetween($purchaseDate, 'now')->format('Y-m-d') : null,
                    'purchase_receipt' => sprintf('RCPT-DMY-%d-%03d', $team->id, $i),
                    'description' => 'Data dummy pengujian modul aset.',
                    'condition' => $damaged ? Asset::CONDITION_DAMAGED : Asset::CONDITION_GOOD,
                    'usage_status' => $inUse ? Asset::USAGE_IN_USE : Asset::USAGE_IN_STORAGE,
                    'assigned_user_id' => $inUse && $members->isNotEmpty() ? $members->random() : null,
                ],
            ));
        }

        return $assets;
    }

    /**
     * @param  Collection<int, Asset>  $assets
     */
    private function seedPurchases(Team $team, Collection $assets): void
    {
        $assets->take(self::PURCHASES_PER_TEAM)->values()->each(function (Asset $asset, int $index) use ($team) {
            Purchase::query()->create([
                'purchase_number' => sprintf('PCH-DMY-%d-%02d', $team->id, $index + 1),
                'supplier' => fake()->company(),
                'invoice_number' => strtoupper(fake()->bothify('INV-####/??')),
                'purchase_date' => $asset->purchase_date?->format('Y-m-d')
                    ?? fake()->dateTimeBetween('-3 years', '-1 month')->format('Y-m-d'),
                'amount' => $asset->purchase_price,
                'proof_path' => 'uploads/purchases/demo-proof.png',
                'notes' => 'Pembelian dummy untuk pengujian modul pembelian.',
                'asset_id' => $asset->id,
            ]);
        });
    }

    /**
     * @param  Collection<int, Asset>  $assets
     */
    private function seedAssignments(Team $team, Collection $assets): void
    {
        foreach ($assets as $asset) {
            if (! $asset->room_id && ! $asset->assigned_user_id) {
                continue;
            }

            $date = $asset->purchase_date
                ? $asset->purchase_date->copy()->addDays(fake()->numberBetween(3, 40))
                : Carbon::now()->subMonths(fake()->numberBetween(1, 24));

            AssetAssignment::query()->create([
                'asset_id' => $asset->id,
                'team_id' => $team->id,
                'room_id' => $asset->room_id,
                'assigned_user_id' => $asset->assigned_user_id,
                'assigned_date' => $date->format('Y-m-d'),
                'notes' => 'Riwayat penempatan dummy.',
            ]);
        }
    }

    /**
     * @param  Collection<int, Asset>  $assets
     */
    private function seedDamages(Team $team, Collection $assets): void
    {
        $members = $team->users()->pluck('id');

        foreach ($assets->where('condition', Asset::CONDITION_DAMAGED) as $asset) {
            AssetDamage::query()->create([
                'asset_id' => $asset->id,
                'room_id' => $asset->room_id,
                'damage_date' => fake()->dateTimeBetween('-18 months', 'now')->format('Y-m-d'),
                'user_id' => $asset->assigned_user_id ?? ($members->isNotEmpty() ? $members->random() : null),
                'responsible_id' => $members->isNotEmpty() ? $members->random() : null,
                'description' => 'Kerusakan dummy: '.fake()->sentence(6),
                'notes' => 'Laporan kerusakan dummy untuk pengujian.',
                'performed_by_id' => $members->isNotEmpty() ? $members->random() : null,
            ]);
        }
    }

    /**
     * @param  Collection<int, Room>  $rooms
     */
    private function seedVehicles(Team $team, Collection $rooms): void
    {
        $members = $team->users()->pluck('id');
        $brands = array_keys(self::VEHICLE_CATALOG);

        for ($i = 1; $i <= self::VEHICLES_PER_TEAM; $i++) {
            $brand = fake()->randomElement($brands);
            $model = fake()->randomElement(self::VEHICLE_CATALOG[$brand]);
            $purchaseDate = fake()->dateTimeBetween('-5 years', '-2 months');
            $dueDate = Carbon::instance(fake()->dateTimeBetween('-1 month', '+1 year'));

            $unpaid = $dueDate->isPast() || fake()->boolean(45);

            $vehicle = VehicleAsset::query()->create([
                'asset_code' => sprintf('VHC-DMY-%d-%03d', $team->id, $i),
                'photo' => null,
                'brand' => $brand,
                'model' => $model,
                'year' => (string) fake()->numberBetween(2018, 2025),
                'plate_number' => sprintf(
                    '%s %d %s',
                    fake()->randomElement(self::PLATE_REGIONS),
                    1000 + ($team->id * 100) + $i,
                    fake()->randomElement(self::PLATE_SUFFIXES),
                ),
                'engine_number' => sprintf('ENG%d%04d', $team->id, $i),
                'chassis_number' => sprintf('CHS%d%04d', $team->id, $i),
                'purchase_date' => $purchaseDate->format('Y-m-d'),
                'purchase_price' => fake()->randomFloat(2, 15000000, 35000000),
                'last_tax_amount' => $unpaid ? null : fake()->randomFloat(2, 400000, 1500000),
                'tax_due_date' => $dueDate->format('Y-m-d'),
                'tax_status' => $unpaid ? VehicleAsset::TAX_UNPAID : VehicleAsset::TAX_PAID,
                'description' => 'Kendaraan dummy untuk pengujian modul kendaraan.',
                'condition' => fake()->boolean(80) ? VehicleAsset::CONDITION_GOOD : VehicleAsset::CONDITION_DAMAGED,
                'usage_status' => fake()->boolean(70) ? VehicleAsset::USAGE_IN_USE : VehicleAsset::USAGE_IN_STORAGE,
                'team_id' => $team->id,
                'room_id' => $rooms->isNotEmpty() ? $rooms->random()->id : null,
                'assigned_user_id' => $members->isNotEmpty() ? $members->random() : null,
                'placement_date' => $purchaseDate->format('Y-m-d'),
            ]);

            // A paid record from a year ago, then the current obligation.
            $this->createTax($vehicle, $dueDate->copy()->subYear()->format('Y-m-d'), VehicleTax::PAYMENT_PAID);
            $this->createTax($vehicle, $dueDate->format('Y-m-d'), $unpaid ? VehicleTax::PAYMENT_UNPAID : VehicleTax::PAYMENT_PAID);
        }
    }

    private function createTax(VehicleAsset $vehicle, string $dueDate, string $status): VehicleTax
    {
        $pkb = fake()->randomFloat(2, 300000, 1500000);
        $swdkllj = 35000;
        $opsen = round($pkb * 0.2, 2);
        $admin = fake()->randomElement([10000, 15000, 20000]);
        $penalty = $status === VehicleTax::PAYMENT_PAID ? 0 : fake()->randomElement([0, 0, 25000, 50000]);
        $other = 0;

        return VehicleTax::query()->create([
            'vehicle_id' => $vehicle->id,
            'tax_due_date' => $dueDate,
            'pkb' => $pkb,
            'swdkllj' => $swdkllj,
            'opsen_pkb' => $opsen,
            'administrative_fee' => $admin,
            'penalty' => $penalty,
            'other_fee' => $other,
            'total_tax' => round($pkb + $swdkllj + $opsen + $admin + $penalty + $other, 2),
            'payment_date' => $status === VehicleTax::PAYMENT_PAID
                ? Carbon::parse($dueDate)->subDays(fake()->numberBetween(1, 10))->format('Y-m-d')
                : null,
            'payment_status' => $status,
            'notes' => 'Riwayat pajak dummy.',
        ]);
    }

    /**
     * Build a small FTTH topology per unit: OLT -> ODC -> (ODP -> ONT) per site.
     *
     * @param  Collection<int, Category>  $categories
     * @param  Collection<int, Room>  $rooms
     */
    private function seedNetworkNodes(Team $team, Collection $categories, Collection $rooms): void
    {
        $sites = $rooms->where('is_storage', false)->values();

        if ($sites->isEmpty()) {
            return;
        }

        $networkCategory = $categories->firstWhere('code', 'CAT-IT')
            ?? ($categories->isNotEmpty() ? $categories->first() : null);

        $createAsset = function (string $code, string $name, Room $site) use ($team, $networkCategory): Asset {
            return Asset::query()->updateOrCreate(
                ['asset_code' => $code],
                [
                    'name' => $name,
                    'category_id' => $networkCategory?->id,
                    'team_id' => $team->id,
                    'room_id' => $site->id,
                    'purchase_price' => fake()->randomFloat(2, 900000, 30000000),
                    'purchase_date' => fake()->dateTimeBetween('-4 years', '-1 month')->format('Y-m-d'),
                    'purchase_receipt' => 'RCPT-'.$code,
                    'description' => 'Perangkat jaringan dummy untuk pengujian.',
                    'condition' => Asset::CONDITION_GOOD,
                    'usage_status' => Asset::USAGE_IN_STORAGE,
                ],
            );
        };

        $install = function (Asset $asset, Room $site, array $attributes, ?NetworkNode $parent = null): NetworkNode {
            $attributes['asset_id'] = $asset->id;
            $attributes['room_id'] = $site->id;
            $attributes['parent_id'] = $parent?->id;

            $node = NetworkNode::query()->updateOrCreate(['asset_id' => $asset->id], $attributes);

            $asset->update([
                'usage_status' => Asset::USAGE_IN_USE,
                'room_id' => $site->id,
            ]);

            return $node;
        };

        for ($s = 1; $s <= self::NETWORK_SITES_PER_TEAM; $s++) {
            $site = $sites[($s - 1) % $sites->count()];
            $prefix = sprintf('AST-DMY-NET-%d-%d', $team->id, $s);

            $olt = $install(
                $createAsset($prefix.'-OLT', 'OLT '.$site->name, $site),
                $site,
                [
                    'node_type' => NetworkNode::TYPE_OLT,
                    'label' => 'OLT '.$site->name,
                    'pon_port' => 'PON 0/'.$s,
                    'splitter_ratio' => '1:8',
                    'port_capacity' => 8,
                    'port_used' => fake()->numberBetween(3, 8),
                    'customer_count' => fake()->numberBetween(10, 64),
                    'area' => $site->name,
                    'status' => NetworkNode::STATUS_ACTIVE,
                ],
            );

            $odc = $install(
                $createAsset($prefix.'-ODC', 'ODC '.$site->name, $site),
                $site,
                [
                    'node_type' => NetworkNode::TYPE_ODC,
                    'label' => 'ODC '.$site->name,
                    'pon_port' => 'PON 0/'.$s,
                    'splitter_ratio' => '1:4',
                    'port_capacity' => 4,
                    'port_used' => fake()->numberBetween(1, 4),
                    'customer_count' => fake()->numberBetween(8, 32),
                    'area' => $site->name,
                    'status' => NetworkNode::STATUS_ACTIVE,
                ],
                $olt,
            );

            for ($o = 1; $o <= self::NETWORK_ODP_PER_SITE; $o++) {
                $odp = $install(
                    $createAsset($prefix.'-ODP'.$o, 'ODP '.$site->name.' #'.$o, $site),
                    $site,
                    [
                        'node_type' => NetworkNode::TYPE_ODP,
                        'label' => 'ODP '.$site->name.' #'.$o,
                        'pon_port' => 'PON 0',
                        'splitter_ratio' => '1:8',
                        'port_capacity' => 8,
                        'port_used' => fake()->numberBetween(1, 8),
                        'customer_count' => fake()->numberBetween(1, 8),
                        'area' => 'Blok '.chr(64 + $o),
                        'status' => fake()->boolean(85) ? NetworkNode::STATUS_ACTIVE : NetworkNode::STATUS_MAINTENANCE,
                    ],
                    $odc,
                );

                for ($n = 1; $n <= self::NETWORK_ONT_PER_ODP; $n++) {
                    $customer = fake()->name();

                    $install(
                        $createAsset($prefix.'-ONT'.$o.$n, 'ONT '.$customer, $site),
                        $site,
                        [
                            'node_type' => NetworkNode::TYPE_ONT,
                            'label' => 'ONT '.$customer,
                            'pon_port' => 'PON 0',
                            'port_capacity' => 1,
                            'port_used' => 1,
                            'customer_count' => 1,
                            'rx_power_dbm' => fake()->randomFloat(2, -27, -16),
                            'area' => 'Blok '.chr(64 + $o),
                            'status' => NetworkNode::STATUS_ACTIVE,
                            'notes' => 'Pelanggan: '.$customer.'.',
                        ],
                        $odp,
                    );
                }
            }
        }
    }

    /**
     * Move a few dummy assets between units to populate the transfer history.
     *
     * @param  Collection<int, Team>  $teams
     */
    private function seedTransfers(Collection $teams): void
    {
        if ($teams->count() < 2) {
            return;
        }

        $assets = Asset::query()
            ->where('asset_code', 'like', 'AST-DMY-%')
            ->where('asset_code', 'not like', 'AST-DMY-NET-%')
            ->inRandomOrder()
            ->take($teams->count() * 2)
            ->get();

        foreach ($assets as $asset) {
            $fromTeam = $teams->firstWhere('id', $asset->team_id) ?? $teams->first();
            $toTeam = $teams->where('id', '!=', $fromTeam->id)->random();
            $members = $fromTeam->users()->pluck('id');

            AssetTransfer::query()->create([
                'asset_id' => $asset->id,
                'transfer_date' => fake()->dateTimeBetween('-12 months', 'now')->format('Y-m-d'),
                'from_team_id' => $fromTeam->id,
                'to_team_id' => $toTeam->id,
                'from_room_id' => $asset->room_id,
                'to_room_id' => Room::query()->where('team_id', $toTeam->id)->value('id'),
                'from_user_id' => $asset->assigned_user_id,
                'to_user_id' => $toTeam->users()->value('id'),
                'reason' => 'Mutasi dummy antar unit untuk pengujian.',
                'performed_by_id' => $members->isNotEmpty() ? $members->random() : null,
            ]);
        }
    }
}
