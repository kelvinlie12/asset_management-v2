<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // The column may already exist (it was also added by a later migration);
        // stay idempotent so this one never blocks the chain.
        if (Schema::hasColumn('teams', 'logo')) {
            return;
        }

        Schema::table('teams', function (Blueprint $table) {
            // Server-relative path, e.g. "uploads/teams/logo_abc.png".
            $table->string('logo')->nullable()->after('description');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasColumn('teams', 'logo')) {
            return;
        }

        Schema::table('teams', function (Blueprint $table) {
            $table->dropColumn('logo');
        });
    }
};
