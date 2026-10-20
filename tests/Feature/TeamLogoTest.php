<?php

namespace Tests\Feature;

use App\Models\Team;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TeamLogoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    protected function tearDown(): void
    {
        // Uploaded test logos land in the real public folder; clean them up.
        foreach (File::glob(public_path('uploads/teams/logo_*')) as $file) {
            File::delete($file);
        }

        parent::tearDown();
    }

    private function superAdmin(): User
    {
        $user = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN, 'team_id' => null]);
        $user->syncRoleToSpatie();

        return $user;
    }

    public function test_unit_can_be_created_with_a_logo(): void
    {
        Sanctum::actingAs($this->superAdmin());

        $response = $this->post('/api/v1/teams', [
            'name' => 'Unit Logo',
            'logo' => UploadedFile::fake()->image('logo.png', 200, 200),
        ], ['Accept' => 'application/json'])->assertCreated();

        $path = $response->json('data.team.logo');

        $this->assertNotNull($path);
        $this->assertStringStartsWith('uploads/teams/', $path);
        $this->assertFileExists(public_path($path));
        $this->assertNotNull($response->json('data.team.logo_url'));
    }

    public function test_logo_must_be_an_image(): void
    {
        Sanctum::actingAs($this->superAdmin());

        $this->post('/api/v1/teams', [
            'name' => 'Unit Bad Logo',
            'logo' => UploadedFile::fake()->create('logo.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertUnprocessable();
    }

    public function test_logo_can_be_replaced_and_removed(): void
    {
        Sanctum::actingAs($this->superAdmin());

        $team = Team::create(['name' => 'Unit Ganti', 'slug' => 'unit-ganti', 'description' => 'x']);

        $first = $this->post('/api/v1/teams/'.$team->id, [
            '_method' => 'PUT',
            'name' => 'Unit Ganti',
            'logo' => UploadedFile::fake()->image('a.png'),
        ], ['Accept' => 'application/json'])->assertOk()->json('data.team.logo');

        $second = $this->post('/api/v1/teams/'.$team->id, [
            '_method' => 'PUT',
            'name' => 'Unit Ganti',
            'logo' => UploadedFile::fake()->image('b.png'),
        ], ['Accept' => 'application/json'])->assertOk()->json('data.team.logo');

        $this->assertNotSame($first, $second);
        $this->assertFileDoesNotExist(public_path($first));
        $this->assertFileExists(public_path($second));

        $this->post('/api/v1/teams/'.$team->id, [
            '_method' => 'PUT',
            'name' => 'Unit Ganti',
            'remove_logo' => 1,
        ], ['Accept' => 'application/json'])->assertOk();

        $this->assertNull($team->fresh()->logo);
        $this->assertFileDoesNotExist(public_path($second));
    }

    public function test_profile_carries_the_users_unit_logo(): void
    {
        $team = Team::create(['name' => 'Unit Profil', 'slug' => 'unit-profil', 'description' => 'x', 'logo' => 'uploads/teams/logo_demo.png']);

        $user = User::factory()->create(['role' => User::ROLE_STAFF, 'team_id' => $team->id]);
        $user->syncRoleToSpatie();

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/profile')
            ->assertOk()
            ->assertJsonPath('data.user.team.name', 'Unit Profil')
            ->assertJsonPath('data.user.team.logo', 'uploads/teams/logo_demo.png');
    }
}
