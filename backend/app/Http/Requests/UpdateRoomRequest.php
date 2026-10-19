<?php

namespace App\Http\Requests;

use App\Models\Room;
use App\Models\Team;
use App\Support\UnitScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRoomRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('rooms.update');
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
            'name' => ['sometimes', 'string', 'max:255'],
            'location' => ['sometimes', 'nullable', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', Rule::in(Room::STATUSES)],
            // A scoped user stays on their own unit, so the field is not theirs
            // to change and must not accept a null that would orphan the room.
            'team_id' => $scoped ? ['prohibited'] : ['sometimes', Rule::exists(Team::class, 'id')],
        ];
    }
}
