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
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            // bug_system | menu | other
            $table->string('category')->default('bug_system');
            // Free-text label of the menu/page the report is about.
            $table->string('page')->nullable();
            $table->text('description');
            // low | medium | high
            $table->string('priority')->default('medium');
            // open | in_progress | resolved | rejected
            $table->string('status')->default('open');
            $table->string('attachment_path')->nullable();
            $table->foreignId('reporter_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'priority']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
