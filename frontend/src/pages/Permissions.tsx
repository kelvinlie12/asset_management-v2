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
  fetchPermissions,
  createPermission,
  updatePermission,
  deletePermission,
  type Permission,
} from "../services/roles";

export default function Permissions() {
  const { t } = useLang();
  const { user } = useAuth();
  const canView = hasPermission(user, "permissions.view");
  const canCreate = hasPermission(user, "permissions.create");
  const canUpdate = hasPermission(user, "permissions.update");
  const canDelete = hasPermission(user, "permissions.delete");

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { pushToast } = useToast();
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<Permission | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const addModal = useModal();
  const editModal = useModal();
  const deleteModal = useModal();

  const loadPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPermissions(search || undefined);
      setPermissions(res.data.data);
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to load permissions.")));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  async function handleSavePermission(payload: {
    name: string;
    permission: Permission | null;
  }) {
    setSaving(true);
    try {
      if (payload.permission) {
        await updatePermission(payload.permission.id, payload.name);
        editModal.closeModal();
        pushToast("success", t("Permission updated."));
      } else {
        await createPermission(payload.name);
        addModal.closeModal();
        pushToast("success", t("Permission created."));
      }
      await loadPermissions();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to save permission.")));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setSubmitting("delete");
    try {
      await deletePermission(selected.id);
      deleteModal.closeModal();
      setSelected(null);
      pushToast("success", t("Permission deleted."));
      await loadPermissions();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to delete permission.")));
    } finally {
      setSubmitting(null);
    }
  }

  if (!canView) {
    return (
      <>
        <PageMeta
          title={t("Permissions | Access Denied")}
          description={t("Permission management")}
        />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-error-600 dark:text-error-400">
            {t("You do not have permission to manage permissions.")}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title={t("Permission Management")}
        description={t("Manage permissions.")}
      />
      

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("Permission Management")}
          </h3>
          {canCreate && (
            <Button
              onClick={() => {
                setSelected(null);
                addModal.openModal();
              }}
              startIcon={<PlusIcon />}
            >
              {t("Add Permission")}
            </Button>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Search permissions...")}
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
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Guard")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                    {t("Actions")}
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={3} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("Loading...")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading && permissions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("No permissions found.")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  permissions.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="px-5 py-4">
                        <Badge size="sm" variant="light" color="info">
                          {p.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {p.guard_name}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          {canUpdate && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelected(p);
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
                                setSelected(p);
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

      <PermissionModal
        key={selected?.id || "add"}
        isOpen={addModal.isOpen || editModal.isOpen}
        onClose={() => {
          editModal.closeModal();
          addModal.closeModal();
        }}
        permission={selected}
        saving={saving}
        onSubmit={handleSavePermission}
      />

      {selected && (
        <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.closeModal} className="max-w-[450px] m-4">
          <div className="no-scrollbar relative w-full max-w-[450px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
            <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              {t("Delete Permission")}
            </h4>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t(
                "Are you sure you want to delete the permission {name}? This action cannot be undone.",
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

function PermissionModal({
  isOpen,
  onClose,
  permission,
  saving,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  permission: Permission | null;
  saving: boolean;
  onSubmit: (payload: { name: string; permission: Permission | null }) => void;
}) {
  const { t } = useLang();
  const [name, setName] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName(permission?.name || "");
    }
  }, [isOpen, permission]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), permission });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[450px] m-4">
      <div className="no-scrollbar relative w-full max-w-[450px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {permission ? t("Edit Permission") : t("Add Permission")}
        </h4>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {permission
            ? t("Rename {name}.", { name: permission.name })
            : t("Create a new permission.")}
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <Label>{t("Permission Name")}</Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("e.g. report.view")}
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
                : permission
                  ? t("Save Changes")
                  : t("Create Permission")}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
