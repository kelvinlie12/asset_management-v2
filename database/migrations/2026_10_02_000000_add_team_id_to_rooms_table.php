<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Give every room exactly one owning unit.
 *
 * Rooms used to be many-to-many with teams through the `room_team` pivot, so a
 * single room could be shared by several units. Each company (unit) now keeps
 * its own rooms, created and managed by that unit's own users, so the pivot is
 * replaced by a plain `team_id` column like users, assets and vehicles already
 * use.
 *
 * Rooms that belonged to more than one unit are assigned to the first linked
 * unit; rooms with no unit at all are left unassigned so a super admin can
 * place them afterwards.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('rooms', 'team_id')) {
            Schema::table('rooms', function (Blueprint $table) {
                $table->foreignId('team_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('teams')
                    ->nullOnDelete();
            });
        }

        if (Schema::hasTable('room_team')) {
            // Pick a single owner per room: the lowest team_id already linked.
            $links = DB::table('room_team')
                ->orderBy('room_id')
                ->orderBy('team_id')
                ->get(['room_id', 'team_id']);

            $ownerByRoom = [];
            foreach ($links as $link) {
                // First link wins because the rows are sorted by team_id.
                $ownerByRoom[$link->room_id] ??= $link->team_id;
            }

            foreach ($ownerByRoom as $roomId => $teamId) {
                DB::table('rooms')->where('id', $roomId)->update(['team_id' => $teamId]);
            }

            Schema::drop('room_team');
        }

        Schema::table('rooms', function (Blueprint $table) {
            $table->index('team_id');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('room_team')) {
            Schema::create('room_team', function (Blueprint $table) {
                $table->id();
                $table->foreignId('room_id')->constrained('rooms')->cascadeOnDelete();
                $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
                $table->timestamps();
            });
        }

        if (Schema::hasColumn('rooms', 'team_id')) {
            DB::table('rooms')
                ->whereNotNull('team_id')
                ->orderBy('id')
                ->each(function ($room) {
                    DB::table('room_team')->insert([
                        'room_id' => $room->id,
                        'team_id' => $room->team_id,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                });

            Schema::table('rooms', function (Blueprint $table) {
                $table->dropForeign(['team_id']);
                $table->dropColumn('team_id');
            });
        }
    }
};
