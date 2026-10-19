<?php

namespace App\Http\Requests;

use App\Models\Room;
use App\Models\Team;
use App\Support\UnitScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRoomRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('rooms.create');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $user = $this->user();

        $scoped = $user && ! UnitScope::bypasses($user) && $user->team_id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', Rule::in(Room::STATUSES)],
            // Each company keeps its own rooms, so a room always has exactly one
            // owning unit. Scoped users get their own unit injected below.
            'team_id' => $scoped ? ['nullable', Rule::exists(Team::class, 'id')] : ['required', Rule::exists(Team::class, 'id')],
        ];
    }

    /**
     * Scoped users may not create a room for another unit.
     */
    protected function prepareForValidation(): void
    {
        $user = $this->user();

        if ($user && ! UnitScope::bypasses($user) && $user->team_id) {
            $this->merge(['team_id' => $user->team_id]);
        }
    }
}