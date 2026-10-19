import { useCallback, useEffect, useState, type FormEvent } from "react";
import PageMeta from "../components/common/PageMeta";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import Select from "../components/form/Select";
import Button from "../components/ui/button/Button";
import Badge from "../components/ui/badge/Badge";
import { Modal } from "../components/ui/modal";
import { useModal } from "../hooks/useModal";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import {
  Table,
  TableBody,
  TableHeader,
  TableCell,
  TableRow,
} from "../components/ui/table";
import { useAuth, hasPermission } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import {
  PlusIcon,
  PencilIcon,
  TrashBinIcon,
  EyeIcon,
  UserCircleIcon,
  LockIcon,
  TaskIcon,
} from "../icons";
import {
  fetchUsers,
  fetchTeams,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  deactivateUser,
  activateUser,
  fetchUserAccess,
  updateUserAccess,
  ROLE_OPTIONS,
  assignableRoleOptions,
  type User,
  type Team,
  type UserAccess,
  type AccessPermission,
  type Paginated,
  type UserFilters,
} from "../services/users";
import { useToast } from "../hooks/useToast";
import { extractApiError as extractError } from "../utils/error";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const PER_PAGE = 10;

type FormState = {
  name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  role: string;
  team_id: string;
  status: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  password: "",
  password_confirmation: "",
  role: "",
  team_id: "",
  status: "active",
};

