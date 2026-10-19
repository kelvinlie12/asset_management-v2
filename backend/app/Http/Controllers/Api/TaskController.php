<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaskCommentRequest;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskCommentRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Http\Resources\TaskCommentResource;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use App\Models\TaskActivity;
use App\Models\TaskComment;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;

/**
 * Task menu: users file bug reports about the system or its menus, and an
 * owner/unit admin triages them (status changes, deletion).
 */
class TaskController extends Controller
{
    /** Directory (relative to the public path) that holds attachments. */
    private const ATTACHMENT_DIR = 'uploads/tasks';

    /**
     * Display a paginated, filterable list of task reports.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $perPage = min(max($perPage, 1), 100);

        $tasks = Task::query()
            // A unit only ever sees the reports filed within it. A super admin
            // (or a user handed `tasks.manage_all`) sees the whole board.
            ->visibleTo($request->user())
            ->with(['reporter', 'handler', 'assignee', 'team'])
            ->withCount('comments')
            ->when($request->query('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('page', 'like', "%{$search}%")
                        // Searching a person's name finds the reports filed by
                        // or assigned to them.
                        ->orWhereHas('reporter', fn ($rel) => $rel->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('assignee', fn ($rel) => $rel->where('name', 'like', "%{$search}%"));
                });
            })
            // A global viewer may drill into one unit from the board.
            ->when($request->query('team_id'), fn ($query, $teamId) => $query->where('team_id', (int) $teamId))
            ->when($request->query('status'), fn ($query, $status) => $query->where('status', $status))
            ->when($request->query('category'), fn ($query, $category) => $query->where('category', $category))
            ->when($request->query('priority'), fn ($query, $priority) => $query->where('priority', $priority))
            ->when($request->query('assigned_to'), function ($query, $assignedTo) use ($request) {
                if ($assignedTo === 'me') {
                    $query->where('assigned_to', $request->user()->id);
                } elseif ($assignedTo === 'none') {
                    $query->whereNull('assigned_to');
                } else {
                    $query->where('assigned_to', (int) $assignedTo);
                }
            })
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString();

        return ApiResponse::success(
            TaskResource::collection($tasks)->response()->getData(true),
            'Data task berhasil dimuat.'
        );
    }

    /**
     * Store a newly filed report. The reporter is always the current user.
     */
    public function store(StoreTaskRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $attachment = $request->hasFile('attachment')
            ? $this->storeAttachment($request->file('attachment'))
            : null;

        $task = Task::create([
            'title' => $validated['title'],
            'category' => $validated['category'],
            'page' => $validated['page'] ?? null,
            'description' => $validated['description'],
            'priority' => $validated['priority'],
            'status' => Task::STATUS_OPEN,
            'attachment_path' => $attachment,
            'reporter_id' => $request->user()->id,
            // The report belongs to the reporter's unit.
            'team_id' => $request->user()->team_id,
            'assigned_to' => $validated['assigned_to'] ?? null,
        ]);

        $task->recordActivity($request->user()->id, TaskActivity::ACTION_CREATED);

        if (! empty($validated['assigned_to'])) {
            $task->recordActivity($request->user()->id, TaskActivity::ACTION_ASSIGNED, [
                'to_id' => $task->assigned_to,
                'to_name' => User::find($task->assigned_to)?->name,
            ]);
        }

        return ApiResponse::created([
            'task' => $this->resource($task),
        ], 'Task berhasil dikirim.');
    }

    /**
     * Display the specified report, with its full history.
     */
    public function show(Request $request, Task $task): JsonResponse
    {
        $this->assertVisible($request->user(), $task);

        return ApiResponse::success(['task' => $this->resource($task)]);
    }

    /**
     * List the users a report may be assigned to.
     */
    public function assignableUsers(Request $request): JsonResponse
    {
        $viewer = $request->user();

        $users = User::query()
            ->where('status', User::STATUS_ACTIVE)
            // A unit user only sees the people of their own unit, plus the
            // super admins who handle system bugs. A global viewer (super admin
            // or `tasks.manage_all`) sees every active user. Other units' staff
            // (and their emails) stay out of the roster.
            ->when(! Task::userSeesEveryTask($viewer), function ($query) use ($viewer) {
                $query->where(function ($q) use ($viewer) {
                    $q->where('role', User::ROLE_SUPER_ADMIN);
                    if ($viewer?->team_id) {
                        $q->orWhere('team_id', $viewer->team_id);
                    }
                });
            })
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role']);

        return ApiResponse::success(['users' => $users]);
    }

