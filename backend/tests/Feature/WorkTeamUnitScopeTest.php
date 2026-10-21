<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Team;
use App\Models\User;
use App\Models\WorkTeam;
use App\Support\ModuleCatalog;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WorkTeamUnitScopeTest extends TestCase
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

    private function workTeamFor(Team $team, string $name): WorkTeam
    {
        return WorkTeam::create([
            'team_id' => $team->id,
            'name' => $name,
            'status' => WorkTeam::STATUS_ACTIVE,
        ]);
    }

    public function test_each_unit_only_lists_its_own_work_teams(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $this->workTeamFor($teamA, 'Tim A');
        $this->workTeamFor($teamB, 'Tim B');

        Sanctum::actingAs($this->userFor($teamA, User::ROLE_OWNER));

        $names = collect($this->getJson('/api/v1/work-teams')->assertOk()->json('data.data'))
            ->pluck('name')
            ->all();

        $this->assertContains('Tim A', $names);
        $this->assertNotContains('Tim B', $names);
    }

    public function test_owner_created_work_team_is_pinned_to_own_unit(): void
    {
        $teamA = $this->team('Unit A');
        Sanctum::actingAs($this->userFor($teamA, User::ROLE_OWNER));

        $this->postJson('/api/v1/work-teams', ['name' => 'Tim Baru'])
            ->assertCreated()
            ->assertJsonPath('data.work_team.team_id', $teamA->id);

        $this->assertDatabaseHas('work_teams', ['name' => 'Tim Baru', 'team_id' => $teamA->id]);
    }

    public function test_owner_cannot_open_another_units_work_team(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $other = $this->workTeamFor($teamB, 'Tim B');

        Sanctum::actingAs($this->userFor($teamA, User::ROLE_OWNER));

        $this->getJson("/api/v1/work-teams/{$other->id}")->assertForbidden();
        $this->putJson("/api/v1/work-teams/{$other->id}", ['name' => 'Hijack'])->assertForbidden();
        $this->deleteJson("/api/v1/work-teams/{$other->id}")->assertForbidden();
    }

    public function test_work_team_with_assets_cannot_be_deleted(): void
    {
        $teamA = $this->team('Unit A');
        $workTeam = $this->workTeamFor($teamA, 'Tim A');
        Asset::create([
            'asset_code' => 'AST-001',
            'name' => 'Laptop',
            'team_id' => $teamA->id,
            'work_team_id' => $workTeam->id,
            'condition' => Asset::CONDITION_GOOD,
            'usage_status' => Asset::USAGE_IN_STORAGE,
        ]);

        Sanctum::actingAs($this->userFor($teamA, User::ROLE_OWNER));

        $this->deleteJson("/api/v1/work-teams/{$workTeam->id}")->assertStatus(422);
        $this->assertDatabaseHas('work_teams', ['id' => $workTeam->id]);
    }

    public function test_lookups_carry_the_units_work_teams(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $this->workTeamFor($teamA, 'Tim A');
        $this->workTeamFor($teamB, 'Tim B');

        Sanctum::actingAs($this->userFor($teamA, User::ROLE_OWNER));

        $names = collect($this->getJson('/api/v1/lookups')->assertOk()->json('data.work_teams'))
            ->pluck('name')
            ->all();

        $this->assertContains('Tim A', $names);
        $this->assertNotContains('Tim B', $names);
    }

    public function test_super_admin_may_leave_a_work_team_global(): void
    {
        Sanctum::actingAs($this->superAdmin());

        $this->postJson('/api/v1/work-teams', ['name' => 'Tim Global'])
            ->assertCreated()
            ->assertJsonPath('data.work_team.team_id', null);
    }
}
