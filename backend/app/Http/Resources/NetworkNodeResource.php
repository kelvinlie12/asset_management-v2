<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NetworkNodeResource extends JsonResource
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
            'asset_id' => $this->asset_id,
            'asset' => $this->whenLoaded('asset', fn () => $this->asset ? [
                'id' => $this->asset->id,
                'asset_code' => $this->asset->asset_code,
                'name' => $this->asset->name,
                'description' => $this->asset->description,
                'photo_url' => $this->asset->photo ? url($this->asset->photo) : null,
            ] : null),
            'room_id' => $this->room_id,
            'room' => $this->whenLoaded('room', fn () => $this->room ? [
                'id' => $this->room->id,
                'name' => $this->room->name,
                'is_storage' => (bool) $this->room->is_storage,
            ] : null),
            'parent_id' => $this->parent_id,
            'node_type' => $this->node_type,
            'label' => $this->label,
            'pon_port' => $this->pon_port,
            'splitter_ratio' => $this->splitter_ratio,
            'port_capacity' => $this->port_capacity,
            'port_used' => $this->port_used,
            'customer_count' => $this->customer_count,
            'rx_power_dbm' => $this->rx_power_dbm !== null ? (float) $this->rx_power_dbm : null,
            'area' => $this->area,
            'status' => $this->status,
            'notes' => $this->notes,
            'children' => $this->whenLoaded('children', fn () => $this->children
                ? NetworkNodeResource::collection($this->children)
                : []),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}