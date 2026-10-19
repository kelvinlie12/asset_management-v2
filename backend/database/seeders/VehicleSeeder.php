<?php

namespace Database\Seeders;

use App\Models\Room;
use App\Models\Team;
use App\Models\User;
use App\Models\VehicleAsset;
use App\Models\VehicleTax;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class VehicleSeeder extends Seeder
{
    /**
     * Owner account and room for each unit that operates a fleet, keyed by the
     * team slug.
     *
     * Vehicles are deliberately spread across units instead of all parked on
     * the first team, so unit scoping and the per-owner module grants are
     * visible on the vehicles page right after seeding.
     *
     * @var array<string, array{owner: string, room: string}>
     */
    private const UNIT_CONTACTS = [
        'unit-teknik' => [
            'owner' => 'owner.budi@example.com',
            'room' => 'Ruang Unit Teknik',
        ],
        'unit-operasional' => [
            'owner' => 'owner.siti@example.com',
            'room' => 'Ruang Unit Operasional',
        ],
        'unit-keuangan' => [
            'owner' => 'owner.andi@example.com',
            'room' => 'Ruang Unit Keuangan',
        ],
    ];

    /**
     * Seed demo vehicles and their tax history so the tax module,
     * status indicators, and reminders are immediately testable.
     */
    public function run(): void
    {
        $teams = Team::query()->pluck('id', 'slug');
        $owners = User::query()->pluck('id', 'email');

        $today = Carbon::today();

        // `unit` picks the owning team; tax buckets are spread so each unit
        // also gets its own mix of reminders.
        $vehicles = [
            [
                'unit' => 'unit-teknik',
                'plate_number' => 'B 1234 ABC',
                'asset_code' => 'VHC-001',
                'photo' => null,
                'brand' => 'Honda',
                'model' => 'Vario 160',
                'year' => '2023',
                'purchase_date' => $today->copy()->subYear(),
                'purchase_price' => 25000000,
                'last_tax_amount' => 1250000,
                'tax_due_date' => $today->copy()->addYear()->toDateString(),
                'tax_status' => VehicleAsset::TAX_PAID,
                'description' => 'Motor lapangan teknisi unit teknik.',
                'tax' => [
                    'tax_due_date' => $today->copy()->subMonths(11)->toDateString(),
                    'pkb' => 985000,
                    'swdkllj' => 35000,
                    'opsen_pkb' => 220000,
                    'administrative_fee' => 10000,
                    'penalty' => 0,
                    'other_fee' => 0,
                    'payment_status' => VehicleTax::PAYMENT_PAID,
                    'payment_date' => $today->copy()->subMonths(11)->addDays(3)->toDateString(),
                ],
            ],
            [
                'unit' => 'unit-teknik',
                'plate_number' => 'B 2345 KLM',
                'asset_code' => 'VHC-004',
                'photo' => null,
                'brand' => 'Honda',
                'model' => 'Beat CBS',
                'year' => '2023',
                'purchase_date' => $today->copy()->subMonths(8),
                'purchase_price' => 17500000,
                'last_tax_amount' => null,
                'tax_due_date' => $today->copy()->addDays(12)->toDateString(),
                'tax_status' => VehicleAsset::TAX_UNPAID,
                'description' => 'Motor kedua tim lapangan teknik.',
                'tax' => [
                    'tax_due_date' => $today->copy()->addDays(12)->toDateString(),
                    'pkb' => 430000,
                    'swdkllj' => 35000,
                    'opsen_pkb' => 120000,
                    'administrative_fee' => 10000,
                    'penalty' => 0,
                    'other_fee' => 0,
                    'payment_status' => VehicleTax::PAYMENT_UNPAID,
                    'payment_date' => null,
                ],
            ],
            [
                'unit' => 'unit-operasional',
                'plate_number' => 'D 5678 EFG',
                'asset_code' => 'VHC-002',
                'photo' => null,
                'brand' => 'Yamaha',
                'model' => 'NMAX 155',
                'year' => '2022',
                'purchase_date' => $today->copy()->subYears(2),
                'purchase_price' => 31000000,
                'last_tax_amount' => null,
                'tax_due_date' => $today->copy()->addDays(3)->toDateString(),
                'tax_status' => VehicleAsset::TAX_UNPAID,
                'description' => 'Motor pengantar tim unit operasional.',
                'tax' => [
                    'tax_due_date' => $today->copy()->addDays(3)->toDateString(),
                    'pkb' => 1150000,
                    'swdkllj' => 35000,
                    'opsen_pkb' => 250000,
                    'administrative_fee' => 15000,
                    'penalty' => 0,
                    'other_fee' => 0,
                    'payment_status' => VehicleTax::PAYMENT_UNPAID,
                    'payment_date' => null,
                ],
            ],
            [
                'unit' => 'unit-operasional',
                'plate_number' => 'F 3456 MNO',
                'asset_code' => 'VHC-005',
                'photo' => null,
                'brand' => 'Yamaha',
                'model' => 'Mio Gear 125',
                'year' => '2021',
                'purchase_date' => $today->copy()->subYears(3),
                'purchase_price' => 19500000,
                'last_tax_amount' => 640000,
                'tax_due_date' => $today->copy()->addMonths(6)->toDateString(),
                'tax_status' => VehicleAsset::TAX_PAID,
                'description' => 'Motor operasional harian.',
                'tax' => [
                    'tax_due_date' => $today->copy()->subMonths(6)->toDateString(),
                    'pkb' => 580000,
                    'swdkllj' => 35000,
                    'opsen_pkb' => 140000,
                    'administrative_fee' => 10000,
                    'penalty' => 0,
                    'other_fee' => 0,
                    'payment_status' => VehicleTax::PAYMENT_PAID,
                    'payment_date' => $today->copy()->subMonths(6)->addDays(2)->toDateString(),
                ],
            ],
            [
                'unit' => 'unit-operasional',
                'plate_number' => 'D 4567 PQR',
                'asset_code' => 'VHC-006',
                'photo' => null,
                'brand' => 'Suzuki',
                'model' => 'Shogun 125',
                'year' => '2022',
                'purchase_date' => $today->copy()->subMonths(14),
                'purchase_price' => 21500000,
                'last_tax_amount' => null,
                'tax_due_date' => $today->copy()->addDays(25)->toDateString(),
                'tax_status' => VehicleAsset::TAX_UNPAID,
                'description' => 'Motor cadangan armada operasional.',
                'tax' => [
                    'tax_due_date' => $today->copy()->addDays(25)->toDateString(),
                    'pkb' => 690000,
                    'swdkllj' => 35000,
                    'opsen_pkb' => 160000,
                    'administrative_fee' => 10000,
                    'penalty' => 0,
                    'other_fee' => 0,
                    'payment_status' => VehicleTax::PAYMENT_UNPAID,
                    'payment_date' => null,
                ],
            ],
            [
                'unit' => 'unit-keuangan',
                'plate_number' => 'F 9012 HIJ',
                'asset_code' => 'VHC-003',
                'photo' => null,
                'brand' => 'Suzuki',
                'model' => 'Satria F150',
                'year' => '2020',
                'purchase_date' => $today->copy()->subYears(3),
                'purchase_price' => 22500000,
                'last_tax_amount' => null,
                'tax_due_date' => $today->copy()->subDays(20)->toDateString(),
                'tax_status' => VehicleAsset::TAX_UNPAID,
                'description' => 'Pajak sudah melewati jatuh tempo.',
                'tax' => [
                    'tax_due_date' => $today->copy()->subDays(20)->toDateString(),
                    'pkb' => 890000,
                    'swdkllj' => 40000,
                    'opsen_pkb' => 190000,
                    'administrative_fee' => 10000,
                    'penalty' => 25000,
                    'other_fee' => 5000,
                    'payment_status' => VehicleTax::PAYMENT_UNPAID,
                    'payment_date' => null,
                ],
            ],
            [
                'unit' => 'unit-keuangan',
                'plate_number' => 'B 5678 STU',
                'asset_code' => 'VHC-007',
                'photo' => null,
                'brand' => 'Honda',
                'model' => 'Vario 160',
                'year' => '2024',
                'purchase_date' => $today->copy()->subMonths(4),
                'purchase_price' => 27500000,
                'last_tax_amount' => 1250000,
                'tax_due_date' => $today->copy()->addMonths(8)->toDateString(),
                'tax_status' => VehicleAsset::TAX_PAID,
                'description' => 'Motor pengantar berkas keuangan.',
                'tax' => [
                    'tax_due_date' => $today->copy()->subMonths(4)->toDateString(),
                    'pkb' => 985000,
                    'swdkllj' => 35000,
                    'opsen_pkb' => 220000,
                    'administrative_fee' => 10000,
                    'penalty' => 0,
                    'other_fee' => 0,
                    'payment_status' => VehicleTax::PAYMENT_PAID,
                    'payment_date' => $today->copy()->subMonths(4)->addDays(4)->toDateString(),
                ],
            ],
        ];

        foreach ($vehicles as $data) {
            $slug = $data['unit'];
            unset($data['unit']);

            $teamId = $teams[$slug] ?? null;
            $contact = self::UNIT_CONTACTS[$slug] ?? null;

            if (! $teamId || ! $contact) {
                continue;
            }

            $tax = $data['tax'];
            unset($data['tax']);

            $data['team_id'] = $teamId;
            // The room has to belong to the same unit, otherwise the vehicle
            // would point at another company's room.
            $data['room_id'] = Room::query()
                ->where('name', $contact['room'])
                ->where('team_id', $teamId)
                ->value('id');
            $data['assigned_user_id'] = $owners[$contact['owner']] ?? null;
            $data['purchase_date'] = $data['purchase_date']->toDateString();
            $data['condition'] = VehicleAsset::CONDITION_GOOD;
            $data['usage_status'] = VehicleAsset::USAGE_IN_USE;

            $vehicle = VehicleAsset::query()->updateOrCreate(
                ['plate_number' => $data['plate_number']],
                $data,
            );

            $total = (float) $tax['pkb']
                + (float) $tax['swdkllj']
                + (float) $tax['opsen_pkb']
                + (float) $tax['administrative_fee']
                + (float) $tax['penalty']
                + (float) $tax['other_fee'];

            $vehicle->taxes()->updateOrCreate(
                ['tax_due_date' => $tax['tax_due_date']],
                array_merge($tax, ['total_tax' => round($total, 2)]),
            );
        }
    }
}