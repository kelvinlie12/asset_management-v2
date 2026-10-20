<?php

namespace App\Http\Requests;

use App\Models\TaskComment;
use Illuminate\Foundation\Http\FormRequest;

class UpdateTaskCommentRequest extends FormRequest
{
    /**
     * Only the user who wrote a message may edit it (like a chat app).
     */
    public function authorize(): bool
    {
        $comment = $this->route('comment');

        return $comment instanceof TaskComment
            && $comment->user_id === $this->user()->id;
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
