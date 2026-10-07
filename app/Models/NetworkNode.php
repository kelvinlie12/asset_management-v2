<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NetworkNode extends Model
{
    use HasFactory;

    public const TYPE_OLT = 'OLT';
    public const TYPE_ODC = 'ODC';
    public const TYPE_ODP = 'ODP';
    public const TYPE_SPLITTER = 'SPLITTER';
    public const TYPE_ONT = 'ONT';
    public const TYPE_SWITCH = 'SWITCH';
    public const TYPE_ROUTER = 'ROUTER';
    public const TYPE_OTHER = 'OTHER';

    public const NODE_TYPES = [
        self::TYPE_OLT,
        self::TYPE_ODC,
        self::TYPE_ODP,
        self::TYPE_SPLITTER,
        self::TYPE_ONT,
        self::TYPE_SWITCH,
        self::TYPE_ROUTER,
        self::TYPE_OTHER,
    ];

    public const STATUS_ACTIVE = 'ACTIVE';
    public const STATUS_INACTIVE = 'INACTIVE';
    public const STATUS_MAINTENANCE = 'MAINTENANCE';

    public const STATUSES = [
        self::STATUS_ACTIVE,
        self::STATUS_INACTIVE,
        self::STATUS_MAINTENANCE,
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'asset_id',
        'room_id',
        'parent_id',
        'node_type',
        'label',
        'pon_port',
        'splitter_ratio',
        'port_capacity',
        'port_used',
        'customer_count',
        'rx_power_dbm',
        'area',
        'status',
        'notes',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'port_capacity' => 'integer',
            'port_used' => 'integer',
            'customer_count' => 'integer',
            'rx_power_dbm' => 'decimal:2',
        ];
    }

    /**
     * The asset (from the Asset Master) behind this node.
     *
     * @return BelongsTo<Asset, $this>
     */
    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    /**
     * The site (storage-less room) where the node is installed.
     *
     * @return BelongsTo<Room, $this>
     */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    /**
     * The parent node this node hangs off of.
     *
     * @return BelongsTo<NetworkNode, $this>
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /**
     * Child nodes under this node.
     *
     * @return HasMany<NetworkNode, $this>
     */
    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    /**
     * Whether this node still has at least one child node.
     */
    public function hasChildren(): bool
    {
        return $this->children()->exists();
    }

    /**
     * Walk up the parent chain to detect cycles.
     */
    public function wouldCreateLoop(?int $newParentId): bool
    {
        if (! $newParentId) {
            return false;
        }

        $cursorId = (int) $newParentId;
        $guard = 0;
        while ($cursorId !== (int) $this->id && $guard++ < 10000) {
            $parent = static::query()->find($cursorId);
            if (! $parent) {
                return false;
            }
            $cursorId = (int) $parent->parent_id;
        }

        // Tool returned to this node, meaning a cycle would be introduced.
        return (int) $this->id !== 0 && $cursorId === (int) $this->id;
    }
}