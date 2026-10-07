<?php

namespace Database\Seeders;

use App\Models\Room;
use App\Models\Team;
use Illuminate\Database\Seeder;

class RoomSeeder extends Seeder
{
    /**
     * Legacy rooms that predate unit ownership, mapped to the unit that keeps
     * them. They are claimed by name so the ids survive and no assets, network
     * nodes, or vehicles pointing at them lose their room.
     *
     * @var array<string, string>
     */
    private const LEGACY_ROOMS = [
        'Gudang' => 'development',
        'Training Room' => 'unit-teknik',
        'Site Tower A' => 'unit-teknik',
        'Site Tower B' => 'unit-teknik',
        'Site Tower C' => 'unit-teknik',
        'ruang kelas' => 'unit-keuangan',
    ];

    /**
     * Seed rooms for each unit.
     *
     * Every room is owned by exactly one unit, so each company gets its own
     * set of rooms instead of sharing a common list. The unit that owns a room
     * is the one whose users can later edit or use it.
     */
    public function run(): void
    {
        $teams = Team::query()->pluck('id', 'slug');

        $this->claimLegacyRooms($teams);

        // Keyed by team slug so a missing unit simply skips its rooms instead
        // of failing the whole seed.
        $rooms = [
            'development' => [
                ['name' => 'Ruang Rapat A', 'location' => 'Lantai 1', 'description' => 'Ruang rapat utama unit.', 'status' => 'active', 'is_storage' => false],
                ['name' => 'Ruang Rapat B', 'location' => 'Lantai 1', 'description' => 'Ruang rapat kecil unit.', 'status' => 'active', 'is_storage' => false],
                ['name' => 'Gudang', 'location' => 'Gudang Lantai 1', 'description' => 'Gudang / storage unit.', 'status' => 'active', 'is_storage' => true],
            ],
            'marketing' => [
                ['name' => 'Ruang Kreatif', 'location' => 'Lantai 1', 'description' => 'Ruang kerja kreatif unit.', 'status' => 'active', 'is_storage' => false],
            ],
            'operations' => [
                ['name' => 'Server Room', 'location' => 'Lantai 2', 'description' => 'Ruang server dan perangkat jaringan unit.', 'status' => 'active', 'is_storage' => false],
                ['name' => 'Gudang Operasional', 'location' => 'Lantai 1', 'description' => 'Gudang penyimpanan unit.', 'status' => 'active', 'is_storage' => true],
            ],
            'unit-teknik' => [
                ['name' => 'Ruang Unit Teknik', 'location' => 'Lantai 1', 'description' => 'Ruang kerja unit teknik.', 'status' => 'active', 'is_storage' => false],
                ['name' => 'Gudang Unit Teknik', 'location' => 'Lantai 1', 'description' => 'Gudang unit teknik.', 'status' => 'active', 'is_storage' => true],
            ],
            'unit-operasional' => [
                ['name' => 'Ruang Unit Operasional', 'location' => 'Lantai 1', 'description' => 'Ruang kerja unit operasional.', 'status' => 'active', 'is_storage' => false],
                ['name' => 'Gudang Unit Operasional', 'location' => 'Lantai 1', 'description' => 'Gudang unit operasional.', 'status' => 'active', 'is_storage' => true],
            ],
            'unit-keuangan' => [
                ['name' => 'Ruang Unit Keuangan', 'location' => 'Lantai 1', 'description' => 'Ruang kerja unit keuangan.', 'status' => 'active', 'is_storage' => false],
                ['name' => 'Ruang Arsip', 'location' => 'Lantai 2', 'description' => 'Ruang arsip dokumen unit.', 'status' => 'active', 'is_storage' => false],
            ],
        ];

        $teams = Team::query()->pluck('id', 'slug');

        foreach ($rooms as $slug => $unitRooms) {
            $teamId = $teams[$slug] ?? null;
            if (! $teamId) {
                continue;
            }

            foreach ($unitRooms as $room) {
                // Keyed by unit as well so two units may both have a "Gudang".
                Room::query()->updateOrCreate(
                    ['name' => $room['name'], 'team_id' => $teamId],
                    $room,
                );
            }
        }
    }

    /**
     * Give rooms that were created before unit ownership existed a unit, so no
     * room is left without an owner after the migration.
     *
     * @param  \Illuminate\Support\Collection<string, int>  $teams
     */
    private function claimLegacyRooms($teams): void
    {
        foreach (self::LEGACY_ROOMS as $name => $slug) {
            $teamId = $teams[$slug] ?? null;

            if (! $teamId) {
                continue;
            }

            Room::query()
                ->where('name', $name)
                ->whereNull('team_id')
                ->update(['team_id' => $teamId]);
        }
    }
}
