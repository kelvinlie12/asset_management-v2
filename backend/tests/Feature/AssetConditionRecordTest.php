<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Purchase;
use App\Models\Room;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AssetConditionRecordTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    private function admin(): User
    {
        $user = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $user->syncRoleToSpatie();

        return $user;
    }

    private function storageRoom(): Room
    {
        return Room::create([
            'name' => 'Gudang Utama',
            'location' => 'Warehouse',
            'is_storage' => true,
        ]);
    }

    public function test_creating_a_new_asset_records_a_purchase(): void
    {
        Sanctum::actingAs($this->admin());

        $res = $this->postJson('/api/v1/assets', [
            'asset_code' => 'AST-TEST-1',
            'name' => 'Laptop Baru',
            'condition' => Asset::CONDITION_NEW,
            'usage_status' => Asset::USAGE_IN_STORAGE,
        ]);

        $res->assertCreated();
        $assetId = $res->json('data.asset.id');

        $this->assertDatabaseHas('assets', [
            'id' => $assetId,
            'condition' => Asset::CONDITION_NEW,
        ]);
        $this->assertDatabaseHas('purchases', ['asset_id' => $assetId]);
        $this->assertSame(1, Purchase::query()->where('asset_id', $assetId)->count());
    }

    public function test_creating_a_damaged_asset_records_a_damage_and_stores_it(): void
    {
        Sanctum::actingAs($this->admin());
        $warehouse = $this->storageRoom();
        $site = Room::create([
            'name' => 'Ruang Kerja',
            'location' => 'Lantai 1',
            'is_storage' => false,
        ]);

        $res = $this->postJson('/api/v1/assets', [
            'asset_code' => 'AST-TEST-2',
            'name' => 'Kursi Rusak',
            'condition' => Asset::CONDITION_DAMAGED,
            'usage_status' => Asset::USAGE_IN_USE,
            'room_id' => $site->id,
        ]);

        $res->assertCreated();
        $assetId = $res->json('data.asset.id');

        $this->assertDatabaseHas('asset_damages', ['asset_id' => $assetId]);

        $asset = Asset::query()->findOrFail($assetId);
        $this->assertSame(Asset::CONDITION_DAMAGED, $asset->condition);
        $this->assertSame(Asset::USAGE_IN_STORAGE, $asset->usage_status);
        $this->assertSame($warehouse->id, $asset->room_id);
        $this->assertNull($asset->assigned_user_id);
    }

    public function test_updating_an_asset_to_damaged_records_a_damage(): void
    {
        Sanctum::actingAs($this->admin());
        $warehouse = $this->storageRoom();

        $asset = Asset::create([
            'asset_code' => 'AST-TEST-3',
            'name' => 'Meja',
            'room_id' => $warehouse->id,
            'condition' => Asset::CONDITION_USED,
            'usage_status' => Asset::USAGE_IN_STORAGE,
        ]);

        $this->putJson("/api/v1/assets/{$asset->id}", [
            'condition' => Asset::CONDITION_DAMAGED,
        ])->assertOk();

        $this->assertDatabaseHas('asset_damages', ['asset_id' => $asset->id]);
        $this->assertSame(Asset::CONDITION_DAMAGED, $asset->fresh()->condition);
    }

    public function test_the_four_conditions_are_accepted(): void
    {
        Sanctum::actingAs($this->admin());

        $conditions = [
            Asset::CONDITION_NEW,
            Asset::CONDITION_USED,
            Asset::CONDITION_REFURBISHED,
            Asset::CONDITION_DAMAGED,
        ];

        foreach ($conditions as $index => $condition) {
            $this->postJson('/api/v1/assets', [
                'asset_code' => "AST-COND-{$index}",
                'name' => "Asset {$index}",
                'condition' => $condition,
                'usage_status' => Asset::USAGE_IN_STORAGE,
            ])->assertCreated();
        }
    }
}
