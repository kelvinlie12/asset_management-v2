<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Category;
use App\Models\NetworkNode;
use App\Models\Room;
use App\Models\Team;
use App\Models\User;
use App\Support\ModuleCatalog;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UnitScopeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    private function team(string $name): Team
    {
        return Team::create([
            'name' => $name,
            'slug' => str($name)->slug(),
            'description' => $name,
        ]);
    }

    private function userFor(Team $team, string $role): User
    {
        $user = User::factory()->create(['role' => $role, 'team_id' => $team->id]);
        $user->syncRoleToSpatie();

        // These cases exercise data scoping, not menu gating, so owners get
        // every module. Module access has its own test class.
        if ($user->isOwner()) {
            $user->syncModules(ModuleCatalog::keys());
        }

        return $user;
    }

    private function superAdmin(): User
    {
        $user = User::factory()->create([
            'role' => 'super_admin',
            'team_id' => null,
        ]);
        $user->syncRoleToSpatie();

        return $user;
    }

    private function assetFor(Team $team, string $code): Asset
    {
        $category = Category::create(['name' => 'Cat '.$code, 'code' => 'CAT-'.$code]);

        return Asset::create([
            'asset_code' => $code,
            'name' => 'Asset '.$code,
            'category_id' => $category->id,
            'condition' => Asset::CONDITION_GOOD,
            'usage_status' => Asset::USAGE_IN_STORAGE,
            'team_id' => $team->id,
        ]);
    }

    public function test_asset_list_is_limited_to_the_users_own_unit(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $this->assetFor($teamA, 'AST-A1');
        $this->assetFor($teamB, 'AST-B1');

        $ownerA = $this->userFor($teamA, 'owner');
        Sanctum::actingAs($ownerA);

        $response = $this->getJson('/api/v1/assets');

        $response->assertOk();
        $codes = array_column($response->json('data.data'), 'asset_code');
        $this->assertContains('AST-A1', $codes);
        $this->assertNotContains('AST-B1', $codes);
    }

    public function test_user_cannot_open_another_units_asset(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $foreignAsset = $this->assetFor($teamB, 'AST-B1');

        $ownerA = $this->userFor($teamA, 'owner');
        Sanctum::actingAs($ownerA);

        $this->getJson('/api/v1/assets/'.$foreignAsset->id)->assertForbidden();
        $this->deleteJson('/api/v1/assets/'.$foreignAsset->id)->assertForbidden();
    }

    public function test_super_admin_sees_every_unit(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $this->assetFor($teamA, 'AST-A1');
        $this->assetFor($teamB, 'AST-B1');

        Sanctum::actingAs($this->superAdmin());

        $response = $this->getJson('/api/v1/assets');

        $response->assertOk();
        $codes = array_column($response->json('data.data'), 'asset_code');
        $this->assertContains('AST-A1', $codes);
        $this->assertContains('AST-B1', $codes);
    }

    public function test_user_list_only_contains_own_unit_members(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $this->userFor($teamA, 'admin');
        $userB = $this->userFor($teamB, 'admin');

        Sanctum::actingAs($this->userFor($teamA, 'owner'));

        $response = $this->getJson('/api/v1/users');

        $response->assertOk();
        $emails = array_column($response->json('data.data'), 'email');
        $this->assertNotContains($userB->email, $emails);
    }

    public function test_team_list_is_limited_to_own_unit(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');

        Sanctum::actingAs($this->userFor($teamA, 'owner'));

        $response = $this->getJson('/api/v1/teams');

        $response->assertOk();
        $slugs = array_column($response->json('data.data'), 'slug');
        $this->assertContains((string) $teamA->slug, $slugs);
        $this->assertNotContains((string) $teamB->slug, $slugs);
    }

    public function test_network_nodes_inherit_scope_from_their_asset(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $room = Room::create([
            'name' => 'Site',
            'location' => 'Tower',
            'is_storage' => false,
        ]);

        $nodeA = NetworkNode::create([
            'asset_id' => $this->assetFor($teamA, 'AST-A1')->id,
            'room_id' => $room->id,
            'label' => 'Node A',
            'node_type' => 'odf',
            'status' => 'active',
        ]);
        $nodeB = NetworkNode::create([
            'asset_id' => $this->assetFor($teamB, 'AST-B1')->id,
            'room_id' => $room->id,
            'label' => 'Node B',
            'node_type' => 'odf',
            'status' => 'active',
        ]);

        Sanctum::actingAs($this->userFor($teamA, 'owner'));

        $response = $this->getJson('/api/v1/network-nodes');

        $response->assertOk();
        $labels = array_column($response->json('data.data'), 'label');
        $this->assertContains($nodeA->label, $labels);
        $this->assertNotContains($nodeB->label, $labels);

        $this->getJson('/api/v1/network-nodes/'.$nodeB->id)->assertForbidden();
    }
}
