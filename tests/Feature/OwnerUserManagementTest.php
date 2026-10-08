<?php

namespace Tests\Feature;

use App\Models\Team;
use App\Models\User;
use App\Support\ModuleCatalog;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OwnerUserManagementTest extends TestCase
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

    private function ownerFor(Team $team): User
    {
        $user = User::factory()->create(['role' => User::ROLE_OWNER, 'team_id' => $team->id]);
        $user->syncRoleToSpatie();
        $user->syncModules(ModuleCatalog::DEFAULT_OWNER_MODULES);

        return $user;
    }

    public function test_default_owner_modules_include_users(): void
    {
        $this->assertContains('users', ModuleCatalog::DEFAULT_OWNER_MODULES);
    }

    public function test_owner_edits_staff_and_viewer_in_own_unit(): void
    {
        $team = $this->team('Unit A');
        $staff = User::factory()->create(['role' => User::ROLE_STAFF, 'team_id' => $team->id]);
        $viewer = User::factory()->create(['role' => User::ROLE_VIEWER, 'team_id' => $team->id]);

        Sanctum::actingAs($this->ownerFor($team));

        $this->putJson("/api/v1/users/{$staff->id}", [
            'name' => 'Staff Baru',
            'email' => $staff->email,
            'role' => User::ROLE_STAFF,
            'status' => User::STATUS_ACTIVE,
        ])->assertOk();

        $this->assertSame('Staff Baru', $staff->fresh()->name);
        $this->assertSame($team->id, $staff->fresh()->team_id);

        $this->putJson("/api/v1/users/{$viewer->id}", [
            'name' => 'Viewer Baru',
            'email' => $viewer->email,
            'role' => User::ROLE_VIEWER,
            'status' => User::STATUS_INACTIVE,
        ])->assertOk();

        $this->assertSame('Viewer Baru', $viewer->fresh()->name);
        $this->assertSame(User::STATUS_INACTIVE, $viewer->fresh()->status);
    }

    public function test_owner_cannot_edit_owner_admin_superadmin_or_self(): void
    {
        $team = $this->team('Unit A');
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN, 'team_id' => $team->id]);
        $peer = $this->ownerFor($team);
        $super = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN, 'team_id' => null]);
        $acting = $this->ownerFor($team);

        Sanctum::actingAs($acting);

        $this->putJson("/api/v1/users/{$admin->id}", ['name' => 'x'])->assertForbidden();
        $this->putJson("/api/v1/users/{$peer->id}", ['name' => 'x'])->assertForbidden();
        $this->putJson("/api/v1/users/{$super->id}", ['name' => 'x'])->assertForbidden();
        $this->putJson("/api/v1/users/{$acting->id}", ['name' => 'x'])->assertForbidden();
    }

    public function test_owner_without_users_module_cannot_manage_users(): void
    {
        $team = $this->team('Unit A');
        $staff = User::factory()->create(['role' => User::ROLE_STAFF, 'team_id' => $team->id]);
        $owner = User::factory()->create(['role' => User::ROLE_OWNER, 'team_id' => $team->id]);
        $owner->syncRoleToSpatie();
        $owner->syncModules(['assets']);

        Sanctum::actingAs($owner);

        $this->putJson("/api/v1/users/{$staff->id}", ['name' => 'x'])->assertForbidden();
    }
}