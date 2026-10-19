<?php

namespace App\Http\Requests;

use App\Models\Room;
use App\Rules\RoomBelongsToUnit;
use App\Rules\UserBelongsToUnit;
use App\Support\UnitScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreAssetAssignmentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('assignments.create');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'asset_id' => ['required', Rule::exists('assets', 'id')],
            'assigned_date' => ['required', 'date'],
            'team_id' => ['nullable', Rule::exists('teams', 'id')],
            'room_id' => ['nullable', Rule::exists('rooms', 'id'), new RoomBelongsToUnit($this->user(), $this->owningTeamId())],
            'assigned_user_id' => ['nullable', Rule::exists('users', 'id'), new UserBelongsToUnit($this->user(), $this->owningTeamId())],
            'notes' => ['nullable', 'string'],
        ];
    }

    /**
     * Apply additional domain rules.
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                $data = $validator->getData();

                $placements = array_filter([
                    $data['team_id'] ?? null,
                    $data['room_id'] ?? null,
                    $data['assigned_user_id'] ?? null,
                ]);

                if ($placements === []) {
                    $validator->errors()->add(
                        'placements',
                        'Specify at least one placement: a team, a room, or an assigned user.'
                    );
                }
            },
            function (Validator $validator) {
                $roomId = $validator->getData()['room_id'] ?? null;
                if ($roomId && Room::query()->where('id', $roomId)->where('is_storage', true)->exists()) {
                    $validator->errors()->add(
                        'room_id',
                        'An in-use asset cannot be placed in a storage room.'
                    );
                }
            },
        ];
    }

    private function owningTeamId(): int|string|null
    {
        $user = $this->user();
        if ($user && ! UnitScope::bypasses($user) && $user->team_id) {
            return $user->team_id;
        }

        $posted = $this->input('team_id');
        if ($posted !== null && $posted !== '') {
            return $posted;
        }

        return null;
    }
}