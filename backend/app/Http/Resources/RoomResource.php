<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoomResource extends JsonResource
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
            'location' => $this->location,
            'description' => $this->description,
            'status' => $this->status,
            'is_storage' => (bool) $this->is_storage,
            'assets_count' => $this->whenCounted('assets'),
            // A room is owned by exactly one unit.
            'team_id' => $this->team_id,
            'team' => new TeamResource($this->whenLoaded('team')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}