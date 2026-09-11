<?php

namespace Database\Seeders;

use App\Models\Supplier;
use Illuminate\Database\Seeder;

class SupplierSeeder extends Seeder
{
    /**
     * Seed the master supplier/vendor data.
     */
    public function run(): void
    {
        $suppliers = [
            [
                'name' => 'PT Astra Honda Motor',
                'contact_person' => 'Budi Santoso',
                'phone' => '021-12345678',
                'email' => 'sales@ahm.co.id',
                'address' => 'Jakarta',
                'notes' => 'Distributor resmi sepeda motor Honda.',
            ],
            [
                'name' => 'PT Yamaha Indonesia Motor Manufacturing',
                'contact_person' => 'Siti Rahma',
                'phone' => '021-87654321',
                'email' => 'sales@yamaha-motor.co.id',
                'address' => 'Jakarta',
                'notes' => 'Distributor resmi sepeda motor Yamaha.',
            ],
            [
                'name' => 'PT Suzuki Indomobil Motor',
                'contact_person' => 'Agus Wijaya',
                'phone' => '021-11223344',
                'email' => 'sales@suzuki.co.id',
                'address' => 'Jakarta',
                'notes' => 'Distributor resmi sepeda motor Suzuki.',
            ],
        ];

        foreach ($suppliers as $supplier) {
            Supplier::query()->updateOrCreate(
                ['name' => $supplier['name']],
                $supplier,
            );
        }
    }
}