<?php

namespace Database\Seeders;

use App\Models\Team;
use App\Models\WorkTeam;
use Illuminate\Database\Seeder;

/**
 * Demo work teams (working groups) for every unit.
 *
 * Idempotent: keyed by (team_id, name) so re-running only fills the gaps.
 */
class WorkTeamSeeder extends Seeder
{
    /** @var list<string> */
    private const NAMES = [
        'Tim Jaringan',
        'Tim Teknik',
        'Tim Operasional',
        'Tim Keuangan',
        'Tim Umum',
    ];

    public function run(): void
    {
        foreach (Team::query()->orderBy('id')->get() as $team) {
            foreach (self::NAMES as $name) {
                WorkTeam::firstOrCreate(
                    ['team_id' => $team->id, 'name' => $name],
                    ['status' => WorkTeam::STATUS_ACTIVE],
                );
            }
        }
    }
}
