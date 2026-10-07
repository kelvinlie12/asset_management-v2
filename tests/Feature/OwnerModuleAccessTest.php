<?php

namespace Tests\Feature;

use App\Models\Team;
use App\Models\User;
use App\Support\ModuleCatalog;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OwnerModuleAccessTest extends TestCase
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

    private function ownerOf(Team $team): User
    {
        $user = User::factory()->create([
            'role' => User::ROLE_OWNER,
            'team_id' => $team->id,
        ]);
        $user->syncRoleToSpatie();
        $user->syncModules(ModuleCatalog::DEFAULT_OWNER_MODULES);

        return $user;
    }

    private function superAdmin(): User
    {
        $user = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
            'team_id' => null,
        ]);
        $user->syncRoleToSpatie();

        return $user;
    }

    public function test_new_owner_role_grants_no_feature_modules(): void
    {
        $team = $this->team('Unit A');

        $owner = $this->ownerOf($team);

        // The role itself carries profile access only, so a fresh owner can
        // reach nothing until a super admin picks modules for them.
        $owner->syncPermissions([]);

        $this->assertSame([], $owner->fresh()->getModuleKeys());
        $this->assertTrue($owner->fresh()->can('profile.view'));
        $this->assertFalse($owner->fresh()->can('assets.view'));
    }

    public function test_default_owner_modules_are_asset_and_damage(): void
    {
        $this->assertSame(['assets', 'damages'], ModuleCatalog::DEFAULT_OWNER_MODULES);

        $team = $this->team('Unit A');
        $owner = $this->ownerOf($team);

        $this->assertSame(
            ['assets', 'damages'],
            $owner->fresh()->getModuleKeys()
        );
    }

    public function test_two_owners_can_hold_different_module_sets(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');

        $teknik = $this->ownerOf($teamA);
        $keuangan = $this->ownerOf($teamB);

        $teknik->syncModules(['assets', 'damages', 'network']);
        $keuangan->syncModules(['assets', 'damages', 'purchases', 'suppliers']);

        $this->assertSame(
            ['assets', 'damages', 'network'],
            $teknik->fresh()->getModuleKeys()
        );
        $this->assertSame(
            ['assets', 'damages', 'purchases', 'suppliers'],
            $keuangan->fresh()->getModuleKeys()
        );
    }

    public function test_revoking_a_module_removes_its_permissions(): void
    {
        $team = $this->team('Unit A');
        $owner = $this->ownerOf($team);

        $owner->syncModules(['assets', 'damages', 'network']);
        $owner->syncModules(['assets']);

        $fresh = $owner->fresh();

        $this->assertSame(['assets'], $fresh->getModuleKeys());
        $this->assertTrue($fresh->can('assets.view'));
        $this->assertFalse($fresh->can('network.view'));
        $this->assertFalse($fresh->can('damages.view'));
        // Profile access comes from the role and survives a module reset.
        $this->assertTrue($fresh->can('profile.update'));
    }

    public function test_owner_menu_endpoints_follow_their_modules(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');

        $teknik = $this->ownerOf($teamA);
        $keuangan = $this->ownerOf($teamB);

        $teknik->syncModules(['assets', 'damages', 'network']);
        $keuangan->syncModules(['assets', 'damages', 'purchases', 'suppliers']);

        Sanctum::actingAs($teknik->fresh());

        $this->getJson('/api/v1/assets')->assertOk();
        $this->getJson('/api/v1/damages')->assertOk();
        $this->getJson('/api/v1/lookups')->assertOk();
        $this->getJson('/api/v1/network-nodes')->assertOk();
        $this->getJson('/api/v1/purchases')->assertForbidden();
        $this->getJson('/api/v1/suppliers')->assertForbidden();

        Sanctum::actingAs($keuangan->fresh());

        $this->getJson('/api/v1/purchases')->assertOk();
        $this->getJson('/api/v1/suppliers')->assertOk();
        $this->getJson('/api/v1/network-nodes')->assertForbidden();
    }

    public function test_lookups_stay_available_and_unit_scoped_without_master_data_permissions(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');

        $owner = $this->ownerOf($teamA);
        $owner->syncModules(['assets']);

        Sanctum::actingAs($owner->fresh());

        $response = $this->getJson('/api/v1/lookups');

        $response->assertOk()
            ->assertJsonCount(1, 'data.teams')
            ->assertJsonPath('data.teams.0.name', 'Unit A');

        // The asset form's dropdowns must not require rooms.view/users.view.
        $this->assertArrayHasKey('categories', $response->json('data'));
        $this->assertArrayHasKey('rooms', $response->json('data'));
        $this->assertArrayHasKey('users', $response->json('data'));
        $this->assertArrayHasKey('assets', $response->json('data'));
    }

    public function test_lookups_carry_the_owning_unit_so_forms_can_filter_by_it(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');

        $roomA = \App\Models\Room::create([
            'team_id' => $teamA->id,
            'name' => 'Ruang A',
            'is_storage' => false,
        ]);
        $roomB = \App\Models\Room::create([
            'team_id' => $teamB->id,
            'name' => 'Ruang B',
            'is_storage' => false,
        ]);

        $ownerA = $this->ownerOf($teamA);
        $ownerB = $this->ownerOf($teamB);

        Sanctum::actingAs($this->superAdmin());

        $rooms = collect($this->getJson('/api/v1/lookups')->assertOk()->json('data.rooms'))
            ->keyBy('id');

        // A super admin gets every unit's rooms, each labelled with its owner, so
        // the vehicle form can keep the placement picker on the chosen unit.
        $this->assertSame($teamA->id, $rooms[$roomA->id]['team_id']);
        $this->assertSame($teamB->id, $rooms[$roomB->id]['team_id']);

        Sanctum::actingAs($ownerA->fresh());

        $scoped = $this->getJson('/api/v1/lookups')->assertOk();

        $scoped->assertJsonCount(1, 'data.rooms')
            ->assertJsonPath('data.rooms.0.team_id', $teamA->id);
        $scoped->assertJsonPath('data.users.0.team_id', $teamA->id);

        $this->assertNotSame(
            $ownerB->id,
            $scoped->json('data.users.0.id'),
            'an owner must not find another unit\'s people in the lookups',
        );
    }

    public function test_super_admin_can_read_the_module_catalogue(): void
    {
        Sanctum::actingAs($this->superAdmin());

        $response = $this->getJson('/api/v1/users/module-catalog');

        $response->assertOk()
            ->assertJsonPath('data.defaults', ModuleCatalog::DEFAULT_OWNER_MODULES);

        $keys = array_column($response->json('data.modules'), 'key');
        $this->assertSame(ModuleCatalog::keys(), $keys);
    }

    public function test_super_admin_can_rewrite_an_owners_modules(): void
    {
        $team = $this->team('Unit A');
        $owner = $this->ownerOf($team);

        Sanctum::actingAs($this->superAdmin());

        $response = $this->putJson("/api/v1/users/{$owner->id}/modules", [
            'modules' => ['assets', 'vehicles'],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.user.modules', ['assets', 'vehicles']);

        $this->assertTrue($owner->fresh()->can('vehicles.view'));
        $this->assertFalse($owner->fresh()->can('suppliers.view'));
    }

    public function test_owner_cannot_change_module_access(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');

        $ownerA = $this->ownerOf($teamA);
        $ownerA->syncModules(['assets', 'damages', 'users']);
        $ownerB = $this->ownerOf($teamB);

        Sanctum::actingAs($ownerA->fresh());

        $this->putJson("/api/v1/users/{$ownerB->id}/modules", [
            'modules' => ['assets'],
        ])->assertForbidden();

        $this->assertNotSame(
            ['assets'],
            $ownerB->fresh()->getModuleKeys()
        );
    }

    public function test_unknown_modules_are_rejected(): void
    {
        $team = $this->team('Unit A');
        $owner = $this->ownerOf($team);

        Sanctum::actingAs($this->superAdmin());

        $this->putJson("/api/v1/users/{$owner->id}/modules", [
            'modules' => ['assets', 'not_a_module'],
        ])->assertStatus(422);
    }

    public function test_super_admin_modules_cannot_be_trimmed(): void
    {
        $admin = $this->superAdmin();

        Sanctum::actingAs($this->superAdmin());

        $this->putJson("/api/v1/users/{$admin->id}/modules", [
            'modules' => ['assets'],
        ])->assertStatus(422);

        // A super admin still owns every module.
        $this->assertSame(
            ModuleCatalog::keys(),
            $admin->fresh()->getModuleKeys()
        );
    }

    public function test_new_owner_created_by_api_starts_with_default_modules(): void
    {
        $team = $this->team('Unit A');

        Sanctum::actingAs($this->superAdmin());

        $response = $this->postJson('/api/v1/users', [
            'name' => 'Owner Baru',
            'email' => 'owner.baru@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => User::ROLE_OWNER,
            'team_id' => $team->id,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.user.modules', ModuleCatalog::DEFAULT_OWNER_MODULES);
    }

    public function test_user_listing_reports_each_owners_modules(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');

        $teknik = $this->ownerOf($teamA);
        $teknik->syncModules(['assets', 'damages', 'network']);

        $keuangan = $this->ownerOf($teamB);

        Sanctum::actingAs($this->superAdmin());

        $rows = $this->getJson('/api/v1/users')
            ->assertOk()
            ->json('data.data');

        $byEmail = collect($rows)->keyBy('email');

        $this->assertSame(
            ['assets', 'damages', 'network'],
            $byEmail[$teknik->email]['modules']
        );
        $this->assertSame(
            ModuleCatalog::DEFAULT_OWNER_MODULES,
            $byEmail[$keuangan->email]['modules']
        );
    }
}