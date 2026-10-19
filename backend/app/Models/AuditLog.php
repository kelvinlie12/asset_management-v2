<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    public const EVENT_CREATED = 'created';

    public const EVENT_UPDATED = 'updated';

    public const EVENT_DELETED = 'deleted';

    public const EVENTS = [
        self::EVENT_CREATED,
        self::EVENT_UPDATED,
        self::EVENT_DELETED,
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'event',
        'auditable_type',
        'auditable_id',
        'old_values',
        'new_values',
        'url',
        'ip_address',
        'user_agent',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'old_values' => 'array',
            'new_values' => 'array',
        ];
    }

    /**
     * The user who performed the action.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Resolve a human readable label for the auditable model.
     */
    public function getAuditableLabelAttribute(): string
    {
        $class = class_basename($this->auditable_type);

        return match ($class) {
            'Asset' => 'Aset',
            'AssetAssignment' => 'Penempatan',
            'AssetTransfer' => 'Mutasi',
            'AssetDamage' => 'Barang Rusak',
            'VehicleAsset' => 'Kendaraan',
            'Purchase' => 'Pembelian',
            'Category' => 'Kategori',
            'Room' => 'Ruangan',
            'Team' => 'Team',
            'User' => 'User',
            'Role' => 'Role',
            'Permission' => 'Permission',
            default => $class,
        };
    }
}
