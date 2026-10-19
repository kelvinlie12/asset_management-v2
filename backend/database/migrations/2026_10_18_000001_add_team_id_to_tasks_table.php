<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A task report belongs to a unit (the reporter's team).
     *
     * Every signed-in user files reports for their own unit; a unit only ever
     * sees its own reports, while a super admin (or a user granted
     * `tasks.manage_all`) sees the whole board. Reports filed by a user without
     * a unit stay unit-less and only reach those global viewers.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('tasks', 'team_id')) {
            Schema::table('tasks', function (Blueprint $table) {
                $table->foreignId('team_id')
                    ->nullable()
                    ->after('reporter_id')
                    ->constrained('teams')
                    ->nullOnDelete();

                $table->index('team_id');
            });
        }

        // Backfill: an existing report inherits the unit of whoever filed it.
        // A correlated subquery keeps this portable across MySQL and SQLite
        // (SQLite rejects an "update ... join"'s SET referencing the join).
        DB::table('tasks')->update([
            'team_id' => DB::raw('(select team_id from users where users.id = tasks.reporter_id)'),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('tasks', 'team_id')) {
            Schema::table('tasks', function (Blueprint $table) {
                $table->dropConstrainedForeignId('team_id');
            });
        }
    }
};
