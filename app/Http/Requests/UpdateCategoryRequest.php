<?php

namespace App\Http\Requests;

use App\Models\Category;
use App\Models\Team;
use App\Support\UnitScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique;

class UpdateCategoryRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('categories.update');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $category = $this->route('category');
        $teamId = $this->owningTeamId($category);

        $uniqueIn = function (string $column) use ($category, $teamId): Unique {
            $rule = Rule::unique(Category::class, $column)->ignore($category->id);

            // Uniqueness is per unit, so a rename is only checked against the
            // rows this category would live alongside after the update.
            return $teamId === null ? $rule->whereNull('team_id') : $rule->where('team_id', $teamId);
        };

        return [
            'name' => ['sometimes', 'string', 'max:255', $uniqueIn('name')],
            'code' => ['sometimes', 'string', 'max:50', $uniqueIn('code')],
            'description' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', Rule::in(Category::STATUSES)],
            // Only a super admin may move a category to another unit.
            'team_id' => ['sometimes', 'nullable', Rule::exists(Team::class, 'id')],
        ];
    }

    /**
     * Unit that will own this category after the update.
     *
     * A unit-scoped user can never move it off their own unit, so their own
     * unit wins over anything posted. A super admin posts the destination, and
     * an empty value means the shared global list.
     */
    private function owningTeamId(Category $category): int|string|null
    {
        $user = $this->user();

        if ($user && ! UnitScope::bypasses($user) && $user->team_id) {
            return $user->team_id;
        }

        if ($this->exists('team_id')) {
            $posted = $this->input('team_id');

            return ($posted === null || $posted === '') ? null : $posted;
        }

        return $category->team_id;
    }
}
