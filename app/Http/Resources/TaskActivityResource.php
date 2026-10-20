<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskActivityResource extends JsonResource
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
            'action' => $this->action,
            'meta' => $this->meta,
            'user' => $this->whenLoaded('user', fn () => $this->person($this->user)),
            'created_at' => $this->created_at,
        ];
    }

    /**
     * A compact view of the user who performed the action.
     *
     * @return array<string, mixed>|null
     */
    private function person($user): ?array
    {
        if (! $user) {
            return null;
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'avatar_url' => $user->avatar ? url($user->avatar) : null,
        ];
    }
}
