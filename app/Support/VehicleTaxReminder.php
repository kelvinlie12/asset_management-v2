<?php

namespace App\Support;

use App\Models\VehicleAsset;
use Carbon\Carbon;

/**
 * Computes vehicle tax reminder categories based on each vehicle's current
 * unpaid tax due date.
 *
 * Buckets are cumulative:
 *  - overdue:        tax due date passed
 *  - due_today:      due today (unpaid)
 *  - due_soon_7:     due within the next 7 days (inclusive of today)
 *  - due_soon_14:    due within the next 14 days
 *  - due_soon_30:    due within the next 30 days
 *
 * Vehicles whose tax_status is PAID are excluded from the "needs attention"
 * lists.
 */
class VehicleTaxReminder
{
    /**
     * Build the reminder summary and the list of vehicles needing attention.
     *
     * @return array{summary: array<string, int>, vehicles: \Illuminate\Support\Collection<int, VehicleAsset>}
     */
    public static function summarize(): array
    {
        $today = Carbon::today();

        $vehicles = VehicleAsset::query()
            ->with(['team', 'room', 'assignedUser', 'supplier'])
            ->get();

        $summary = [
            'total_vehicles' => $vehicles->count(),
            'overdue' => 0,
            'due_today' => 0,
            'due_soon_7' => 0,
            'due_soon_14' => 0,
            'due_soon_30' => 0,
            'needs_attention' => 0,
        ];

        $attention = $vehicles->filter(function (VehicleAsset $vehicle) use ($today, &$summary) {
            if ($vehicle->tax_status === VehicleAsset::TAX_PAID) {
                return false;
            }

            $due = $vehicle->effectiveTaxDueDate();
            if (! $due) {
                return false;
            }

            if ($due->lt($today)) {
                $summary['overdue']++;
            } elseif ($due->isSameDay($today)) {
                $summary['due_today']++;
            } elseif ($due->lte($today->copy()->addDays(6))) {
                $summary['due_soon_7']++;
            } elseif ($due->lte($today->copy()->addDays(13))) {
                $summary['due_soon_14']++;
            } elseif ($due->lte($today->copy()->addDays(29))) {
                $summary['due_soon_30']++;
            }

            return true;
        });

        $summary['due_soon_14'] += $summary['due_soon_7'];
        $summary['due_soon_30'] += $summary['due_soon_14'];
        $summary['needs_attention'] = $summary['overdue'] + $summary['due_today'] + $summary['due_soon_30'];

        return [
            'summary' => $summary,
            'vehicles' => $attention->values(),
        ];
    }
}