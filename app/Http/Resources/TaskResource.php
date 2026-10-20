<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
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
            'title' => $this->title,
            'category' => $this->category,
            'page' => $this->page,
            'description' => $this->description,
            'priority' => $this->priority,
            'status' => $this->status,
            'attachment_path' => $this->attachment_path,
            'attachment_url' => $this->attachment_path ? url($this->attachment_path) : null,
            'reporter' => $this->whenLoaded('reporter', fn () => $this->person($this->reporter)),
            'handler' => $this->whenLoaded('handler', fn () => $this->person($this->handler)),
            // The unit the report belongs to (its reporter's team).
            'team_id' => $this->team_id,
            'team' => $this->whenLoaded('team', fn () => $this->team ? [
                'id' => $this->team->id,
                'name' => $this->team->name,
            ] : null),
            'assigned_to' => $this->assigned_to,
            'assignee' => $this->whenLoaded('assignee', fn () => $this->person($this->assignee)),
            'activities' => TaskActivityResource::collection($this->whenLoaded('activities')),
            'comments' => TaskCommentResource::collection($this->whenLoaded('comments')),
            'comments_count' => $this->whenCounted('comments'),
            'resolved_at' => $this->resolved_at,
            // Stopwatch: total worked seconds (including the run still ticking)
            // and whether it is counting right now.
            'worked_seconds' => $this->workedSeconds(),
            'timer_running' => $this->isTimerRunning(),
            'work_started_at' => $this->work_started_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    /**
     * A compact view of a user referenced by a task.
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
