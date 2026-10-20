<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A single entry in a report's history: who did what, and when.
 *
 * The `meta` payload carries the extra detail a translation needs, for example
 * the old/new priority or the name of the user a report was assigned to.
 */
class TaskActivity extends Model
{
    use HasFactory;

    public const ACTION_CREATED = 'created';
    public const ACTION_STARTED = 'started';
    public const ACTION_RESUMED = 'resumed';
    public const ACTION_PAUSED = 'paused';
    public const ACTION_RESOLVED = 'resolved';
    public const ACTION_REJECTED = 'rejected';
    public const ACTION_REOPENED = 'reopened';
    public const ACTION_STATUS_CHANGED = 'status_changed';
    public const ACTION_PRIORITY_CHANGED = 'priority_changed';
    public const ACTION_ASSIGNED = 'assigned';
    public const ACTION_UNASSIGNED = 'unassigned';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'task_id',
        'user_id',
        'action',
        'meta',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'meta' => 'array',
        ];
    }

    /**
     * The report this entry belongs to.
     *
     * @return BelongsTo<Task, $this>
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * The user who performed the action.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
