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
        Schema::create('task_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            // created | started | resumed | paused | resolved | rejected | reopened
            // | status_changed | priority_changed | assigned | unassigned
            $table->string('action');
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['task_id', 'created_at']);
        });

        // Backfill a "created" entry for reports that predate this table so the
        // history never starts empty.
        $rows = DB::table('tasks')->select('id', 'reporter_id', 'created_at')->get();
        $insert = [];
        foreach ($rows as $task) {
            $at = $task->created_at ?? now();
            $insert[] = [
                'task_id' => $task->id,
                'user_id' => $task->reporter_id,
                'action' => 'created',
                'meta' => null,
                'created_at' => $at,
                'updated_at' => $at,
            ];
        }

        if (! empty($insert)) {
            DB::table('task_activities')->insert($insert);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_activities');
    }
};
