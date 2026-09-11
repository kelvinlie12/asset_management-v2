<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'contact_person',
        'phone',
        'email',
        'address',
        'notes',
    ];

    /**
     * The vehicles purchased from this supplier.
     *
     * @return HasMany<VehicleAsset, $this>
     */
    public function vehicles(): HasMany
    {
        return $this->hasMany(VehicleAsset::class);
    }
}