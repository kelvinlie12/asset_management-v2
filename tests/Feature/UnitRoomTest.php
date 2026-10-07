<?php

namespace Tests\Feature;

use App\Models\Room;
use App\Models\Team;
use App\Models\User;
use App\Support\ModuleCatalog;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UnitRoomTest extends TestCase
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

    /**
     * A room is created for exactly one unit.
     */
    private function room(Team $team, string $name): Room
    {
        return Room::create([
            'name' => $name,
            'location' => 'Lantai 1',
            'status' => Room::STATUS_ACTIVE,
            'team_id' => $team->id,
        ]);
    }

    private function ownerOf(Team $team): User
    {
        $user = User::factory()->create(['role' => 'owner', 'team_id' => $team->id]);
        $user->syncRoleToSpatie();

        // These cases exercise room and reference scoping, not menu gating, so
        // owners get every module. Module access has its own test class.
        $user->syncModules(ModuleCatalog::keys());

        return $user;
    }

    private function superAdmin(): User
    {
        $user = User::factory()->create(['role' => 'super_admin', 'team_id' => null]);
        $user->syncRoleToSpatie();

        return $user;
    }

    public function test_room_list_only_shows_own_unit_rooms(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $roomA = $this->room($teamA, 'Ruang A');
        $roomB = $this->room($teamB, 'Ruang B');

        Sanctum::actingAs($this->ownerOf($teamA));

        $response = $this->getJson('/api/v1/rooms');

        $response->assertOk();
        $names = array_column($response->json('data.data'), 'name');
        $this->assertContains($roomA->name, $names);
        $this->assertNotContains($roomB->name, $names);
    }

    public function test_room_list_is_not_shared_between_units_with_the_same_room_name(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $this->room($teamA, 'Gudang');
        $this->room($teamB, 'Gudang');

        Sanctum::actingAs($this->ownerOf($teamA));

        $response = $this->getJson('/api/v1/rooms');

        $response->assertOk();
        $this->assertSame(1, $response->json('data.meta.total'));
        $this->assertSame($teamA->id, $response->json('data.data.0.team_id'));
    }

    public function test_owner_cannot_touch_another_units_room(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $roomB = $this->room($teamB, 'Ruang B');

        Sanctum::actingAs($this->ownerOf($teamA));

        $this->getJson('/api/v1/rooms/'.$roomB->id)->assertForbidden();
        $this->putJson('/api/v1/rooms/'.$roomB->id, ['name' => 'Dibajak'])->assertForbidden();
        $this->deleteJson('/api/v1/rooms/'.$roomB->id)->assertForbidden();
    }

    public function test_owner_created_room_is_owned_by_own_unit(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');

        Sanctum::actingAs($this->ownerOf($teamA));

        // The owner asks for another unit; the request pins it to their own.
        $response = $this->postJson('/api/v1/rooms', [
            'name' => 'Ruang Baru',
            'location' => 'Lantai 2',
            'team_id' => $teamB->id,
        ]);

        $response->assertCreated();

        $room = Room::findOrFail($response->json('data.room.id'));
        $this->assertSame($teamA->id, $room->team_id);
        $this->assertSame($teamA->id, $response->json('data.room.team_id'));
    }

    public function test_owner_cannot_move_their_room_to_another_unit(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $roomA = $this->room($teamA, 'Ruang A');

        Sanctum::actingAs($this->ownerOf($teamA));

        $this->putJson('/api/v1/rooms/'.$roomA->id, ['team_id' => $teamB->id])
            ->assertStatus(422)
            ->assertJsonValidationErrors('team_id');

        $this->assertSame($teamA->id, $roomA->fresh()->team_id);
    }

    public function test_super_admin_must_pick_a_unit_when_creating_a_room(): void
    {
        $teamA = $this->team('Unit A');

        Sanctum::actingAs($this->superAdmin());

        $this->postJson('/api/v1/rooms', ['name' => 'Tanpa Unit'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('team_id');

        $response = $this->postJson('/api/v1/rooms', [
            'name' => 'Ruang Superadmin',
            'team_id' => $teamA->id,
        ]);

        $response->assertCreated();
        $this->assertSame($teamA->id, Room::findOrFail($response->json('data.room.id'))->team_id);
    }

    public function test_team_has_no_room_assignment_endpoint_anymore(): void
    {
        $teamA = $this->team('Unit A');
        $roomA = $this->room($teamA, 'Ruang A');

        Sanctum::actingAs($this->superAdmin());

        $this->putJson('/api/v1/teams/'.$teamA->id.'/rooms', ['room_ids' => [$roomA->id]])
            ->assertNotFound();
    }

    public function test_super_admin_can_move_a_room_to_another_unit(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $roomA = $this->room($teamA, 'Ruang A');

        Sanctum::actingAs($this->superAdmin());

        $this->putJson('/api/v1/rooms/'.$roomA->id, ['team_id' => $teamB->id])->assertOk();

        $this->assertSame($teamB->id, $roomA->fresh()->team_id);
        $this->assertSame([$roomA->id], $teamB->rooms()->pluck('rooms.id')->all());
    }

    public function test_team_creation_does_not_take_rooms(): void
    {
        $teamA = $this->team('Unit A');
        $roomA = $this->room($teamA, 'Ruang A');

        Sanctum::actingAs($this->superAdmin());

        $response = $this->postJson('/api/v1/teams', [
            'name' => 'Unit Baru',
            'room_ids' => [Room::query()->value('id')],
        ]);

        $response->assertCreated();
        $this->assertSame(0, $response->json('data.team.rooms_count'));
        $this->assertNull($response->json('data.team.rooms'));
        // The ignored room_ids did not steal the room from its own unit.
        $this->assertSame($teamA->id, $roomA->fresh()->team_id);
    }

    public function test_owner_cannot_reference_another_units_room_on_an_asset(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $roomB = $this->room($teamB, 'Ruang B');

        Sanctum::actingAs($this->ownerOf($teamA));

        $this->postJson('/api/v1/assets', [
            'asset_code' => 'AST-X1',
            'name' => 'Aset X',
            'condition' => 'GOOD',
            'usage_status' => 'IN_STORAGE',
            'room_id' => $roomB->id,
        ])->assertJsonValidationErrors('room_id');
    }

    public function test_owner_cannot_assign_a_user_from_another_unit(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $foreignUser = User::factory()->create(['role' => 'staff', 'team_id' => $teamB->id]);

        Sanctum::actingAs($this->ownerOf($teamA));

        $this->postJson('/api/v1/assets', [
            'asset_code' => 'AST-Y1',
            'name' => 'Aset Y',
            'condition' => 'GOOD',
            'usage_status' => 'IN_STORAGE',
            'assigned_user_id' => $foreignUser->id,
        ])->assertJsonValidationErrors('assigned_user_id');
    }
}
