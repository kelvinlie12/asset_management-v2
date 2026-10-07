<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamResource extends JsonResource
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
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'status' => $this->status,
            'users_count' => $this->whenCounted('users'),
            // Rooms are owned by the unit and managed on the rooms page, so
            // only the total is exposed here.
            'rooms_count' => $this->whenCounted('rooms'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}