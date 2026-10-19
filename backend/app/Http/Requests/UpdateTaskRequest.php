<?php

namespace App\Http\Requests;

use App\Models\Task;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTaskRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * Every signed-in user who can see the reports may reach this endpoint:
     * they may claim one for themselves, and work it once they own it. The
     * controller is what stops them from reassigning it to somebody else or
     * working a report that is not theirs.
     */
    public function authorize(): bool
    {
        $task = $this->route('task');

        return $this->user() !== null
            && ($this->user()->can('tasks.view') || $this->user()->can('tasks.manage_all'))
            && $task instanceof Task;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => ['sometimes', 'required', Rule::in(Task::STATUSES)],
            'priority' => ['sometimes', 'required', Rule::in(Task::PRIORITIES)],
            // Reassignment is reserved for owner/admin; the controller ignores
            // this key for an assignee who is simply working on the report.
            'assigned_to' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    /**
     * Whether the user may hand the report to somebody else (or leave it
     * unassigned). Anybody else may still claim it for themselves.
     *
     * A `tasks.manage_all` holder looks after every unit's reports, so they may
     * reassign within any of them as well.
     */
    public function canReassign(): bool
    {
        return $this->user()->can('tasks.update')
            || $this->user()->can('tasks.manage_all');
    }
}
