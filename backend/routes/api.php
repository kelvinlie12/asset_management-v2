<?php

use App\Http\Controllers\Api\AssetAssignmentController;
use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\AssetDamageController;
use App\Http\Controllers\Api\AssetTransferController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BrandingController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\LookupController;
use App\Http\Controllers\Api\NetworkNodeController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\PurchaseController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\TeamController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VehicleController;
use App\Http\Controllers\Api\VehicleTaxController;
use App\Http\Controllers\Api\VehicleTaxReminderController;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\Route;

Route::name('login')->get('/login', function () {
    return ApiResponse::error('Unauthenticated.', null, 401);
});

Route::prefix('v1')->group(function () {
    Route::post('/auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:5,1');

    // Company branding. Reading is public so the logo also shows on the
    // sign-in screen; changing it is restricted to an owner/super admin inside
    // the controller.
    Route::get('/branding', [BrandingController::class, 'show']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/branding', [BrandingController::class, 'update']);

        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/profile', [AuthController::class, 'profile']);
        Route::put('/profile', [AuthController::class, 'updateProfile'])
            ->middleware('permission:profile.update');
        Route::put('/change-password', [AuthController::class, 'changePassword'])
            ->middleware('permission:profile.password');

        // Dropdown data shared by forms; gated on assets.view so the asset
        // module keeps working without the master-data permissions.
        Route::get('/lookups', [LookupController::class, 'index'])->middleware('permission:assets.view');

        // User Management
        Route::get('/users', [UserController::class, 'index'])->middleware('permission:users.view');
        Route::post('/users', [UserController::class, 'store'])->middleware('permission:users.create');
        Route::get('/users/{user}', [UserController::class, 'show'])->middleware('permission:users.view');
        Route::put('/users/{user}', [UserController::class, 'update'])->middleware('permission:users.update');
        // Per-user module access matrix inside a unit.
        Route::get('/users/{user}/access', [UserController::class, 'showAccess'])->middleware('permission:users.manage_access');
        Route::put('/users/{user}/access', [UserController::class, 'updateAccess'])->middleware('permission:users.manage_access');
        Route::delete('/users/{user}', [UserController::class, 'destroy'])->middleware('permission:users.delete');
        Route::put('/users/{user}/assign-role', [UserController::class, 'assignRole'])->middleware('permission:users.update');
        Route::put('/users/{user}/assign-team', [UserController::class, 'assignTeam'])->middleware('permission:users.update');
        Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword'])->middleware('permission:users.update');
        Route::post('/users/{user}/deactivate', [UserController::class, 'deactivate'])->middleware('permission:users.update');
        Route::post('/users/{user}/activate', [UserController::class, 'activate'])->middleware('permission:users.update');

        // Team management
        Route::get('/teams', [TeamController::class, 'index'])->middleware('permission:teams.view');
        Route::post('/teams', [TeamController::class, 'store'])->middleware('permission:teams.create');
        Route::get('/teams/{team}', [TeamController::class, 'show'])->middleware('permission:teams.view');
        Route::put('/teams/{team}', [TeamController::class, 'update'])->middleware('permission:teams.update');
Route::delete('/teams/{team}', [TeamController::class, 'destroy'])->middleware('permission:teams.delete');

        // Room (Ruangan) management
        Route::get('/rooms', [RoomController::class, 'index'])->middleware('permission:rooms.view');
        Route::post('/rooms', [RoomController::class, 'store'])->middleware('permission:rooms.create');
        Route::get('/rooms/{room}', [RoomController::class, 'show'])->middleware('permission:rooms.view');
        Route::put('/rooms/{room}', [RoomController::class, 'update'])->middleware('permission:rooms.update');
        Route::delete('/rooms/{room}', [RoomController::class, 'destroy'])->middleware('permission:rooms.delete');

        // Category (Kategori Barang) management
        Route::get('/categories', [CategoryController::class, 'index'])->middleware('permission:categories.view');
        Route::post('/categories', [CategoryController::class, 'store'])->middleware('permission:categories.create');
        Route::get('/categories/{category}', [CategoryController::class, 'show'])->middleware('permission:categories.view');
        Route::put('/categories/{category}', [CategoryController::class, 'update'])->middleware('permission:categories.update');
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy'])->middleware('permission:categories.delete');

        // Asset (Barang) management
        Route::get('/assets/generate-code', [AssetController::class, 'generateCode'])->middleware('permission:assets.create');
        Route::get('/assets', [AssetController::class, 'index'])->middleware('permission:assets.view');
        Route::post('/assets', [AssetController::class, 'store'])->middleware('permission:assets.create');
        Route::get('/assets/{asset}', [AssetController::class, 'show'])->middleware('permission:assets.view');
        Route::put('/assets/{asset}', [AssetController::class, 'update'])->middleware('permission:assets.update');
        Route::delete('/assets/{asset}', [AssetController::class, 'destroy'])->middleware('permission:assets.delete');

        // Purchase (Pembelian Barang) management
        Route::get('/purchases', [PurchaseController::class, 'index'])->middleware('permission:purchases.view');
        Route::post('/purchases', [PurchaseController::class, 'store'])->middleware('permission:purchases.create');
        Route::get('/purchases/{purchase}', [PurchaseController::class, 'show'])->middleware('permission:purchases.view');
        Route::delete('/purchases/{purchase}', [PurchaseController::class, 'destroy'])->middleware('permission:purchases.delete');

        // Asset Assignment (Penempatan Barang) history
        Route::get('/assignments', [AssetAssignmentController::class, 'index'])->middleware('permission:assignments.view');
        Route::post('/assignments', [AssetAssignmentController::class, 'store'])->middleware('permission:assignments.create');
        Route::get('/assignments/{assetAssignment}', [AssetAssignmentController::class, 'show'])->middleware('permission:assignments.view');

        // Asset Transfer (Mutasi Barang) history
        Route::get('/transfers', [AssetTransferController::class, 'index'])->middleware('permission:transfers.view');
        Route::post('/transfers', [AssetTransferController::class, 'store'])->middleware('permission:transfers.create');
        Route::get('/transfers/{assetTransfer}', [AssetTransferController::class, 'show'])->middleware('permission:transfers.view');
        Route::put('/transfers/{assetTransfer}', [AssetTransferController::class, 'update'])->middleware('permission:transfers.update');
        Route::delete('/transfers/{assetTransfer}', [AssetTransferController::class, 'destroy'])->middleware('permission:transfers.delete');

        // Asset Damage Report (Barang Rusak) history
        Route::get('/damages', [AssetDamageController::class, 'index'])->middleware('permission:damages.view');
        Route::post('/damages', [AssetDamageController::class, 'store'])->middleware('permission:damages.create');
        Route::get('/damages/{assetDamage}', [AssetDamageController::class, 'show'])->middleware('permission:damages.view');
        Route::put('/damages/{assetDamage}', [AssetDamageController::class, 'update'])->middleware('permission:damages.update');
        Route::delete('/damages/{assetDamage}', [AssetDamageController::class, 'destroy'])->middleware('permission:damages.delete');

        // Vehicle Asset (Motor) management
Route::get('/vehicles/generate-code', [VehicleController::class, 'generateCode'])->middleware('permission:vehicles.create');
// Declared before /vehicles/{vehicle} so "unit-summary" is not read as an id.
Route::get('/vehicles/unit-summary', [VehicleController::class, 'unitSummary'])->middleware('permission:vehicles.view');
Route::get('/vehicles', [VehicleController::class, 'index'])->middleware('permission:vehicles.view');
        Route::post('/vehicles', [VehicleController::class, 'store'])->middleware('permission:vehicles.create');
        Route::get('/vehicles/{vehicle}', [VehicleController::class, 'show'])->middleware('permission:vehicles.view');
        Route::put('/vehicles/{vehicle}', [VehicleController::class, 'update'])->middleware('permission:vehicles.update');
        Route::delete('/vehicles/{vehicle}', [VehicleController::class, 'destroy'])->middleware('permission:vehicles.delete');

        // Vehicle Tax (pajak kendaraan) management
        Route::get('/vehicles/{vehicle}/taxes', [VehicleTaxController::class, 'index'])->middleware('permission:vehicle_taxes.view');
        Route::post('/vehicles/{vehicle}/taxes', [VehicleTaxController::class, 'store'])->middleware('permission:vehicle_taxes.create');
        Route::get('/vehicles/{vehicle}/taxes/{vehicleTax}', [VehicleTaxController::class, 'show'])->middleware('permission:vehicle_taxes.view');
        Route::put('/vehicles/{vehicle}/taxes/{vehicleTax}', [VehicleTaxController::class, 'update'])->middleware('permission:vehicle_taxes.update');
        Route::delete('/vehicles/{vehicle}/taxes/{vehicleTax}', [VehicleTaxController::class, 'destroy'])->middleware('permission:vehicle_taxes.delete');

        // FTTH Network (Jaringan FTTH) module
        Route::get('/network-nodes/available-assets', [NetworkNodeController::class, 'availableAssets'])->middleware('permission:network.view');
        Route::get('/network-nodes/tree', [NetworkNodeController::class, 'tree'])->middleware('permission:network.view');
        Route::get('/network-nodes', [NetworkNodeController::class, 'index'])->middleware('permission:network.view');
        Route::post('/network-nodes', [NetworkNodeController::class, 'store'])->middleware('permission:network.create');
        Route::get('/network-nodes/{networkNode}', [NetworkNodeController::class, 'show'])->middleware('permission:network.view');
        Route::put('/network-nodes/{networkNode}', [NetworkNodeController::class, 'update'])->middleware('permission:network.update');
        Route::delete('/network-nodes/{networkNode}', [NetworkNodeController::class, 'destroy'])->middleware('permission:network.delete');

        // Vehicle Tax Reminder
        Route::get('/vehicle-tax-reminders', [VehicleTaxReminderController::class, 'index'])->middleware('permission:vehicles.view');

        // Role management (RBAC)
        Route::get('/roles', [RoleController::class, 'index'])->middleware('permission:roles.view');
        Route::post('/roles', [RoleController::class, 'store'])->middleware('permission:roles.create');
        Route::get('/roles/{role}', [RoleController::class, 'show'])->middleware('permission:roles.view');
        Route::put('/roles/{role}', [RoleController::class, 'update'])->middleware('permission:roles.update');
        Route::delete('/roles/{role}', [RoleController::class, 'destroy'])->middleware('permission:roles.delete');

        // Permission management (RBAC)
        Route::get('/permissions', [PermissionController::class, 'index'])->middleware('permission:permissions.view');
        Route::post('/permissions', [PermissionController::class, 'store'])->middleware('permission:permissions.create');
        Route::get('/permissions/{permission}', [PermissionController::class, 'show'])->middleware('permission:permissions.view');
        Route::put('/permissions/{permission}', [PermissionController::class, 'update'])->middleware('permission:permissions.update');
        Route::delete('/permissions/{permission}', [PermissionController::class, 'destroy'])->middleware('permission:permissions.delete');

        // Dashboard
        Route::get('/dashboard', [DashboardController::class, 'show'])->middleware('permission:assets.view');

        // Audit log (Log Aktivitas)
        Route::get('/audit-logs', [AuditLogController::class, 'index'])->middleware('permission:audit_logs.view');
        Route::get('/audit-logs/{auditLog}', [AuditLogController::class, 'show'])->middleware('permission:audit_logs.view');

        // Task (laporan bug sistem / menu). A report belongs to a unit; a super
        // admin — or a user handed `tasks.manage_all` — sees and works every
        // unit's reports.
        Route::get('/tasks', [TaskController::class, 'index'])->middleware('permission:tasks.view|tasks.manage_all');
        Route::post('/tasks', [TaskController::class, 'store'])->middleware('permission:tasks.create');
        // Declared before the {task} routes so "assignable-users" is not read as
        // a task id. Anyone filing a report may point it at a user, so viewing
        // the roster only needs tasks.view.
        Route::get('/tasks/assignable-users', [TaskController::class, 'assignableUsers'])->middleware('permission:tasks.view|tasks.manage_all');
        Route::get('/tasks/{task}', [TaskController::class, 'show'])->middleware('permission:tasks.view|tasks.manage_all');
        // Discussion: anyone who can see the report may read/post; the author or
        // an owner/admin may delete a message.
        Route::post('/tasks/{task}/comments', [TaskController::class, 'storeComment'])->middleware('permission:tasks.view|tasks.manage_all');
        Route::put('/tasks/{task}/comments/{comment}', [TaskController::class, 'updateComment'])->middleware('permission:tasks.view|tasks.manage_all');
        Route::delete('/tasks/{task}/comments/{comment}', [TaskController::class, 'destroyComment'])->middleware('permission:tasks.view|tasks.manage_all');
        // No permission middleware: UpdateTaskRequest authorises either an
        // owner/admin (tasks.update) or the user the report is assigned to.
        Route::put('/tasks/{task}', [TaskController::class, 'update']);
        Route::delete('/tasks/{task}', [TaskController::class, 'destroy'])->middleware('permission:tasks.delete');
    });
});