export default function Users() {
  const { t } = useLang();
  const { user } = useAuth();
  const canView = hasPermission(user, "users.view");
  const canCreate = hasPermission(user, "users.create");
  const canUpdate = hasPermission(user, "users.update");
  const canDelete = hasPermission(user, "users.delete");

  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<Paginated<User>["meta"] | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const { pushToast } = useToast();

  const [filters, setFilters] = useState<UserFilters>({
    search: "",
    role: "",
    status: "",
    team_id: "",
    page: 1,
    per_page: PER_PAGE,
  });

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setFilters((prev) =>
      prev.search === debouncedSearch
        ? prev
        : { ...prev, search: debouncedSearch, page: 1 },
    );
  }, [debouncedSearch]);

  const [selected, setSelected] = useState<User | null>(null);

  const addModal = useModal();
  const detailModal = useModal();
  const editModal = useModal();
  const resetModal = useModal();
  const deleteModal = useModal();
  const accessModal = useModal();

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const loadTeams = useCallback(async () => {
    try {
      const res = await fetchTeams();
      setTeams(res.data.data);
    } catch {
      setTeams([]);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchUsers(filters);
      setUsers(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to load users.")));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  function updateFilter(key: keyof UserFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  function goToPage(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  function showTempSuccess(msg: string) {
    pushToast("success", msg);
  }

  async function refresh() {
    await loadUsers();
  }

  async function handleToggleStatus(u: User) {
    setSubmitting(u.id.toString());
    try {
      if (u.status === "active") {
        await deactivateUser(u.id);
        showTempSuccess(t("{name} deactivated.", { name: u.name }));
      } else {
        await activateUser(u.id);
        showTempSuccess(t("{name} activated.", { name: u.name }));
      }
      await refresh();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to update status.")));
    } finally {
      setSubmitting(null);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setSubmitting("delete");
    try {
      await deleteUser(selected.id);
      deleteModal.closeModal();
      setSelected(null);
      showTempSuccess(t("User deleted."));
      await refresh();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to delete user.")));
    } finally {
      setSubmitting(null);
    }
  }

  async function handleSaveUser(payload: {
    name: string;
    email: string;
    phone: string;
    password?: string;
    password_confirmation?: string;
    role: string;
    team_id: string;
    status: string;
    editing: User | null;
  }) {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: payload.name,
        email: payload.email,
        phone: payload.phone || null,
        role: payload.role,
        team_id: payload.team_id || null,
      };
      if (payload.editing) {
        await updateUser(payload.editing.id, body);
        showTempSuccess(t("User updated."));
      } else {
        body.password = payload.password;
        body.password_confirmation = payload.password_confirmation;
        body.status = payload.status;
        await createUser(body);
        showTempSuccess(t("User created."));
      }
      if (payload.editing) {
        editModal.closeModal();
      } else {
        addModal.closeModal();
      }
      await refresh();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to save user.")));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAccess(permissions: string[]) {
    if (!selected) return;
    setSaving(true);
    try {
      await updateUserAccess(selected.id, permissions);
      accessModal.closeModal();
      showTempSuccess(
        t("Hak akses diperbarui. Pengguna harus masuk kembali.")
      );
      await refresh();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to update access.")));
    } finally {
      setSaving(false);
    }
  }

  /**
   * Whether the acting user may configure this person's access rights.
   *
   * Administering access rights is its own privilege (`users.manage_access`),
   * not tied to editing accounts. Owners manage everyone in their own unit
   * (admins included); admins manage staff and viewers only. Nobody edits a
   * super admin or themselves.
   */
  function canManageAccess(target: User): boolean {
    if (!user) return false;
    if (target.id === user.id || target.role === "super_admin") return false;
    if (user.role === "super_admin") return true;
    if (target.team_id !== user.team_id) return false;
    if (user.role === "owner") {
      return (
        hasPermission(user, "users.manage_access") &&
        ["admin", "staff", "viewer"].includes(target.role)
      );
    }
    return (
      hasPermission(user, "users.manage_access") &&
      ["staff", "viewer"].includes(target.role)
    );
  }

  async function handleResetPassword(password: string) {
    if (!selected) return;
    setSaving(true);
    try {
      await resetPassword(selected.id, password);
      resetModal.closeModal();
      setSelected(null);
      showTempSuccess(t("Password reset successfully."));
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to reset password.")));
    } finally {
      setSaving(false);
    }
  }

  if (!canView) {
    return (
      <>
        <PageMeta
          title={t("Users | Access Denied")}
          description={t("User management")}
        />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-error-600 dark:text-error-400">
            {t("You do not have permission to manage users.")}
          </p>
        </div>
      </>
    );
  }

  const roleBadgeColor: Record<string, "primary" | "info" | "warning" | "dark"> =
    {
      super_admin: "primary",
      admin: "info",
      staff: "warning",
      viewer: "dark",
    };

  return (
    <>
      <PageMeta
        title={t("User Management")}
        description={t("Manage users, roles, and teams.")}
      />

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("User Management")}
          </h3>
          {canCreate && (
            <Button onClick={addModal.openModal} startIcon={<PlusIcon />}>
              {t("Add User")}
            </Button>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
            <Input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("Search by name or email...")}
              className="lg:max-w-[300px]"
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Select
                options={ROLE_OPTIONS}
                placeholder={t("All roles")}
                defaultValue=""
                onChange={(v) => updateFilter("role", v)}
              />
              <Select
                options={STATUS_OPTIONS.map((o) => ({
                  value: o.value,
                  label: t(o.label),
                }))}
                placeholder={t("All statuses")}
                defaultValue=""
                onChange={(v) => updateFilter("status", v)}
              />
              <Select
                options={teams.map((team) => ({
                  value: String(team.id),
                  label: team.name,
                }))}
                placeholder={t("All teams")}
                defaultValue=""
                onChange={(v) => updateFilter("team_id", v)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Name")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Position")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Team")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Status")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                    {t("Actions")}
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("Loading...")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading && users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("No users found.")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                            <UserCircleIcon />
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                              {u.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <Badge
                          size="sm"
                          variant="light"
                          color={roleBadgeColor[u.role] || "dark"}
                        >
                          {u.role_label}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {u.team?.name || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <Badge
                          size="sm"
                          variant="light"
                          color={u.status === "active" ? "success" : "error"}
                        >
                          {u.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelected(u);
                              detailModal.openModal();
                            }}
                            startIcon={<EyeIcon />}
                          >
                            {t("View")}
                          </Button>
                          {canUpdate && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelected(u);
                                editModal.openModal();
                              }}
                              startIcon={<PencilIcon />}
                            >
                              {t("Edit")}
                            </Button>
                          )}
                          {canUpdate && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelected(u);
                                resetModal.openModal();
                              }}
                              startIcon={<LockIcon />}
                            >
                              {t("Reset Password")}
                            </Button>
                          )}
                          {canManageAccess(u) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelected(u);
                                accessModal.openModal();
                              }}
                              startIcon={<TaskIcon />}
                            >
                              {t("Access Rights")}
                            </Button>
                          )}
                          {canUpdate && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={submitting === u.id.toString()}
                              onClick={() => handleToggleStatus(u)}
                            >
                              {u.status === "active"
                                ? t("Deactivate")
                                : t("Activate")}
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelected(u);
                                deleteModal.openModal();
                              }}
                              startIcon={<TrashBinIcon />}
                            >
                              {t("Delete")}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          {meta && meta.last_page > 1 && (
            <div className="flex flex-col gap-3 border-t border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("Showing {from}-{to} of {total}", {
                  from: (meta.current_page - 1) * meta.per_page + 1,
                  to: Math.min(meta.current_page * meta.per_page, meta.total),
                  total: meta.total,
                })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={meta.current_page <= 1}
                  onClick={() => goToPage(meta.current_page - 1)}
                >
                  {t("Prev")}
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {meta.current_page} / {meta.last_page}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={meta.current_page >= meta.last_page}
                  onClick={() => goToPage(meta.current_page + 1)}
                >
                  {t("Next")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {canCreate && (
        <AddEditModal
          isOpen={addModal.isOpen}
          onClose={addModal.closeModal}
          editing={null}
          teams={teams}
          saving={saving}
          onSubmit={handleSaveUser}
        />
      )}

      {selected && (
        <AccessModal
          isOpen={accessModal.isOpen}
          onClose={accessModal.closeModal}
          target={selected}
          saving={saving}
          onSubmit={handleSaveAccess}
        />
      )}

      {canUpdate && (
        <AddEditModal
          isOpen={editModal.isOpen}
          onClose={editModal.closeModal}
          key={selected?.id || "edit"}
          editing={selected}
          teams={teams}
          saving={saving}
          onSubmit={handleSaveUser}
        />
      )}

      <DetailModal
        isOpen={detailModal.isOpen}
        onClose={detailModal.closeModal}
        user={selected}
        onEdit={
          canUpdate
            ? () => {
                detailModal.closeModal();
                editModal.openModal();
              }
            : undefined
        }
      />

      {canDelete && selected && (
        <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.closeModal} className="max-w-[450px] m-4">
          <div className="no-scrollbar relative w-full max-w-[450px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
            <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              {t("Delete User")}
            </h4>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t(
                "Are you sure you want to delete {name}? This action cannot be undone.",
                { name: selected.name }
              )}
            </p>
            <div className="mt-6 flex items-center gap-3 justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={deleteModal.closeModal}
              >
                {t("Cancel")}
              </Button>
              <Button
                size="sm"
                disabled={submitting === "delete"}
                onClick={handleDelete}
              >
                {submitting === "delete" ? t("Deleting...") : t("Delete")}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {canUpdate && selected && (
        <Modal isOpen={resetModal.isOpen} onClose={resetModal.closeModal} className="max-w-[450px] m-4">
          <ResetPasswordBody
            user={selected}
            saving={saving}
            onSubmit={handleResetPassword}
            onClose={resetModal.closeModal}
          />
        </Modal>
      )}
    </>
  );
}

