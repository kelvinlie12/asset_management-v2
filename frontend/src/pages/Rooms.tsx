import { useCallback, useEffect, useState, type FormEvent } from "react";
import PageMeta from "../components/common/PageMeta";
import ExportButton from "../components/common/ExportButton";
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
import { useAuth, hasPermission } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { PlusIcon, PencilIcon, TrashBinIcon, EyeIcon, BoxIconLine } from "../icons";
import {
  fetchRooms,
  fetchAllRooms,
  fetchRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  STATUS_OPTIONS,
  type Room,
  type Paginated,
  type RoomFilters,
} from "../services/rooms";
import { fetchTeams, type Team } from "../services/teams";
import { useToast } from "../hooks/useToast";
import { extractApiError as extractError } from "../utils/error";

const PER_PAGE = 10;

type FormState = {
  name: string;
  location: string;
  description: string;
  status: string;
  /** A room belongs to exactly one unit, so this is a single id. */
  team_id: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  location: "",
  description: "",
  status: "active",
  team_id: "",
};

export default function Rooms() {
  const { t } = useLang();
  const { user } = useAuth();
  const canView = hasPermission(user, "rooms.view");
  const canCreate = hasPermission(user, "rooms.create");
  const canUpdate = hasPermission(user, "rooms.update");
  const canDelete = hasPermission(user, "rooms.delete");

  const [rooms, setRooms] = useState<Room[]>([]);
  const [meta, setMeta] = useState<Paginated<Room>["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const { pushToast } = useToast();

  const [filters, setFilters] = useState<RoomFilters>({
    search: "",
    status: "",
    page: 1,
    per_page: PER_PAGE,
  });

  const [selected, setSelected] = useState<Room | null>(null);

  const addModal = useModal();
  const detailModal = useModal();
  const editModal = useModal();
  const deleteModal = useModal();

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchRooms(filters);
      setRooms(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to load rooms.")));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  function updateFilter(key: keyof RoomFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  function goToPage(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  function showTempSuccess(msg: string) {
    pushToast("success", msg);
  }

  async function refresh() {
    await loadRooms();
  }

  async function handleSaveRoom(payload: {
    name: string;
    location: string;
    description: string;
    status: string;
    team_id: string;
    editing: Room | null;
  }) {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: payload.name,
        location: payload.location || null,
        description: payload.description || null,
        status: payload.status,
      };
      if (payload.editing) {
        await updateRoom(payload.editing.id, body);
        showTempSuccess(t("Room updated."));
        editModal.closeModal();
      } else {
        // A room must belong to a unit. Scoped users always use their own unit.
        const isSuperAdmin = user?.role === "super_admin";
        body.team_id = isSuperAdmin
          ? Number(payload.team_id)
          : user?.team_id;
        await createRoom(body);
        showTempSuccess(t("Room created."));
        addModal.closeModal();
      }
      await refresh();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to save room.")));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setSubmitting("delete");
    try {
      await deleteRoom(selected.id);
      deleteModal.closeModal();
      setSelected(null);
      showTempSuccess(t("Room deleted."));
      await refresh();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to delete room.")));
    } finally {
      setSubmitting(null);
    }
  }

  if (!canView) {
    return (
      <>
        <PageMeta
          title={`${t("Rooms")} | ${t("Access Denied")}`}
          description={t("Room management")}
        />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-error-600 dark:text-error-400">
            {t("You do not have permission to view rooms.")}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title={t("Room Management")}
        description={t("Manage rooms and location information.")}
      />
      

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("Room Management")}
          </h3>
          <div className="flex items-center gap-2">
            <ExportButton
              fileStem={t("Room Management")}
              headers={() => [
                t("Room"),
                t("Location"),
                t("Team"),
                t("Assets"),
                t("Status"),
              ]}
              rows={async () => {
                const all = await fetchAllRooms(filters);
                return all.map((r) => [
                  r.name,
                  r.location ?? "",
                  r.team?.name ?? "",
                  r.assets_count ?? 0,
                  t(r.status),
                ]);
              }}
            />
            {canCreate && (
              <Button onClick={addModal.openModal} startIcon={<PlusIcon />}>
                {t("Add Room")}
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
              placeholder={t("Search by name, location, or description...")}
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
                    {t("Room")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Location")}
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
                {!loading && rooms.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("No rooms found.")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  rooms.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                            <BoxIconLine />
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                              {r.name}
                            </p>
                            <p className="max-w-[240px] truncate text-xs text-gray-500 dark:text-gray-400">
                              {r.description || "-"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {r.location || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {r.team?.name || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {r.assets_count ?? 0}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <Badge
                          size="sm"
                          variant="light"
                          color={r.status === "active" ? "success" : "error"}
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelected(r);
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
        <RoomModal
          isOpen={addModal.isOpen}
          onClose={addModal.closeModal}
          editing={null}
          saving={saving}
          onSubmit={handleSaveRoom}
        />
      )}

      {canUpdate && (
        <RoomModal
          isOpen={editModal.isOpen}
          onClose={editModal.closeModal}
          key={selected?.id || "edit"}
          editing={selected}
          saving={saving}
          onSubmit={handleSaveRoom}
        />
      )}

      <DetailModal
        isOpen={detailModal.isOpen}
        onClose={detailModal.closeModal}
        room={selected}
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
              {t("Delete Room")}
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

function RoomModal({
  isOpen,
  onClose,
  editing,
  saving,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  editing: Room | null;
  saving: boolean;
  onSubmit: (payload: {
    name: string;
    location: string;
    description: string;
    status: string;
    team_id: string;
    editing: Room | null;
  }) => void;
}) {
  const { t } = useLang();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const [teams, setTeams] = useState<Team[]>([]);
  const buildForm = (room: Room | null): FormState =>
    room
      ? {
          name: room.name,
          location: room.location || "",
          description: room.description || "",
          status: room.status,
          team_id: room.team_id ? String(room.team_id) : "",
        }
      : EMPTY_FORM;
  const [form, setForm] = useState<FormState>(() => buildForm(editing));

  useEffect(() => {
    if (!isOpen || !isSuperAdmin) return;
    fetchTeams()
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
    if (!form.name.trim()) return;
    // Only a super admin picks the unit; everyone else is pinned to their own.
    if (isSuperAdmin && !form.team_id) {
      alert(t("Please select a team."));
      return;
    }
    onSubmit({ ...form, name: form.name.trim(), editing });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[500px] m-4">
      <div className="no-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {editing ? t("Edit Room") : t("Add Room")}
        </h4>
        <p className="mb-6 mt-1 text-sm text-gray-500 dark:text-gray-400">
          {editing
            ? t("Update details for {name}.", { name: editing.name })
            : t("Create a new room.")}
        </p>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>{t("Room Name")}</Label>
            <Input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={t("e.g. Meeting Room A")}
              required
            />
          </div>
          <div>
            <Label>{t("Location")}</Label>
            <Input
              type="text"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder={t("e.g. Floor 1")}
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
            <Label>{t("Team")}</Label>
            {isSuperAdmin ? (
              <Select
                options={teams.map((team) => ({
                  value: String(team.id),
                  label: team.name,
                }))}
                placeholder={t("Select team")}
                defaultValue={form.team_id}
                onChange={(v) => set("team_id", v)}
              />
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {user?.team?.name ?? t("Your team")}
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <Label>{t("Description")}</Label>
            <Input
              type="text"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder={t("Room description")}
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
                  : t("Create Room")}
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
  room,
  onEdit,
}: {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null;
  onEdit?: () => void;
}) {
  const { t } = useLang();
  const [loaded, setLoaded] = useState<Room | null>(room);

  useEffect(() => {
    if (isOpen && room) {
      setLoaded(room);
      fetchRoom(room.id)
        .then((res) => setLoaded(res.data.room))
        .catch(() => undefined);
    }
  }, [isOpen, room]);

  if (!room || !loaded) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[500px] m-4">
      <div className="no-scrollbar max-h-[85vh] w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {t("Room Details")}
        </h4>
        <div className="mt-4">
          <p className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {loaded.name}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {loaded.team ? (
              <Badge size="sm" variant="light" color="info">
                {loaded.team.name}
              </Badge>
            ) : (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t("No team assigned.")}
              </span>
            )}
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>{t("Location")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.location || "-"}
            </p>
          </div>
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