<?php

namespace App\Rules;

use App\Models\Room;
use App\Models\User;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * A referenced room must belong to the unit that will own the record.
 *
 * The unit is normally the requesting user's own unit, which is how this rule
 * was first used. Callers that let a super admin choose the owning unit pass
 * that unit explicitly: without it a super admin could park a record of one
 * company inside another company's room, because "super admins are not
 * restricted" used to mean "not checked at all".
 */
class RoomBelongsToUnit implements ValidationRule
{
    /**
     * Create a new rule instance.
     *
     * @param  int|string|null  $targetTeamId  Unit that will own the record; falls back to the user's own unit.
     */
    public function __construct(
        private readonly ?User $user = null,
        private readonly int|string|null $targetTeamId = null,
    ) {
    }

    /**
     * Run the validation rule.
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null || $value === '') {
            return;
        }

        $teamId = $this->targetTeamId ?? $this->user?->team_id;

        // No unit to compare against (a super admin who has not chosen one
        // yet, or a legacy user without a unit) leaves the choice unrestricted.
        if ($teamId === null || $teamId === '') {
            return;
        }

        $allowed = Room::query()
            ->whereKey($value)
            ->where('team_id', $teamId)
            ->exists();

        if (! $allowed) {
            $fail('Ruangan tersebut bukan milik unit Anda.');
        }
    }
}
