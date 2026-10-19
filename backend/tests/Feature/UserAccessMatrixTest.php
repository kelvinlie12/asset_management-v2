<?php

namespace Tests\Feature;

use App\Models\Team;
use App\Models\User;
use App\Support\ModuleCatalog;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class UserAccessMatrixTest extends TestCase
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
        ]);
    }

    private function ownerOf(Team $team, array $modules = ModuleCatalog::DEFAULT_OWNER_MODULES): User
    {
        $user = User::factory()->create(['role' => User::ROLE_OWNER, 'team_id' => $team->id]);
        $user->syncRoleToSpatie();
        $user->syncModules($modules);

        return $user;
    }

    private function adminOf(Team $team): User
    {
        $user = User::factory()->create(['role' => User::ROLE_ADMIN, 'team_id' => $team->id]);
        $user->syncRoleToSpatie();

        return $user;
    }

    private function person(Team $team, string $role = User::ROLE_STAFF): User
    {
        $user = User::factory()->create(['role' => $role, 'team_id' => $team->id]);
        $user->syncRoleToSpatie();

        return $user;
    }

    private function superAdmin(): User
    {
        $user = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN, 'team_id' => null]);
        $user->syncRoleToSpatie();

        return $user;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function modules(array $payload): array
    {
        return collect($payload)->keyBy('key')->all();
    }

    public function test_owner_can_read_the_access_matrix_of_a_member_of_their_unit(): void
    {
        $team = $this->team('Unit A');
        $staff = $this->person($team);

        Sanctum::actingAs($this->ownerOf($team));

        $response = $this->getJson("/api/v1/users/{$staff->id}/access")->assertOk();

        $response->assertJsonPath('data.target.id', $staff->id)
            ->assertJsonPath('data.editable', true);

        $modules = $this->modules($response->json('data.modules'));

        // The staff reaches the assets module (role seeded assets.view) and the
        // owner is allowed to hand assets down; suppliers is out of reach.
        $this->assertTrue($modules['assets']['selected']);
        $this->assertTrue($modules['assets']['grantable']);
        $this->assertFalse($modules['suppliers']['grantable']);
    }

    public function test_owner_can_set_a_module_matrix_independent_of_role(): void
    {
        $team = $this->team('Unit A');
        $staff = $this->person($team);

        // The staff role's default access seeds assets.view and damages.view as
        // the user's own (direct) grants, independent of the job title.
        $this->assertTrue($staff->fresh()->can('assets.view'));
        $this->assertTrue($staff->fresh()->can('damages.view'));

        Sanctum::actingAs($this->ownerOf($team));

        $this->putJson("/api/v1/users/{$staff->id}/access", [
            'modules' => ['assets', 'users'],
        ])->assertOk();

        $fresh = $staff->fresh();

        // Whole modules are granted, not single actions.
        $this->assertTrue($fresh->can('assets.view'));
        $this->assertTrue($fresh->can('assets.create'));
        $this->assertTrue($fresh->can('users.view'));

        // `users.manage_access` is reserved for a super admin and never travels
        // with the module when an owner passes it down.
        $this->assertFalse($fresh->can('users.manage_access'));

        // damages was dropped from the matrix, so it is revoked.
        $this->assertFalse($fresh->can('damages.view'));
    }

    public function test_revocation_is_enforced_by_the_api_middleware(): void
    {
        $team = $this->team('Unit A');
        $staff = $this->person($team);

        Sanctum::actingAs($this->ownerOf($team));

        $this->putJson("/api/v1/users/{$staff->id}/access", [
            'modules' => ['users'],
        ])->assertOk();

        Sanctum::actingAs($staff->fresh());

        $this->getJson('/api/v1/users')->assertOk();
        $this->getJson('/api/v1/assets')->assertForbidden();
        $this->getJson('/api/v1/damages')->assertForbidden();
    }

    public function test_two_users_of_the_same_role_can_differ(): void
    {
        $team = $this->team('Unit A');
        $userA = $this->person($team);
        $userB = $this->person($team);

        Sanctum::actingAs($this->ownerOf($team));

        $this->putJson("/api/v1/users/{$userA->id}/access", [
            'modules' => ['assets'],
        ])->assertOk();
        $this->putJson("/api/v1/users/{$userB->id}/access", [
            'modules' => ['damages'],
        ])->assertOk();

        $this->assertTrue($userA->fresh()->can('assets.view'));
        $this->assertFalse($userA->fresh()->can('damages.view'));

        $this->assertTrue($userB->fresh()->can('damages.view'));
        $this->assertFalse($userB->fresh()->can('assets.view'));
    }

    public function test_owner_grants_within_the_modules_they_were_given(): void
    {
        $team = $this->team('Unit A');
        $staff = $this->person($team);

        Sanctum::actingAs($this->ownerOf($team));

        // The owner of a unit starts from the modules a super admin hands
        // them (assets, damages, users). Everything inside those modules can
        // be passed down; a module they were never given - suppliers - stays
        // out of reach and the reserved `users.manage_access` never travels.
        $this->putJson("/api/v1/users/{$staff->id}/access", [
            'modules' => ['assets', 'damages', 'users', 'suppliers', 'network'],
        ])->assertOk();

        $fresh = $staff->fresh();

        $this->assertTrue($fresh->can('assets.delete'));
        $this->assertTrue($fresh->can('damages.create'));
        $this->assertTrue($fresh->can('users.delete'));
        $this->assertFalse($fresh->can('users.manage_access'));
        $this->assertFalse($fresh->can('suppliers.view'));
    }

    public function test_owner_cannot_manage_a_user_from_another_unit(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $stranger = $this->person($teamB);

        Sanctum::actingAs($this->ownerOf($teamA));

        $this->getJson("/api/v1/users/{$stranger->id}/access")->assertForbidden();
        $this->putJson("/api/v1/users/{$stranger->id}/access", [
            'modules' => ['assets'],
        ])->assertForbidden();
    }

    public function test_owner_cannot_manage_a_super_admin_or_themselves(): void
    {
        $team = $this->team('Unit A');
        $owner = $this->ownerOf($team);
        $super = $this->superAdmin();

        Sanctum::actingAs($owner);

        $this->putJson("/api/v1/users/{$super->id}/access", [
            'modules' => ['assets'],
        ])->assertForbidden();

        $this->putJson("/api/v1/users/{$owner->id}/access", [
            'modules' => ['assets'],
        ])->assertForbidden();
    }

    public function test_owner_manages_an_admin_in_their_unit(): void
    {
        $team = $this->team('Unit A');
        $admin = $this->adminOf($team);

        // The owner holds the users module by default, so they administer the
        // admins of their own unit just like any other member of staff.
        Sanctum::actingAs($this->ownerOf($team));

        $this->getJson("/api/v1/users/{$admin->id}/access")
            ->assertOk()
            ->assertJsonPath('data.editable', true);

        $this->putJson("/api/v1/users/{$admin->id}/access", [
            'modules' => ['assets', 'users'],
        ])->assertOk();

        $fresh = $admin->fresh();
        $this->assertTrue($fresh->can('assets.create'));
        $this->assertTrue($fresh->can('users.view'));
        $this->assertFalse($fresh->can('users.manage_access'));
    }

    public function test_admin_manages_staff_and_viewer_but_not_another_admin(): void
    {
        $team = $this->team('Unit A');
        $admin = $this->adminOf($team);
        $staff = $this->person($team);
        $peer = $this->adminOf($team);
        $viewer = $this->person($team, User::ROLE_VIEWER);

        Sanctum::actingAs($admin);

        $this->putJson("/api/v1/users/{$staff->id}/access", [
            'modules' => ['assets'],
        ])->assertOk();
        $this->putJson("/api/v1/users/{$viewer->id}/access", [
            'modules' => ['assets'],
        ])->assertOk();
        $this->putJson("/api/v1/users/{$peer->id}/access", [
            'modules' => ['assets'],
        ])->assertForbidden();
    }

    public function test_super_admin_can_set_access_for_any_unit(): void
    {
        $team = $this->team('Unit A');
        $staff = $this->person($team);

        Sanctum::actingAs($this->superAdmin());

        $this->putJson("/api/v1/users/{$staff->id}/access", [
            'modules' => ['network'],
        ])->assertOk();

        $this->assertTrue($staff->fresh()->can('network.view'));
        $this->assertTrue($staff->fresh()->can('network.create'));
        $this->assertFalse($staff->fresh()->can('assets.view'));
    }

    public function test_super_admin_can_hand_down_a_reserved_permission(): void
    {
        $team = $this->team('Unit A');
        $owner = $this->ownerOf($team, ['assets']);

        $this->assertFalse($owner->fresh()->can('users.manage_access'));

        Sanctum::actingAs($this->superAdmin());

        // Only a super admin can hand the users module over with the reserved
        // access-administration privilege included.
        $this->putJson("/api/v1/users/{$owner->id}/access", [
            'modules' => ['assets', 'users'],
        ])->assertOk();

        $this->assertTrue($owner->fresh()->can('users.manage_access'));
    }

    public function test_unknown_modules_are_rejected(): void
    {
        $team = $this->team('Unit A');
        $staff = $this->person($team);

        Sanctum::actingAs($this->ownerOf($team));

        $this->putJson("/api/v1/users/{$staff->id}/access", [
            'modules' => ['assets', 'not.a.module'],
        ])->assertStatus(422);
    }

    public function test_access_matrix_does_not_expose_super_admin_editing(): void
    {
        $team = $this->team('Unit A');
        $super = $this->superAdmin();

        Sanctum::actingAs($this->ownerOf($team));

        // The owner cannot even open the matrix of a super admin.
        $this->getJson("/api/v1/users/{$super->id}/access")->assertForbidden();
    }

    public function test_owner_without_manage_access_cannot_edit_access(): void
    {
        $team = $this->team('Unit A');
        $staff = $this->person($team);

        // An owner given assets only - no users module - has no ability to
        // administer access rights.
        $owner = $this->ownerOf($team, ['assets']);

        Sanctum::actingAs($owner);

        $this->getJson("/api/v1/users/{$staff->id}/access")->assertForbidden();
        $this->putJson("/api/v1/users/{$staff->id}/access", [
            'modules' => ['assets'],
        ])->assertForbidden();
    }

    public function test_owner_passes_down_only_the_modules_they_were_given(): void
    {
        $team = $this->team('Unit A');
        $staff = $this->person($team);

        $owner = $this->ownerOf($team, ['assets', 'users']);

        Sanctum::actingAs($owner);

        $this->getJson("/api/v1/users/{$staff->id}/access")->assertOk();

        // assets and users are the owner's to give; suppliers is not held and
        // the reserved manage-access flag never travels with the users module.
        $this->putJson("/api/v1/users/{$staff->id}/access", [
            'modules' => ['assets', 'users', 'suppliers'],
        ])->assertOk();

        $fresh = $staff->fresh();

        $this->assertTrue($fresh->can('assets.view'));
        $this->assertTrue($fresh->can('users.view'));
        $this->assertFalse($fresh->can('users.manage_access'));
        $this->assertFalse($fresh->can('suppliers.view'));
    }

    public function test_granting_a_module_creates_missing_permission_rows(): void
    {
        $team = $this->team('Unit A');
        $owner = $this->ownerOf($team);

        // Simulate a production database that was never re-seeded after a new
        // permission was added to the catalogue.
        Permission::query()->where('name', 'suppliers.view')->delete();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->assertFalse(
            Permission::query()->where('name', 'suppliers.view')->exists()
        );

        Sanctum::actingAs($this->superAdmin());

        $this->putJson("/api/v1/users/{$owner->id}/access", [
            'modules' => ['assets', 'suppliers'],
        ])->assertOk();

        $this->assertTrue($owner->fresh()->can('suppliers.view'));
        $this->assertTrue(
            Permission::query()->where('name', 'suppliers.view')->exists()
        );
    }
}
