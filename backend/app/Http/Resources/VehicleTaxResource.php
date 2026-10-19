<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VehicleTaxResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'vehicle_id' => $this->vehicle_id,
            'tax_due_date' => $this->tax_due_date?->format('Y-m-d'),
            'pkb' => $this->pkb,
            'swdkllj' => $this->swdkllj,
            'opsen_pkb' => $this->opsen_pkb,
            'administrative_fee' => $this->administrative_fee,
            'penalty' => $this->penalty,
            'other_fee' => $this->other_fee,
            'total_tax' => $this->total_tax,
            'payment_date' => $this->payment_date?->format('Y-m-d'),
            'payment_status' => $this->payment_status,
            'payment_proof' => $this->payment_proof,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}