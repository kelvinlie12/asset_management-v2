<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProfileAccessTest extends TestCase
{
    use RefreshDatabase;

    private const PROFILE_PERMISSIONS = [
        'profile.view',
        'profile.update',
        'profile.password',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    private function userOf(string $role): User
    {
        $user = User::factory()->create(['role' => $role]);
        $user->syncRoleToSpatie();

        return $user;
    }

    public function test_every_role_can_manage_its_own_profile(): void
    {
        foreach ([
            User::ROLE_VIEWER,
            User::ROLE_STAFF,
            User::ROLE_ADMIN,
            User::ROLE_OWNER,
            User::ROLE_SUPER_ADMIN,
        ] as $role) {
            $user = $this->userOf($role);

            foreach (self::PROFILE_PERMISSIONS as $permission) {
                $this->assertTrue(
                    $user->fresh()->can($permission),
                    "[{$role}] missing permission {$permission}"
                );
            }
        }
    }

    public function test_viewer_opens_and_updates_own_profile(): void
    {
        $viewer = $this->userOf(User::ROLE_VIEWER);

        Sanctum::actingAs($viewer);

        $this->getJson('/api/v1/profile')
            ->assertOk()
            ->assertJsonPath('data.user.email', $viewer->email);

        $this->putJson('/api/v1/profile', [
            'name' => 'Viewer Terbaru',
            'phone' => '081234567890',
        ])->assertOk();

        $this->assertSame('Viewer Terbaru', $viewer->fresh()->name);
    }

    public function test_viewer_changes_own_password(): void
    {
        $viewer = $this->userOf(User::ROLE_VIEWER);

        Sanctum::actingAs($viewer);

        $this->putJson('/api/v1/change-password', [
            'current_password' => 'password',
            'password' => 'rahasia-baru-123',
            'password_confirmation' => 'rahasia-baru-123',
        ])->assertOk();

        $fresh = $viewer->fresh();

        $this->assertTrue(Hash::check('rahasia-baru-123', $fresh->password));
        $this->assertFalse(Hash::check('password', $fresh->password));
    }

    public function test_viewer_with_wrong_current_password_is_rejected(): void
    {
        $viewer = $this->userOf(User::ROLE_VIEWER);

        Sanctum::actingAs($viewer);

        $this->putJson('/api/v1/change-password', [
            'current_password' => 'salah',
            'password' => 'rahasia-baru-123',
            'password_confirmation' => 'rahasia-baru-123',
        ])->assertStatus(422);

        $this->assertTrue(Hash::check('password', $viewer->fresh()->password));
    }
}