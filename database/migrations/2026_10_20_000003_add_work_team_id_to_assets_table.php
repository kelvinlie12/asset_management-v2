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
        Schema::table('assets', function (Blueprint $table) {
            if (! Schema::hasColumn('assets', 'work_team_id')) {
                // The team (working group) that marks who uses this asset,
                // separate from team_id, which is the owning company/unit.
                $table->foreignId('work_team_id')->nullable()->after('team_id')->constrained('work_teams')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            if (Schema::hasColumn('assets', 'work_team_id')) {
                $table->dropConstrainedForeignId('work_team_id');
            }
        });
    }
};
