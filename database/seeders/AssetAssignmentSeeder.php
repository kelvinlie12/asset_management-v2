<?php

namespace Database\Seeders;

use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\Room;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Seeder;

class AssetAssignmentSeeder extends Seeder
{
    /**
     * Seed sample asset placement history.
     */
    public function run(): void
    {
        if (AssetAssignment::count() > 0) {
            return;
        }

        $teamDev = fn () => Team::query()->where('slug', 'development')->first()?->id;
        // A room is owned by one unit, so every room lookup is scoped to the
        // same unit the asset is recorded under.
        $roomOf = fn (string $name) => fn (string $slug) => Room::query()
            ->where('name', $name)
            ->where('team_id', Team::query()->where('slug', $slug)->value('id'))
            ->value('id');
        $roomA = $roomOf('Ruang Rapat A');
        $roomB = $roomOf('Ruang Rapat B');
        $staff = fn () => User::query()->where('email', 'staff@example.com')->first()?->id;

        $assignments = [
            [
                'asset_code' => 'AST-004',
                'team_id' => $teamDev(),
                'room_id' => $roomB('development'),
                'assigned_user_id' => $staff(),
                'assigned_date' => '2025-03-12',
                'notes' => 'Penempatan awal laptop untuk tim pengembangan.',
            ],
            [
                'asset_code' => 'AST-001',
                'team_id' => $teamDev(),
                'room_id' => $roomA('development'),
                'assigned_user_id' => null,
                'assigned_date' => '2024-02-10',
                'notes' => 'Dipinjam untuk rapat Q1, kemudian dikembalikan ke storage.',
            ],
            [
                'asset_code' => 'AST-002',
                'team_id' => $teamDev(),
                'room_id' => $roomA('development'),
                'assigned_user_id' => $staff(),
                'assigned_date' => '2024-03-05',
                'notes' => 'Digunakan untuk presentasi produk.',
            ],
        ];

        foreach ($assignments as $assignment) {
            $asset = Asset::query()->where('asset_code', $assignment['asset_code'])->value('id');
            if (! $asset) {
                continue;
            }

            AssetAssignment::query()->create([
                'asset_id' => $asset,
                'team_id' => $assignment['team_id'],
                'room_id' => $assignment['room_id'],
                'assigned_user_id' => $assignment['assigned_user_id'],
                'assigned_date' => $assignment['assigned_date'],
                'notes' => $assignment['notes'],
            ]);
        }
    }
}