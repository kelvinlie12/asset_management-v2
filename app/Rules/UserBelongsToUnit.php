<?php

namespace App\Rules;

use App\Models\User;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * A referenced person must belong to the unit that will own the record.
 *
 * As with {@see RoomBelongsToUnit}, the unit is the requesting user's own unit
 * unless the caller passes the unit a super admin picked for the record.
 */
class UserBelongsToUnit implements ValidationRule
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

        if ($teamId === null || $teamId === '') {
            return;
        }

        $target = User::query()->find($value);

        if ($target === null || (int) $target->team_id !== (int) $teamId) {
            $fail('Pengguna tersebut bukan anggota unit Anda.');
        }
    }
}
