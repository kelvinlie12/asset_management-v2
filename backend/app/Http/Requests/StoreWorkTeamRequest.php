<?php

namespace App\Http\Requests;

use App\Models\Team;
use App\Models\WorkTeam;
use App\Support\UnitScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWorkTeamRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('work_teams.create');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $teamId = $this->owningTeamId();

        // Names are unique inside one unit only, so two companies can each have
        // their own "Tim Jaringan".
        $uniqueName = Rule::unique(WorkTeam::class, 'name');
        $uniqueName = $teamId === null ? $uniqueName->whereNull('team_id') : $uniqueName->where('team_id', $teamId);

        return [
            'name' => ['required', 'string', 'max:255', $uniqueName],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', Rule::in(WorkTeam::STATUSES)],
            'team_id' => ['sometimes', 'nullable', Rule::exists(Team::class, 'id')],
        ];
    }

    /**
     * Scoped users always create a team for their own unit.
     */
    protected function prepareForValidation(): void
    {
        $user = $this->user();

        if ($user && ! UnitScope::bypasses($user) && $user->team_id) {
            $this->merge(['team_id' => $user->team_id]);
        }
    }

    /**
     * Unit that will own this team, or null for a shared/global one.
     */
    private function owningTeamId(): int|string|null
    {
        $user = $this->user();

        if ($user && ! UnitScope::bypasses($user) && $user->team_id) {
            return $user->team_id;
        }

        $posted = $this->input('team_id');

        return ($posted === null || $posted === '') ? null : $posted;
    }
}