function AccessModal({
  isOpen,
  onClose,
  target,
  saving,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  target: User;
  saving: boolean;
  onSubmit: (permissions: string[]) => void;
}) {
  const { t } = useLang();
  const [access, setAccess] = useState<UserAccess | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    setError(null);
    setAccess(null);
    setSearch("");
    fetchUserAccess(target.id)
      .then((res) => {
        if (!active) return;
        setAccess(res.data);
        setPicked(
          res.data.permissions.filter((p) => p.selected).map((p) => p.name)
        );
      })
      .catch((err) => {
        if (active) setError(extractError(err, t("Failed to load access.")));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, target.id]);

  const permissions = access?.permissions ?? [];
  const grantable = new Set(
    permissions.filter((p) => p.grantable).map((p) => p.name)
  );
  const editable = access?.editable ?? false;

  // Only what the actor may hand out, plus whatever the user already holds.
  const visible = permissions.filter((p) => p.grantable || p.selected);
  const query = search.trim().toLowerCase();
  const filtered = query
    ? visible.filter((p) => p.name.toLowerCase().includes(query))
    : visible;

  function toggle(name: string) {
    if (!grantable.has(name) || !editable) return;
    setPicked((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }

  // "Select all" / "Clear" act on what is currently listed, so they combine
  // with the search box (e.g. search "assets." then select all).
  function selectListed() {
    const names = filtered.filter((p) => grantable.has(p.name)).map((p) => p.name);
    setPicked((prev) => Array.from(new Set([...prev, ...names])));
  }

  function clearListed() {
    const names = new Set(
      filtered.filter((p) => grantable.has(p.name)).map((p) => p.name)
    );
    setPicked((prev) => prev.filter((n) => !names.has(n)));
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[760px] m-4">
      <div className="no-scrollbar max-h-[88vh] w-full max-w-[760px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {t("Access Rights")}
        </h4>
        <p className="mb-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("Set which permissions {name} may use.", {
            name: target.name,
          })}
        </p>

        {loading && (
          <p className="py-8 text-center text-sm text-gray-500">
            {t("Loading...")}
          </p>
        )}

        {error && (
          <p className="py-8 text-center text-sm text-error-600 dark:text-error-400">
            {error}
          </p>
        )}

        {access && !loading && (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Search permissions...")}
                className="sm:max-w-[260px]"
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                  {t("{count} of {total} selected", {
                    count: picked.length,
                    total: visible.length,
                  })}
                </span>
                {access.editable && (
                  <>
                    <Button size="sm" variant="outline" onClick={selectListed}>
                      {t("Select all")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={clearListed}>
                      {t("Clear")}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                {t("No permissions found.")}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {filtered.map((permission: AccessPermission) => (
                  <label
                    key={permission.name}
                    className={`flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 dark:border-gray-800 ${
                      grantable.has(permission.name)
                        ? "text-gray-800 dark:text-white/90"
                        : "text-gray-400 dark:text-gray-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0"
                      disabled={!grantable.has(permission.name) || !editable}
                      checked={picked.includes(permission.name)}
                      onChange={() => toggle(permission.name)}
                    />
                    <span className="break-all font-mono text-xs">
                      {permission.name}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {!access.editable && (
              <p className="mt-4 text-xs text-warning-600 dark:text-warning-400">
                {t("You cannot change this user's access.")}
              </p>
            )}
          </>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button size="sm" variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button
            size="sm"
            disabled={saving || loading || !editable}
            onClick={() => onSubmit(picked)}
          >
            {saving ? t("Saving...") : t("Save Access")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AddEditModal({
  isOpen,
  onClose,
  editing,
  teams,
  saving,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  editing: User | null;
  teams: Team[];
  saving: boolean;
  onSubmit: (payload: {
    name: string;
    email: string;
    phone: string;
    password?: string;
    password_confirmation?: string;
    role: string;
    team_id: string;
    status: string;
    editing: User | null;
  }) => void;
}) {
  const { t } = useLang();
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === "super_admin";
  const [form, setForm] = useState<FormState>(() =>
    editing
      ? {
          name: editing.name,
          email: editing.email,
          phone: editing.phone || "",
          password: "",
          password_confirmation: "",
          role: editing.role,
          team_id: editing.team ? String(editing.team.id) : "",
          status: editing.status,
        }
      : EMPTY_FORM
  );

  useEffect(() => {
    if (isOpen) {
      setForm(
        editing
          ? {
              name: editing.name,
              email: editing.email,
              phone: editing.phone || "",
              password: "",
              password_confirmation: "",
              role: editing.role,
              team_id: editing.team ? String(editing.team.id) : "",
              status: editing.status,
            }
          : {
              ...EMPTY_FORM,
              // Unit-scoped users always target their own unit.
              team_id: isSuperAdmin
                ? ""
                : currentUser?.team_id
                  ? String(currentUser.team_id)
                  : "",
            }
      );
    }
  }, [isOpen, editing, isSuperAdmin, currentUser?.team_id]);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editing && form.password !== form.password_confirmation) {
      alert(t("Password confirmation does not match."));
      return;
    }
    // For unit-scoped users (non-superadmin), force their own unit.
    const unitId = isSuperAdmin
      ? form.team_id
      : currentUser?.team_id
        ? String(currentUser.team_id)
        : form.team_id;

    // Only superadmins may create a user without a unit.
    if (!isSuperAdmin && !unitId) {
      alert(t("Please select a team."));
      return;
    }
    onSubmit({
      name: form.name,
      email: form.email,
      phone: form.phone,
      password: form.password,
      password_confirmation: form.password_confirmation,
      role: form.role,
      team_id: unitId,
      status: form.status,
      editing,
    });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[600px] m-4">
      <div className="no-scrollbar relative w-full max-w-[600px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {editing ? t("Edit User") : t("Add User")}
        </h4>
        <p className="mb-6 mt-1 text-sm text-gray-500 dark:text-gray-400">
          {editing
            ? t("Update details for {name}.", { name: editing.name })
            : t("Create a new user account.")}
        </p>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>{t("Full Name")}</Label>
            <Input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={t("Full name")}
              required
            />
          </div>
          <div>
            <Label>{t("Email")}</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder={t("you@example.com")}
              required
            />
          </div>
          <div>
            <Label>{t("Phone")}</Label>
            <Input
              type="text"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder={t("Phone")}
            />
          </div>
          <div>
            <Label>{t("Position")}</Label>
            <Select
              options={assignableRoleOptions(currentUser?.role)}
              placeholder={t("Select position")}
              defaultValue={form.role}
              onChange={(v) => set("role", v)}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t("A position is only a job title; menu access is granted per user under Access Rights.")}
            </p>
          </div>
          <div>
            <Label>{t("Team")}</Label>
            {isSuperAdmin ? (
              <Select
                options={teams.map((team) => ({
                  value: String(team.id),
                  label: team.name,
                }))}
                placeholder={t("No team (all teams)")}
                defaultValue={form.team_id}
                onChange={(v) => set("team_id", v)}
              />
            ) : (
              // Owners and other unit-scoped users cannot move people between
              // units: the unit comes from the acting user.
              <div className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-300">
                {currentUser?.team?.name ?? teams[0]?.name ?? t("No team (all teams)")}
              </div>
            )}
            {!isSuperAdmin && currentUser?.team?.name && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("Team is set from your own team.")}
              </p>
            )}
          </div>
          {!editing && (
            <div>
              <Label>{t("Status")}</Label>
              <Select
                options={STATUS_OPTIONS.map((o) => ({
                  value: o.value,
                  label: t(o.label),
                }))}
                placeholder={t("Select status")}
                defaultValue={form.status}
                onChange={(v) => set("status", v)}
              />
            </div>
          )}
          {!editing && (
            <div>
              <Label>{t("Password")}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder={t("Min. 8 characters")}
                required
              />
            </div>
          )}
          {!editing && (
            <div>
              <Label>{t("Confirm Password")}</Label>
              <Input
                type="password"
                value={form.password_confirmation}
                onChange={(e) => set("password_confirmation", e.target.value)}
                placeholder={t("Repeat password")}
                required
              />
            </div>
          )}
          <div className="sm:col-span-2 mt-2 flex items-center gap-3 justify-end">
            <Button size="sm" variant="outline" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button size="sm" disabled={saving}>
              {saving
                ? t("Saving...")
                : editing
                  ? t("Save Changes")
                  : t("Create User")}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

function DetailModal({
  isOpen,
  onClose,
  user,
  onEdit,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onEdit?: () => void;
}) {
  const { t } = useLang();
  if (!user) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[500px] m-4">
      <div className="no-scrollbar max-h-[85vh] w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {t("User Details")}
        </h4>
        <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
            <UserCircleIcon />
          </span>
          <div className="text-center sm:text-left">
            <p className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {user.name}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {user.email}
            </p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>{t("Position")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90 capitalize">
              {user.role_label}
            </p>
          </div>
          <div>
            <Label>{t("Status")}</Label>
            <Badge
              size="sm"
              variant="light"
              color={user.status === "active" ? "success" : "error"}
            >
              {user.status}
            </Badge>
          </div>
          <div>
            <Label>{t("Team")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {user.team?.name || "-"}
            </p>
          </div>
          <div>
            <Label>{t("Phone")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {user.phone || "-"}
            </p>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button size="sm" variant="outline" onClick={onClose}>
            {t("Close")}
          </Button>
          {onEdit && (
            <Button size="sm" onClick={onEdit}>
              {t("Edit")}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ResetPasswordBody({
  user,
  saving,
  onSubmit,
  onClose,
}: {
  user: User;
  saving: boolean;
  onSubmit: (password: string) => void;
  onClose: () => void;
}) {
  const { t } = useLang();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      alert(t("Password confirmation does not match."));
      return;
    }
    onSubmit(password);
  }

  return (
    <div className="no-scrollbar relative w-full max-w-[450px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
      <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
        {t("Reset Password")}
      </h4>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {t("Set a new password for {name}.", { name: user.name })}
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <Label>{t("New Password")}</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("Min. 8 characters")}
            required
          />
        </div>
        <div>
          <Label>{t("Confirm Password")}</Label>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t("Repeat password")}
            required
          />
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button size="sm" variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button size="sm" disabled={saving}>
            {saving ? t("Resetting...") : t("Reset Password")}
          </Button>
        </div>
      </form>
    </div>
  );
}
