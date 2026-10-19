<?php

namespace App\Http\Requests;

use App\Models\VehicleTax;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateVehicleTaxRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('vehicle_taxes.update');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'tax_due_date' => ['sometimes', 'nullable', 'date'],
            'pkb' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'swdkllj' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'opsen_pkb' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'administrative_fee' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'penalty' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'other_fee' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'payment_date' => ['sometimes', 'nullable', 'date'],
            'payment_status' => ['sometimes', Rule::in(VehicleTax::PAYMENT_STATUSES)],
            'payment_proof' => ['sometimes', 'nullable', 'string', 'max:255'],
            'notes' => ['sometimes', 'nullable', 'string'],
        ];
    }
}