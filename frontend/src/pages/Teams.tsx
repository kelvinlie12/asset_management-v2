import { useCallback, useEffect, useState, type FormEvent } from "react";
import PageMeta from "../components/common/PageMeta";
import ExportButton from "../components/common/ExportButton";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import FileInput from "../components/form/input/FileInput";
import Select from "../components/form/Select";
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
import { PlusIcon, PencilIcon, TrashBinIcon, EyeIcon, GroupIcon } from "../icons";
import {
  fetchTeams,
  fetchAllTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  STATUS_OPTIONS,
  resolveTeamLogo,
  type Team,
  type Paginated,
  type TeamFilters,
  type TeamPayload,
} from "../services/teams";
import { useToast } from "../hooks/useToast";
import { extractApiError as extractError } from "../utils/error";

const PER_PAGE = 10;

type FormState = {
  name: string;
  description: string;
  status: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  status: "active",
};

export default function Teams() {
  const { t } = useLang();
  const { user } = useAuth();
  const canView = hasPermission(user, "teams.view");
  const canCreate = hasPermission(user, "teams.create");
  const canUpdate = hasPermission(user, "teams.update");
  const canDelete = hasPermission(user, "teams.delete");

  const [teams, setTeams] = useState<Team[]>([]);
  const [meta, setMeta] = useState<Paginated<Team>["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const { pushToast } = useToast();

  const [filters, setFilters] = useState<TeamFilters>({
    search: "",
    status: "",
    page: 1,
    per_page: PER_PAGE,
  });

  const [selected, setSelected] = useState<Team | null>(null);

  const addModal = useModal();
  const detailModal = useModal();
  const editModal = useModal();
  const deleteModal = useModal();

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const loadTeams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchTeams(filters);
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

  function updateFilter(key: keyof TeamFilters, value: string) {
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
    logo: File | null;
    removeLogo: boolean;
    editing: Team | null;
  }) {
    setSaving(true);
    try {
      // No room_ids: rooms belong to one unit and are created by that unit
      // on the rooms page.
      const body: TeamPayload = {
        name: payload.name,
        description: payload.description || null,
        logo: payload.logo,
      };
      if (payload.editing) {
        body.remove_logo = payload.removeLogo && !payload.logo;
        await updateTeam(payload.editing.id, body);
        showTempSuccess(t("Team updated."));
        editModal.closeModal();
      } else {
        body.status = payload.status;
        await createTeam(body);
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
      await deleteTeam(selected.id);
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
        description={t("Manage teams and their members.")}
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
                t("Description"),
                t("Members"),
                t("Rooms"),
                t("Status"),
              ]}
              rows={async () => {
                const all = await fetchAllTeams(filters);
                return all.map((team) => [
                  team.name,
                  team.description ?? "",
                  team.users_count ?? 0,
                  team.rooms_count ?? 0,
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
                    {t("Members")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Rooms")}
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
                          {resolveTeamLogo(team) ? (
                            <img
                              src={resolveTeamLogo(team)!}
                              alt={team.name}
                              className="h-10 w-10 shrink-0 rounded-full border border-gray-200 bg-white object-contain dark:border-white/10"
                            />
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                              <GroupIcon />
                            </span>
                          )}
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
                        {team.users_count ?? 0}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {team.rooms_count ?? 0}
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
  editing: Team | null;
  saving: boolean;
  onSubmit: (payload: {
    name: string;
    description: string;
    status: string;
    logo: File | null;
    removeLogo: boolean;
    editing: Team | null;
  }) => void;
}) {
  const { t } = useLang();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() =>
    editing
      ? {
          name: editing.name,
          description: editing.description || "",
          status: editing.status,
        }
      : EMPTY_FORM
  );

  // Preview of the file the user just picked.
  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  useEffect(() => {
    if (isOpen) {
      setLogoFile(null);
      setRemoveLogo(false);
      setForm(
        editing
          ? {
              name: editing.name,
              description: editing.description || "",
              status: editing.status,
            }
          : EMPTY_FORM
      );
    }
  }, [isOpen, editing]);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit({
      ...form,
      name: form.name.trim(),
      logo: logoFile,
      removeLogo,
      editing,
    });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[550px] m-4">
      <div className="no-scrollbar relative w-full max-w-[550px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {editing ? t("Edit Team") : t("Add Team")}
        </h4>
        <p className="mb-6 mt-1 text-sm text-gray-500 dark:text-gray-400">
          {editing
            ? t("Update details for {name}.", { name: editing.name })
            : t("Create a new team.")}
        </p>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>{t("Team Name")}</Label>
            <Input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={t("e.g. Development")}
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
          <div className="sm:col-span-2">
            <Label>{t("Description")}</Label>
            <Input
              type="text"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder={t("Team description")}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>{t("Team Logo")}</Label>
            <div className="flex items-center gap-4">
              {(() => {
                const current = removeLogo ? null : resolveTeamLogo(editing);
                const src = logoPreview ?? current;
                return src ? (
                  <img
                    src={src}
                    alt={t("Team Logo")}
                    className="h-16 w-16 shrink-0 rounded-xl border border-gray-200 bg-white object-contain dark:border-white/10"
                  />
                ) : (
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                    <GroupIcon />
                  </span>
                );
              })()}
              <div className="min-w-0 flex-1">
                <FileInput
                  className="custom-class"
                  onChange={(e) => {
                    setLogoFile(e.target.files?.[0] ?? null);
                    setRemoveLogo(false);
                  }}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t("PNG, JPG, WEBP or GIF, max 4 MB. Shown in the sidebar.")}
                </p>
                {editing?.logo && !logoFile && (
                  <label className="mt-2 inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={removeLogo}
                      onChange={(e) => setRemoveLogo(e.target.checked)}
                    />
                    {t("Remove current logo")}
                  </label>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 sm:col-span-2 dark:text-gray-400">
            {t("Rooms are added by the team itself on the Rooms page.")}
          </p>
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
  team: Team | null;
  onEdit?: () => void;
}) {
  const { t } = useLang();
  if (!team) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[500px] m-4">
      <div className="no-scrollbar max-h-[85vh] w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {t("Team Details")}
        </h4>
        <div className="mt-4">
          <p className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {team.name}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{team.slug}</p>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>{t("Status")}</Label>
            <Badge
              size="sm"
              variant="light"
              color={team.status === "active" ? "success" : "error"}
            >
              {team.status}
            </Badge>
          </div>
          <div>
            <Label>{t("Members")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {team.users_count ?? 0}
            </p>
          </div>
          <div className="sm:col-span-2">
            <Label>{t("Description")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {team.description || "-"}
            </p>
          </div>
          <div>
            <Label>{t("Rooms")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {team.rooms_count ?? 0}
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
