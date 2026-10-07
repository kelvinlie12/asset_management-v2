<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(UserSeeder::class);
        $this->call(CategorySeeder::class);
        // Permissions must exist before owners, which grant each of them a
        // tailored set of modules. OwnerSeeder links its own Spatie role.
        $this->call(RolePermissionSeeder::class);
        // Owners create the remaining units together with their own room, so
        // they run before RoomSeeder, which fills in every unit's rooms.
        $this->call(OwnerSeeder::class);
        $this->call(RoomSeeder::class);
        $this->call(AssetSeeder::class);
        $this->call(PurchaseSeeder::class);
        $this->call(AssetAssignmentSeeder::class);
        $this->call(SupplierSeeder::class);
        $this->call(VehicleSeeder::class);
        $this->call(NetworkNodeSeeder::class);
    }
}
