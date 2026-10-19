<?php

use App\Models\User;
use App\Support\ModuleCatalog;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Owners manage the staff of their own unit, so every existing owner gets
     * the "users" module. The bundle is additive: an owner's current modules
     * are kept and "users" is merged in when missing.
     */
    public function up(): void
    {
        $changed = false;

        User::query()
            ->where('role', User::ROLE_OWNER)
            ->orderBy('id')
            ->get()
            ->each(function (User $user) use (&$changed) {
                $modules = $user->getModuleKeys();

                if (! in_array('users', $modules, true)) {
                    $user->syncModules([...$modules, 'users']);
                    $changed = true;
                }
            });

        if ($changed) {
            app(PermissionRegistrar::class)->forgetCachedPermissions();
        }
    }

    /**
     * Reversing this is not safe: an owner could have been granted the
     * module afterwards, and token/menu snapshots depend on it. The change
     * is additive and idempotent, so it is left in place.
     */
    public function down(): void
    {
    }
};