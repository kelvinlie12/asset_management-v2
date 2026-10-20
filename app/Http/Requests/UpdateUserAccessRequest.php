<?php

namespace App\Http\Requests;

use App\Support\AccessCatalog;
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
            // Either the individual permissions (the Access Rights screen) or,
            // for older clients, a list of module bundles.
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', Rule::in(AccessCatalog::permissionNames())],
            'modules' => ['sometimes', 'array'],
            'modules.*' => ['string', Rule::in(ModuleCatalog::keys())],
        ];
    }

    /**
     * An empty list is a valid way to revoke everything, so presence of one
     * of the two keys is checked here instead of with `required`.
     *
     * @return array<int, \Closure>
     */
    public function after(): array
    {
        return [
            function ($validator) {
                if (! $this->has('permissions') && ! $this->has('modules')) {
                    $validator->errors()->add(
                        'permissions',
                        'Kirim daftar permission, atau array kosong untuk mencabut semua akses.'
                    );
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'permissions.array' => 'Permission harus dikirim sebagai daftar.',
            'permissions.*.in' => 'Permission tidak dikenal.',
            'modules.array' => 'Modul harus dikirim sebagai daftar.',
            'modules.*.in' => 'Modul tidak dikenal.',
        ];
    }

    /**
     * Whether the request carries individual permissions (as opposed to
     * module bundles).
     */
    public function usesPermissions(): bool
    {
        return $this->has('permissions');
    }

    /**
     * The sanitized list of individual permissions to apply.
     *
     * @return list<string>
     */
    public function permissionNames(): array
    {
        return AccessCatalog::sanitize($this->validated('permissions', []));
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
