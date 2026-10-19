import { useCallback, useEffect, useState, type FormEvent } from "react";
import PageMeta from "../components/common/PageMeta";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import Button from "../components/ui/button/Button";
import Badge from "../components/ui/badge/Badge";
import { Modal } from "../components/ui/modal";
import { useModal } from "../hooks/useModal";
import {
  Table,
  TableBody,
  TableHeader,
  TableCell,
  TableRow,
} from "../components/ui/table";
import { useAuth, hasPermission } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { useToast } from "../hooks/useToast";
import { extractApiError as extractError } from "../utils/error";
import { PlusIcon, PencilIcon, TrashBinIcon } from "../icons";
import {
  fetchRoles,
  createRole,
  updateRole,
  deleteRole,
  type Role,
} from "../services/roles";

const ROLE_BADGE_COLOR: Record<
  string,
  "primary" | "info" | "warning" | "dark"
> = {
  super_admin: "primary",
  admin: "info",
  staff: "warning",
  viewer: "dark",
};

export default function Roles() {
  const { t } = useLang();
  const { user } = useAuth();
  const canView = hasPermission(user, "roles.view");
  const canCreate = hasPermission(user, "roles.create");
  const canUpdate = hasPermission(user, "roles.update");
  const canDelete = hasPermission(user, "roles.delete");

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { pushToast } = useToast();
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<Role | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const addModal = useModal();
  const editModal = useModal();
  const deleteModal = useModal();

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchRoles(search || undefined);
      setRoles(res.data.data);
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to load roles.")));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  async function handleSaveRole(payload: { name: string; role: Role | null }) {
    setSaving(true);
    try {
      if (payload.role) {
        await updateRole(payload.role.id, payload.name);
        editModal.closeModal();
        pushToast("success", t("Role updated."));
      } else {
        await createRole(payload.name);
        addModal.closeModal();
        pushToast("success", t("Role created."));
      }
      await loadRoles();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to save role.")));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setSubmitting("delete");
    try {
      await deleteRole(selected.id);
      deleteModal.closeModal();
      setSelected(null);
      pushToast("success", t("Role deleted."));
      await loadRoles();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to delete role.")));
    } finally {
      setSubmitting(null);
    }
  }

  if (!canView) {
    return (
      <>
        <PageMeta
          title={t("Roles | Access Denied")}
          description={t("Role management")}
        />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-error-600 dark:text-error-400">
            {t("You do not have permission to manage roles.")}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title={t("Role Management")}
        description={t("Manage job titles.")}
      />

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("Role Management")}
          </h3>
          {canCreate && (
            <Button
              onClick={() => {
                setSelected(null);
                addModal.openModal();
              }}
              startIcon={<PlusIcon />}
            >
              {t("Add Role")}
            </Button>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Search roles...")}
              className="lg:max-w-[300px]"
            />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Name")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                    {t("Actions")}
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={2} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("Loading...")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading && roles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("No roles found.")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  roles.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="px-5 py-4">
                        <Badge
                          size="sm"
                          variant="light"
                          color={ROLE_BADGE_COLOR[r.name] || "dark"}
                        >
                          {r.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          {canUpdate && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelected(r);
                                editModal.openModal();
                              }}
                              startIcon={<PencilIcon />}
                            >
                              {t("Edit")}
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelected(r);
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
        </div>
      </div>

      <RoleModal
        key={selected?.id || "add"}
        isOpen={addModal.isOpen || editModal.isOpen}
        onClose={() => {
          editModal.closeModal();
          addModal.closeModal();
        }}
        role={selected}
        saving={saving}
        onSubmit={handleSaveRole}
      />

      {selected && (
        <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.closeModal} className="max-w-[450px] m-4">
          <div className="no-scrollbar relative w-full max-w-[450px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
            <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              {t("Delete Role")}
            </h4>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t(
                "Are you sure you want to delete the role {name}? This action cannot be undone.",
                { name: selected.name }
              )}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button size="sm" variant="outline" onClick={deleteModal.closeModal}>
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
    </>
  );
}

function RoleModal({
  isOpen,
  onClose,
  role,
  saving,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  saving: boolean;
  onSubmit: (payload: { name: string; role: Role | null }) => void;
}) {
  const { t } = useLang();
  const [name, setName] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName(role?.name || "");
    }
  }, [isOpen, role]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), role });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[450px] m-4">
      <div className="no-scrollbar relative w-full max-w-[450px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {role ? t("Edit Role") : t("Add Role")}
        </h4>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {role
            ? t("Rename {name}.", { name: role.name })
            : t("Create a new system role.")}
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <Label>{t("Role Name")}</Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("e.g. manager")}
              required
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button size="sm" variant="outline" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button size="sm" disabled={saving}>
              {saving
                ? t("Saving...")
                : role
                  ? t("Save Changes")
                  : t("Create Role")}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

