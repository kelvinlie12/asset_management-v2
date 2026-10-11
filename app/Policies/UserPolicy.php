<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    /**
     * The role rank (higher = more privileged).
     */
    private const ROLE_RANK = [
        User::ROLE_VIEWER => 1,
        User::ROLE_STAFF => 2,
        User::ROLE_OWNER => 3,
        User::ROLE_ADMIN => 4,
        User::ROLE_SUPER_ADMIN => 5,
    ];

    private function canManage(User $user, string $permission): bool
    {
        return $user->hasPermissionTo($permission);
    }

    /**
     * Determine whether the user can view the list of users.
     */
    public function viewAny(User $user): bool
    {
        return $this->canManage($user, 'users.view');
    }

    /**
     * Determine whether the user can view a specific user.
     */
    public function view(User $user, User $model): bool
    {
        return $this->canManage($user, 'users.view') || $user->id === $model->id;
    }

    /**
     * Determine whether the user can create users.
     */
    public function create(User $user): bool
    {
        return $this->canManage($user, 'users.create');
    }

    /**
     * Determine whether the user can update a user.
     */
    public function update(User $user, User $model): bool
    {
        if (! $this->canManage($user, 'users.update')) {
            return false;
        }

        // A user cannot change their own role/status.
        if ($user->id === $model->id) {
            return false;
        }

        if ($user->isSuperAdmin()) {
            return true;
        }

        // An owner manages everyone in their own unit, admins included, but
        // never a peer owner or a super admin.
        if ($user->isOwner()) {
            return in_array($model->role, [User::ROLE_ADMIN, User::ROLE_STAFF, User::ROLE_VIEWER], true);
        }

        // Any other role (admin) cannot manage super admins, admins or owners.
        if (in_array($model->role, [User::ROLE_SUPER_ADMIN, User::ROLE_ADMIN, User::ROLE_OWNER], true)) {
            return false;
        }

        return true;
    }

    /**
     * Determine whether the user can delete a user.
     */
    public function delete(User $user, User $model): bool
    {
        if (! $this->canManage($user, 'users.delete')) {
            return false;
        }

        // Cannot delete yourself.
        if ($user->id === $model->id) {
            return false;
        }

        // A super admin can delete any user.
        if ($user->isSuperAdmin()) {
            return true;
        }

        // An owner deletes the people of their own unit, admins included, but
        // never a peer owner or a super admin.
        if ($user->isOwner()) {
            return in_array($model->role, [User::ROLE_ADMIN, User::ROLE_STAFF, User::ROLE_VIEWER], true);
        }

        // Admins can only delete lower ranks.
        return self::ROLE_RANK[$model->role] < self::ROLE_RANK[$user->role];
    }

    /**
     * Determine whether the user can edit a user's access rights.
     *
     * Handing out access rights is its own privilege (`users.manage_access`),
     * separate from editing a user account. A super admin administers everyone.
     * An owner administers the admins, staff and viewers of their own unit;
     * every other role limits itself to staff and viewers.
     */
    public function manageAccess(User $user, User $model): bool
    {
        if (! $this->canManage($user, 'users.manage_access')) {
            return false;
        }

        if ($model->isSuperAdmin() || $user->id === $model->id) {
            return false;
        }

        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($user->isOwner()) {
            return in_array($model->role, [User::ROLE_ADMIN, User::ROLE_STAFF, User::ROLE_VIEWER], true);
        }

        return in_array($model->role, [User::ROLE_STAFF, User::ROLE_VIEWER], true);
    }

    /**
     * Determine whether the user can assign a role to a user.
     */
    public function assignRole(User $user, User $model): bool
    {
        return $this->update($user, $model);
    }

    /**
     * Determine whether the user can assign a team to a user.
     */
    public function assignTeam(User $user, User $model): bool
    {
        if (! $this->canManage($user, 'users.update')) {
            return false;
        }

        return $user->id !== $model->id;
    }

    /**
     * Determine whether the user can reset a user's password.
     */
    public function resetPassword(User $user, User $model): bool
    {
        return $this->update($user, $model);
    }

    /**
     * Determine whether the user can deactivate/activate a user.
     */
    public function toggleStatus(User $user, User $model): bool
    {
        return $this->update($user, $model);
    }

    /**
     * Determine whether the user can deactivate a user.
     */
    public function deactivate(User $user, User $model): bool
    {
        return $this->toggleStatus($user, $model);
    }

    /**
     * Determine whether the user can activate a user.
     */
    public function activate(User $user, User $model): bool
    {
        return $this->toggleStatus($user, $model);
    }
}
