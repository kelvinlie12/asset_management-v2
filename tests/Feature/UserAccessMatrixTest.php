<?php

namespace Tests\Feature;

use App\Models\Team;
use App\Models\User;
use App\Support\ModuleCatalog;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
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

    private function ownerOf(Team $team): User
    {
        $user = User::factory()->create(['role' => User::ROLE_OWNER, 'team_id' => $team->id]);
        $user->syncRoleToSpatie();
        $user->syncModules(ModuleCatalog::DEFAULT_OWNER_MODULES);

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

    public function test_owner_can_read_the_access_matrix_of_a_member_of_their_unit(): void
    {
        $team = $this->team('Unit A');
        $staff = $this->person($team);

        Sanctum::actingAs($this->ownerOf($team));

        $response = $this->getJson("/api/v1/users/{$staff->id}/access")->assertOk();

        $response->assertJsonPath('data.target.id', $staff->id)
            ->assertJsonPath('data.editable', true);

        $this->assertNotEmpty($response->json('data.catalog'));
        $this->assertSame('assets.view', $response->json('data.catalog.0.features.0.actions.view'));
    }

    public function test_owner_can_set_a_granular_access_matrix_independent_of_role(): void
    {
        $team = $this->team('Unit A');
        $staff = $this->person($team);

        // The staff role's default access seeds assets.view and damages.view as
        // the user's own (direct) grants, independent of the job title.
        $this->assertTrue($staff->fresh()->can('assets.view'));
        $this->assertTrue($staff->fresh()->can('damages.view'));

        Sanctum::actingAs($this->ownerOf($team));

        $this->putJson("/api/v1/users/{$staff->id}/access", [
            'permissions' => ['assets.view', 'users.view'],
        ])->assertOk();

        $fresh = $staff->fresh();

        // Granted directly, even though the staff role never had users.view.
        $this->assertTrue($fresh->can('assets.view'));
        $this->assertTrue($fresh->can('users.view'));

        // Revoked, because access is now driven by the Access Rights matrix.
        $this->assertFalse($fresh->can('damages.view'));
        $this->assertFalse($fresh->can('assets.create'));
    }

    public function test_revocation_is_enforced_by_the_api_middleware(): void
    {
        $team = $this->team('Unit A');
        $staff = $this->person($team);

        Sanctum::actingAs($this->ownerOf($team));

        $this->putJson("/api/v1/users/{$staff->id}/access", [
            'permissions' => ['users.view'],
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
            'permissions' => ['assets.view'],
        ])->assertOk();
        $this->putJson("/api/v1/users/{$userB->id}/access", [
            'permissions' => ['damages.view'],
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

        // The staff role's default access grants rooms.view.
        $this->assertTrue($staff->fresh()->can('rooms.view'));

        Sanctum::actingAs($this->ownerOf($team));

        // The owner of a unit starts from the modules a super admin hands
        // them (assets, damages, users). Everything inside those modules can
        // be passed down; a module they were never given - suppliers, audit
        // logs - and the role/permission RBAC stay out of reach.
        $this->putJson("/api/v1/users/{$staff->id}/access", [
            'permissions' => [
                'assets.delete',    // assets module the owner holds
                'damages.create',   // damages module the owner holds
                'users.delete',     // users module the owner holds
                'suppliers.view',   // module not given to the owner
                'audit_logs.view',  // module not given to the owner
                'roles.view',       // role admin reserved for a super admin
            ],
        ])->assertOk();

        $fresh = $staff->fresh();

        $this->assertTrue($fresh->can('assets.delete'));
        $this->assertTrue($fresh->can('damages.create'));
        $this->assertTrue($fresh->can('users.delete'));
        $this->assertFalse($fresh->can('suppliers.view'));
        $this->assertFalse($fresh->can('audit_logs.view'));
        $this->assertFalse($fresh->can('roles.view'));

        // assets.view was held but dropped from the matrix, so it is revoked.
        $this->assertFalse($fresh->can('assets.view'));

        // rooms.view sits outside the owner's modules, so it is left alone.
        $this->assertTrue($fresh->can('rooms.view'));
    }

    public function test_owner_cannot_manage_a_user_from_another_unit(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $stranger = $this->person($teamB);

        Sanctum::actingAs($this->ownerOf($teamA));

        $this->getJson("/api/v1/users/{$stranger->id}/access")->assertForbidden();
        $this->putJson("/api/v1/users/{$stranger->id}/access", [
            'permissions' => ['assets.view'],
        ])->assertForbidden();
    }

    public function test_owner_cannot_manage_a_super_admin_or_themselves(): void
    {
        $team = $this->team('Unit A');
        $owner = $this->ownerOf($team);
        $super = $this->superAdmin();

        Sanctum::actingAs($owner);

        $this->putJson("/api/v1/users/{$super->id}/access", [
            'permissions' => ['assets.view'],
        ])->assertForbidden();

        $this->putJson("/api/v1/users/{$owner->id}/access", [
            'permissions' => ['assets.view'],
        ])->assertForbidden();
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
            'permissions' => ['assets.view'],
        ])->assertOk();
        $this->putJson("/api/v1/users/{$viewer->id}/access", [
            'permissions' => ['assets.view'],
        ])->assertOk();
        $this->putJson("/api/v1/users/{$peer->id}/access", [
            'permissions' => ['assets.view'],
        ])->assertForbidden();
    }

    public function test_super_admin_can_set_access_for_any_unit(): void
    {
        $team = $this->team('Unit A');
        $staff = $this->person($team);

        Sanctum::actingAs($this->superAdmin());

        // Even a permission the actor's own role does not enumerate is honoured.
        $this->putJson("/api/v1/users/{$staff->id}/access", [
            'permissions' => ['network.view', 'network.create'],
        ])->assertOk();

        $this->assertTrue($staff->fresh()->can('network.view'));
        $this->assertTrue($staff->fresh()->can('network.create'));
        $this->assertFalse($staff->fresh()->can('assets.view'));
    }

    public function test_unknown_permissions_are_rejected(): void
    {
        $team = $this->team('Unit A');
        $staff = $this->person($team);

        Sanctum::actingAs($this->ownerOf($team));

        $this->putJson("/api/v1/users/{$staff->id}/access", [
            'permissions' => ['assets.view', 'not.a.permission'],
        ])->assertStatus(422);
    }

    public function test_access_matrix_does_not_expose_super_admin_editing(): void
    {
        $team = $this->team('Unit A');
        $super = $this->superAdmin();
        $owner = $this->ownerOf($team);

        Sanctum::actingAs($owner);

        // The owner cannot even open the matrix of a super admin.
        $this->getJson("/api/v1/users/{$super->id}/access")->assertForbidden();
    }

    public function test_owner_without_manage_access_cannot_edit_access(): void
    {
        $team = $this->team('Unit A');
        $staff = $this->person($team);
        $owner = User::factory()->create(['role' => User::ROLE_OWNER, 'team_id' => $team->id]);
        $owner->syncRoleToSpatie();
        $owner->syncModules(['assets']);

        Sanctum::actingAs($owner);

        // Owning an asset module alone is not enough: the super admin must
        // hand out the access-administration privilege first.
        $this->getJson("/api/v1/users/{$staff->id}/access")->assertForbidden();
        $this->putJson("/api/v1/users/{$staff->id}/access", [
            'permissions' => ['assets.view'],
        ])->assertForbidden();
    }

    public function test_owner_passes_down_only_the_modules_they_were_given(): void
    {
        $team = $this->team('Unit A');
        $staff = $this->person($team);
        $owner = User::factory()->create(['role' => User::ROLE_OWNER, 'team_id' => $team->id]);
        $owner->syncRoleToSpatie();
        $owner->syncModules(['assets']);
        // A super admin entrusts the owner with the access-administration
        // privilege and the assets module - and nothing else.
        $owner->syncAccessPermissions([
            'assets.view',
            'users.manage_access',
        ]);
        $this->assertTrue($owner->fresh()->can('users.manage_access'));

        Sanctum::actingAs($owner);

        $this->getJson("/api/v1/users/{$staff->id}/access")->assertOk();

        // Holding any action inside a module opens that whole module, but only
        // that module - and never the ability to hand out access rights itself.
        $this->putJson("/api/v1/users/{$staff->id}/access", [
            'permissions' => ['assets.delete', 'users.view', 'users.manage_access'],
        ])->assertOk();

        $fresh = $staff->fresh();

        $this->assertTrue($fresh->can('assets.delete'));
        $this->assertFalse($fresh->can('users.view'));
        $this->assertFalse($fresh->can('users.manage_access'));
    }

    public function test_granting_a_catalogue_permission_from_user_management_creates_the_row(): void
    {
        $team = $this->team('Unit A');
        $owner = $this->ownerOf($team);

        // Simulate a production database that was never re-seeded after a new
        // permission was added to the catalogue.
        \Spatie\Permission\Models\Permission::query()
            ->where('name', 'users.manage_access')
            ->delete();
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        $this->assertFalse(
            \Spatie\Permission\Models\Permission::query()
                ->where('name', 'users.manage_access')
                ->exists()
        );

        // A super admin hands the permission straight from User Management.
        Sanctum::actingAs($this->superAdmin());

        $this->putJson("/api/v1/users/{$owner->id}/access", [
            'permissions' => ['users.manage_access', 'assets.view'],
        ])->assertOk();

        $this->assertTrue($owner->fresh()->can('users.manage_access'));
        $this->assertTrue($owner->fresh()->can('assets.view'));
        $this->assertTrue(
            \Spatie\Permission\Models\Permission::query()
                ->where('name', 'users.manage_access')
                ->exists()
        );
    }
}
