<?php

namespace App\Http\Requests;

use App\Rules\CategoryBelongsToUnit;
use App\Rules\RoomBelongsToUnit;
use App\Rules\UserBelongsToUnit;
use App\Models\Asset;
use App\Support\UnitScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAssetRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('assets.update');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $asset = $this->route('asset');
        $owningTeamId = $this->owningTeamId($asset);

        return [
            'asset_code' => ['sometimes', 'string', 'max:50', 'unique:assets,asset_code,'.$asset->id],
            'name' => ['sometimes', 'string', 'max:255'],
            'category_id' => ['sometimes', 'nullable', Rule::exists('categories', 'id'), new CategoryBelongsToUnit($this->user(), $owningTeamId)],
            'photo' => ['sometimes', 'nullable', 'file', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:8192'],
            'purchase_price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'purchase_date' => ['sometimes', 'nullable', 'date'],
            'placement_date' => ['sometimes', 'nullable', 'date'],
            'purchase_receipt' => ['sometimes', 'nullable', 'file', 'mimes:jpeg,png,jpg,gif,webp,pdf,doc,docx', 'max:8192'],
            'description' => ['sometimes', 'nullable', 'string'],
            'condition' => ['sometimes', Rule::in(Asset::CONDITIONS)],
            'usage_status' => ['sometimes', Rule::in(Asset::USAGE_STATUSES)],
            'team_id' => ['sometimes', 'nullable', Rule::exists('teams', 'id')],
            'work_team_id' => ['sometimes', 'nullable', Rule::exists('work_teams', 'id')],
            'room_id' => ['sometimes', 'nullable', Rule::exists('rooms', 'id'), new RoomBelongsToUnit($this->user(), $owningTeamId)],
            'assigned_user_id' => ['sometimes', 'nullable', Rule::exists('users', 'id'), new UserBelongsToUnit($this->user(), $owningTeamId)],
        ];
    }

    /**
     * Unit that will own this asset after the update.
     *
     * Moving an asset to another unit is only possible for a super admin, who
     * posts the new `team_id`; everyone else keeps the asset where it is. The
     * category, room and person picked must match whichever unit that ends up.
     */
    private function owningTeamId(Asset $asset): int|string|null
    {
        $user = $this->user();

        if ($user && ! UnitScope::bypasses($user) && $user->team_id) {
            return $user->team_id;
        }

        $posted = $this->input('team_id');

        if ($posted !== null && $posted !== '') {
            return $posted;
        }

        return $asset->team_id;
    }
}