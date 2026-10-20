<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            // The moment the current "working" run began (null while paused,
            // open or closed), plus the seconds banked from finished runs.
            // Together they give the stopwatch from start to resolve.
            $table->timestamp('work_started_at')->nullable()->after('resolved_at');
            $table->unsignedBigInteger('worked_seconds')->default(0)->after('work_started_at');
        });

        // Reports that were already being worked on before the stopwatch
        // existed start counting from the last time they were touched.
        DB::table('tasks')
            ->where('status', 'in_progress')
            ->whereNull('work_started_at')
            ->update(['work_started_at' => DB::raw('updated_at')]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn(['work_started_at', 'worked_seconds']);
        });
    }
};
