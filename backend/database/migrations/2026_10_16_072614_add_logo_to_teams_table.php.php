<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The column may already exist (a twin migration adds it too); staying
        // idempotent keeps a fresh `migrate` from failing.
        if (Schema::hasColumn('teams', 'logo')) {
            return;
        }

        Schema::table('teams', function (Blueprint $table) {
            $table->string('logo')->nullable()->after('description');
        });
    }

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