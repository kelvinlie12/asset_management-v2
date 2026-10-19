<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\AssetDamage;
use App\Models\Team;
use App\Models\User;
use App\Support\ModuleCatalog;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AssetDamageUpdateRequestTest extends TestCase
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
        $user->syncModules(ModuleCatalog::keys());

        return $user;
    }

    private function assetFor(Team $team, string $code): Asset
    {
        return Asset::create([
            'asset_code' => $code,
            'name' => 'Asset '.$code,
            'team_id' => $team->id,
            'condition' => Asset::CONDITION_DAMAGED,
            'usage_status' => Asset::USAGE_IN_STORAGE,
        ]);
    }

    private function damageFor(Asset $asset): AssetDamage
    {
        return AssetDamage::create([
            'asset_id' => $asset->id,
            'damage_date' => now()->toDateString(),
            'description' => 'Laporan awal',
        ]);
    }

    public function test_editing_damage_report_accepts_a_user_from_the_own_unit(): void
    {
        $teamA = $this->team('Unit A');
        $colleague = User::factory()->create(['role' => User::ROLE_STAFF, 'team_id' => $teamA->id]);
        $damage = $this->damageFor($this->assetFor($teamA, 'AST-1'));

        Sanctum::actingAs($this->ownerFor($teamA));

        $this->putJson("/api/v1/damages/{$damage->id}", [
            'damage_date' => now()->toDateString(),
            'user_id' => $colleague->id,
            'description' => 'Lecet bumper',
            'notes' => 'Sudah dicek',
        ])->assertOk();

        $this->assertSame($colleague->id, $damage->fresh()->user_id);
    }

    public function test_editing_damage_report_rejects_a_user_from_another_unit(): void
    {
        $teamA = $this->team('Unit A');
        $teamB = $this->team('Unit B');
        $outsider = User::factory()->create(['role' => User::ROLE_STAFF, 'team_id' => $teamB->id]);
        $damage = $this->damageFor($this->assetFor($teamA, 'AST-1'));

        Sanctum::actingAs($this->ownerFor($teamA));

        $this->putJson("/api/v1/damages/{$damage->id}", [
            'damage_date' => now()->toDateString(),
            'user_id' => $outsider->id,
            'description' => 'Lecet bumper',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['user_id']);

        $this->assertNull($damage->fresh()->user_id);
    }
}