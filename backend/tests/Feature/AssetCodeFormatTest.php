<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Category;
use App\Models\Team;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Asset codes follow KODE-BULAN-TAHUN-URUT, e.g. "ITE-10-2026-001":
 * the category code, the month and year of placement, then the item number.
 */
class AssetCodeFormatTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    private function team(): Team
    {
        return Team::create([
            'name' => 'Unit A',
            'slug' => 'unit-a',
            'description' => 'Unit A',
        ]);
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

    public function test_build_asset_code_uses_category_month_year_and_sequence(): void
    {
        $this->assertSame(
            'ITE-10-2026-001',
            Asset::buildAssetCode('ITE', '2026-10-05', 1),
        );
        $this->assertSame(
            'ITE-10-2026-042',
            Asset::buildAssetCode('ite', '2026-10-31', 42),
        );
    }

    public function test_build_asset_code_falls_back_to_ast_without_a_category(): void
    {
        $this->assertSame(
            'AST-03-2026-007',
            Asset::buildAssetCode(null, '2026-03-01', 7),
        );
    }

    public function test_generate_asset_code_counts_items_in_the_same_category_and_month(): void
    {
        $team = $this->team();
        $category = Category::create([
            'team_id' => $team->id,
            'name' => 'IT Equipment',
            'code' => 'ITE',
            'status' => 'active',
        ]);

        Asset::create([
            'asset_code' => 'ITE-10-2026-001',
            'name' => 'Laptop A',
            'category_id' => $category->id,
            'team_id' => $team->id,
            'condition' => Asset::CONDITION_USED,
            'usage_status' => Asset::USAGE_IN_STORAGE,
        ]);

        // The next code for the same category/month is 002 ...
        $this->assertSame('ITE-10-2026-002', Asset::generateAssetCode('ITE', '2026-10-20'));

        // ... while a different month restarts at 001.
        $this->assertSame('ITE-11-2026-001', Asset::generateAssetCode('ITE', '2026-11-01'));
    }

    public function test_generate_code_endpoint_uses_the_selected_category_and_date(): void
    {
        $team = $this->team();
        $category = Category::create([
            'team_id' => $team->id,
            'name' => 'IT Equipment',
            'code' => 'ITE',
            'status' => 'active',
        ]);

        Sanctum::actingAs($this->superAdmin());

        $response = $this->getJson(
            '/api/v1/assets/generate-code?category_id='.$category->id.'&placement_date=2026-10-09',
        );

        $response->assertOk()
            ->assertJsonPath('data.asset_code', 'ITE-10-2026-001')
            ->assertJsonPath('data.sequence', 1)
            ->assertJsonPath('data.category_code', 'ITE');
    }
}
