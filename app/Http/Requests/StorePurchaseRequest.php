<?php

namespace App\Http\Requests;

use App\Rules\CategoryBelongsToUnit;
use App\Rules\RoomBelongsToUnit;
use App\Support\UnitScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePurchaseRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('purchases.create');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        // A purchase creates an asset in the buyer's own unit, so the category
        // and room picked must belong to that unit too. A super admin buys for
        // no particular unit unless one is posted, which leaves it unrestricted.
        $owningTeamId = $this->owningTeamId();

        return [
            'name' => ['required', 'string', 'max:255'],
            'category_id' => ['nullable', Rule::exists('categories', 'id'), new CategoryBelongsToUnit($this->user(), $owningTeamId)],
            'room_id' => ['nullable', Rule::exists('rooms', 'id'), new RoomBelongsToUnit($this->user(), $owningTeamId)],
            'amount' => ['required', 'numeric', 'min:0'],
            'purchase_date' => ['required', 'date'],
            'supplier' => ['required', 'string', 'max:255'],
            'invoice_number' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'proof' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ];
    }

    /**
     * Unit that will own the asset this purchase produces.
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