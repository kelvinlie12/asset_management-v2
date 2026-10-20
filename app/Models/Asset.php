<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Validation\ValidationException;

class Asset extends Model
{
    use HasFactory;

    public const CONDITION_NEW = 'NEW';
    public const CONDITION_USED = 'USED';
    public const CONDITION_REFURBISHED = 'REFURBISHED';

    // "GOOD" is kept for assets recorded before the four conditions below existed.
    public const CONDITION_GOOD = 'GOOD';
    public const CONDITION_DAMAGED = 'DAMAGED';

    public const CONDITIONS = [
        self::CONDITION_NEW,
        self::CONDITION_USED,
        self::CONDITION_DAMAGED,
        self::CONDITION_REFURBISHED,
        self::CONDITION_GOOD,
    ];

    public const USAGE_IN_USE = 'IN_USE';
    public const USAGE_IN_STORAGE = 'IN_STORAGE';

    public const USAGE_STATUSES = [
        self::USAGE_IN_USE,
        self::USAGE_IN_STORAGE,
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'asset_code',
        'name',
        'category_id',
        'photo',
        'purchase_price',
        'purchase_date',
        'placement_date',
        'purchase_receipt',
        'description',
        'condition',
        'usage_status',
        'team_id',
        'work_team_id',
        'room_id',
        'assigned_user_id',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'purchase_price' => 'decimal:2',
            'purchase_date' => 'date',
            'placement_date' => 'date',
        ];
    }

    /**
     * Generate a unique asset code (AST-001, AST-002, ...).
     */
    public static function generateAssetCode(): string
    {
        $max = static::query()
            ->where('asset_code', 'like', 'AST-%')
            ->pluck('asset_code')
            ->reduce(function (int $carry, string $code): int {
                if (preg_match('/^AST-(\d+)$/i', $code, $m)) {
                    return max($carry, (int) $m[1]);
                }

                return $carry;
            }, 0);

        return 'AST-' . str_pad((string) ($max + 1), 3, '0', STR_PAD_LEFT);
    }

    /**
     * The room that this asset belongs to.
     *
     * @return BelongsTo<Room, $this>
     */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    /**
     * The category that this asset belongs to.
     *
     * @return BelongsTo<Category, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * The team that this asset is assigned to.
     *
     * @return BelongsTo<Team, $this>
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * The user this asset is assigned to.
     *
     * @return BelongsTo<User, $this>
     */
    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    /**
     * The team (working group) that uses this asset.
     *
     * @return BelongsTo<WorkTeam, $this>
     */
    public function workTeam(): BelongsTo
    {
        return $this->belongsTo(WorkTeam::class, 'work_team_id');
    }

    /**
     * Purchase history for this asset.
     *
     * @return HasMany<Purchase, $this>
     */
    public function purchases(): HasMany
    {
        return $this->hasMany(Purchase::class);
    }

    /**
     * Placement (assignment) history for this asset.
     *
     * @return HasMany<AssetAssignment, $this>
     */
    public function assignments(): HasMany
    {
        return $this->hasMany(AssetAssignment::class);
    }

    /**
     * Transfer (mutation) history for this asset.
     *
     * @return HasMany<AssetTransfer, $this>
     */
    public function transfers(): HasMany
    {
        return $this->hasMany(AssetTransfer::class);
    }

    /**
     * Damage report history for this asset.
     *
     * @return HasMany<AssetDamage, $this>
     */
    public function damages(): HasMany
    {
        return $this->hasMany(AssetDamage::class);
    }

    /**
     * The FTTH network node this asset has become (if any).
     *
     * @return HasOne<NetworkNode, $this>
     */
    public function networkNode(): HasOne
    {
        return $this->hasOne(NetworkNode::class);
    }

    /**
     * Whether this asset is currently used as an FTTH network node.
     */
    public function hasNetworkNode(): bool
    {
        return $this->networkNode()->exists();
    }
}