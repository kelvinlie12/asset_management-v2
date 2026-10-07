<?php

namespace App\Http\Requests;

use App\Support\ModuleCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserModulesRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Only a super admin may reshuffle a unit's menu access.
        return $this->user()?->isSuperAdmin() ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'modules' => ['present', 'array'],
            'modules.*' => ['string', Rule::in(ModuleCatalog::keys())],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'modules.required' => 'Select at least one module, or send an empty list to remove all access.',
            'modules.array' => 'Modules must be sent as a list.',
            'modules.*.in' => 'Unknown module.',
        ];
    }

    /**
     * @return list<string>
     */
    public function moduleKeys(): array
    {
        return ModuleCatalog::sanitizeKeys($this->validated('modules', []));
    }
}