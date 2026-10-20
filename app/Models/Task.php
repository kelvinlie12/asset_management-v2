<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A bug report filed from the Task menu.
 *
 * Any signed-in user may open a report. A report belongs to the reporter's unit
 * and stays inside it: a unit only ever sees the reports filed within that unit
 * ("beda unit, beda task"). Only a super admin — or a user handed the
 * `tasks.manage_all` grant — sees the whole board and works any unit's report.
 *
 * A report is worked by the single user it is assigned to; anybody in its unit
 * may claim one by assigning it to themselves.
 */
class Task extends Model
{
    use HasFactory;

    public const CATEGORY_BUG_SYSTEM = 'bug_system';

    public const CATEGORY_MENU = 'menu';

    public const CATEGORY_OTHER = 'other';

    public const CATEGORIES = [
        self::CATEGORY_BUG_SYSTEM,
        self::CATEGORY_MENU,
        self::CATEGORY_OTHER,
    ];

    public const PRIORITY_LOW = 'low';

    public const PRIORITY_MEDIUM = 'medium';

    public const PRIORITY_HIGH = 'high';

    public const PRIORITIES = [
        self::PRIORITY_LOW,
        self::PRIORITY_MEDIUM,
        self::PRIORITY_HIGH,
    ];

    public const STATUS_OPEN = 'open';

    public const STATUS_IN_PROGRESS = 'in_progress';

    public const STATUS_PAUSED = 'paused';

    public const STATUS_RESOLVED = 'resolved';

    public const STATUS_REJECTED = 'rejected';

    public const STATUSES = [
        self::STATUS_OPEN,
        self::STATUS_IN_PROGRESS,
        self::STATUS_PAUSED,
        self::STATUS_RESOLVED,
        self::STATUS_REJECTED,
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'title',
        'category',
        'page',
        'description',
        'priority',
        'status',
        'attachment_path',
        'reporter_id',
        'team_id',
        'handled_by',
        'assigned_to',
        'resolved_at',
        'work_started_at',
        'worked_seconds',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'resolved_at' => 'datetime',
            'work_started_at' => 'datetime',
        ];
    }

    /**
     * The unit the report belongs to (the reporter's team).
     *
     * @return BelongsTo<Team, $this>
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * Whether the given user may see reports of every unit.
     *
     * A super admin always may. On top of that, a super admin may hand a single
     * user the `tasks.manage_all` grant so a non-super-admin can look after (and
     * work on) every unit's reports — "user yang diberi akses untuk melihat
     * semua dan mengerjakan semua task".
     */
    public static function userSeesEveryTask(?User $user): bool
    {
        return $user !== null
            && ($user->isSuperAdmin() || $user->can('tasks.manage_all'));
    }

    /**
     * Narrow a query to the reports the user is allowed to see.
     *
     * A unit user only ever sees their own unit's reports. Global viewers (a
     * super admin, a `tasks.manage_all` holder) and users without a unit see
     * everything, matching the unit scoping used across the application.
     *
     * @param  Builder<Task>  $query
     * @return Builder<Task>
     */
    public function scopeVisibleTo(Builder $query, ?User $user): Builder
    {
        if (self::userSeesEveryTask($user) || $user === null || ! $user->team_id) {
            return $query;
        }

        return $query->where('team_id', $user->team_id);
    }

    /**
     * Whether the given user is allowed to see this report.
     */
    public function isVisibleTo(?User $user): bool
    {
        if ($user === null) {
            return false;
        }

        if (self::userSeesEveryTask($user) || ! $user->team_id) {
            return true;
        }

        return (int) $this->team_id === (int) $user->team_id;
    }

    /**
     * The user who filed the report.
     *
     * @return BelongsTo<User, $this>
     */
    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    /**
     * The user who last changed the status.
     *
     * @return BelongsTo<User, $this>
     */
    public function handler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by');
    }

    /**
     * The user the report is assigned to.
     *
     * Only this person may work on the report: change its status or priority.
     *
     * @return BelongsTo<User, $this>
     */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * Whether the given user is the current assignee of this report.
     */
    public function isAssignedTo(?User $user): bool
    {
        return $user !== null && $this->assigned_to !== null && $this->assigned_to === $user->id;
    }

    /**
     * The history of everything that happened to this report.
     *
     * @return HasMany<TaskActivity, $this>
     */
    public function activities(): HasMany
    {
        return $this->hasMany(TaskActivity::class);
    }

    /**
     * The discussion messages posted on this report.
     *
     * @return HasMany<TaskComment, $this>
     */
    public function comments(): HasMany
    {
        return $this->hasMany(TaskComment::class);
    }

    /**
     * Append an entry to the report's history.
     *
     * @param  array<string, mixed>  $meta
     */
    public function recordActivity(?int $userId, string $action, array $meta = []): TaskActivity
    {
        return $this->activities()->create([
            'user_id' => $userId,
            'action' => $action,
            'meta' => $meta ?: null,
        ]);
    }

    /**
     * Whether the report has reached a terminal state.
     */
    public function isClosed(): bool
    {
        return in_array($this->status, [self::STATUS_RESOLVED, self::STATUS_REJECTED], true);
    }

    /**
     * Whether the stopwatch is counting right now (the report is being worked
     * on and has not been paused or closed).
     */
    public function isTimerRunning(): bool
    {
        return $this->work_started_at !== null;
    }

    /**
     * Total seconds spent working on the report, including the run that is
     * still ticking. Paused / open / closed reports do not add to it.
     */
    public function workedSeconds(): int
    {
        $total = (int) $this->worked_seconds;

        if ($this->work_started_at !== null) {
            $total += max(0, now()->getTimestamp() - $this->work_started_at->getTimestamp());
        }

        return $total;
    }

    /**
     * Begin (or resume) the stopwatch. Does nothing if it is already running.
     */
    public function startWorkTimer(): void
    {
        if ($this->work_started_at === null) {
            $this->work_started_at = now();
        }
    }

    /**
     * Stop the stopwatch and bank the seconds it measured.
     *
     * @return int The seconds just measured by this run.
     */
    public function stopWorkTimer(): int
    {
        if ($this->work_started_at === null) {
            return 0;
        }

        $elapsed = max(0, now()->getTimestamp() - $this->work_started_at->getTimestamp());
        $this->worked_seconds = (int) $this->worked_seconds + $elapsed;
        $this->work_started_at = null;

        return $elapsed;
    }

    /**
     * Keep the stopwatch in step with a status change: it runs while the report
     * is "in progress" and stops for pause, resolve, reject or reopen.
     */
    public function applyTimerForStatus(string $from, string $to): void
    {
        if ($from === $to) {
            return;
        }

        if ($to === self::STATUS_IN_PROGRESS) {
            $this->startWorkTimer();
        } elseif ($from === self::STATUS_IN_PROGRESS) {
            $this->stopWorkTimer();
        }
    }
}