    /**
     * Post a message to a report's discussion. Any user who can see the report
     * may take part.
     */
    public function storeComment(StoreTaskCommentRequest $request, Task $task): JsonResponse
    {
        $this->assertVisible($request->user(), $task);

        $comment = $task->comments()->create([
            'user_id' => $request->user()->id,
            'body' => $request->validated()['body'],
        ]);

        return ApiResponse::created([
            'comment' => new TaskCommentResource($comment->load('user')),
        ], 'Komentar berhasil dikirim.');
    }

    /**
     * Edit a discussion message. Only its author may change it.
     */
    public function updateComment(UpdateTaskCommentRequest $request, Task $task, TaskComment $comment): JsonResponse
    {
        $this->assertVisible($request->user(), $task);

        if ($comment->task_id !== $task->id) {
            abort(404);
        }

        $comment->body = $request->validated()['body'];
        $comment->edited_at = now();
        $comment->save();

        return ApiResponse::success([
            'comment' => new TaskCommentResource($comment->load('user')),
        ], 'Komentar berhasil diperbarui.');
    }

    /**
     * Remove a discussion message. Its author or an owner/admin may delete it.
     */
    public function destroyComment(Request $request, Task $task, TaskComment $comment): JsonResponse
    {
        $this->assertVisible($request->user(), $task);

        if ($comment->task_id !== $task->id) {
            abort(404);
        }

        $user = $request->user();
        if ($comment->user_id !== $user->id && ! $user->can('tasks.update')) {
            abort(403, 'Anda tidak berhak menghapus komentar ini.');
        }

        $comment->delete();

        return ApiResponse::success(null, 'Komentar berhasil dihapus.');
    }

    /**
     * Work on a report: change its status and/or priority, and (re)assign it.
     *
     * Every signed-in user may claim a report by assigning it to themselves,
     * and only then work it (change its status or priority). Owners/admins
     * (tasks.update) may assign it to anybody, or leave it unassigned.
     *
     * A report that has already been worked on (its status left "open") is
     * frozen to its assignee: nobody may point it at somebody else until the
     * assignee reopens it. Every assignment and status/priority change is
     * written to the report's history, so it stays clear who did what.
     */
    public function update(UpdateTaskRequest $request, Task $task): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        $this->assertVisible($user, $task);

        $isAssignee = $task->isAssignedTo($user);
        $assigning = array_key_exists('assigned_to', $validated);
        // Taking the report for yourself — the way anybody but an owner/admin
        // picks up work.
        $claiming = $assigning
            && $validated['assigned_to'] !== null
            && (int) $validated['assigned_to'] === (int) $user->id;

        // A report that has been worked on belongs to whoever worked it. It
        // cannot be handed to anybody else — only the assignee may reopen it,
        // which frees it up again.
        if ($assigning && $task->status !== Task::STATUS_OPEN) {
            abort(403, 'Task yang sudah dikerjakan tidak dapat dialihkan. Hanya user yang ditugaskan yang dapat membuka kembali task ini.');
        }

        // Handing the report to somebody else (or leaving it unassigned) is an
        // owner/admin action; anybody else may only claim it for themselves.
        if ($assigning && ! $request->canReassign() && ! $claiming) {
            abort(403, 'Anda hanya dapat menugaskan task ini kepada diri sendiri.');
        }

        // Working the report (status/priority) is reserved for its assignee.
        // Assigning it to yourself in the same request counts.
        if (! $isAssignee && ! $claiming
            && (array_key_exists('status', $validated) || array_key_exists('priority', $validated))) {
            abort(403, 'Tugaskan task ini kepada diri Anda terlebih dahulu.');
        }

        $fromStatus = $task->status;
        $fromPriority = $task->priority;
        $fromAssignee = $task->assigned_to;

        // The reassignment was authorised above, so just apply it.
        $assigneeChanged = false;
        if ($assigning) {
            $task->assigned_to = $validated['assigned_to'];
            $assigneeChanged = $fromAssignee !== $task->assigned_to;
        }

        $statusChanged = false;
        if (array_key_exists('status', $validated)) {
            $statusChanged = $fromStatus !== $validated['status'];
            $task->status = $validated['status'];
            $task->handled_by = $user->id;
            $task->resolved_at = in_array($validated['status'], [Task::STATUS_RESOLVED, Task::STATUS_REJECTED], true)
                ? ($task->resolved_at ?? now())
                : null;

            // Run the stopwatch while the report is being worked on, and bank
            // the measured time when it pauses or closes.
            $task->applyTimerForStatus($fromStatus, $task->status);
        }

