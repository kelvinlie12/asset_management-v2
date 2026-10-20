<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Key/value store for application-wide settings (company branding, ...).
 *
 * A single row per key keeps the table flexible without a schema change every
 * time a new global preference is introduced.
 */
class Setting extends Model
{
    public const KEY_COMPANY_LOGO = 'company_logo';

    public const KEY_COMPANY_NAME = 'company_name';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'key',
        'value',
    ];

    /**
     * Read a setting value.
     */
    public static function get(string $key, ?string $default = null): ?string
    {
        $value = static::query()->where('key', $key)->value('value');

        return $value !== null ? (string) $value : $default;
    }

    /**
     * Create or update a setting value.
     */
    public static function put(string $key, ?string $value): void
    {
        static::query()->updateOrCreate(['key' => $key], ['value' => $value]);
    }
}
