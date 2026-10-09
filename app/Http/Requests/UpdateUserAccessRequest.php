<?php

namespace App\Http\Requests;

use App\Support\AccessCatalog;
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
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string', Rule::in(AccessCatalog::permissionNames())],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'permissions.present' => 'Kirim daftar izin, atau array kosong untuk mencabut semua akses fitur.',
            'permissions.array' => 'Izin harus dikirim sebagai daftar.',
            'permissions.*.in' => 'Izin tidak dikenal.',
        ];
    }

    /**
     * The sanitized list of permissions to apply.
     *
     * @return list<string>
     */
    public function permissionNames(): array
    {
        return AccessCatalog::sanitize($this->validated('permissions', []));
    }
}
