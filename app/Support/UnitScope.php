<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Unit (team) data scoping.
 *
 * Non-super-admin users are limited to their own unit (team). Super admins
 * bypass the scope and can access every unit.
 */
class UnitScope
{
    /**
     * Whether the user has unrestricted access across all units.
     */
    public static function bypasses(?User $user): bool
    {
        return $user !== null && $user->isSuperAdmin();
    }

    /**
     * Narrow a query to the user's own unit, unless they bypass scoping.
     *
     * Users without an assigned unit are not scoped (legacy behaviour).
     */
    public static function apply(Builder $query, ?User $user, string $column = 'team_id'): Builder
    {
        if (! self::bypasses($user) && $user !== null && $user->team_id) {
            $query->where($column, $user->team_id);
        }

        return $query;
    }

    /**
     * Narrow a query to the user's own unit through a belongs-to/has-one
     * relation, for tables that have no unit column of their own
     * (e.g. network nodes and damages inherit the unit of their asset).
     */
    public static function applyToRelation(Builder $query, ?User $user, string $relation, string $column = 'team_id'): Builder
    {
        if (! self::bypasses($user) && $user !== null && $user->team_id) {
            $query->whereHas($relation, fn ($related) => $related->where($column, $user->team_id));
        }

        return $query;
    }

    /**
     * Whether a many-to-many record (e.g. a room) is linked to the user's unit.
     */
    public static function allows(?User $user, ?int $teamId): bool
    {
        if (self::bypasses($user) || $user === null || ! $user->team_id) {
            return true;
        }

        if ($teamId === null) {
            return false;
        }

        return (int) $user->team_id === (int) $teamId;
    }

    /**
     * Abort (403) when a many-to-many record is not linked to the user's unit.
     */
    public static function assertAllowed(?User $user, ?int $teamId, string $message = 'Anda hanya dapat mengakses data unit sendiri.'): void
    {
        if (! self::allows($user, $teamId)) {
            abort(403, $message);
        }
    }

    /**
     * Abort (403) when the user is scoped and the row belongs to another unit.
     */
    public static function assertAccess(?User $user, ?int $teamId): void
    {
        if (self::bypasses($user) || $user === null || ! $user->team_id) {
            return;
        }

        if ((int) $user->team_id !== (int) $teamId) {
            abort(403, 'Anda hanya dapat mengakses data unit sendiri.');
        }
    }

    /**
     * Abort (403) when a scoped user is not a party to either side of a transfer.
     */
    public static function assertTransferAccess(?User $user, ?int $fromTeamId, ?int $toTeamId): void
    {
        if (self::bypasses($user) || $user === null || ! $user->team_id) {
            return;
        }

        $unit = (int) $user->team_id;

        if ($unit !== (int) $fromTeamId && $unit !== (int) $toTeamId) {
            abort(403, 'Anda hanya dapat mengakses mutasi pada unit sendiri.');
        }
    }

    /**
     * Resolve the team id a scoped user may write to (locks to their unit).
     */
    public static function resolveTeamId(?User $user, ?int $requested): ?int
    {
        if (self::bypasses($user) || $user === null || ! $user->team_id) {
            return $requested;
        }

        return $user->team_id;
    }
}