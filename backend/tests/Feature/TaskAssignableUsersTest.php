<?php

namespace Tests\Feature;

use App\Models\Team;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskAssignableUsersTest extends TestCase
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

    private function userFor(?Team $team, string $role): User
    {
        $user = User::factory()->create(['role' => $role, 'team_id' => $team?->id]);
        $user->syncRoleToSpatie();

        return $user;
    }

    public function test_unit_user_only_sees_own_unit_and_super_admins(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');

        $viewer = $this->userFor($teamA, User::ROLE_STAFF);
        $mate = $this->userFor($teamA, User::ROLE_STAFF);
        $stranger = $this->userFor($teamB, User::ROLE_STAFF);
        $superAdmin = $this->userFor(null, User::ROLE_SUPER_ADMIN);

        Sanctum::actingAs($viewer);

        $ids = collect($this->getJson('/api/v1/tasks/assignable-users')
            ->assertOk()
            ->json('data.users'))->pluck('id');

        $this->assertTrue($ids->contains($mate->id));
        $this->assertTrue($ids->contains($superAdmin->id));
        $this->assertFalse($ids->contains($stranger->id));
    }

    public function test_super_admin_sees_every_active_user(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');

        $a = $this->userFor($teamA, User::ROLE_STAFF);
        $b = $this->userFor($teamB, User::ROLE_STAFF);
        $superAdmin = $this->userFor(null, User::ROLE_SUPER_ADMIN);

        Sanctum::actingAs($superAdmin);

        $ids = collect($this->getJson('/api/v1/tasks/assignable-users')
            ->assertOk()
            ->json('data.users'))->pluck('id');

        $this->assertTrue($ids->contains($a->id));
        $this->assertTrue($ids->contains($b->id));
    }
}
