<?php

namespace Tests\Feature;

use Spatie\Permission\Models\Permission;
use App\Models\Team;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SuperAdminAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
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

    public function test_super_admin_can_do_every_assigned_ability(): void
    {
        $superAdmin = $this->superAdmin();

        foreach (Permission::pluck('name') as $name) {
            $this->assertTrue(
                $superAdmin->can($name),
                "Super admin should be able to: {$name}"
            );
        }
    }

    public function test_super_admin_abilities_include_a_brand_new_permission(): void
    {
        $superAdmin = $this->superAdmin();

        // A permission that exists in the system but is not assigned to the role.
        Permission::create(['name' => 'assets.teleport', 'guard_name' => 'web']);

        $this->assertContains('assets.teleport', $superAdmin->fresh()->getRoleAbilities());
        $this->assertTrue($superAdmin->fresh()->can('assets.teleport'));
    }

    public function test_super_admin_can_manage_every_unit(): void
    {
        $teamA = Team::create(['name' => 'Unit A', 'slug' => 'unit-a', 'description' => 'a']);
        $teamB = Team::create(['name' => 'Unit B', 'slug' => 'unit-b', 'description' => 'b']);

        Sanctum::actingAs($this->superAdmin());

        $teams = $this->getJson('/api/v1/teams')->assertOk();
        $slugs = array_column($teams->json('data.data'), 'slug');
        $this->assertContains((string) $teamA->slug, $slugs);
        $this->assertContains((string) $teamB->slug, $slugs);

        // And can edit any unit, not only their own.
        $this->putJson('/api/v1/teams/'.$teamB->id, [
            'name' => 'Unit B Baru',
        ])->assertOk();
    }

    public function test_super_admin_is_not_blocked_by_unit_scope(): void
    {
        $team = Team::create(['name' => 'Unit A', 'slug' => 'unit-a', 'description' => 'a']);

        Sanctum::actingAs($this->superAdmin());

        // Creating a unit is super-admin-only, and the super admin passes.
        $this->postJson('/api/v1/teams', ['name' => 'Unit C'])->assertCreated();
        $this->assertDatabaseHas('teams', ['name' => 'Unit C']);

        // Rooms may be created for any unit.
        $this->postJson('/api/v1/rooms', [
            'name' => 'Ruang Superadmin',
            'team_id' => $team->id,
        ])->assertCreated();
    }

    public function test_super_admin_can_manage_other_super_admins(): void
    {
        $superAdmin = $this->superAdmin();
        $otherAdmin = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
            'team_id' => null,
        ]);

        Sanctum::actingAs($superAdmin);

        $this->getJson('/api/v1/users/'.$otherAdmin->id)->assertOk();
        $this->putJson('/api/v1/users/'.$otherAdmin->id, [
            'name' => 'Super Admin 2',
        ])->assertOk();
        $this->deleteJson('/api/v1/users/'.$otherAdmin->id)->assertOk();
    }
}