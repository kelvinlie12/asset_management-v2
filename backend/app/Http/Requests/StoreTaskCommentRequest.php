<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTaskCommentRequest extends FormRequest
{
    /**
     * Any user who can see the reports may join a discussion. A report belongs
     * to a unit, so a `tasks.view` holder of that unit (or a global viewer with
     * `tasks.manage_all`) may take part.
     */
    public function authorize(): bool
    {
        return $this->user()->can('tasks.view')
            || $this->user()->can('tasks.manage_all');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:2000'],
        ];
    }
}
