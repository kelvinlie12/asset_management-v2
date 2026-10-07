<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\AssetDamage;
use App\Models\Category;
use App\Models\NetworkNode;
use App\Models\Room;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NetworkNodeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    private function roleUser(string $role): User
    {
        $user = User::factory()->create(['role' => $role]);
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

    private function siteRoom(): Room
    {
        return Room::create([
            'name' => 'Site A',
            'location' => 'Tower A',
            'is_storage' => false,
        ]);
    }

    private function category(): Category
    {
        return Category::create(['name' => 'Jaringan', 'code' => 'NET']);
    }

    private function storedAsset(Room $room): Asset
    {
        return Asset::create([
            'asset_code' => 'AST-'.fake()->unique()->numberBetween(1000, 999999),
            'name' => 'Modul OLT',
            'description' => 'Perangkat FTTH',
            'room_id' => $room->id,
            'condition' => Asset::CONDITION_GOOD,
            'usage_status' => Asset::USAGE_IN_STORAGE,
        ]);
    }

    private function installNode(Asset $asset, Room $site, array $overrides = []): NetworkNode
    {
        return NetworkNode::create(array_merge([
            'asset_id' => $asset->id,
            'room_id' => $site->id,
            'node_type' => NetworkNode::TYPE_OLT,
            'label' => 'OLT Site A',
            'status' => NetworkNode::STATUS_ACTIVE,
        ], $overrides));
    }

    private function nodePayload(Asset $asset, Room $site, array $overrides = []): array
    {
        return array_merge([
            'asset_id' => $asset->id,
            'room_id' => $site->id,
            'node_type' => NetworkNode::TYPE_ODP,
            'label' => 'ODP Site A',
            'status' => NetworkNode::STATUS_ACTIVE,
        ], $overrides);
    }

    public function test_staff_can_view_nodes_but_not_create_them(): void
    {
        Sanctum::actingAs($this->roleUser(User::ROLE_STAFF));

        $this->getJson('/api/v1/network-nodes')->assertOk();

        $room = $this->siteRoom();
        $asset = $this->storedAsset($this->storageRoom());

        $this->postJson('/api/v1/network-nodes', $this->nodePayload($asset, $room))
            ->assertForbidden();
    }

    public function test_viewer_cannot_access_network_endpoints(): void
    {
        Sanctum::actingAs($this->roleUser(User::ROLE_VIEWER));

        $this->getJson('/api/v1/network-nodes')->assertForbidden();
    }

    public function test_admin_can_create_node_and_asset_becomes_in_use(): void
    {
        Sanctum::actingAs($this->roleUser(User::ROLE_ADMIN));

        $warehouse = $this->storageRoom();
        $site = $this->siteRoom();
        $asset = $this->storedAsset($warehouse);

        $this->postJson('/api/v1/network-nodes', $this->nodePayload($asset, $site))
            ->assertCreated()
            ->assertJsonPath('data.node.asset_id', $asset->id)
            ->assertJsonPath('data.node.room_id', $site->id);

        $this->assertDatabaseHas('network_nodes', [
            'asset_id' => $asset->id,
            'room_id' => $site->id,
            'node_type' => NetworkNode::TYPE_ODP,
        ]);

        $asset->refresh();
        $this->assertSame(Asset::USAGE_IN_USE, $asset->usage_status);
        $this->assertSame($site->id, $asset->room_id);
    }

    public function test_store_rejects_damaged_asset(): void
    {
        Sanctum::actingAs($this->roleUser(User::ROLE_ADMIN));

        $warehouse = $this->storageRoom();
        $site = $this->siteRoom();
        $asset = $this->storedAsset($warehouse);
        $asset->update(['condition' => Asset::CONDITION_DAMAGED]);

        $this->postJson('/api/v1/network-nodes', $this->nodePayload($asset, $site))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('asset_id');

        $this->assertDatabaseCount('network_nodes', 0);
    }

    public function test_store_rejects_asset_not_in_storage(): void
    {
        Sanctum::actingAs($this->roleUser(User::ROLE_ADMIN));

        $site = $this->siteRoom();
        $asset = $this->storedAsset($site);
        $asset->update(['usage_status' => Asset::USAGE_IN_USE]);

        $this->postJson('/api/v1/network-nodes', $this->nodePayload($asset, $site))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('asset_id');

        $this->assertDatabaseCount('network_nodes', 0);
    }

    public function test_store_rejects_asset_already_installed_as_node(): void
    {
        Sanctum::actingAs($this->roleUser(User::ROLE_ADMIN));

        $warehouse = $this->storageRoom();
        $site = $this->siteRoom();
        $asset = $this->storedAsset($warehouse);
        $this->installNode($asset, $site);

        $this->postJson('/api/v1/network-nodes', $this->nodePayload($asset, $site))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('asset_id');

        $this->assertDatabaseCount('network_nodes', 1);
    }

    public function test_update_rejects_parent_loop(): void
    {
        Sanctum::actingAs($this->roleUser(User::ROLE_ADMIN));

        $warehouse = $this->storageRoom();
        $site = $this->siteRoom();
        $parent = $this->installNode($this->storedAsset($warehouse), $site, [
            'node_type' => NetworkNode::TYPE_ODC,
        ]);
        $child = $this->installNode($this->storedAsset($warehouse), $site, [
            'node_type' => NetworkNode::TYPE_ODP,
            'parent_id' => $parent->id,
        ]);

        // Pointing the parent at its own child creates a cycle.
        $this->putJson("/api/v1/network-nodes/{$parent->id}", [
            'parent_id' => $child->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('parent_id');

        // A node cannot be its own parent either.
        $this->putJson("/api/v1/network-nodes/{$parent->id}", [
            'parent_id' => $parent->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('parent_id');

        $this->assertDatabaseHas('network_nodes', [
            'id' => $parent->id,
            'parent_id' => null,
        ]);
    }

    public function test_destroy_requires_a_storage_room(): void
    {
        Sanctum::actingAs($this->roleUser(User::ROLE_ADMIN));

        $warehouse = $this->storageRoom();
        $site = $this->siteRoom();
        $asset = $this->storedAsset($warehouse);
        $node = $this->installNode($asset, $site);

        $this->deleteJson("/api/v1/network-nodes/{$node->id}", [
            'warehouse_room_id' => $site->id,
        ])->assertUnprocessable();

        $this->assertDatabaseHas('network_nodes', ['id' => $node->id]);
    }

    public function test_destroy_returns_asset_to_warehouse(): void
    {
        Sanctum::actingAs($this->roleUser(User::ROLE_ADMIN));

        $warehouse = $this->storageRoom();
        $site = $this->siteRoom();
        $asset = $this->storedAsset($warehouse);
        $node = $this->installNode($asset, $site);
        $asset->update(['usage_status' => Asset::USAGE_IN_USE, 'room_id' => $site->id]);

        $this->deleteJson("/api/v1/network-nodes/{$node->id}", [
            'warehouse_room_id' => $warehouse->id,
        ])->assertOk();

        $this->assertDatabaseMissing('network_nodes', ['id' => $node->id]);

        $asset->refresh();
        $this->assertSame(Asset::USAGE_IN_STORAGE, $asset->usage_status);
        $this->assertSame($warehouse->id, $asset->room_id);
    }

    public function test_destroy_rejects_node_with_children(): void
    {
        Sanctum::actingAs($this->roleUser(User::ROLE_ADMIN));

        $warehouse = $this->storageRoom();
        $site = $this->siteRoom();
        $parent = $this->installNode($this->storedAsset($warehouse), $site, [
            'node_type' => NetworkNode::TYPE_ODC,
        ]);
        $this->installNode($this->storedAsset($warehouse), $site, [
            'node_type' => NetworkNode::TYPE_ODP,
            'parent_id' => $parent->id,
        ]);

        $this->deleteJson("/api/v1/network-nodes/{$parent->id}", [
            'warehouse_room_id' => $warehouse->id,
        ])->assertUnprocessable();

        $this->assertDatabaseHas('network_nodes', ['id' => $parent->id]);
    }

    public function test_tree_returns_nested_children(): void
    {
        Sanctum::actingAs($this->roleUser(User::ROLE_STAFF));

        $warehouse = $this->storageRoom();
        $site = $this->siteRoom();
        $olt = $this->installNode($this->storedAsset($warehouse), $site, ['node_type' => NetworkNode::TYPE_OLT]);
        $this->installNode($this->storedAsset($warehouse), $site, [
            'node_type' => NetworkNode::TYPE_ODP,
            'parent_id' => $olt->id,
        ]);

        $response = $this->getJson('/api/v1/network-nodes/tree')->assertOk();
        $tree = $response->json('data.tree');

        $this->assertCount(1, $tree);
        $this->assertSame(NetworkNode::TYPE_OLT, $tree[0]['node_type']);
        $this->assertCount(1, $tree[0]['children']);
        $this->assertSame(NetworkNode::TYPE_ODP, $tree[0]['children'][0]['node_type']);
    }

    public function test_available_assets_excludes_installed_and_not_in_storage(): void
    {
        Sanctum::actingAs($this->roleUser(User::ROLE_STAFF));

        $warehouse = $this->storageRoom();
        $site = $this->siteRoom();

        $eligible = $this->storedAsset($warehouse);
        $installed = $this->storedAsset($warehouse);
        $this->installNode($installed, $site);
        $busy = $this->storedAsset($warehouse);
        $busy->update(['usage_status' => Asset::USAGE_IN_USE]);
        $damaged = $this->storedAsset($warehouse);
        $damaged->update(['condition' => Asset::CONDITION_DAMAGED]);

        $response = $this->getJson('/api/v1/network-nodes/available-assets')->assertOk();
        $ids = collect($response->json('data.assets'))->pluck('id')->all();

        $this->assertContains($eligible->id, $ids);
        $this->assertNotContains($installed->id, $ids);
        $this->assertNotContains($busy->id, $ids);
        $this->assertNotContains($damaged->id, $ids);
    }

    public function test_network_asset_cannot_be_deleted_via_asset_master(): void
    {
        Sanctum::actingAs($this->roleUser(User::ROLE_ADMIN));

        $warehouse = $this->storageRoom();
        $site = $this->siteRoom();
        $asset = $this->storedAsset($warehouse);
        $this->installNode($asset, $site);

        $this->deleteJson("/api/v1/assets/{$asset->id}")->assertUnprocessable();
        $this->assertDatabaseHas('assets', ['id' => $asset->id]);
    }

    public function test_network_asset_cannot_be_marked_damaged(): void
    {
        Sanctum::actingAs($this->roleUser(User::ROLE_ADMIN));

        $warehouse = $this->storageRoom();
        $site = $this->siteRoom();
        $asset = $this->storedAsset($warehouse);
        $this->installNode($asset, $site);

        $this->postJson('/api/v1/damages', [
            'asset_id' => $asset->id,
            'damage_date' => now()->toDateString(),
            'description' => 'Rusak padahal node',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('asset_id');

        $this->assertDatabaseCount('asset_damages', 0);
        $this->assertSame(Asset::CONDITION_GOOD, $asset->fresh()->condition);
    }

    public function test_network_asset_cannot_be_transferred(): void
    {
        Sanctum::actingAs($this->roleUser(User::ROLE_ADMIN));

        $warehouse = $this->storageRoom();
        $other = Room::create([
            'name' => 'Site B',
            'location' => 'Tower B',
            'is_storage' => false,
        ]);
        $site = $this->siteRoom();
        $asset = $this->storedAsset($warehouse);
        $this->installNode($asset, $site);
        $asset->update(['usage_status' => Asset::USAGE_IN_USE, 'room_id' => $site->id]);

        $this->postJson('/api/v1/transfers', [
            'asset_id' => $asset->id,
            'transfer_date' => now()->toDateString(),
            'to_room_id' => $other->id,
            'reason' => 'Memindahkan aset node',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('asset_id');

        $this->assertDatabaseCount('asset_transfers', 0);
        $this->assertSame(Asset::USAGE_IN_USE, $asset->fresh()->usage_status);
    }
}