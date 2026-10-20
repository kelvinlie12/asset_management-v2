<?php

namespace App\Http\Requests;

use App\Models\Task;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTaskRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('tasks.create');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:150'],
            'category' => ['required', Rule::in(Task::CATEGORIES)],
            'page' => ['nullable', 'string', 'max:150'],
            'description' => ['required', 'string', 'max:5000'],
            'priority' => ['required', Rule::in(Task::PRIORITIES)],
            // Anyone who files a report may point it straight at a user (or
            // leave it unassigned for later triage).
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'attachment' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp,gif', 'max:4096'],
        ];
    }
}
