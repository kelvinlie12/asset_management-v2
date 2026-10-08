<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\Category;
use App\Models\Purchase;
use App\Models\Room;
use App\Models\Team;
use App\Models\User;
use App\Models\VehicleAsset;
use App\Support\ApiResponse;
use App\Support\UnitScope;
use App\Support\VehicleTaxReminder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $bypass = UnitScope::bypasses($user);

        $assetQuery = Asset::query();
        $vehicleQuery = VehicleAsset::query();
        if (! $bypass && $user && $user->team_id) {
            $assetQuery->where('team_id', $user->team_id);
            $vehicleQuery->where('team_id', $user->team_id);
        }

        $totalAssets = $assetQuery->count();
        $assetsInUse = (clone $assetQuery)->where('usage_status', Asset::USAGE_IN_USE)->count();
        $assetsInStorage = (clone $assetQuery)->where('usage_status', Asset::USAGE_IN_STORAGE)->count();
        $assetsDamaged = (clone $assetQuery)->where('condition', Asset::CONDITION_DAMAGED)->count();
        $totalAssetValue = (float) (clone $assetQuery)->whereNotNull('purchase_price')->sum('purchase_price');

        $totalAssets += $vehicleQuery->count();
        $assetsInUse += (clone $vehicleQuery)->where('usage_status', VehicleAsset::USAGE_IN_USE)->count();
        $assetsInStorage += (clone $vehicleQuery)->where('usage_status', VehicleAsset::USAGE_IN_STORAGE)->count();
        $assetsDamaged += (clone $vehicleQuery)->where('condition', VehicleAsset::CONDITION_DAMAGED)->count();
        $assetsGood = (clone $assetQuery)->where('condition', Asset::CONDITION_GOOD)->count()
            + (clone $vehicleQuery)->where('condition', VehicleAsset::CONDITION_GOOD)->count();
        $totalAssetValue += (float) (clone $vehicleQuery)->whereNotNull('purchase_price')->sum('purchase_price');

        $taxSummary = VehicleTaxReminder::summarize($user)['summary'];

        // Scoped to the user's unit the same way the counters above are, so a
        // unit only ever sees the categories it owns and its own asset counts.
        $assetsByCategory = UnitScope::apply(Category::query(), $user)
            ->whereHas('assets')
            ->withCount('assets')
            ->orderByDesc('assets_count')
            ->get()
            ->map(fn (Category $category) => [
                'label' => $category->name,
                'value' => $category->assets_count,
            ])
            ->values()
            ->all();

        $assetsByCondition = [
            ['label' => 'Good', 'value' => $assetsGood],
            ['label' => 'Damaged', 'value' => $assetsDamaged],
        ];

        $assetsByTeam = (clone $assetQuery)
            ->whereNotNull('team_id')
            ->select('team_id', DB::raw('count(*) as total'))
            ->groupBy('team_id')
            ->with('team:id,name')
            ->get()
            ->map(fn (Asset $asset) => [
                'label' => $asset->team?->name ?? 'Unassigned',
                'value' => (int) $asset->total,
            ])
            ->values()
            ->all();

        // Combine vehicle assets into team buckets.
        $vehicleTeamTotals = (clone $vehicleQuery)
            ->whereNotNull('team_id')
            ->select('team_id', DB::raw('count(*) as total'))
            ->groupBy('team_id')
            ->with('team:id,name')
            ->get();
        foreach ($vehicleTeamTotals as $vt) {
            $name = $vt->team?->name ?? 'Unassigned';
            $found = false;
            foreach ($assetsByTeam as &$bucket) {
                if ($bucket['label'] === $name) {
                    $bucket['value'] += (int) $vt->total;
                    $found = true;
                    break;
                }
            }
            unset($bucket);
            if (! $found) {
                $assetsByTeam[] = ['label' => $name, 'value' => (int) $vt->total];
            }
        }
        usort($assetsByTeam, fn ($a, $b) => $b['value'] <=> $a['value']);
        $assetsByTeam = array_values($assetsByTeam);

        // DATE_FORMAT is MySQL-only; sqlite (the test driver) spells it strftime.
        $monthExpression = DB::connection()->getDriverName() === 'sqlite'
            ? "strftime('%Y-%m', purchase_date)"
            : "DATE_FORMAT(purchase_date, '%Y-%m')";

        $purchasesPerMonth = Purchase::query()
            ->whereNotNull('purchase_date')
            ->select(DB::raw($monthExpression.' as month'), DB::raw('count(*) as count'), DB::raw('sum(amount) as total'))
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(function ($row) {
                $ts = strtotime($row->month.'-01');
                return [
                    'month' => $row->month,
                    'label' => \Carbon\Carbon::parse($row->month.'-01')->isoFormat('MMM YYYY'),
                    'count' => (int) $row->count,
                    'total' => round((float) $row->total, 2),
                ];
            })
            ->values()
            ->all();

        return ApiResponse::success([
            'metrics' => [
                'total_assets' => $totalAssets,
                'assets_in_use' => $assetsInUse,
                'assets_in_storage' => $assetsInStorage,
                'assets_damaged' => $assetsDamaged,
                'total_asset_value' => round($totalAssetValue, 2),
                'total_teams' => Team::count(),
                'total_users' => User::count(),
                'total_rooms' => Room::count(),
            ],
            'tax_reminders' => [
                'overdue' => $taxSummary['overdue'],
                'due_today' => $taxSummary['due_today'],
                'due_soon_7' => $taxSummary['due_soon_7'],
                'due_soon_14' => $taxSummary['due_soon_14'],
                'due_soon_30' => $taxSummary['due_soon_30'],
                'needs_attention' => $taxSummary['needs_attention'],
                'total_vehicles' => $taxSummary['total_vehicles'],
            ],
            'assets_by_category' => $assetsByCategory,
            'assets_by_condition' => $assetsByCondition,
            'assets_by_team' => $assetsByTeam,
            'purchases_per_month' => $purchasesPerMonth,
        ], 'Data dashboard berhasil dimuat.');
    }
}
