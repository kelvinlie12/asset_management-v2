<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Per-user access overrides.
     *
     * The permission matrix inside a unit may grant a permission to an
     * individual user (stored by Spatie in `model_has_permissions`) or revoke
     * one that the user's role would otherwise hand out. Because Spatie has no
     * notion of a "deny", revoked permissions are tracked in this JSON column
     * and subtracted by the User model at authorization time.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('denied_permissions')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('denied_permissions');
        });
    }
};
