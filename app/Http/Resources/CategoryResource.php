<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryResource extends JsonResource
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
            // null = shared global category; otherwise the unit that owns this copy.
            'team_id' => $this->team_id,
            'team' => $this->whenLoaded('team'),
            'name' => $this->name,
            'code' => $this->code,
            'description' => $this->description,
            'status' => $this->status,
            'assets_count' => $this->whenCounted('assets'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}