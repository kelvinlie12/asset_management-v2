<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Team;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Seed asset categories.
     *
     * Categories are per unit, so the base list is created once as the shared
     * global list and then copied into every company. A unit can rename, add to
     * or retire its own copy without touching anybody else's.
     */
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Elektronik',
                'code' => 'CAT-ELE',
                'description' => 'Barang elektronik dan perangkat listrik.',
                'status' => 'active',
            ],
            [
                'name' => 'Furniture',
                'code' => 'CAT-FUR',
                'description' => 'Perabotan dan perlengkapan ruangan.',
                'status' => 'active',
            ],
            [
                'name' => 'IT Equipment',
                'code' => 'CAT-IT',
                'description' => 'Peralatan IT dan jaringan.',
                'status' => 'active',
            ],
            [
                'name' => 'Lainnya',
                'code' => 'CAT-LAIN',
                'description' => 'Kategori lainnya.',
                'status' => 'inactive',
            ],
        ];

        foreach ($categories as $category) {
            Category::query()->updateOrCreate(
                ['code' => $category['code'], 'team_id' => null],
                $category,
            );
        }

        // Every unit then receives its own copy of the whole list.
        foreach (Team::query()->pluck('id') as $teamId) {
            foreach ($categories as $category) {
                Category::query()->firstOrCreate(
                    ['code' => $category['code'], 'team_id' => $teamId],
                    $category,
                );
            }
        }
    }
}
