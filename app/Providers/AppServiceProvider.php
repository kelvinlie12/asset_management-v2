<?php

namespace App\Providers;

use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\AssetDamage;
use App\Models\AssetTransfer;
use App\Models\Category;
use App\Models\NetworkNode;
use App\Models\Purchase;
use App\Models\Room;
use App\Models\Supplier;
use App\Models\Team;
use App\Models\User;
use App\Models\VehicleAsset;
use App\Models\VehicleTax;
use App\Observers\AuditObserver;
use App\Policies\UserPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(User::class, UserPolicy::class);

        // Register the audit observer on every auditable model.
        foreach ([
            Asset::class,
            AssetAssignment::class,
            AssetDamage::class,
            AssetTransfer::class,
            Category::class,
            NetworkNode::class,
            Purchase::class,
            Role::class,
            Room::class,
            Supplier::class,
            Team::class,
            User::class,
            VehicleAsset::class,
            VehicleTax::class,
        ] as $model) {
            $model::observe(AuditObserver::class);
        }

        // Super admins are granted every ability regardless of assigned permissions.
        // Return null for everyone else so the gate can continue to Spatie's
        // permission check (returning false here would deny all other users).
        Gate::before(function ($user, $ability) {
            if ($user instanceof User && $user->isSuperAdmin()) {
                return true;
            }
        });
    }
}
