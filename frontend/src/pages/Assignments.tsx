import { useCallback, useEffect, useState, type FormEvent } from "react";
import PageMeta from "../components/common/PageMeta";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
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
import { useAuth, hasPermission, hasAnyPermission } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { PlusIcon, EyeIcon, TaskIcon } from "../icons";
import {
  fetchAssignments,
  fetchAssignment,
  createAssignment,
  type AssetAssignment,
  type Paginated,
  type AssignmentFilters,
} from "../services/assignments";
import { fetchAssets, type Asset } from "../services/assets";
import { fetchTeams, type Team } from "../services/teams";
import { fetchRooms, type Room } from "../services/rooms";
import { fetchUsers, type User } from "../services/users";
import { useToast } from "../hooks/useToast";
import { extractApiError as extractError } from "../utils/error";

const PER_PAGE = 10;

type FormState = {
  asset_id: string;
  assigned_date: string;
  team_id: string;
  room_id: string;
  assigned_user_id: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  asset_id: "",
  assigned_date: new Date().toISOString().slice(0, 10),
  team_id: "",
  room_id: "",
  assigned_user_id: "",
  notes: "",
};

export default function Assignments() {
  const { user } = useAuth();
  const { t } = useLang();
  const canView = hasPermission(user, "assignments.view");
  const canManage = hasAnyPermission(user, ["assignments.create"]);

  const [assignments, setAssignments] = useState<AssetAssignment[]>([]);
  const [meta, setMeta] = useState<Paginated<AssetAssignment>["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const { pushToast } = useToast();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [filters, setFilters] = useState<AssignmentFilters>({
    search: "",
    page: 1,
    per_page: PER_PAGE,
  });

  const [selected, setSelected] = useState<AssetAssignment | null>(null);

  const addModal = useModal();
  const detailModal = useModal();

  const [saving, setSaving] = useState(false);

  const loadAssignments = useCallback(async () => {
    setLoading(true);

    try {
      const res = await fetchAssignments(filters);
      setAssignments(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to load assignments.")));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [assetsRes, teamsRes, roomsRes, usersRes] = await Promise.all([
          fetchAssets({ per_page: 100 }),
          fetchTeams({ per_page: 100 }),
          fetchRooms({ per_page: 100 }),
          fetchUsers({ per_page: 100 }),
        ]);
        if (cancelled) return;
        setAssets(assetsRes.data.data);
        setTeams(teamsRes.data.data);
        setRooms(roomsRes.data.data);
        setUsers(usersRes.data.data);
      } catch {
        // options are non-critical
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateFilter(key: keyof AssignmentFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  function goToPage(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  function showTempSuccess(msg: string) {
    pushToast("success", msg);
  }

  async function refresh() {
    await loadAssignments();
  }

  async function handleSaveAssignment(payload: FormState) {
    setSaving(true);

    try {
      await createAssignment({
        asset_id: payload.asset_id,
        assigned_date: payload.assigned_date,
        team_id: payload.team_id || null,
        room_id: payload.room_id || null,
        assigned_user_id: payload.assigned_user_id || null,
        notes: payload.notes || null,
      });
      showTempSuccess(t("Asset assigned. Placement history saved."));
      addModal.closeModal();
      await refresh();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to assign asset.")));
    } finally {
      setSaving(false);
    }
  }

  if (!canView) {
    return (
      <>
        <PageMeta
          title={t("Assignments | Access Denied")}
          description={t("Asset assignment management")}
        />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-error-600 dark:text-error-400">
            {t("You do not have permission to view asset assignments.")}
          </p>
        </div>
      </>
    );
  }

  const assignableAssets = assets.filter((a) => a.condition !== "DAMAGED");

  return (
    <>
      <PageMeta
        title={t("Asset Assignments")}
        description={t("Track asset placement history (penempatan barang).")}
      />
      

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("Asset Assignment")}
          </h3>
          {canManage && (
            <Button onClick={addModal.openModal} startIcon={<PlusIcon />}>
              {t("Assign Asset")}
            </Button>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
            <Input
              type="text"
              value={filters.search || ""}
              onChange={(e) => updateFilter("search", e.target.value)}
              placeholder={t("Search by asset, team, user, or date...")}
              className="lg:max-w-[300px]"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("Full placement history is preserved. Assigning an asset sets it to IN_USE.")}
            </p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Asset")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Assigned To")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Team")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Room")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Date")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Notes")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                    {t("Detail")}
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("Loading...")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading && assignments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("No assignments found.")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  assignments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                            <TaskIcon />
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                              {a.asset?.name || "-"}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {a.asset?.asset_code || ""}
                              {a.asset ? `  ${a.asset.usage_status}` : ""}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {a.assigned_user?.name || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {a.team?.name || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {a.room ? a.room.name : "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {a.assigned_date || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <p className="max-w-[220px] truncate text-sm text-gray-600 dark:text-gray-400">
                          {a.notes || "-"}
                        </p>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center justify-end whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelected(a);
                              detailModal.openModal();
                            }}
                            startIcon={<EyeIcon />}
                          >
                            {t("View")}
                          </Button>
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

      {canManage && (
        <AssignModal
          isOpen={addModal.isOpen}
          onClose={addModal.closeModal}
          saving={saving}
          assets={assignableAssets}
          teams={teams}
          rooms={rooms}
          users={users}
          onSubmit={handleSaveAssignment}
        />
      )}

      <DetailModal
        isOpen={detailModal.isOpen}
        onClose={detailModal.closeModal}
        assignment={selected}
      />
    </>
  );
}

function AssignModal({
  isOpen,
  onClose,
  saving,
  assets,
  teams,
  rooms,
  users,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  saving: boolean;
  assets: Asset[];
  teams: Team[];
  rooms: Room[];
  users: User[];
  onSubmit: (payload: FormState) => void;
}) {
  const { t } = useLang();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm({ ...EMPTY_FORM, assigned_date: new Date().toISOString().slice(0, 10) });
      setFormError(null);
    }
  }, [isOpen]);

  const selectedAsset = assets.find((a) => String(a.id) === form.asset_id);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.asset_id) {
      setFormError(t("Please select an asset to assign."));
      return;
    }
    if (!form.team_id && !form.room_id && !form.assigned_user_id) {
      setFormError(
        t("Specify at least one placement: a team, a room, or an assigned user."),
      );
      return;
    }
    onSubmit({
      ...form,
      notes: form.notes.trim(),
    });
  }

  const roomOptions = rooms.filter((r) => !r.is_storage);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[560px] m-4">
      <div className="no-scrollbar max-h-[85vh] w-full max-w-[560px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {t("Assign Asset")}
        </h4>
        <p className="mb-6 mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("Place an asset into use. The asset moves from IN_STORAGE to IN_USE and the placement is appended to its history (previous history is kept).")}
        </p>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>{t("Asset")}</Label>
            <Select
              options={assets.map((a) => ({
                value: String(a.id),
                label: `${a.name} (${a.asset_code}  ${a.usage_status})`,
              }))}
              placeholder={t("Select asset to assign")}
              defaultValue={form.asset_id}
              onChange={(v) => set("asset_id", v)}
            />
            {selectedAsset && selectedAsset.usage_status === "IN_USE" && (
              <p className="mt-1 text-xs text-warning-600 dark:text-warning-400">
                {t("This asset is already IN_USE. Assigning will add a new history entry for the new placement.")}
              </p>
            )}
          </div>
          <div>
            <Label>{t("Assigned Date")}</Label>
            <Input
              type="date"
              value={form.assigned_date}
              onChange={(e) => set("assigned_date", e.target.value)}
              required
            />
          </div>
          <div>
            <Label>{t("Team")}</Label>
            <Select
              options={teams.map((team) => ({ value: String(team.id), label: team.name }))}
              placeholder={t("Select team")}
              defaultValue={form.team_id}
              onChange={(v) => set("team_id", v)}
            />
          </div>
          <div>
            <Label>{t("Assigned User")}</Label>
            <Select
              options={users.map((u) => ({ value: String(u.id), label: u.name }))}
              placeholder={t("Select user")}
              defaultValue={form.assigned_user_id}
              onChange={(v) => set("assigned_user_id", v)}
            />
          </div>
          <div>
            <Label>{t("Room")}</Label>
            <Select
              options={roomOptions.map((r) => ({
                value: String(r.id),
                label: r.name,
              }))}
              placeholder={t("Select room")}
              defaultValue={form.room_id}
              onChange={(v) => set("room_id", v)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>{t("Notes")}</Label>
            <Input
              type="text"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder={t("Optional notes about the placement")}
            />
          </div>
          {formError && (
            <div className="sm:col-span-2 rounded-lg border border-error-500 bg-error-50 p-3 text-xs text-error-600 dark:bg-error-500/10 dark:text-error-400">
              {formError}
            </div>
          )}
          <div className="sm:col-span-2 mt-2 flex items-center gap-3 justify-end">
            <Button size="sm" variant="outline" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button size="sm" disabled={saving}>
              {saving ? t("Assigning...") : t("Assign Asset")}
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
  assignment,
}: {
  isOpen: boolean;
  onClose: () => void;
  assignment: AssetAssignment | null;
}) {
  const { t } = useLang();
  const [loaded, setLoaded] = useState<AssetAssignment | null>(assignment);

  useEffect(() => {
    if (isOpen && assignment) {
      setLoaded(assignment);
      fetchAssignment(assignment.id)
        .then((res) => setLoaded(res.data.assignment))
        .catch(() => undefined);
    }
  }, [isOpen, assignment]);

  if (!assignment || !loaded) return null;
  const asset = loaded.asset;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[560px] m-4">
      <div className="no-scrollbar max-h-[85vh] w-full max-w-[560px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {t("Assignment Details")}
        </h4>
        <div className="mt-4">
          <p className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {asset?.name || "-"}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge size="sm" variant="light" color="info">
              {asset?.asset_code || "-"}
            </Badge>
            {asset && (
              <Badge
                size="sm"
                variant="light"
                color={asset.usage_status === "IN_USE" ? "success" : "warning"}
              >
                {asset.usage_status}
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>{t("Assigned Date")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.assigned_date || "-"}
            </p>
          </div>
          <div>
            <Label>{t("Team")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.team?.name || "-"}
            </p>
          </div>
          <div>
            <Label>{t("Assigned User")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.assigned_user?.name || "-"}
            </p>
          </div>
          <div>
            <Label>{t("Room")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.room?.name || "-"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <Label>{t("Notes")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.notes || "-"}
            </p>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button size="sm" variant="outline" onClick={onClose}>
            {t("Close")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}