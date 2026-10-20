<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;

/**
 * Company branding (the logo shown in the sidebar and on the sign-in screen).
 *
 * Reading is public so the logo can be displayed before a user signs in;
 * changing it is limited to a unit owner or a super admin.
 */
class BrandingController extends Controller
{
    /** Directory (relative to the public path) that holds uploaded logos. */
    private const LOGO_DIR = 'uploads/branding';

    /**
     * Return the current branding.
     */
    public function show(): JsonResponse
    {
        return ApiResponse::success([
            'branding' => $this->brandingPayload(),
        ]);
    }

    /**
     * Update the company logo and/or name.
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user || ! ($user->isSuperAdmin() || $user->isOwner())) {
            return ApiResponse::error(
                'Hanya owner dan super admin yang dapat mengubah logo perusahaan.',
                null,
                403
            );
        }

        $validated = $request->validate([
            'company_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'logo' => ['sometimes', 'nullable', 'image', 'mimes:jpeg,png,jpg,webp,gif', 'max:4096'],
            'remove_logo' => ['sometimes', 'boolean'],
        ]);

        $current = Setting::get(Setting::KEY_COMPANY_LOGO);

        if ($request->boolean('remove_logo')) {
            $this->deleteLogo($current);
            Setting::put(Setting::KEY_COMPANY_LOGO, null);
        } elseif ($request->hasFile('logo')) {
            $this->deleteLogo($current);
            Setting::put(Setting::KEY_COMPANY_LOGO, $this->storeLogo($request->file('logo')));
        }

        if (array_key_exists('company_name', $validated)) {
            Setting::put(Setting::KEY_COMPANY_NAME, $validated['company_name']);
        }

        return ApiResponse::success([
            'branding' => $this->brandingPayload(),
        ], 'Logo perusahaan berhasil diperbarui.');
    }

    /**
     * The branding payload shared by the read and write endpoints.
     *
     * @return array{company_name: ?string, logo_path: ?string, logo_url: ?string}
     */
    private function brandingPayload(): array
    {
        $path = Setting::get(Setting::KEY_COMPANY_LOGO);

        return [
            'company_name' => Setting::get(Setting::KEY_COMPANY_NAME),
            'logo_path' => $path,
            'logo_url' => $path ? url($path) : null,
        ];
    }

    /**
     * Move an uploaded logo into the public branding directory.
     */
    private function storeLogo(UploadedFile $file): string
    {
        $directory = public_path(self::LOGO_DIR);
        File::ensureDirectoryExists($directory);

        $ext = strtolower($file->guessExtension() ?: 'png');
        $name = 'logo_'.md5(uniqid((string) random_int(0, PHP_INT_MAX), true)).'.'.$ext;
        $file->move($directory, $name);

        return self::LOGO_DIR.'/'.$name;
    }

    /**
     * Remove a stored logo, but only a file that lives in our branding folder.
     */
    private function deleteLogo(?string $path): void
    {
        if (! $path || ! str_starts_with($path, self::LOGO_DIR.'/')) {
            return;
        }

        $fullPath = public_path($path);
        if (File::exists($fullPath)) {
            File::delete($fullPath);
        }
    }
}
