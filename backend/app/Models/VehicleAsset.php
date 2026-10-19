<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VehicleAsset extends Model
{
    use HasFactory;

    public const CONDITION_GOOD = 'GOOD';
    public const CONDITION_DAMAGED = 'DAMAGED';

    public const CONDITIONS = [
        self::CONDITION_GOOD,
        self::CONDITION_DAMAGED,
    ];

    public const USAGE_IN_USE = 'IN_USE';
    public const USAGE_IN_STORAGE = 'IN_STORAGE';

    public const USAGE_STATUSES = [
        self::USAGE_IN_USE,
        self::USAGE_IN_STORAGE,
    ];

    public const TAX_PAID = 'PAID';
    public const TAX_UNPAID = 'UNPAID';

    public const TAX_STATUSES = [
        self::TAX_PAID,
        self::TAX_UNPAID,
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'asset_code',
        'photo',
        'brand',
        'model',
        'year',
        'plate_number',
        'engine_number',
        'chassis_number',
        'purchase_date',
        'purchase_price',
        'last_tax_amount',
        'tax_due_date',
        'tax_status',
        'description',
        'condition',
        'usage_status',
        'team_id',
        'room_id',
        'assigned_user_id',
        'placement_date',
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
            'last_tax_amount' => 'decimal:2',
            'purchase_date' => 'date',
            'tax_due_date' => 'date',
            'placement_date' => 'date',
        ];
    }

    /**
     * The team this vehicle is assigned to.
     *
     * @return BelongsTo<Team, $this>
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * The room this vehicle is stored in.
     *
     * @return BelongsTo<Room, $this>
     */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    /**
     * The user this vehicle is assigned to.
     *
     * @return BelongsTo<User, $this>
     */
    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    /**
     * The tax records (payment history) for this vehicle.
     *
     * @return HasMany<VehicleTax, $this>
     */
    public function taxes(): HasMany
    {
        return $this->hasMany(VehicleTax::class, 'vehicle_id');
    }

    /**
     * The latest tax record for this vehicle.
     *
     * @return HasMany<VehicleTax, $this>
     */
    public function latestTax(): HasMany
    {
        return $this->hasMany(VehicleTax::class, 'vehicle_id')->orderByDesc('tax_due_date')->limit(1);
    }

    /**
     * The effective due date for the current unpaid tax obligation:
     * latest unpaid tax record's due date, otherwise the vehicle's own due date.
     */
    public function effectiveTaxDueDate(): ?Carbon
    {
        $latest = $this->taxes()
            ->where('payment_status', VehicleTax::PAYMENT_UNPAID)
            ->orderByDesc('tax_due_date')
            ->value('tax_due_date');

        if ($latest) {
            return Carbon::parse($latest)->startOfDay();
        }

        return $this->tax_due_date ? Carbon::parse($this->tax_due_date)->startOfDay() : null;
    }

    /**
     * Compute the automatic tax health based on the due date:
     *  - PAID tax status          -> Lunas (paid)
     *  - > 30 days before due     -> Aman (safe)
     *  - 8 - 30 days before due   -> Segera Jatuh Tempo (soon)
     *  - 1 - 7 days before due    -> Akan Jatuh Tempo (due_7)
     *  - past the due date        -> Terlambat (overdue)
     *
     * @return array{key: string, label: string, color: string}
     */
    public function getTaxHealthAttribute(): array
    {
        if ($this->tax_status === self::TAX_PAID) {
            return ['key' => 'paid', 'label' => 'Lunas', 'color' => 'success'];
        }

        $due = $this->effectiveTaxDueDate();
        if (! $due) {
            return ['key' => 'safe', 'label' => 'Aman', 'color' => 'success'];
        }

        // Positive = days remaining until due; negative = days past due.
        $days = -$due->diffInDays(Carbon::today()->startOfDay(), false);

        if ($days < 0) {
            return ['key' => 'overdue', 'label' => 'Terlambat', 'color' => 'error'];
        }
        if ($days <= 7) {
            return ['key' => 'due_7', 'label' => 'Akan Jatuh Tempo', 'color' => 'error'];
        }
        if ($days <= 30) {
            return ['key' => 'soon', 'label' => 'Segera Jatuh Tempo', 'color' => 'warning'];
        }

        return ['key' => 'safe', 'label' => 'Aman', 'color' => 'success'];
    }
}