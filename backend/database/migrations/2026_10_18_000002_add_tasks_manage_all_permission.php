<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Introduce the `tasks.manage_all` grant.
     *
     * A super admin (or a user handed this permission from the Access Rights
     * screen) sees every unit's task reports and may work on them, as opposed to
     * the unit-scoped view everybody else gets. The row has to exist for the
     * permission check to resolve, so it is created here as well as in the
     * seeder.
     */
    public function up(): void
    {
        Permission::firstOrCreate(
            ['name' => 'tasks.manage_all', 'guard_name' => 'web'],
            ['name' => 'tasks.manage_all', 'guard_name' => 'web'],
        );

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Reversing is not safe: the permission may already have been handed out.
     */
    public function down(): void {}
};
