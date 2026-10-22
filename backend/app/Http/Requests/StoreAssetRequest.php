<?php

namespace App\Http\Requests;

use App\Rules\CategoryBelongsToUnit;
use App\Rules\RoomBelongsToUnit;
use App\Rules\UserBelongsToUnit;
use App\Models\Asset;
use App\Support\UnitScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAssetRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('assets.create');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $owningTeamId = $this->owningTeamId();

        return [
            'asset_code' => ['required', 'string', 'max:50', 'unique:assets,asset_code'],
            'name' => ['required', 'string', 'max:255'],
            'category_id' => ['nullable', Rule::exists('categories', 'id'), new CategoryBelongsToUnit($this->user(), $owningTeamId)],
            'photo' => ['nullable', 'file', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:8192'],
            'purchase_price' => ['nullable', 'numeric', 'min:0'],
            'purchase_date' => ['nullable', 'date'],
            'placement_date' => ['nullable', 'date'],
            'purchase_receipt' => ['nullable', 'file', 'mimes:jpeg,png,jpg,gif,webp,pdf,doc,docx', 'max:8192'],
            'description' => ['nullable', 'string'],
            'condition' => ['required', Rule::in(Asset::CONDITIONS)],
            'usage_status' => ['required', Rule::in(Asset::USAGE_STATUSES)],
            'team_id' => ['nullable', Rule::exists('teams', 'id')],
            'work_team_id' => ['nullable', Rule::exists('work_teams', 'id')],
            'room_id' => ['nullable', Rule::exists('rooms', 'id'), new RoomBelongsToUnit($this->user(), $owningTeamId)],
            'assigned_user_id' => ['nullable', Rule::exists('users', 'id'), new UserBelongsToUnit($this->user(), $owningTeamId)],
        ];
    }

    /**
     * Unit that will own this asset.
     *
     * A unit-scoped user is pinned to their own unit by the controller, so their
     * own unit wins over anything posted. A super admin chooses the unit, and the
     * category, room and person they pick all have to belong to that same unit.
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