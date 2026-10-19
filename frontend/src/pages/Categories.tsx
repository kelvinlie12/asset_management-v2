import { useCallback, useEffect, useState, type FormEvent } from "react";
import PageMeta from "../components/common/PageMeta";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import Select from "../components/form/Select";
import Badge from "../components/ui/badge/Badge";
import Button from "../components/ui/button/Button";
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
import { PlusIcon, PencilIcon, TrashBinIcon, EyeIcon, FolderIcon } from "../icons";
import {
  fetchCategories,
  fetchCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  STATUS_OPTIONS,
  type Category,
  type Paginated,
  type CategoryFilters,
} from "../services/categories";
import { fetchTeams, type Team } from "../services/teams";
import { useToast } from "../hooks/useToast";
import { extractApiError as extractError } from "../utils/error";

const PER_PAGE = 10;

type FormState = {
  name: string;
  code: string;
  description: string;
  status: string;
  team_id: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  code: "",
  description: "",
  status: "active",
  team_id: "",
};

export default function Categories() {
  const { t } = useLang();
  const { user } = useAuth();
  const canView = hasPermission(user, "categories.view");
  const canCreate = hasPermission(user, "categories.create");
  const canUpdate = hasPermission(user, "categories.update");
  const canDelete = hasPermission(user, "categories.delete");
  // Every unit owns its own copy of the category list, so only a super admin
  // can switch between units; everyone else is already pinned by the API.
  const isSuperAdmin = user?.role === "super_admin";

  const [categories, setCategories] = useState<Category[]>([]);
  const [meta, setMeta] = useState<Paginated<Category>["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const { pushToast } = useToast();

  const [filters, setFilters] = useState<CategoryFilters>({
    search: "",
    status: "",
    team_id: "",
    page: 1,
    per_page: PER_PAGE,
  });

  const [selected, setSelected] = useState<Category | null>(null);

  const addModal = useModal();
  const detailModal = useModal();
  const editModal = useModal();
  const deleteModal = useModal();

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCategories(filters);
      setCategories(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to load categories.")));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Only the super admin needs the unit list, for the filter dropdown.
  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchTeams({ per_page: 100 })
      .then((res) => setTeams(res.data.data))
      .catch(() => setTeams([]));
  }, [isSuperAdmin]);

  function updateFilter(key: keyof CategoryFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  function goToPage(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  function showTempSuccess(msg: string) {
    pushToast("success", msg);
  }

  async function refresh() {
    await loadCategories();
  }

  async function handleSaveCategory(payload: {
    name: string;
    code: string;
    description: string;
    status: string;
    team_id: string;
    editing: Category | null;
  }) {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: payload.name,
        code: payload.code,
        description: payload.description || null,
        status: payload.status,
      };
      if (payload.editing) {
        // Only a super admin may move a category to another unit; scoped users
        // are pinned server-side, so sending their own team_id would be a no-op.
        if (isSuperAdmin) body.team_id = payload.team_id ? Number(payload.team_id) : null;
        await updateCategory(payload.editing.id, body);
        showTempSuccess(t("Category updated."));
        editModal.closeModal();
      } else {
        if (isSuperAdmin) body.team_id = payload.team_id ? Number(payload.team_id) : null;
        await createCategory(body);
        showTempSuccess(t("Category created."));
        addModal.closeModal();
      }
      await refresh();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to save category.")));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setSubmitting("delete");
    try {
      await deleteCategory(selected.id);
      deleteModal.closeModal();
      setSelected(null);
      showTempSuccess(t("Category deleted."));
      await refresh();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to delete category.")));
    } finally {
      setSubmitting(null);
    }
  }

  if (!canView) {
    return (
      <>
        <PageMeta
          title={`${t("Categories")} | ${t("Access Denied")}`}
          description={t("Category management")}
        />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-error-600 dark:text-error-400">
            {t("You do not have permission to view categories.")}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title={t("Category Management")}
        description={t("Manage asset categories.")}
      />
      

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("Category Management")}
          </h3>
          {canCreate && (
            <Button onClick={addModal.openModal} startIcon={<PlusIcon />}>
              {t("Add Category")}
            </Button>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
            <Input
              type="text"
              value={filters.search || ""}
              onChange={(e) => updateFilter("search", e.target.value)}
              placeholder={t("Search by name, code, or description...")}
              className="lg:max-w-[300px]"
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              {isSuperAdmin && (
                <Select
                  options={[
                    { value: "", label: t("All teams") },
                    { value: "global", label: t("Global") },
                    ...teams.map((team) => ({
                      value: String(team.id),
                      label: team.name,
                    })),
                  ]}
                  placeholder={t("All teams")}
                  defaultValue=""
                  onChange={(v) => updateFilter("team_id", v)}
                />
              )}
              <Select
                options={STATUS_OPTIONS}
                placeholder={t("All statuses")}
                defaultValue=""
                onChange={(v) => updateFilter("status", v)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Category")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Code")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Team")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Assets")}
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
                    <TableCell colSpan={6} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("Loading...")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading && categories.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("No categories found.")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  categories.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                            <FolderIcon />
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                              {c.name}
                            </p>
                            <p className="max-w-[240px] truncate text-xs text-gray-500 dark:text-gray-400">
                              {c.description || "-"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {c.code}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {c.team?.name ?? t("Global")}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {c.assets_count ?? 0}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <Badge
                          size="sm"
                          variant="light"
                          color={c.status === "active" ? "success" : "error"}
                        >
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelected(c);
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
                                setSelected(c);
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
                                setSelected(c);
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
        <CategoryModal
          isOpen={addModal.isOpen}
          onClose={addModal.closeModal}
          editing={null}
          saving={saving}
          onSubmit={handleSaveCategory}
        />
      )}

      {canUpdate && (
        <CategoryModal
          isOpen={editModal.isOpen}
          onClose={editModal.closeModal}
          key={selected?.id || "edit"}
          editing={selected}
          saving={saving}
          onSubmit={handleSaveCategory}
        />
      )}

      <DetailModal
        isOpen={detailModal.isOpen}
        onClose={detailModal.closeModal}
        category={selected}
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
              {t("Delete Category")}
            </h4>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t("Are you sure you want to delete {name}? This action cannot be undone.", {
                name: selected.name,
              })}
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

function CategoryModal({
  isOpen,
  onClose,
  editing,
  saving,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  editing: Category | null;
  saving: boolean;
  onSubmit: (payload: {
    name: string;
    code: string;
    description: string;
    status: string;
    team_id: string;
    editing: Category | null;
  }) => void;
}) {
  const { t } = useLang();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const [teams, setTeams] = useState<Team[]>([]);

  const buildForm = (category: Category | null): FormState =>
    category
      ? {
          name: category.name,
          code: category.code,
          description: category.description || "",
          status: category.status,
          team_id: category.team_id ? String(category.team_id) : "",
        }
      : EMPTY_FORM;
  const [form, setForm] = useState<FormState>(() => buildForm(editing));

  useEffect(() => {
    if (!isOpen || !isSuperAdmin) return;
    fetchTeams({ per_page: 100 })
      .then((res) => setTeams(res.data.data))
      .catch(() => setTeams([]));
  }, [isOpen, isSuperAdmin]);

  useEffect(() => {
    if (isOpen) {
      setForm(buildForm(editing));
    }
  }, [isOpen, editing]);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) return;
    onSubmit({ ...form, name: form.name.trim(), code: form.code.trim(), editing });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[500px] m-4">
      <div className="no-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {editing ? t("Edit Category") : t("Add Category")}
        </h4>
        <p className="mb-6 mt-1 text-sm text-gray-500 dark:text-gray-400">
          {editing
            ? t("Update details for {name}.", { name: editing.name })
            : t("Create a new asset category.")}
        </p>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>{t("Category Name")}</Label>
            <Input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={t("e.g. Electronics")}
              required
            />
          </div>
          <div>
            <Label>{t("Code")}</Label>
            <Input
              type="text"
              value={form.code}
              onChange={(e) => set("code", e.target.value)}
              placeholder={t("e.g. CAT-ELE")}
              required
            />
          </div>
          <div>
            <Label>{t("Status")}</Label>
            <Select
              options={STATUS_OPTIONS}
              placeholder={t("Select status")}
              defaultValue={form.status}
              onChange={(v) => set("status", v)}
            />
          </div>
          {isSuperAdmin && (
            <div>
              <Label>{t("Team")}</Label>
              <Select
                options={teams.map((team) => ({
                  value: String(team.id),
                  label: team.name,
                }))}
                placeholder={t("No team (global)")}
                defaultValue={form.team_id}
                onChange={(v) => set("team_id", v)}
              />
            </div>
          )}
          <div className="sm:col-span-2">
            <Label>{t("Description")}</Label>
            <Input
              type="text"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder={t("Category description")}
            />
          </div>
          <div className="sm:col-span-2 mt-2 flex items-center gap-3 justify-end">
            <Button size="sm" variant="outline" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button size="sm" disabled={saving}>
              {saving
                ? t("Saving...")
                : editing
                  ? t("Save Changes")
                  : t("Create Category")}
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
  category,
  onEdit,
}: {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  onEdit?: () => void;
}) {
  const { t } = useLang();
  const [loaded, setLoaded] = useState<Category | null>(category);

  useEffect(() => {
    if (isOpen && category) {
      setLoaded(category);
      fetchCategory(category.id)
        .then((res) => setLoaded(res.data.category))
        .catch(() => undefined);
    }
  }, [isOpen, category]);

  if (!category || !loaded) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[500px] m-4">
      <div className="no-scrollbar max-h-[85vh] w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {t("Category Details")}
        </h4>
        <div className="mt-4">
          <p className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {loaded.name}
          </p>
          <div className="mt-1">
            <Badge size="sm" variant="light" color="info">
              {loaded.code}
            </Badge>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>{t("Status")}</Label>
            <Badge
              size="sm"
              variant="light"
              color={loaded.status === "active" ? "success" : "error"}
            >
              {loaded.status}
            </Badge>
          </div>
          <div>
            <Label>{t("Team")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.team ? loaded.team.name : t("Global")}
            </p>
          </div>
          <div>
            <Label>{t("Assets")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.assets_count ?? 0}
            </p>
          </div>
          <div className="sm:col-span-2">
            <Label>{t("Description")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.description || "-"}
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