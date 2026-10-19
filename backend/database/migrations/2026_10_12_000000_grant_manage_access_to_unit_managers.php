<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Backfill `users.manage_access` for owners and admins.
     *
     * The permission was introduced after these accounts were seeded, so their
     * stored access - including the users module - never carried it. Without it
     * an owner cannot open the Access Rights screen for their own staff. The
     * grant stays checked here against the module actually held: a user who was
     * never given the users module (for example a staff member) is left alone.
     */
    public function up(): void
    {
        $permission = Permission::firstOrCreate(
            ['name' => 'users.manage_access', 'guard_name' => 'web'],
            ['name' => 'users.manage_access', 'guard_name' => 'web'],
        );

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        User::query()
            ->whereIn('role', [User::ROLE_OWNER, User::ROLE_ADMIN])
            ->get()
            ->each(function (User $user) use ($permission) {
                $holdsUsersModule = $user->permissions()
                    ->where('name', 'users.view')
                    ->exists();

                $alreadyGranted = $user->permissions()
                    ->whereKey($permission->getKey())
                    ->exists();

                if ($holdsUsersModule && ! $alreadyGranted) {
                    $user->permissions()->attach($permission->getKey());
                    $user->unsetRelation('permissions');
                }
            });

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Reversing is not safe: a manager may have been granted or denied the
     * permission afterwards. The change is additive and idempotent.
     */
    public function down(): void
    {
    }
};
