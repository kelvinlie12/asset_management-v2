<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Category;
use App\Models\Team;
use App\Models\User;
use App\Support\ModuleCatalog;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CategoryUnitTestScopeTest extends TestCase
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
        $user = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN, 'team_id' => null]);
        $user->syncRoleToSpatie();

        return $user;
    }

    private function categoryFor(?Team $team, string $code, string $name = null): Category
    {
        return Category::create([
            'name' => $name ?? ('Kategori '.$code),
            'code' => $code,
            'team_id' => $team?->id,
        ]);
    }

    private function assetFor(Team $team, string $code, ?int $categoryId): Asset
    {
        return Asset::create([
            'asset_code' => $code,
            'name' => 'Asset '.$code,
            'category_id' => $categoryId,
            'team_id' => $team->id,
            'condition' => Asset::CONDITION_GOOD,
            'usage_status' => Asset::USAGE_IN_STORAGE,
        ]);
    }

    // ---- index / show / update / destroy scoping ----

    public function test_each_unit_only_lists_its_own_categories(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $this->categoryFor($teamA, 'CAT-A', 'Milik A');
        $this->categoryFor($teamB, 'CAT-B', 'Milik B');

        Sanctum::actingAs($this->userFor($teamA, User::ROLE_OWNER));

        $codes = array_column(
            $this->getJson('/api/v1/categories')->assertOk()->json('data.data'),
            'code',
        );

        $this->assertSame(['CAT-A'], array_values(array_intersect(['CAT-A', 'CAT-B'], $codes)));
    }

    public function test_owner_cannot_open_another_units_category(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $mine = $this->categoryFor($teamA, 'CAT-A');
        $theirs = $this->categoryFor($teamB, 'CAT-B');

        Sanctum::actingAs($this->userFor($teamA, User::ROLE_OWNER));

        $this->getJson("/api/v1/categories/{$mine->id}")->assertOk();
        $this->getJson("/api/v1/categories/{$theirs->id}")->assertForbidden();
        $this->putJson("/api/v1/categories/{$theirs->id}", ['name' => 'Hijack'])->assertForbidden();
        $this->deleteJson("/api/v1/categories/{$theirs->id}")->assertForbidden();
    }

    public function test_list_can_be_filtered_by_unit(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $this->categoryFor($teamA, 'CAT-A');
        $this->categoryFor($teamB, 'CAT-B');

        Sanctum::actingAs($this->superAdmin());

        $codes = array_column(
            $this->getJson('/api/v1/categories?team_id='.$teamB->id)->assertOk()->json('data.data'),
            'code',
        );

        $this->assertContains('CAT-B', $codes);
        $this->assertNotContains('CAT-A', $codes);
    }

    public function test_the_global_filter_returns_only_shared_categories(): void
    {
        $teamA = $this->team('Unit A');
        $unitCopy = $this->categoryFor($teamA, 'CAT-GLOB');
        $global = $this->categoryFor(null, 'CAT-GLOB');
        $otherGlobal = $this->categoryFor(null, 'CAT-OTHER');

        Sanctum::actingAs($this->superAdmin());

        $ids = array_column(
            $this->getJson('/api/v1/categories?team_id=global')->assertOk()->json('data.data'),
            'id',
        );

        $this->assertContains($global->id, $ids);
        $this->assertContains($otherGlobal->id, $ids);
        $this->assertNotContains($unitCopy->id, $ids);
    }

    // ---- creating ----

    public function test_owner_creates_a_category_for_their_own_unit(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');

        Sanctum::actingAs($this->userFor($teamA, User::ROLE_OWNER));

        $this->postJson('/api/v1/categories', [
            'name' => 'Kantor',
            'code' => 'CAT-KTR',
            'team_id' => $teamB->id, // the owner tries to claim another unit
        ])->assertCreated();

        $this->assertDatabaseHas('categories', [
            'code' => 'CAT-KTR',
            'team_id' => $teamA->id,
        ]);
    }

    public function test_super_admin_can_create_a_category_for_a_unit(): void
    {
        $teamA = $this->team('Unit A');
        Sanctum::actingAs($this->superAdmin());

        $this->postJson('/api/v1/categories', [
            'name' => 'Kantor',
            'code' => 'CAT-KTR',
            'team_id' => $teamA->id,
        ])->assertCreated();

        $this->assertDatabaseHas('categories', ['code' => 'CAT-KTR', 'team_id' => $teamA->id]);
    }

    public function test_super_admin_can_create_a_shared_global_category(): void
    {
        Sanctum::actingAs($this->superAdmin());

        $this->postJson('/api/v1/categories', [
            'name' => 'Global',
            'code' => 'CAT-GLB',
        ])->assertCreated();

        $this->assertDatabaseHas('categories', ['code' => 'CAT-GLB', 'team_id' => null]);
    }

    // ---- uniqueness is per unit, not global ----

    public function test_the_same_code_can_exist_in_two_units(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $this->categoryFor($teamA, 'CAT-KTR', 'Kantor A');

        Sanctum::actingAs($this->superAdmin());

        // The exact same code and name, but for another unit: allowed.
        $this->postJson('/api/v1/categories', [
            'name' => 'Kantor A',
            'code' => 'CAT-KTR',
            'team_id' => $teamB->id,
        ])->assertCreated();

        $this->assertSame(2, Category::where('code', 'CAT-KTR')->count());
    }

    public function test_a_duplicate_code_is_rejected_inside_one_unit(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $this->categoryFor($teamA, 'CAT-KTR', 'Kantor A');

        Sanctum::actingAs($this->superAdmin());

        $this->postJson('/api/v1/categories', [
            'name' => 'Kantor B',
            'code' => 'CAT-KTR',
            'team_id' => $teamA->id, // same unit as the existing row
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['code']);

        $this->postJson('/api/v1/categories', [
            'name' => 'Kantor A',
            'code' => 'CAT-OTHER',
            'team_id' => $teamA->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);
    }

    public function test_a_scoped_user_sees_only_their_units_uniqueness(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        // Another unit already owns this exact code and name.
        $this->categoryFor($teamB, 'CAT-KTR', 'Kantor');

        Sanctum::actingAs($this->userFor($teamA, User::ROLE_OWNER));

        $this->postJson('/api/v1/categories', [
            'name' => 'Kantor',
            'code' => 'CAT-KTR',
        ])->assertCreated();
    }

    // ---- moving a category between units ----

    public function test_owner_cannot_move_their_category_to_another_unit(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $category = $this->categoryFor($teamA, 'CAT-KTR');

        Sanctum::actingAs($this->userFor($teamA, User::ROLE_OWNER));

        $this->putJson("/api/v1/categories/{$category->id}", [
            'team_id' => $teamB->id,
        ])->assertOk();

        $this->assertSame($teamA->id, $category->fresh()->team_id);
    }

    public function test_moving_a_category_clears_it_from_left_behind_assets(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $category = $this->categoryFor($teamA, 'CAT-KTR');
        $stays = $this->assetFor($teamA, 'AST-1', $category->id);
        $moves = $this->assetFor($teamB, 'AST-2', null);

        Sanctum::actingAs($this->superAdmin());

        $this->putJson("/api/v1/categories/{$category->id}", ['team_id' => $teamB->id])
            ->assertOk();

        // The unit A asset loses the category rather than crossing into unit B.
        $this->assertNull($stays->fresh()->category_id);
        // The unit B asset never pointed at it, so nothing changes there.
        $this->assertNull($moves->fresh()->category_id);
    }

    // ---- cross-unit placement on assets ----

    public function test_owner_cannot_tag_an_asset_with_another_units_category(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $theirs = $this->categoryFor($teamB, 'CAT-B');
        $mine = $this->categoryFor($teamA, 'CAT-A');
        $asset = $this->assetFor($teamA, 'AST-1', null);

        Sanctum::actingAs($this->userFor($teamA, User::ROLE_OWNER));

        $this->putJson("/api/v1/assets/{$asset->id}", [
            'category_id' => $theirs->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['category_id']);

        $this->putJson("/api/v1/assets/{$asset->id}", [
            'category_id' => $mine->id,
        ])->assertOk();

        $this->assertSame($mine->id, $asset->fresh()->category_id);
    }

    public function test_super_admin_cannot_tag_a_units_asset_with_another_units_category(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $categoryA = $this->categoryFor($teamA, 'CAT-A');
        $categoryB = $this->categoryFor($teamB, 'CAT-B');
        $asset = $this->assetFor($teamA, 'AST-1', null);

        Sanctum::actingAs($this->superAdmin());

        // The record belongs to unit A, so unit B's copy is rejected even
        // though a super admin is the one asking.
        $this->putJson("/api/v1/assets/{$asset->id}", [
            'team_id' => $teamA->id,
            'category_id' => $categoryB->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['category_id']);

        $this->putJson("/api/v1/assets/{$asset->id}", [
            'team_id' => $teamA->id,
            'category_id' => $categoryA->id,
        ])->assertOk();
    }

    public function test_a_shared_global_category_cannot_be_attached_to_a_units_asset(): void
    {
        $teamA = $this->team('Unit A');
        $global = $this->categoryFor(null, 'CAT-GLB');
        $asset = $this->assetFor($teamA, 'AST-1', null);

        Sanctum::actingAs($this->userFor($teamA, User::ROLE_OWNER));

        $this->putJson("/api/v1/assets/{$asset->id}", [
            'category_id' => $global->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['category_id']);
    }

    public function test_a_shared_global_category_is_allowed_for_an_asset_with_no_unit(): void
    {
        $teamA = $this->team('Unit A');
        $global = $this->categoryFor(null, 'CAT-GLB');
        $theirCopy = $this->categoryFor($teamA, 'CAT-GLB-A');
        $asset = Asset::create([
            'asset_code' => 'AST-NO-TEAM',
            'name' => 'Unassigned asset',
            'category_id' => null,
            'team_id' => null,
            'condition' => Asset::CONDITION_GOOD,
            'usage_status' => Asset::USAGE_IN_STORAGE,
        ]);

        Sanctum::actingAs($this->superAdmin());

        $this->putJson("/api/v1/assets/{$asset->id}", [
            'category_id' => $theirCopy->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['category_id']);

        $this->putJson("/api/v1/assets/{$asset->id}", [
            'category_id' => $global->id,
        ])->assertOk();
    }

    // ---- lookups feed the forms ----

    public function test_owner_category_lookup_only_returns_their_own_unit(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $this->categoryFor($teamA, 'CAT-A');
        $this->categoryFor($teamB, 'CAT-B');

        Sanctum::actingAs($this->userFor($teamA, User::ROLE_OWNER));

        $codes = array_column(
            $this->getJson('/api/v1/lookups')->assertOk()->json('data.categories'),
            'code',
        );

        $this->assertContains('CAT-A', $codes);
        $this->assertNotContains('CAT-B', $codes);
    }

    public function test_every_category_in_the_lookup_carries_its_unit(): void
    {
        $teamA = $this->team('Unit A');
        $this->categoryFor($teamA, 'CAT-A');

        Sanctum::actingAs($this->superAdmin());

        $categories = $this->getJson('/api/v1/lookups')->assertOk()->json('data.categories');

        $this->assertNotEmpty($categories);
        foreach ($categories as $category) {
            $this->assertArrayHasKey('team_id', $category);
        }
    }

    // ---- dashboard ----

    public function test_dashboard_categories_are_limited_to_the_users_unit(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $mine = $this->categoryFor($teamA, 'CAT-A', 'Milik A');
        $theirs = $this->categoryFor($teamB, 'CAT-B', 'Milik B');
        $this->assetFor($teamA, 'AST-1', $mine->id);
        $this->assetFor($teamB, 'AST-2', $theirs->id);

        Sanctum::actingAs($this->userFor($teamA, User::ROLE_OWNER));

        $labels = array_column(
            $this->getJson('/api/v1/dashboard')->assertOk()->json('data.assets_by_category'),
            'label',
        );

        $this->assertContains('Milik A', $labels);
        $this->assertNotContains('Milik B', $labels);
    }
}
