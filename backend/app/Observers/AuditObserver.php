<?php

namespace App\Observers;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

/**
 * Generic observer that records model create/update/delete events
 * into the audit_logs table.
 */
class AuditObserver
{
    /**
     * Handle the Model "created" event.
     */
    public function created(Model $model): void
    {
        $this->record($model, AuditLog::EVENT_CREATED);
    }

    /**
     * Handle the Model "updated" event.
     */
    public function updated(Model $model): void
    {
        $this->record($model, AuditLog::EVENT_UPDATED);
    }

    /**
     * Handle the Model "deleted" event.
     */
    public function deleted(Model $model): void
    {
        $this->record($model, AuditLog::EVENT_DELETED);
    }

    /**
     * Persist one audit log row for the given model event.
     */
    private function record(Model $model, string $event): void
    {
        $request = app('request');
        $user = Auth::user();

        try {
            AuditLog::create([
                'user_id' => $user?->id,
                'event' => $event,
                'auditable_type' => get_class($model),
                'auditable_id' => $model->getKey(),
                'old_values' => $event === AuditLog::EVENT_CREATED ? null : $model->getOriginal(),
                'new_values' => $event === AuditLog::EVENT_DELETED ? null : $model->getAttributes(),
                'url' => $request?->fullUrl(),
                'ip_address' => $request?->ip(),
                'user_agent' => substr((string) $request?->userAgent(), 0, 500),
            ]);
        } catch (\Throwable) {
            // Never let audit logging break the main request flow.
        }
    }
}
