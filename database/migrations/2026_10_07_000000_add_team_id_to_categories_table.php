<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Give every unit its own copy of every category.
 *
 * Categories used to be one global list shared by every company, so "IT
 * Equipment" was a single row that all seven units pointed at and no unit could
 * rename, deactivate or add to without changing the others. Each unit now keeps
 * its own categories, exactly like rooms, users and assets already do.
 *
 * The migration:
 *   1. adds a `team_id` owning column,
 *   2. relaxes the global `code` unique index to one unique index per unit,
 *   3. copies every category into every unit,
 *   4. points each unit's assets at that unit's copy.
 *
 * The original rows keep `team_id = NULL`: they stay readable as the global
 * categories used by assets that belong to no unit at all, and a super admin
 * can still create more of them.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('categories', 'team_id')) {
            return;
        }

        Schema::table('categories', function (Blueprint $table) {
            $table->foreignId('team_id')
                ->nullable()
                ->after('id')
                ->constrained('teams')
                ->nullOnDelete();
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->index('team_id');
        });

        // A code only has to be unique inside its unit now, otherwise the copies
        // below could not share `CAT-IT` with the row they were copied from.
        Schema::table('categories', function (Blueprint $table) {
            $table->dropUnique(['code']);
            $table->unique(['team_id', 'code']);
        });

        $this->copyCategoriesIntoEveryUnit();
    }

    private function copyCategoriesIntoEveryUnit(): void
    {
        $teams = DB::table('teams')->orderBy('id')->pluck('id');
        $globals = DB::table('categories')->whereNull('team_id')->get();

        foreach ($teams as $teamId) {
            foreach ($globals as $category) {
                $alreadyOwned = DB::table('categories')
                    ->where('team_id', $teamId)
                    ->where('code', $category->code)
                    ->exists();

                if ($alreadyOwned) {
                    continue;
                }

                $copyId = DB::table('categories')->insertGetId([
                    'name' => $category->name,
                    'code' => $category->code,
                    'description' => $category->description,
                    'status' => $category->status,
                    'team_id' => $teamId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                // Re-point this unit's assets at the copy that now belongs to it.
                DB::table('assets')
                    ->where('team_id', $teamId)
                    ->where('category_id', $category->id)
                    ->update(['category_id' => $copyId]);
            }
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('categories', 'team_id')) {
            return;
        }

        Schema::table('categories', function (Blueprint $table) {
            $table->dropUnique(['team_id', 'code']);
        });

        // Only the global rows survive; the per-unit copies go back to being a
        // single shared category, so this restores the original shape but loses
        // any category a unit created for itself.
        DB::table('categories')->whereNotNull('team_id')->delete();

        Schema::table('categories', function (Blueprint $table) {
            $table->dropForeign(['team_id']);
            $table->dropIndex(['team_id']);
            $table->dropColumn('team_id');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->unique('code');
        });
    }
};
