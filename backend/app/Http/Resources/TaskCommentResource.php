<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskCommentResource extends JsonResource
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
            'body' => $this->body,
            'user' => $this->whenLoaded('user', fn () => $this->person($this->user)),
            'edited_at' => $this->edited_at,
            'created_at' => $this->created_at,
        ];
    }

    /**
     * A compact view of the user who wrote the comment.
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
