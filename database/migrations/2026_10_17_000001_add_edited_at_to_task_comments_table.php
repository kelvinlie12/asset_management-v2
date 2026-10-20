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
        Schema::table('task_comments', function (Blueprint $table) {
            // Set the moment a discussion message is edited so the UI can show
            // an "edited" marker, the way a chat app does.
            $table->timestamp('edited_at')->nullable()->after('body');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('task_comments', function (Blueprint $table) {
            $table->dropColumn('edited_at');
        });
    }
};
