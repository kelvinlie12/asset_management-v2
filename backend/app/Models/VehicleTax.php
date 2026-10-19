<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehicleTax extends Model
{
    use HasFactory;

    public const PAYMENT_PAID = 'PAID';
    public const PAYMENT_UNPAID = 'UNPAID';

    public const PAYMENT_STATUSES = [
        self::PAYMENT_PAID,
        self::PAYMENT_UNPAID,
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'vehicle_id',
        'tax_due_date',
        'pkb',
        'swdkllj',
        'opsen_pkb',
        'administrative_fee',
        'penalty',
        'other_fee',
        'total_tax',
        'payment_date',
        'payment_status',
        'payment_proof',
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
            'pkb' => 'decimal:2',
            'swdkllj' => 'decimal:2',
            'opsen_pkb' => 'decimal:2',
            'administrative_fee' => 'decimal:2',
            'penalty' => 'decimal:2',
            'other_fee' => 'decimal:2',
            'total_tax' => 'decimal:2',
            'tax_due_date' => 'date',
            'payment_date' => 'date',
        ];
    }

    /**
     * The vehicle this tax record belongs to.
     *
     * @return BelongsTo<VehicleAsset, $this>
     */
    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(VehicleAsset::class, 'vehicle_id');
    }

    /**
     * The total tax is always derived from its components:
     * PKB + SWDKLLJ + Opsen PKB + Administrative Fee + Penalty + Other Fee.
     * Do NOT use a percentage of the purchase price.
     */
    public function getTotalTaxAttribute(mixed $value): float
    {
        return round(
            (float) $this->pkb
            + (float) $this->swdkllj
            + (float) $this->opsen_pkb
            + (float) $this->administrative_fee
            + (float) $this->penalty
            + (float) $this->other_fee,
            2,
        );
    }
}