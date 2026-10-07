<?php

namespace App\Http\Requests;

use App\Rules\RoomBelongsToUnit;
use App\Rules\UserBelongsToUnit;
use App\Models\VehicleAsset;
use App\Support\UnitScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreVehicleRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('vehicles.create');
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
            // Left nullable so the controller can fall back to nextVehicleCode(); a blank
            // value still has to be unique, which `unique` enforces for non-null input.
            'asset_code' => ['nullable', 'string', 'max:50', 'unique:vehicle_assets,asset_code'],
            'photo' => ['nullable', 'file', 'max:2048'],
            'brand' => ['required', 'string', 'max:255'],
            'model' => ['required', 'string', 'max:255'],
            'year' => ['nullable', 'string', 'max:4', 'regex:/^\d{4}$/'],
            'plate_number' => ['required', 'string', 'max:20', 'regex:/^[A-Z]{1,2}[ ]?\d{1,4}[ ]?[A-Z]{1,3}$/', 'unique:vehicle_assets,plate_number'],
            'engine_number' => ['required', 'string', 'max:255'],
            'chassis_number' => ['required', 'string', 'max:255'],
            'placement_date' => ['required', 'date'],
            'tax_due_date' => ['required', 'date'],
            'tax_status' => ['nullable', Rule::in(VehicleAsset::TAX_STATUSES)],
            'description' => ['nullable', 'string'],
            'condition' => ['required', Rule::in(VehicleAsset::CONDITIONS)],
            'usage_status' => ['required', Rule::in(VehicleAsset::USAGE_STATUSES)],
            'team_id' => ['nullable', Rule::exists('teams', 'id')],
'room_id' => ['nullable', Rule::exists('rooms', 'id'), new RoomBelongsToUnit($this->user(), $owningTeamId)],
            'assigned_user_id' => ['nullable', Rule::exists('users', 'id'), new UserBelongsToUnit($this->user(), $owningTeamId)],
            'supplier_id' => ['nullable', Rule::exists('suppliers', 'id')],
        ];
    }

    /**
     * Unit that will own this vehicle.
     *
     * A unit-scoped user is pinned to their own unit by the controller, so their
     * own unit wins over anything posted. A super admin chooses the unit, and the
     * room and person they pick have to belong to that same unit.
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

    /**
     * Apply additional domain rules: tax due date and damaged storage.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $data = $validator->getData();

            $placementDate = $data['placement_date'] ?? null;
            $taxDueDate = $data['tax_due_date'] ?? null;
            if ($placementDate && $taxDueDate && $taxDueDate < $placementDate) {
                $validator->errors()->add(
                    'tax_due_date',
                    'The tax due date cannot be before the placement date.',
                );
            }

            if (($data['condition'] ?? null) === VehicleAsset::CONDITION_DAMAGED
                && ($data['usage_status'] ?? null) !== VehicleAsset::USAGE_IN_STORAGE) {
                $validator->errors()->add(
                    'usage_status',
                    'A damaged vehicle must be stored (usage status IN_STORAGE).',
                );
            }
        });
    }
}
