<?php

namespace App\Http\Requests;

use App\Support\ModuleCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserAccessRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('manageAccess', $this->route('user'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
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
            'modules.present' => 'Kirim daftar modul, atau array kosong untuk mencabut semua akses.',
            'modules.array' => 'Modul harus dikirim sebagai daftar.',
            'modules.*.in' => 'Modul tidak dikenal.',
        ];
    }

    /**
     * The sanitized list of modules to apply.
     *
     * @return list<string>
     */
    public function moduleKeys(): array
    {
        return ModuleCatalog::sanitizeKeys($this->validated('modules', []));
    }
}
