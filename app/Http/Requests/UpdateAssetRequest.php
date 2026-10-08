<?php

namespace App\Http\Requests;

use App\Rules\CategoryBelongsToUnit;
use App\Rules\RoomBelongsToUnit;
use App\Rules\UserBelongsToUnit;
use App\Models\Asset;
use App\Models\Room;
use App\Support\UnitScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

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

    /**
     * Enforce the business rule: a damaged asset must be stored in a warehouse.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $asset = $this->route('asset');
            $data = $validator->getData();
            $condition = $data['condition'] ?? $asset->condition;

            if ($condition !== Asset::CONDITION_DAMAGED) {
                return;
            }

            $usageStatus = $data['usage_status'] ?? $asset->usage_status;
            if ($usageStatus !== Asset::USAGE_IN_STORAGE) {
                $validator->errors()->add(
                    'usage_status',
                    'A damaged asset must be stored in the warehouse (usage status IN_STORAGE).',
                );
            }

            $roomId = $data['room_id'] ?? $asset->room_id;
            if ($roomId && ! Room::query()->where('id', $roomId)->where('is_storage', true)->exists()) {
                $validator->errors()->add(
                    'room_id',
                    'A damaged asset must be assigned to a storage room (warehouse).',
                );
            }
        });
    }
}