        $priorityChanged = false;
        if (array_key_exists('priority', $validated)) {
            $priorityChanged = $fromPriority !== $validated['priority'];
            $task->priority = $validated['priority'];
        }

        $task->save();

        // History, in the order the changes are applied.
        if ($assigneeChanged) {
            if ($task->assigned_to === null) {
                $task->recordActivity($user->id, TaskActivity::ACTION_UNASSIGNED, [
                    'from_id' => $fromAssignee,
                    'from_name' => $fromAssignee ? User::find($fromAssignee)?->name : null,
                ]);
            } else {
                $task->recordActivity($user->id, TaskActivity::ACTION_ASSIGNED, [
                    'to_id' => $task->assigned_to,
                    'to_name' => User::find($task->assigned_to)?->name,
                ]);
            }
        }

        if ($statusChanged) {
            $task->recordActivity($user->id, $this->statusAction($fromStatus, $task->status), [
                'from' => $fromStatus,
                'to' => $task->status,
            ]);
        }

        if ($priorityChanged) {
            $task->recordActivity($user->id, TaskActivity::ACTION_PRIORITY_CHANGED, [
                'from' => $fromPriority,
                'to' => $task->priority,
            ]);
        }

        return ApiResponse::success([
            'task' => $this->resource($task),
        ], 'Task berhasil diperbarui.');
    }

    /**
     * Build the detail payload: the report plus its relations and history.
     */
    private function resource(Task $task): TaskResource
    {
        $task->load([
            'reporter',
            'handler',
            'assignee',
            'team',
            'activities' => fn ($query) => $query->with('user')->orderByDesc('created_at')->orderByDesc('id'),
            'comments' => fn ($query) => $query->with('user')->orderBy('created_at')->orderBy('id'),
        ]);

        return new TaskResource($task);
    }

    /**
     * Abort (403) when the viewer has no business with this report.
     *
     * A unit user may only touch their own unit's reports; a super admin (or a
     * `tasks.manage_all` holder) may touch any of them.
     */
    private function assertVisible(?User $user, Task $task): void
    {
        if (! $task->isVisibleTo($user)) {
            abort(403, 'Anda hanya dapat mengakses task unit sendiri.');
        }
    }

    /**
     * Translate a status transition into a history action.
     */
    private function statusAction(string $from, string $to): string
    {
        return match (true) {
            $to === Task::STATUS_IN_PROGRESS && $from === Task::STATUS_PAUSED => TaskActivity::ACTION_RESUMED,
            $to === Task::STATUS_IN_PROGRESS => TaskActivity::ACTION_STARTED,
            $to === Task::STATUS_PAUSED => TaskActivity::ACTION_PAUSED,
            $to === Task::STATUS_RESOLVED => TaskActivity::ACTION_RESOLVED,
            $to === Task::STATUS_REJECTED => TaskActivity::ACTION_REJECTED,
            $to === Task::STATUS_OPEN => TaskActivity::ACTION_REOPENED,
            default => TaskActivity::ACTION_STATUS_CHANGED,
        };
    }

    /**
     * Remove the specified report and its attachment.
     */
    public function destroy(Request $request, Task $task): JsonResponse
    {
        $this->assertVisible($request->user(), $task);

        $this->deleteAttachment($task->attachment_path);
        $task->delete();

        return ApiResponse::noContent('Task berhasil dihapus.');
    }

    /**
     * Move an uploaded attachment into the public task directory.
     */
    private function storeAttachment(UploadedFile $file): string
    {
        $directory = public_path(self::ATTACHMENT_DIR);
        File::ensureDirectoryExists($directory);

        $ext = strtolower($file->guessExtension() ?: 'png');
        $name = 'task_'.md5(uniqid((string) random_int(0, PHP_INT_MAX), true)).'.'.$ext;
        $file->move($directory, $name);

        return self::ATTACHMENT_DIR.'/'.$name;
    }

    /**
     * Remove a stored attachment, but only a file inside our own folder.
     */
    private function deleteAttachment(?string $path): void
    {
        if (! $path || ! str_starts_with($path, self::ATTACHMENT_DIR.'/')) {
            return;
        }

        $fullPath = public_path($path);
        if (File::exists($fullPath)) {
            File::delete($fullPath);
        }
    }
}
