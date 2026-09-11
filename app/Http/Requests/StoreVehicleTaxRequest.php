<?php

namespace App\Http\Requests;

use App\Models\VehicleAsset;
use App\Models\VehicleTax;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreVehicleTaxRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('vehicle_taxes.create');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'tax_due_date' => ['nullable', 'date'],
            'pkb' => ['nullable', 'numeric', 'min:0'],
            'swdkllj' => ['nullable', 'numeric', 'min:0'],
            'opsen_pkb' => ['nullable', 'numeric', 'min:0'],
            'administrative_fee' => ['nullable', 'numeric', 'min:0'],
            'penalty' => ['nullable', 'numeric', 'min:0'],
            'other_fee' => ['nullable', 'numeric', 'min:0'],
            'payment_date' => ['nullable', 'date'],
            'payment_status' => ['required', Rule::in(VehicleTax::PAYMENT_STATUSES)],
            'payment_proof' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ];
    }
}