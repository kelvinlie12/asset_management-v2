<?php

namespace Tests\Feature;

use App\Models\Team;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserRoleAssignmentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    private function team(string $name, string $slug): Team
    {
        return Team::create(['name' => $name, 'slug' => $slug, 'description' => 'desc']);
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

    private function admin(?Team $team = null): User
    {
        $user = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'team_id' => $team?->id,
        ]);
        $user->syncRoleToSpatie();

        return $user;
    }

    /**
     * An owner is built with users.create so the escalation attempt reaches the
     * role check instead of being blocked by a missing permission first.
     */
    private function ownerWithUserManagement(Team $team): User
    {
        $user = User::factory()->create([
            'role' => User::ROLE_OWNER,
            'team_id' => $team->id,
        ]);
        $user->syncRoleToSpatie();
        $user->syncModules(['vehicles']);
        $user->givePermissionTo(\Spatie\Permission\Models\Permission::firstOrCreate(
            ['name' => 'users.create', 'guard_name' => 'web'],
        ));
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        return $user->fresh();
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'New Person',
            'email' => 'new.person@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => User::ROLE_STAFF,
        ], $overrides);
    }

    public function test_admin_cannot_create_a_super_admin(): void
    {
        Sanctum::actingAs($this->admin($this->team('Unit A', 'unit-a')));

        $this->postJson('/api/v1/users', $this->payload([
            'role' => User::ROLE_SUPER_ADMIN,
        ]))->assertForbidden();

        $this->assertDatabaseMissing('users', ['email' => 'new.person@example.com']);
    }

    public function test_admin_cannot_create_an_owner(): void
    {
        Sanctum::actingAs($this->admin($this->team('Unit A', 'unit-a')));

        $this->postJson('/api/v1/users', $this->payload([
            'role' => User::ROLE_OWNER,
        ]))->assertForbidden();

        $this->assertDatabaseMissing('users', ['email' => 'new.person@example.com']);
    }

    public function test_admin_cannot_create_another_admin(): void
    {
        Sanctum::actingAs($this->admin($this->team('Unit A', 'unit-a')));

        $this->postJson('/api/v1/users', $this->payload([
            'role' => User::ROLE_ADMIN,
        ]))->assertForbidden();

        $this->assertDatabaseMissing('users', ['email' => 'new.person@example.com']);
    }

    public function test_owner_cannot_create_a_super_admin(): void
    {
        $team = $this->team('Unit A', 'unit-a');
        Sanctum::actingAs($this->ownerWithUserManagement($team));

        $this->postJson('/api/v1/users', $this->payload([
            'role' => User::ROLE_SUPER_ADMIN,
        ]))->assertForbidden();

        $this->assertDatabaseMissing('users', ['email' => 'new.person@example.com']);
    }

    public function test_owner_cannot_create_an_owner_or_an_admin(): void
    {
        $team = $this->team('Unit A', 'unit-a');
        Sanctum::actingAs($this->ownerWithUserManagement($team));

        foreach ([User::ROLE_OWNER, User::ROLE_ADMIN] as $role) {
            $this->postJson('/api/v1/users', $this->payload([
                'role' => $role,
                'email' => "escalate.{$role}@example.com",
            ]))->assertForbidden();

            $this->assertDatabaseMissing('users', ['email' => "escalate.{$role}@example.com"]);
        }
    }

    public function test_admin_can_still_create_staff_and_viewer(): void
    {
        $team = $this->team('Unit A', 'unit-a');
        Sanctum::actingAs($this->admin($team));

        foreach ([User::ROLE_STAFF, User::ROLE_VIEWER] as $role) {
            $email = "allowed.{$role}@example.com";

            $this->postJson('/api/v1/users', $this->payload([
                'role' => $role,
                'email' => $email,
            ]))->assertCreated();

            $this->assertDatabaseHas('users', [
                'email' => $email,
                'role' => $role,
                'team_id' => $team->id,
            ]);
        }
    }

    public function test_owner_is_pinned_to_their_own_unit_when_creating_staff(): void
    {
        $teamA = $this->team('Unit A', 'unit-a');
        $teamB = $this->team('Unit B', 'unit-b');
        Sanctum::actingAs($this->ownerWithUserManagement($teamA));

        // The owner tries to place a staff member into another unit.
        $this->postJson('/api/v1/users', $this->payload([
            'role' => User::ROLE_STAFF,
            'team_id' => $teamB->id,
        ]))->assertCreated();

        $this->assertDatabaseHas('users', [
            'email' => 'new.person@example.com',
            'team_id' => $teamA->id,
        ]);
    }

    public function test_admin_cannot_promote_an_existing_user_to_owner(): void
    {
        $team = $this->team('Unit A', 'unit-a');
        $staff = User::factory()->create([
            'role' => User::ROLE_STAFF,
            'team_id' => $team->id,
        ]);
        $staff->syncRoleToSpatie();

        Sanctum::actingAs($this->admin($team));

        $this->putJson("/api/v1/users/{$staff->id}", [
            'role' => User::ROLE_OWNER,
        ])->assertForbidden();

        $this->assertSame(User::ROLE_STAFF, $staff->fresh()->role);
    }

    public function test_admin_cannot_promote_an_existing_user_via_assign_role_endpoint(): void
    {
        $team = $this->team('Unit A', 'unit-a');
        $staff = User::factory()->create([
            'role' => User::ROLE_STAFF,
            'team_id' => $team->id,
        ]);
        $staff->syncRoleToSpatie();

        Sanctum::actingAs($this->admin($team));

        $this->putJson("/api/v1/users/{$staff->id}/assign-role", [
            'role' => User::ROLE_SUPER_ADMIN,
        ])->assertForbidden();

        $this->assertSame(User::ROLE_STAFF, $staff->fresh()->role);
    }

    public function test_super_admin_can_still_create_every_role(): void
    {
        $team = $this->team('Unit A', 'unit-a');
        Sanctum::actingAs($this->superAdmin());

        foreach ([User::ROLE_SUPER_ADMIN, User::ROLE_ADMIN, User::ROLE_OWNER, User::ROLE_STAFF] as $role) {
            $email = "sa.{$role}@example.com";

            $this->postJson('/api/v1/users', $this->payload([
                'role' => $role,
                'email' => $email,
                'team_id' => $team->id,
            ]))->assertCreated();

            $this->assertDatabaseHas('users', ['email' => $email, 'role' => $role]);
        }
    }

    public function test_an_unknown_role_is_rejected_for_a_super_admin_too(): void
    {
        Sanctum::actingAs($this->superAdmin());

        $this->postJson('/api/v1/users', $this->payload([
            'role' => 'superadmin',
        ]))->assertUnprocessable();
    }
}
