<?php

namespace App\Http\Requests;

use App\Models\Category;
use App\Models\Team;
use App\Support\UnitScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique;

class StoreCategoryRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('categories.create');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $teamId = $this->owningTeamId();

        $uniqueIn = function (string $column) use ($teamId): Unique {
            $rule = Rule::unique(Category::class, $column);

            // Names and codes are only unique inside one unit, so every unit can
            // have its own "Kantor" without colliding with anybody else's.
            // A super admin creating a global category checks against the global
            // rows only, and a scoped user against their own unit's rows.
            return $teamId === null ? $rule->whereNull('team_id') : $rule->where('team_id', $teamId);
        };

        return [
            'name' => ['required', 'string', 'max:255', $uniqueIn('name')],
            'code' => ['required', 'string', 'max:50', $uniqueIn('code')],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', Rule::in(Category::STATUSES)],
            // Scoped users cannot choose an owner at all: prepareForValidation
            // below has already replaced whatever they posted with their own
            // unit, and a super admin may pick a unit or leave the category
            // shared by leaving it empty.
            'team_id' => ['sometimes', 'nullable', Rule::exists(Team::class, 'id')],
        ];
    }

    /**
     * Scoped users always create a category for their own unit.
     */
    protected function prepareForValidation(): void
    {
        $user = $this->user();

        if ($user && ! UnitScope::bypasses($user) && $user->team_id) {
            $this->merge(['team_id' => $user->team_id]);
        }
    }

    /**
     * Unit that will own this category, or null for a shared global one.
     */
    private function owningTeamId(): int|string|null
    {
        $user = $this->user();

        if ($user && ! UnitScope::bypasses($user) && $user->team_id) {
            return $user->team_id;
        }

        $posted = $this->input('team_id');

        return ($posted === null || $posted === '') ? null : $posted;
    }
}
