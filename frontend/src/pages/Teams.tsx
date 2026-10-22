import { useCallback, useEffect, useState, type FormEvent } from "react";
import PageMeta from "../components/common/PageMeta";
import ExportButton from "../components/common/ExportButton";
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
import { PlusIcon, PencilIcon, TrashBinIcon, EyeIcon, GroupIcon } from "../icons";
import {
  fetchWorkTeams,
  fetchAllWorkTeams,
  fetchWorkTeam,
  createWorkTeam,
  updateWorkTeam,
  deleteWorkTeam,
  STATUS_OPTIONS,
  type WorkTeam,
  type Paginated,
  type WorkTeamFilters,
  type WorkTeamPayload,
} from "../services/workTeams";
import { fetchTeams, type Team } from "../services/teams";
import { useToast } from "../hooks/useToast";
import { extractApiError as extractError } from "../utils/error";

const PER_PAGE = 10;

type FormState = {
  name: string;
  description: string;
  status: string;
  team_id: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  status: "active",
  team_id: "",
};

export default function Teams() {
  const { t } = useLang();
  const { user } = useAuth();
  const canView = hasPermission(user, "work_teams.view");
  const canCreate = hasPermission(user, "work_teams.create");
  const canUpdate = hasPermission(user, "work_teams.update");
  const canDelete = hasPermission(user, "work_teams.delete");
  // Teams belong to one company, so only a super admin can switch between
  // companies; everyone else is already pinned by the API.
  const isSuperAdmin = user?.role === "super_admin";

  const [teams, setTeams] = useState<WorkTeam[]>([]);
  const [meta, setMeta] = useState<Paginated<WorkTeam>["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Team[]>([]);
  const { pushToast } = useToast();

  const [filters, setFilters] = useState<WorkTeamFilters>({
    search: "",
    status: "",
    team_id: "",
    page: 1,
    per_page: PER_PAGE,
  });

  const [selected, setSelected] = useState<WorkTeam | null>(null);

  const addModal = useModal();
  const detailModal = useModal();
  const editModal = useModal();
  const deleteModal = useModal();

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const loadTeams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWorkTeams(filters);
      setTeams(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to load teams.")));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  // Only the super admin needs the company list, for the filter dropdown.
  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchTeams({ per_page: 100 })
      .then((res) => setCompanies(res.data.data))
      .catch(() => setCompanies([]));
  }, [isSuperAdmin]);

  function updateFilter(key: keyof WorkTeamFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  function goToPage(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  function showTempSuccess(msg: string) {
    pushToast("success", msg);
  }

  async function refresh() {
    await loadTeams();
  }

  async function handleSaveTeam(payload: {
    name: string;
    description: string;
    status: string;
    team_id: string;
    editing: WorkTeam | null;
  }) {
    setSaving(true);
    try {
      const body: WorkTeamPayload = {
        name: payload.name,
        description: payload.description || null,
        status: payload.status,
      };
      // Only a super admin may pick the owning company; scoped users are pinned
      // server-side, so sending their own team_id would be a no-op.
      if (isSuperAdmin) body.team_id = payload.team_id ? Number(payload.team_id) : null;
      if (payload.editing) {
        await updateWorkTeam(payload.editing.id, body);
        showTempSuccess(t("Team updated."));
        editModal.closeModal();
      } else {
        await createWorkTeam(body);
        showTempSuccess(t("Team created."));
        addModal.closeModal();
      }
      await refresh();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to save team.")));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setSubmitting("delete");
    try {
      await deleteWorkTeam(selected.id);
      deleteModal.closeModal();
      setSelected(null);
      showTempSuccess(t("Team deleted."));
      await refresh();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to delete team.")));
    } finally {
      setSubmitting(null);
    }
  }

  if (!canView) {
    return (
      <>
        <PageMeta
          title={`${t("Team")} | ${t("Access Denied")}`}
          description={t("Team management")}
        />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-error-600 dark:text-error-400">
            {t("You do not have permission to view teams.")}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title={t("Team Management")}
        description={t("Manage teams inside each company.")}
      />

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("Team Management")}
          </h3>
          <div className="flex items-center gap-2">
            <ExportButton
              fileStem={t("Team Management")}
              headers={() => [
                t("Team"),
                t("Company"),
                t("Description"),
                t("Assets"),
                t("Status"),
              ]}
              rows={async () => {
                const all = await fetchAllWorkTeams(filters);
                return all.map((team) => [
                  team.name,
                  team.team?.name ?? t("Global"),
                  team.description ?? "",
                  team.assets_count ?? 0,
                  t(team.status),
                ]);
              }}
            />
            {canCreate && (
              <Button onClick={addModal.openModal} startIcon={<PlusIcon />}>
                {t("Add Team")}
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
            <Input
              type="text"
              value={filters.search || ""}
              onChange={(e) => updateFilter("search", e.target.value)}
              placeholder={t("Search by name or description...")}
              className="lg:max-w-[300px]"
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              {isSuperAdmin && (
                <Select
                  options={[
                    { value: "", label: t("All companies") },
                    ...companies.map((company) => ({
                      value: String(company.id),
                      label: company.name,
                    })),
                  ]}
                  placeholder={t("All companies")}
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
                    {t("Team")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Company")}
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
                    <TableCell colSpan={5} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("Loading...")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading && teams.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("No teams found.")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  teams.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                            <GroupIcon />
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                              {team.name}
                            </p>
                            <p className="max-w-[240px] truncate text-xs text-gray-500 dark:text-gray-400">
                              {team.description || "-"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {team.team?.name ?? t("Global")}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {team.assets_count ?? 0}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <Badge
                          size="sm"
                          variant="light"
                          color={team.status === "active" ? "success" : "error"}
                        >
                          {team.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelected(team);
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
                                setSelected(team);
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
                                setSelected(team);
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
        <TeamModal
          isOpen={addModal.isOpen}
          onClose={addModal.closeModal}
          editing={null}
          saving={saving}
          onSubmit={handleSaveTeam}
        />
      )}

      {canUpdate && (
        <TeamModal
          isOpen={editModal.isOpen}
          onClose={editModal.closeModal}
          key={selected?.id || "edit"}
          editing={selected}
          saving={saving}
          onSubmit={handleSaveTeam}
        />
      )}

      <DetailModal
        isOpen={detailModal.isOpen}
        onClose={detailModal.closeModal}
        team={selected}
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
              {t("Delete Team")}
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

function TeamModal({
  isOpen,
  onClose,
  editing,
  saving,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  editing: WorkTeam | null;
  saving: boolean;
  onSubmit: (payload: {
    name: string;
    description: string;
    status: string;
    team_id: string;
    editing: WorkTeam | null;
  }) => void;
}) {
  const { t } = useLang();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const [companies, setCompanies] = useState<Team[]>([]);

  const buildForm = (team: WorkTeam | null): FormState =>
    team
      ? {
          name: team.name,
          description: team.description || "",
          status: team.status,
          team_id: team.team_id ? String(team.team_id) : "",
        }
      : EMPTY_FORM;
  const [form, setForm] = useState<FormState>(() => buildForm(editing));

  useEffect(() => {
    if (!isOpen || !isSuperAdmin) return;
    fetchTeams({ per_page: 100 })
      .then((res) => setCompanies(res.data.data))
      .catch(() => setCompanies([]));
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
    if (!form.name.trim()) return;
    onSubmit({ ...form, name: form.name.trim(), editing });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[500px] m-4">
      <div className="no-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {editing ? t("Edit Team") : t("Add Team")}
        </h4>
        <p className="mb-6 mt-1 text-sm text-gray-500 dark:text-gray-400">
          {editing
            ? t("Update details for {name}.", { name: editing.name })
            : t("Create a new team inside a company.")}
        </p>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>{t("Team Name")}</Label>
            <Input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={t("e.g. Network Team")}
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
            <div className="sm:col-span-2">
              <Label>{t("Company")}</Label>
              <Select
                options={companies.map((company) => ({
                  value: String(company.id),
                  label: company.name,
                }))}
                placeholder={t("No company (global)")}
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
              placeholder={t("Team description")}
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
                  : t("Create Team")}
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
  team,
  onEdit,
}: {
  isOpen: boolean;
  onClose: () => void;
  team: WorkTeam | null;
  onEdit?: () => void;
}) {
  const { t } = useLang();
  const [loaded, setLoaded] = useState<WorkTeam | null>(team);

  useEffect(() => {
    if (isOpen && team) {
      setLoaded(team);
      fetchWorkTeam(team.id)
        .then((res) => setLoaded(res.data.work_team))
        .catch(() => undefined);
    }
  }, [isOpen, team]);

  if (!team || !loaded) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[500px] m-4">
      <div className="no-scrollbar max-h-[85vh] w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {t("Team Details")}
        </h4>
        <div className="mt-4">
          <p className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {loaded.name}
          </p>
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
            <Label>{t("Company")}</Label>
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
