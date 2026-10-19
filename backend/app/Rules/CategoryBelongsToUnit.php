<?php

namespace App\Rules;

use App\Models\Category;
use App\Models\User;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * A referenced category must belong to the unit that will own the record.
 *
 * Categories are per unit: each company keeps its own copy of every category,
 * so letting one company's asset point at another company's row would put that
 * asset in the wrong unit's reports. The original categories with no owner
 * (`team_id` null) are the shared global list, and they exist for assets that
 * themselves belong to no unit, so a record that is being placed in a unit has
 * to use that unit's own copy.
 *
 * The unit is normally the requesting user's own unit. Callers that let a super
 * admin choose the owning unit pass it explicitly, the same way
 * RoomBelongsToUnit does, so that picking unit B's category while creating a
 * record of unit A is rejected rather than silently accepted.
 */
class CategoryBelongsToUnit implements ValidationRule
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

        $category = Category::query()->whereKey($value)->first(['id', 'team_id']);

        // An id that does not exist is the `exists` rule's job to report.
        if ($category === null) {
            return;
        }

        // The invariant is simply "same owner": a record of unit A uses unit
        // A's categories, and a record that belongs to no unit at all uses the
        // shared global ones. A null on either side is a real value here, not
        // an unknown, so the comparison stays strict.
        $owningTeamId = $category->team_id;

        $matches = $teamId === null || $teamId === ''
            ? $owningTeamId === null
            : $owningTeamId !== null && (int) $owningTeamId === (int) $teamId;

        if (! $matches) {
            $fail($owningTeamId === null
                ? 'Kategori global hanya untuk aset yang tidak memiliki unit.'
                : 'Kategori tersebut bukan milik unit Anda.');
        }
    }
}
