<?php

namespace App\Http\Requests;

use App\Models\Team;
use App\Models\WorkTeam;
use App\Support\UnitScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateWorkTeamRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('work_teams.update');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $workTeam = $this->route('workTeam');
        $teamId = $this->owningTeamId($workTeam);

        $uniqueName = Rule::unique(WorkTeam::class, 'name')->ignore($workTeam->id);
        $uniqueName = $teamId === null ? $uniqueName->whereNull('team_id') : $uniqueName->where('team_id', $teamId);

        return [
            'name' => ['sometimes', 'string', 'max:255', $uniqueName],
            'description' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', Rule::in(WorkTeam::STATUSES)],
            // Only a super admin may move a team to another unit.
            'team_id' => ['sometimes', 'nullable', Rule::exists(Team::class, 'id')],
        ];
    }

    /**
     * Unit that will own this team after the update.
     */
    private function owningTeamId(WorkTeam $workTeam): int|string|null
    {
        $user = $this->user();

        if ($user && ! UnitScope::bypasses($user) && $user->team_id) {
            return $user->team_id;
        }

        if ($this->exists('team_id')) {
            $posted = $this->input('team_id');

            return ($posted === null || $posted === '') ? null : $posted;
        }

        return $workTeam->team_id;
    }
}
