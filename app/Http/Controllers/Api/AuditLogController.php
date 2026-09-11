<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * Display a paginated, filterable list of audit logs.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $perPage = min(max($perPage, 1), 100);

        $logs = AuditLog::query()
            ->with(['user'])
            ->when($request->query('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereHas('user', function ($user) use ($search) {
                        $user->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    })->orWhere('auditable_type', 'like', "%{$search}%")
                        ->orWhere('auditable_id', 'like', "%{$search}%")
                        ->orWhere('ip_address', 'like', "%{$search}%");
                });
            })
            ->when($request->query('event'), function ($query, $event) {
                if (in_array($event, AuditLog::EVENTS, true)) {
                    $query->where('event', $event);
                }
            })
            ->when($request->query('auditable_type'), function ($query, $auditableType) {
                $query->where('auditable_type', 'like', "%{$auditableType}%");
            })
            ->when($request->query('user_id'), function ($query, $userId) {
                $query->where('user_id', $userId);
            })
            ->when($request->query('date_from'), function ($query, $dateFrom) {
                $query->whereDate('created_at', '>=', $dateFrom);
            })
            ->when($request->query('date_to'), function ($query, $dateTo) {
                $query->whereDate('created_at', '<=', $dateTo);
            })
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        return ApiResponse::success(
            AuditLogResource::collection($logs)->response()->getData(true),
            'Data log aktivitas berhasil dimuat.'
        );
    }

    /**
     * Display the specified audit log.
     */
    public function show(AuditLog $auditLog): JsonResponse
    {
        return ApiResponse::success([
            'log' => new AuditLogResource($auditLog->load(['user'])),
        ]);
    }
}
