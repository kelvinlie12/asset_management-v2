<?php

namespace Tests\Feature;

use App\Models\Room;
use App\Models\Team;
use App\Models\User;
use App\Models\VehicleAsset;
use App\Support\ModuleCatalog;
use App\Support\UnitScope;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VehicleUnitScopeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    private function team(string $name, string $slug): Team
    {
        return Team::create([
            'name' => $name,
            'slug' => $slug,
            'description' => $name,
        ]);
    }

    private function room(Team $team, string $name): Room
    {
        return Room::create([
            'name' => $name,
            'location' => 'Lantai 1',
            'status' => Room::STATUS_ACTIVE,
            'team_id' => $team->id,
        ]);
    }

    private function ownerOf(Team $team, array $modules = ['vehicles']): User
    {
        $user = User::factory()->create([
            'role' => User::ROLE_OWNER,
            'team_id' => $team->id,
        ]);
        $user->syncRoleToSpatie();
        $user->syncModules($modules);

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

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function vehicle(Team $team, array $overrides = []): VehicleAsset
    {
        static $seq = 0;
        $seq++;

        return VehicleAsset::create(array_merge([
            'asset_code' => 'VHC-'.str_pad((string) $seq, 3, '0', STR_PAD_LEFT),
            'brand' => 'Honda',
            'model' => 'Vario 160',
            'year' => '2023',
            'plate_number' => 'B '.$seq.' ABC',
            'engine_number' => 'ENG-'.$seq,
            'chassis_number' => 'CHS-'.$seq,
            'placement_date' => '2024-01-15',
            'tax_due_date' => '2025-01-15',
            'condition' => VehicleAsset::CONDITION_GOOD,
            'usage_status' => VehicleAsset::USAGE_IN_USE,
            'team_id' => $team->id,
        ], $overrides));
    }

    public function test_vehicle_list_only_shows_own_unit_vehicles(): void
    {
        $teamA = $this->team('Unit A', 'unit-a');
        $teamB = $this->team('Unit B', 'unit-b');

        $mine = $this->vehicle($teamA, ['asset_code' => 'VHC-AAA']);
        $theirs = $this->vehicle($teamB, ['asset_code' => 'VHC-BBB']);

        Sanctum::actingAs($this->ownerOf($teamA));

        $response = $this->getJson('/api/v1/vehicles')->assertOk();

        $codes = array_column($response->json('data.data'), 'asset_code');

        $this->assertContains($mine->asset_code, $codes);
        $this->assertNotContains($theirs->asset_code, $codes);
    }

    public function test_owner_cannot_open_another_units_vehicle(): void
    {
        $teamA = $this->team('Unit A', 'unit-a');
        $teamB = $this->team('Unit B', 'unit-b');

        $theirs = $this->vehicle($teamB);

        Sanctum::actingAs($this->ownerOf($teamA));

        $this->getJson("/api/v1/vehicles/{$theirs->id}")->assertForbidden();
        $this->putJson("/api/v1/vehicles/{$theirs->id}", [])->assertForbidden();
        $this->deleteJson("/api/v1/vehicles/{$theirs->id}")->assertForbidden();
    }

    public function test_owner_vehicle_is_always_pinned_to_their_own_unit(): void
    {
        $teamA = $this->team('Unit A', 'unit-a');
        $teamB = $this->team('Unit B', 'unit-b');

        Sanctum::actingAs($this->ownerOf($teamA));

        $response = $this->postJson('/api/v1/vehicles', [
            'brand' => 'Yamaha',
            'model' => 'NMAX 155',
            'plate_number' => 'D 9999 XYZ',
            'engine_number' => 'ENG-X',
            'chassis_number' => 'CHS-X',
            'placement_date' => '2024-02-01',
            'tax_due_date' => '2025-02-01',
            'condition' => VehicleAsset::CONDITION_GOOD,
            'usage_status' => VehicleAsset::USAGE_IN_USE,
            // An owner asking for another unit must still land in their own.
            'team_id' => $teamB->id,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.vehicle.team.id', $teamA->id);

        $this->assertSame(
            $teamA->id,
            VehicleAsset::where('plate_number', 'D 9999 XYZ')->value('team_id')
        );
    }

    public function test_super_admin_vehicle_without_a_unit_is_rejected(): void
    {
        Sanctum::actingAs($this->superAdmin());

        // A vehicle with no company would be invisible to every owner.
        $this->postJson('/api/v1/vehicles', [
            'brand' => 'Honda',
            'model' => 'Beat',
            'plate_number' => 'B 7777 TUV',
            'engine_number' => 'ENG-Y',
            'chassis_number' => 'CHS-Y',
            'placement_date' => '2024-02-01',
            'tax_due_date' => '2025-02-01',
            'condition' => VehicleAsset::CONDITION_GOOD,
            'usage_status' => VehicleAsset::USAGE_IN_USE,
        ])->assertStatus(422);

        $this->assertDatabaseMissing('vehicle_assets', ['plate_number' => 'B 7777 TUV']);
    }

    public function test_super_admin_vehicle_keeps_its_unit_when_none_is_posted_on_update(): void
    {
        $teamA = $this->team('Unit A', 'unit-a');
        $mine = $this->vehicle($teamA, ['asset_code' => 'VHC-KEEP']);

        Sanctum::actingAs($this->superAdmin());

        $this->putJson("/api/v1/vehicles/{$mine->id}", [
            'brand' => 'Honda',
            'model' => 'Vario 160',
            'plate_number' => $mine->plate_number,
            'engine_number' => $mine->engine_number,
            'chassis_number' => $mine->chassis_number,
            'placement_date' => '2024-01-15',
            'tax_due_date' => '2025-06-01',
            'condition' => VehicleAsset::CONDITION_GOOD,
            'usage_status' => VehicleAsset::USAGE_IN_USE,
            'team_id' => null,
        ])->assertOk();

        $this->assertSame($teamA->id, $mine->fresh()->team_id);
    }

    public function test_super_admin_can_move_a_vehicle_to_another_unit(): void
    {
        $teamA = $this->team('Unit A', 'unit-a');
        $teamB = $this->team('Unit B', 'unit-b');

        $mine = $this->vehicle($teamA, ['asset_code' => 'VHC-MOVE']);

        Sanctum::actingAs($this->superAdmin());

        $this->putJson("/api/v1/vehicles/{$mine->id}", [
            'team_id' => $teamB->id,
        ])->assertOk()
            ->assertJsonPath('data.vehicle.team.id', $teamB->id);

        $this->assertSame($teamB->id, $mine->fresh()->team_id);
    }

    public function test_moving_a_vehicle_drops_the_previous_units_placement(): void
    {
        $teamA = $this->team('Unit A', 'unit-a');
        $teamB = $this->team('Unit B', 'unit-b');

        $roomA = $this->room($teamA, 'Ruang A');
        $ownerA = $this->ownerOf($teamA);

        $mine = $this->vehicle($teamA, [
            'asset_code' => 'VHC-RELOC',
            'room_id' => $roomA->id,
            'assigned_user_id' => $ownerA->id,
        ]);

        Sanctum::actingAs($this->superAdmin());

        $this->putJson("/api/v1/vehicles/{$mine->id}", [
            'team_id' => $teamB->id,
        ])->assertOk();

        $fresh = $mine->fresh();

        // The room and the user belong to the unit the vehicle just left, so
        // keeping them would leave a Unit B vehicle sitting in a Unit A room.
        $this->assertNull($fresh->room_id);
        $this->assertNull($fresh->assigned_user_id);
    }

    public function test_updating_without_a_unit_change_keeps_the_placement(): void
    {
        $teamA = $this->team('Unit A', 'unit-a');
        $roomA = $this->room($teamA, 'Ruang A');
        $ownerA = $this->ownerOf($teamA);

        $mine = $this->vehicle($teamA, [
            'asset_code' => 'VHC-STAY',
            'room_id' => $roomA->id,
            'assigned_user_id' => $ownerA->id,
        ]);

        Sanctum::actingAs($this->superAdmin());

        $this->putJson("/api/v1/vehicles/{$mine->id}", [
            'team_id' => $teamA->id,
            'description' => 'Still parked in the same room.',
        ])->assertOk();

        $fresh = $mine->fresh();

        $this->assertSame($roomA->id, $fresh->room_id);
        $this->assertSame($ownerA->id, $fresh->assigned_user_id);
    }

    public function test_vehicle_tax_history_is_unit_scoped(): void
    {
        $teamA = $this->team('Unit A', 'unit-a');
        $teamB = $this->team('Unit B', 'unit-b');

        $theirs = $this->vehicle($teamB);

        Sanctum::actingAs($this->ownerOf($teamA, ModuleCatalog::keys()));

        $this->getJson("/api/v1/vehicles/{$theirs->id}/taxes")->assertForbidden();
    }

    public function test_tax_reminders_only_count_own_unit_vehicles(): void
    {
        $teamA = $this->team('Unit A', 'unit-a');
        $teamB = $this->team('Unit B', 'unit-b');

        // Overdue in A, overdue in B: each owner must see only their own.
        $this->vehicle($teamA, [
            'asset_code' => 'VHC-A1',
            'plate_number' => 'B 1 AAA',
            'tax_due_date' => now()->subYear()->toDateString(),
            'tax_status' => VehicleAsset::TAX_UNPAID,
        ]);
        $this->vehicle($teamA, [
            'asset_code' => 'VHC-A2',
            'plate_number' => 'B 2 AAA',
            'tax_due_date' => now()->addYear()->toDateString(),
            'tax_status' => VehicleAsset::TAX_PAID,
        ]);
        $this->vehicle($teamB, [
            'asset_code' => 'VHC-B1',
            'plate_number' => 'B 3 BBB',
            'tax_due_date' => now()->subYear()->toDateString(),
            'tax_status' => VehicleAsset::TAX_UNPAID,
        ]);

        Sanctum::actingAs($this->ownerOf($teamA));

        $response = $this->getJson('/api/v1/vehicle-tax-reminders')->assertOk();

        $this->assertSame(2, $response->json('data.summary.total_vehicles'));
        $this->assertSame(1, $response->json('data.summary.overdue'));
        $this->assertCount(1, $response->json('data.vehicles'));

        Sanctum::actingAs($this->ownerOf($teamB));

        $other = $this->getJson('/api/v1/vehicle-tax-reminders')->assertOk();

        $this->assertSame(1, $other->json('data.summary.total_vehicles'));
        $this->assertSame(1, $other->json('data.summary.overdue'));
    }

    public function test_vehicle_module_decides_whether_the_page_opens(): void
    {
        $teamA = $this->team('Unit A', 'unit-a');
        $this->vehicle($teamA, ['asset_code' => 'VHC-MOD']);

        // Owner without the vehicles module.
        Sanctum::actingAs($this->ownerOf($teamA, ['assets']));
        $this->getJson('/api/v1/vehicles')->assertForbidden();
        $this->getJson('/api/v1/vehicle-tax-reminders')->assertForbidden();

        // Same owner once the module is granted.
        Sanctum::actingAs($this->ownerOf($teamA, ['assets', 'vehicles']));
        $this->getJson('/api/v1/vehicles')->assertOk();
        $this->getJson('/api/v1/vehicle-tax-reminders')->assertOk();
    }

    public function test_vehicle_creation_still_validates_the_room_unit(): void
    {
        $teamA = $this->team('Unit A', 'unit-a');
        $teamB = $this->team('Unit B', 'unit-b');

        $ownRoom = $this->room($teamA, 'Ruang A');
        $foreignRoom = $this->room($teamB, 'Ruang B');

        Sanctum::actingAs($this->ownerOf($teamA));

        $this->postJson('/api/v1/vehicles', [
            'brand' => 'Honda',
            'model' => 'Beat',
            'plate_number' => 'B 1111 RST',
            'engine_number' => 'ENG-R1',
            'chassis_number' => 'CHS-R1',
            'placement_date' => '2024-02-01',
            'tax_due_date' => '2025-02-01',
            'condition' => VehicleAsset::CONDITION_GOOD,
            'usage_status' => VehicleAsset::USAGE_IN_USE,
            'room_id' => $ownRoom->id,
        ])->assertCreated();

        $this->postJson('/api/v1/vehicles', [
            'brand' => 'Honda',
            'model' => 'Beat',
            'plate_number' => 'B 2222 RUV',
            'engine_number' => 'ENG-R2',
            'chassis_number' => 'CHS-R2',
            'placement_date' => '2024-02-01',
            'tax_due_date' => '2025-02-01',
            'condition' => VehicleAsset::CONDITION_GOOD,
            'usage_status' => VehicleAsset::USAGE_IN_USE,
            'room_id' => $foreignRoom->id,
        ])->assertStatus(422)->assertJsonValidationErrors('room_id');
    }

    public function test_photo_upload_still_records_the_owning_unit(): void
    {
        $teamA = $this->team('Unit A', 'unit-a');

        Sanctum::actingAs($this->ownerOf($teamA));

        $response = $this->post('/api/v1/vehicles', [
            'brand' => 'Honda',
            'model' => 'Beat',
            'plate_number' => 'B 3333 PQR',
            'engine_number' => 'ENG-P',
            'chassis_number' => 'CHS-P',
            'placement_date' => '2024-02-01',
            'tax_due_date' => '2025-02-01',
            'condition' => VehicleAsset::CONDITION_GOOD,
            'usage_status' => VehicleAsset::USAGE_IN_USE,
            'photo' => UploadedFile::fake()->image('vehicle.jpg'),
        ], ['Accept' => 'application/json']);

        $response->assertCreated()
            ->assertJsonPath('data.vehicle.team.id', $teamA->id);

        $this->assertSame(
            $teamA->id,
            VehicleAsset::where('plate_number', 'B 3333 PQR')->value('team_id')
        );
    }

    public function test_unit_scope_helper_reports_vehicle_ownership(): void
    {
        $teamA = $this->team('Unit A', 'unit-a');
        $mine = $this->vehicle($teamA);

        $owner = $this->ownerOf($teamA);

        $this->assertFalse(UnitScope::bypasses($owner));
        UnitScope::assertAccess($owner, $mine->team_id);
    }

    public function test_unit_summary_counts_each_units_own_vehicles(): void
    {
        $teamA = $this->team('Unit A', 'unit-a');
        $teamB = $this->team('Unit B', 'unit-b');
        $emptyTeam = $this->team('Unit C', 'unit-c');

        $this->vehicle($teamA, [
            'asset_code' => 'VHC-A1',
            'plate_number' => 'B 1 AAA',
            'tax_due_date' => now()->subYear()->toDateString(),
            'tax_status' => VehicleAsset::TAX_UNPAID,
        ]);
        $this->vehicle($teamA, [
            'asset_code' => 'VHC-A2',
            'plate_number' => 'B 2 AAA',
            'tax_due_date' => now()->addDays(3)->toDateString(),
            'tax_status' => VehicleAsset::TAX_UNPAID,
        ]);
        $this->vehicle($teamA, [
            'asset_code' => 'VHC-A3',
            'plate_number' => 'B 3 AAA',
            'tax_due_date' => now()->addYear()->toDateString(),
            'tax_status' => VehicleAsset::TAX_PAID,
        ]);
        $this->vehicle($teamB, [
            'asset_code' => 'VHC-B1',
            'plate_number' => 'B 4 BBB',
            'tax_due_date' => now()->subYear()->toDateString(),
            'tax_status' => VehicleAsset::TAX_UNPAID,
        ]);

        Sanctum::actingAs($this->superAdmin());

        $response = $this->getJson('/api/v1/vehicles/unit-summary')->assertOk();

        $rows = collect($response->json('data.units'))->keyBy('team.id');

        $this->assertSame(3, $rows[$teamA->id]['total']);
        $this->assertSame(1, $rows[$teamA->id]['tax_paid']);
        $this->assertSame(1, $rows[$teamA->id]['tax_overdue']);
        $this->assertSame(1, $rows[$teamA->id]['tax_due_soon']);
        $this->assertSame(1, $rows[$teamB->id]['total']);
        // A unit without vehicles still gets a row, so nothing looks missing.
        $this->assertSame(0, $rows[$emptyTeam->id]['total']);
    }

    public function test_unit_summary_is_limited_to_the_owners_own_unit(): void
    {
        $teamA = $this->team('Unit A', 'unit-a');
        $teamB = $this->team('Unit B', 'unit-b');

        $this->vehicle($teamA, ['asset_code' => 'VHC-A1', 'plate_number' => 'B 1 AAA']);
        $this->vehicle($teamB, ['asset_code' => 'VHC-B1', 'plate_number' => 'B 2 BBB']);

        Sanctum::actingAs($this->ownerOf($teamA));

        $response = $this->getJson('/api/v1/vehicles/unit-summary')->assertOk();

        $units = $response->json('data.units');
        $this->assertCount(1, $units);
        $this->assertSame($teamA->id, $units[0]['team']['id']);
        $this->assertSame(1, $units[0]['total']);
    }

    public function test_super_admin_cannot_place_a_vehicle_in_another_units_room(): void
    {
        $teamA = $this->team('Unit A', 'unit-a');
        $teamB = $this->team('Unit B', 'unit-b');

        $ownRoom = Room::create(['team_id' => $teamA->id, 'name' => 'Room A', 'is_storage' => false]);
        $otherRoom = Room::create(['team_id' => $teamB->id, 'name' => 'Room B', 'is_storage' => false]);

        Sanctum::actingAs($this->superAdmin());

        // Choosing the owning unit is allowed; borrowing the other unit's room is not.
        $this->postJson('/api/v1/vehicles', [
            'asset_code' => 'VHC-A1',
            'brand' => 'Honda',
            'model' => 'Vario 160',
            'year' => '2023',
            'plate_number' => 'B 1 AAA',
            'engine_number' => 'ENG-1',
            'chassis_number' => 'CHS-1',
            'placement_date' => '2026-01-15',
            'tax_due_date' => '2027-01-15',
            'condition' => VehicleAsset::CONDITION_GOOD,
            'usage_status' => VehicleAsset::USAGE_IN_USE,
            'team_id' => $teamA->id,
            'room_id' => $otherRoom->id,
        ])->assertStatus(422)->assertJsonValidationErrors('room_id');

        $this->assertSame(0, VehicleAsset::count());

        // The matching room is accepted.
        $this->postJson('/api/v1/vehicles', [
            'asset_code' => 'VHC-A1',
            'brand' => 'Honda',
            'model' => 'Vario 160',
            'year' => '2023',
            'plate_number' => 'B 1 AAA',
            'engine_number' => 'ENG-1',
            'chassis_number' => 'CHS-1',
            'placement_date' => '2026-01-15',
            'tax_due_date' => '2027-01-15',
            'condition' => VehicleAsset::CONDITION_GOOD,
            'usage_status' => VehicleAsset::USAGE_IN_USE,
            'team_id' => $teamA->id,
            'room_id' => $ownRoom->id,
        ])->assertCreated();
    }

    public function test_super_admin_cannot_assign_another_units_person_to_a_vehicle(): void
    {
        $teamA = $this->team('Unit A', 'unit-a');
        $teamB = $this->team('Unit B', 'unit-b');

        $outsider = $this->ownerOf($teamB, ['vehicles']);

        Sanctum::actingAs($this->superAdmin());

        $this->postJson('/api/v1/vehicles', [
            'asset_code' => 'VHC-A1',
            'brand' => 'Honda',
            'model' => 'Vario 160',
            'year' => '2023',
            'plate_number' => 'B 1 AAA',
            'engine_number' => 'ENG-1',
            'chassis_number' => 'CHS-1',
            'placement_date' => '2026-01-15',
            'tax_due_date' => '2027-01-15',
            'condition' => VehicleAsset::CONDITION_GOOD,
            'usage_status' => VehicleAsset::USAGE_IN_USE,
            'team_id' => $teamA->id,
            'assigned_user_id' => $outsider->id,
        ])->assertStatus(422)->assertJsonValidationErrors('assigned_user_id');

        $this->assertSame(0, VehicleAsset::count());
    }

    public function test_super_admin_cannot_move_a_vehicle_onto_another_units_room(): void
    {
        $teamA = $this->team('Unit A', 'unit-a');
        $teamB = $this->team('Unit B', 'unit-b');

        $ownRoom = Room::create(['team_id' => $teamA->id, 'name' => 'Room A', 'is_storage' => false]);
        $otherRoom = Room::create(['team_id' => $teamB->id, 'name' => 'Room B', 'is_storage' => false]);

        $vehicle = $this->vehicle($teamA, [
            'asset_code' => 'VHC-A1',
            'plate_number' => 'B 1 AAA',
            'room_id' => $ownRoom->id,
        ]);

        Sanctum::actingAs($this->superAdmin());

        // Same unit, so the room has to stay inside unit A.
        $this->putJson('/api/v1/vehicles/'.$vehicle->id, [
            'room_id' => $otherRoom->id,
        ])->assertStatus(422)->assertJsonValidationErrors('room_id');

        $this->assertSame($ownRoom->id, $vehicle->fresh()->room_id);

        // Moving the vehicle to unit B passes validation. The controller still drops
        // the placement on a unit change, because the old room belongs to unit A.
        $this->putJson('/api/v1/vehicles/'.$vehicle->id, [
            'team_id' => $teamB->id,
            'room_id' => $otherRoom->id,
        ])->assertOk();

        $moved = $vehicle->fresh();
        $this->assertSame($teamB->id, $moved->team_id);
        $this->assertNull($moved->room_id);

        // Once it sits in unit B, unit B's room is accepted without a unit change.
        $this->putJson('/api/v1/vehicles/'.$vehicle->id, [
            'room_id' => $otherRoom->id,
        ])->assertOk();

        $this->assertSame($otherRoom->id, $vehicle->fresh()->room_id);
    }

    public function test_vehicle_list_can_be_filtered_by_unit(): void
    {
        $teamA = $this->team('Unit A', 'unit-a');
        $teamB = $this->team('Unit B', 'unit-b');

        $mine = $this->vehicle($teamA, ['asset_code' => 'VHC-A1', 'plate_number' => 'B 1 AAA']);
        $other = $this->vehicle($teamB, ['asset_code' => 'VHC-B1', 'plate_number' => 'B 2 BBB']);

        Sanctum::actingAs($this->superAdmin());

        $response = $this->getJson('/api/v1/vehicles?team_id='.$teamA->id)->assertOk();

        $ids = array_column($response->json('data.data'), 'id');
        $this->assertContains($mine->id, $ids);
        $this->assertNotContains($other->id, $ids);
    }
}