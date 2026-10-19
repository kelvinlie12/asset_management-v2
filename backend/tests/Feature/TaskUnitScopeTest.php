<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * A task report belongs to a unit (its reporter's team). A unit only ever sees
 * its own reports ("beda unit, beda task"); a super admin — or a user handed the
 * `tasks.manage_all` grant — sees the whole board.
 */
class TaskUnitScopeTest extends TestCase
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

    private function task(?Team $team, User $reporter): Task
    {
        return Task::create([
            'title' => 'Report for '.($team?->name ?? 'no unit'),
            'category' => Task::CATEGORY_BUG_SYSTEM,
            'description' => 'Something broke',
            'priority' => Task::PRIORITY_MEDIUM,
            'status' => Task::STATUS_OPEN,
            'reporter_id' => $reporter->id,
            'team_id' => $team?->id,
        ]);
    }

    private function listedIds(): array
    {
        return collect($this->getJson('/api/v1/tasks?per_page=50')
            ->assertOk()
            ->json('data.data'))
            ->pluck('id')
            ->all();
    }

    public function test_unit_user_sees_only_its_own_reports(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');

        $userA = $this->userFor($teamA, User::ROLE_STAFF);
        $userB = $this->userFor($teamB, User::ROLE_STAFF);
        $superAdmin = $this->userFor(null, User::ROLE_SUPER_ADMIN);

        $taskA = $this->task($teamA, $userA);
        $taskB = $this->task($teamB, $userB);
        $taskGlobal = $this->task(null, $superAdmin);

        Sanctum::actingAs($userA);

        $ids = $this->listedIds();

        $this->assertContains($taskA->id, $ids);
        $this->assertNotContains($taskB->id, $ids);
        $this->assertNotContains($taskGlobal->id, $ids);
    }

    public function test_super_admin_sees_every_units_reports(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');

        $userA = $this->userFor($teamA, User::ROLE_STAFF);
        $userB = $this->userFor($teamB, User::ROLE_STAFF);
        $superAdmin = $this->userFor(null, User::ROLE_SUPER_ADMIN);

        $taskA = $this->task($teamA, $userA);
        $taskB = $this->task($teamB, $userB);
        $taskGlobal = $this->task(null, $superAdmin);

        Sanctum::actingAs($superAdmin);

        $ids = $this->listedIds();

        $this->assertContains($taskA->id, $ids);
        $this->assertContains($taskB->id, $ids);
        $this->assertContains($taskGlobal->id, $ids);
    }

    public function test_manage_all_holder_sees_every_units_reports(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');

        $userA = $this->userFor($teamA, User::ROLE_STAFF);
        $userB = $this->userFor($teamB, User::ROLE_STAFF);

        $taskA = $this->task($teamA, $userA);
        $taskB = $this->task($teamB, $userB);

        $userA->givePermissionTo('tasks.manage_all');

        Sanctum::actingAs($userA);

        $ids = $this->listedIds();

        $this->assertContains($taskA->id, $ids);
        $this->assertContains($taskB->id, $ids);
    }

    public function test_unit_user_cannot_open_another_units_report(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');

        $userA = $this->userFor($teamA, User::ROLE_STAFF);
        $userB = $this->userFor($teamB, User::ROLE_STAFF);
        $foreign = $this->task($teamB, $userB);

        Sanctum::actingAs($userA);

        $this->getJson("/api/v1/tasks/{$foreign->id}")->assertForbidden();
    }

    public function test_unit_user_cannot_work_another_units_report(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');

        $userA = $this->userFor($teamA, User::ROLE_STAFF);
        $userB = $this->userFor($teamB, User::ROLE_STAFF);
        $foreign = $this->task($teamB, $userB);

        Sanctum::actingAs($userA);

        $this->putJson("/api/v1/tasks/{$foreign->id}", [
            'status' => 'in_progress',
        ])->assertForbidden();
    }

    public function test_report_inherits_the_reporters_unit(): void
    {
        $teamA = $this->team('Unit A');
        $userA = $this->userFor($teamA, User::ROLE_STAFF);

        Sanctum::actingAs($userA);

        $this->postJson('/api/v1/tasks', [
            'title' => 'New report',
            'category' => Task::CATEGORY_MENU,
            'description' => 'The menu is broken',
            'priority' => Task::PRIORITY_HIGH,
        ])
            ->assertCreated()
            ->assertJsonPath('data.task.team_id', $teamA->id);
    }
}
