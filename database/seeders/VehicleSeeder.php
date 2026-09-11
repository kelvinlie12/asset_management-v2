<?php

namespace Database\Seeders;

use App\Models\Room;
use App\Models\Supplier;
use App\Models\Team;
use App\Models\User;
use App\Models\VehicleAsset;
use App\Models\VehicleTax;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class VehicleSeeder extends Seeder
{
    /**
     * Seed demo vehicles and their tax history so the tax module,
     * status indicators, and reminders are immediately testable.
     */
    public function run(): void
    {
        $team = Team::query()->first();
        $room = Room::query()->first();
        $user = User::query()->first();
        $suppliers = Supplier::query()->pluck('id', 'name');

        $today = Carbon::today();

        $vehicles = [
            [
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
                'supplier_id' => $suppliers['PT Astra Honda Motor'] ?? null,
                'description' => 'Kendaraan operasional tim development.',
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
                'supplier_id' => $suppliers['PT Yamaha Indonesia Motor Manufacturing'] ?? null,
                'description' => 'Akan jatuh tempo dalam beberapa hari.',
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
                'supplier_id' => $suppliers['PT Suzuki Indomobil Motor'] ?? null,
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
        ];

        foreach ($vehicles as $data) {
            $tax = $data['tax'];
            unset($data['tax']);

            $data['team_id'] = $team?->id;
            $data['room_id'] = $room?->id;
            $data['assigned_user_id'] = $user?->id;
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