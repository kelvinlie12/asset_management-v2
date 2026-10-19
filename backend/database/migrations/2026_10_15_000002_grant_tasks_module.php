<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Backfill the `tasks` module for accounts that already exist.
     *
     * Access is materialised per user, so a newly introduced module is invisible
     * to everyone until it is granted. Everybody may open the Task menu and file
     * a report; an owner or unit admin may also triage it (change status / delete).
     * A super admin needs nothing here: every permission is granted to them from
     * their identity through the Gate.
     */
    public function up(): void
    {
        $names = ['tasks.view', 'tasks.create', 'tasks.update', 'tasks.delete'];

        foreach ($names as $name) {
            Permission::firstOrCreate(
                ['name' => $name, 'guard_name' => 'web'],
                ['name' => $name, 'guard_name' => 'web'],
            );
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $ids = Permission::query()
            ->where('guard_name', 'web')
            ->whereIn('name', $names)
            ->pluck('id', 'name');

        $reporter = array_values(array_filter([
            $ids['tasks.view'] ?? null,
            $ids['tasks.create'] ?? null,
        ]));

        $manager = array_values(array_filter(array_merge($reporter, [
            $ids['tasks.update'] ?? null,
            $ids['tasks.delete'] ?? null,
        ])));

        User::query()->each(function (User $user) use ($reporter, $manager) {
            if ($user->isSuperAdmin()) {
                return;
            }

            $grant = in_array($user->role, [User::ROLE_OWNER, User::ROLE_ADMIN], true)
                ? $manager
                : $reporter;

            $user->permissions()->syncWithoutDetaching($grant);
            $user->unsetRelation('permissions');
        });

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Reversing is not safe: a manager may have customised the grants afterwards.
     * The change is additive and idempotent.
     */
    public function down(): void
    {
    }
};
