import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
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
import {
  PlusIcon,
  EyeIcon,
  ArrowRightIcon,
  PencilIcon,
  TrashBinIcon,
} from "../icons";
import {
  fetchTransfers,
  fetchAllTransfers,
  fetchTransfer,
  createTransfer,
  updateTransfer,
  deleteTransfer,
  type AssetTransfer,
  type Paginated,
  type TransferFilters,
} from "../services/transfers";
import { fetchAssets, type Asset } from "../services/assets";
import { fetchTeams, type Team } from "../services/teams";
import { fetchRooms, type Room } from "../services/rooms";
import { fetchUsers, type User } from "../services/users";
import { useToast } from "../hooks/useToast";
import { extractApiError as extractError } from "../utils/error";

const PER_PAGE = 10;

type FormState = {
  asset_ids: string[];
  transfer_date: string;
  to_team_id: string;
  to_room_id: string;
  to_user_id: string;
  reason: string;
  proof: File | null;
};

const EMPTY_FORM: FormState = {
  asset_ids: [],
  transfer_date: new Date().toISOString().slice(0, 10),
  to_team_id: "",
  to_room_id: "",
  to_user_id: "",
  reason: "",
  proof: null,
};

function placementLabel(
  teamLabel: string,
  roomLabel: string,
  userLabel: string,
): string {
  const parts = [teamLabel, roomLabel, userLabel].filter(Boolean);
  return parts.length ? parts.join(" / ") : "-";
}

export default function Transfers() {
  const { user } = useAuth();
  const { t } = useLang();
  const canView = hasPermission(user, "transfers.view");
  const canCreate = hasPermission(user, "transfers.create");
  const canUpdate = hasPermission(user, "transfers.update");
  const canDelete = hasPermission(user, "transfers.delete");

  const [transfers, setTransfers] = useState<AssetTransfer[]>([]);
  const [meta, setMeta] = useState<Paginated<AssetTransfer>["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const { pushToast } = useToast();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [filters, setFilters] = useState<TransferFilters>({
    search: "",
    page: 1,
    per_page: PER_PAGE,
  });

  const [selected, setSelected] = useState<AssetTransfer | null>(null);
  const [editing, setEditing] = useState<AssetTransfer | null>(null);
  const [deleting, setDeleting] = useState<AssetTransfer | null>(null);

  const addModal = useModal();
  const editModal = useModal();
  const detailModal = useModal();
  const deleteModal = useModal();

  const [saving, setSaving] = useState(false);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const loadTransfers = useCallback(async () => {
    setLoading(true);

    try {
      const res = await fetchTransfers(filters);
      setTransfers(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to load transfers.")));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

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

  function updateFilter(key: keyof TransferFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  function goToPage(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  function showTempSuccess(msg: string) {
    pushToast("success", msg);
  }

  async function refresh() {
    await loadTransfers();
  }

  async function handleSaveTransfer(payload: FormState) {
     setSaving(true);

     try {
       for (const assetId of payload.asset_ids) {
         await createTransfer({
           asset_id: assetId,
           transfer_date: payload.transfer_date,
           to_team_id: payload.to_team_id || null,
           to_room_id: payload.to_room_id || null,
           to_user_id: payload.to_user_id || null,
           reason: payload.reason || null,
           ...(payload.proof ? { proof: payload.proof } : {}),
         });
       }
       showTempSuccess(t("{count} asset(s) transferred", { count: payload.asset_ids.length }));
       addModal.closeModal();
       await refresh();
     } catch (err) {
       pushToast("error", extractError(err, t("Failed to transfer asset.")));
     } finally {
       setSaving(false);
     }
   }

   async function handleUpdateTransfer(payload: FormState) {
     if (!editing) return;
     setSaving(true);

     try {
       await updateTransfer(editing.id, {
         asset_id: payload.asset_ids[0] || "",
        transfer_date: payload.transfer_date,
        to_team_id: payload.to_team_id || null,
        to_room_id: payload.to_room_id || null,
        to_user_id: payload.to_user_id || null,
        reason: payload.reason || null,
        ...(payload.proof ? { proof: payload.proof } : {}),
      });
      showTempSuccess(t("Transfer updated."));
      editModal.closeModal();
      setEditing(null);
      await refresh();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to update transfer.")));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTransfer() {
    if (!deleting) return;
    setDeletingBusy(true);

    try {
      await deleteTransfer(deleting.id);
      showTempSuccess(t("Transfer deleted."));
      deleteModal.closeModal();
      setDeleting(null);
      await refresh();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to delete transfer.")));
    } finally {
      setDeletingBusy(false);
    }
  }

  if (!canView) {
    return (
      <>
        <PageMeta
          title={t("Transfers | Access Denied")}
          description={t("Asset transfer management")}
        />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-error-600 dark:text-error-400">
            {t("You do not have permission to view asset transfers.")}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title={t("Asset Transfers")}
        description={t("Track asset mutation history (team, room, user).")}
      />
      

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("Asset Transfer")}
          </h3>
          <div className="flex items-center gap-2">
            <ExportButton
              fileStem={t("Asset Transfer")}
              headers={() => [
                t("Asset"),
                t("Move"),
                t("Date"),
                t("Reason"),
                t("Done By"),
              ]}
              rows={async () => {
                const all = await fetchAllTransfers(filters);
                return all.map((tr) => [
                  tr.asset?.name ?? "",
                  `${placementLabel(
                    tr.from_team?.name || "",
                    tr.from_room?.name || "",
                    tr.from_user?.name || "",
                  )} -> ${placementLabel(
                    tr.to_team?.name || "",
                    tr.to_room?.name || "",
                    tr.to_user?.name || "",
                  )}`,
                  tr.transfer_date ?? "",
                  tr.reason ?? "",
                  tr.performed_by?.name ?? "",
                ]);
              }}
            />
            {canCreate && (
              <Button onClick={addModal.openModal} startIcon={<PlusIcon />}>
                {t("Transfer Asset")}
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
              placeholder={t("Search by asset, reason, or date...")}
              className="lg:max-w-[300px]"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("Every transfer records the previous and new placement as history.")}
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
                    {t("Move")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Date")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Reason")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Done By")}
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
                {!loading && transfers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("No transfers found.")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  transfers.map((transfer) => {
                    const from = placementLabel(
                      transfer.from_team?.name || "",
                      transfer.from_room?.name || "",
                      transfer.from_user?.name || "",
                    );
                    const to = placementLabel(
                      transfer.to_team?.name || "",
                      transfer.to_room?.name || "",
                      transfer.to_user?.name || "",
                    );
                    return (
                      <TableRow key={transfer.id}>
                        <TableCell className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                              <ArrowRightIcon />
                            </span>
                            <div>
                              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                {transfer.asset?.name || "-"}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {transfer.asset?.asset_code || ""}
                                {transfer.asset
                                  ? `  ${transfer.asset.usage_status || ""}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Badge size="sm" variant="light" color="warning">
                              {from}
                            </Badge>
                            <ArrowRightIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                            <Badge size="sm" variant="light" color="success">
                              {to}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {transfer.transfer_date || "-"}
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          <p className="max-w-[200px] truncate text-sm text-gray-600 dark:text-gray-400">
                            {transfer.reason || "-"}
                          </p>
                        </TableCell>
                        <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {transfer.performed_by?.name || "-"}
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelected(transfer);
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
                                    setEditing(transfer);
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
                                    setDeleting(transfer);
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
                    );
                  })}
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
        <TransferModal
          isOpen={addModal.isOpen}
          onClose={addModal.closeModal}
          saving={saving}
          assets={assets}
          teams={teams}
          rooms={rooms}
          users={users}
          onSubmit={handleSaveTransfer}
        />
      )}

      {canUpdate && (
        <TransferModal
          isOpen={editModal.isOpen}
          onClose={() => {
            editModal.closeModal();
            setEditing(null);
          }}
          saving={saving}
          assets={assets}
          teams={teams}
          rooms={rooms}
          users={users}
          onSubmit={handleUpdateTransfer}
          initialData={editing}
          mode="edit"
        />
      )}

      <DetailModal
        isOpen={detailModal.isOpen}
        onClose={detailModal.closeModal}
        transfer={selected}
      />

      {canDelete && (
        <DeleteConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => {
            deleteModal.closeModal();
            setDeleting(null);
          }}
          onConfirm={handleDeleteTransfer}
          busy={deletingBusy}
          assetName={deleting?.asset?.name}
        />
      )}
    </>
  );
}

function toFormState(t: AssetTransfer | null): FormState {
  if (!t) {
    return { ...EMPTY_FORM, transfer_date: new Date().toISOString().slice(0, 10) };
  }
  return {
    asset_ids: t.asset ? [String(t.asset.id)] : [],
    transfer_date: t.transfer_date ? t.transfer_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    to_team_id: t.to_team ? String(t.to_team.id) : "",
    to_room_id: t.to_room ? String(t.to_room.id) : "",
    to_user_id: t.to_user ? String(t.to_user.id) : "",
    reason: t.reason || "",
    proof: null,
  };
}

function AssetSearchDropdown({
  assets,
  search,
  onSearchChange,
  value,
  onChange,
  placeholder,
  multiSelect = false,
}: {
  assets: Asset[];
  search: string;
  onSearchChange: (v: string) => void;
  value: string | string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  multiSelect?: boolean;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const ids = Array.isArray(value) ? value : [value];

  const filtered = assets.filter(
    (a) =>
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.asset_code.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedAssets = assets.filter((a) => ids.includes(String(a.id)));

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 text-left"
      >
        {selectedAssets.length > 0 ? (
          <span>
            {multiSelect
              ? `${selectedAssets.length} ${t("asset(s) selected")}`
              : selectedAssets[0].name}
          </span>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <div className="border-b border-gray-200 p-2 dark:border-gray-700">
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("Search by code or name...")}
              className="h-9 w-full rounded border border-gray-300 bg-transparent px-3 py-1.5 text-sm placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white/90"
              autoFocus
            />
          </div>
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
              {t("No assets found.")}
            </p>
          )}
          {filtered.map((a) => {
            const isSelected = ids.includes(String(a.id));
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  if (multiSelect) {
                    const next = isSelected
                      ? ids.filter((id) => id !== String(a.id))
                      : [...ids, String(a.id)];
                    onChange(next);
                  } else {
                    onChange([String(a.id)]);
                    setOpen(false);
                  }
                }}
                className={`w-full cursor-pointer truncate px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  isSelected
                    ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                    : "text-gray-800 dark:text-white/90"
                }`}
              >
                <span className="mr-2">{isSelected ? "✓" : ""}</span>
                {a.name} ({a.asset_code}  {a.usage_status})
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TransferModal({
  isOpen,
  onClose,
  saving,
  assets,
  teams,
  rooms,
  users,
  onSubmit,
  initialData = null,
  mode = "create",
}: {
  isOpen: boolean;
  onClose: () => void;
  saving: boolean;
  assets: Asset[];
  teams: Team[];
  rooms: Room[];
  users: User[];
  onSubmit: (payload: FormState) => void;
  initialData?: AssetTransfer | null;
  mode?: "create" | "edit";
}) {
  const { t } = useLang();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [assetSearch, setAssetSearch] = useState("");

  useEffect(() => {
    if (isOpen) {
      setForm(toFormState(initialData));
      setFormError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData]);

  const selectableAssets = assets.filter(
    (a) => a.condition !== "DAMAGED" || form.asset_ids.includes(String(a.id)),
  );
  const selectedAsset = selectableAssets.find((a) =>
    form.asset_ids.includes(String(a.id)),
  );
  const hiddenDamagedCount = assets.length - selectableAssets.length;

   function set<K extends keyof FormState>(key: K, value: FormState[K]) {
     setForm((prev) => ({ ...prev, [key]: value }));
   }

   function handleSubmit(e: FormEvent) {
     e.preventDefault();
     setFormError(null);
     if (form.asset_ids.length === 0) {
       setFormError(t("Please select at least one asset to transfer."));
       return;
     }
     if (mode === "create" && !form.proof) {
       setFormError(t("Please attach a photo as proof of the transfer."));
       return;
     }
     if (!form.to_team_id && !form.to_room_id && !form.to_user_id) {
       setFormError(
         t("Specify at least one target: a team, a room, or an assigned user."),
       );
       return;
     }
     onSubmit({
       ...form,
       reason: form.reason.trim(),
     });
   }

  const isEdit = mode === "edit";

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[560px] m-4">
      <div className="no-scrollbar max-h-[85vh] w-full max-w-[560px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {isEdit ? t("Edit Transfer") : t("Transfer Asset")}
        </h4>
        <p className="mb-6 mt-1 text-sm text-gray-500 dark:text-gray-400">
          {isEdit
            ? t("Update the details of this transfer record.")
            : t("Move an asset to a new team, room, or user. The previous and new placement are recorded in its transfer history (previous history is kept).")}
        </p>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
           <div className="sm:col-span-2">
             <Label>{t("Asset")}</Label>
              <AssetSearchDropdown
                assets={selectableAssets}
                search={assetSearch}
                onSearchChange={setAssetSearch}
                value={form.asset_ids}
                onChange={(v) => set("asset_ids", v)}
                placeholder={t("Select assets to transfer")}
                multiSelect
              />
              {hiddenDamagedCount > 0 && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t("{count} damaged asset(s) are hidden because they cannot be transferred.", { count: hiddenDamagedCount })}
                </p>
              )}
              {selectedAsset && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t("Current: team {team}, room {room}, user {user}", {
                    team: selectedAsset.team?.name || "-",
                    room: selectedAsset.room?.name || "-",
                    user: selectedAsset.assigned_user?.name || "-",
                  })}
                </p>
              )}
            </div>
          <div>
            <Label>{t("Transfer Date")}</Label>
            <Input
              type="date"
              value={form.transfer_date}
              onChange={(e) => set("transfer_date", e.target.value)}
              required
            />
          </div>
          <div>
            <Label>{t("To Team")}</Label>
            <Select
              options={teams.map((team) => ({ value: String(team.id), label: team.name }))}
              placeholder={t("Select team")}
              defaultValue={form.to_team_id}
              onChange={(v) => set("to_team_id", v)}
            />
          </div>
          <div>
            <Label>{t("To User")}</Label>
            <Select
              options={users.map((u) => ({ value: String(u.id), label: u.name }))}
              placeholder={t("Select user")}
              defaultValue={form.to_user_id}
              onChange={(v) => set("to_user_id", v)}
            />
          </div>
          <div>
            <Label>{t("To Room")}</Label>
            <Select
              options={rooms.map((r) => ({
                value: String(r.id),
                label: r.name,
              }))}
              placeholder={t("Select room")}
              defaultValue={form.to_room_id}
              onChange={(v) => set("to_room_id", v)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>{t("Reason")}</Label>
            <Input
              type="text"
              value={form.reason}
              onChange={(e) => set("reason", e.target.value)}
              placeholder={t("Reason for the transfer")}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>{t("Transfer Proof (Photo)")}</Label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setFormError(null);
                if (file && !/\.(jpg|jpeg|png)$/i.test(file.name)) {
                  setFormError(t("Only JPG or PNG photos are allowed."));
                  set("proof", null);
                  return;
                }
                if (file && file.size > 5 * 1024 * 1024) {
                  setFormError(t("Proof photo must be 5MB or smaller."));
                  set("proof", null);
                  return;
                }
                set("proof", file);
              }}
              className="block w-full text-sm text-gray-500 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-600 hover:file:bg-brand-100 dark:file:bg-brand-500/15 dark:file:text-brand-400"
            />
            {mode === "edit" && initialData?.proof_url && !form.proof && (
              <a
                href={initialData.proof_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                {t("View current photo")}
              </a>
            )}
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
              {saving ? (isEdit ? t("Saving...") : t("Transferring...")) : isEdit ? t("Save Changes") : t("Transfer Asset")}
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
  transfer,
}: {
  isOpen: boolean;
  onClose: () => void;
  transfer: AssetTransfer | null;
}) {
  const { t } = useLang();
  const [loaded, setLoaded] = useState<AssetTransfer | null>(transfer);

  useEffect(() => {
    if (isOpen && transfer) {
      setLoaded(transfer);
      fetchTransfer(transfer.id)
        .then((res) => setLoaded(res.data.transfer))
        .catch(() => undefined);
    }
  }, [isOpen, transfer]);

  if (!transfer || !loaded) return null;
  const asset = loaded.asset;

  const from = placementLabel(
    loaded.from_team?.name || "",
    loaded.from_room?.name || "",
    loaded.from_user?.name || "",
  );
  const to = placementLabel(
    loaded.to_team?.name || "",
    loaded.to_room?.name || "",
    loaded.to_user?.name || "",
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[560px] m-4">
      <div className="no-scrollbar max-h-[85vh] w-full max-w-[560px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {t("Transfer Details")}
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
            <Label>{t("Transfer Date")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.transfer_date || "-"}
            </p>
          </div>
          <div>
            <Label>{t("Done By")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.performed_by?.name || "-"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <Label>{t("From")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">{from}</p>
          </div>
          <div className="sm:col-span-2">
            <Label>{t("To")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">{to}</p>
          </div>
          <div className="sm:col-span-2">
            <Label>{t("Reason")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.reason || "-"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <Label>{t("Transfer Proof (Photo)")}</Label>
            {loaded.proof_url ? (
              <a href={loaded.proof_url} target="_blank" rel="noreferrer">
                <img
                  src={loaded.proof_url}
                  alt={t("Transfer Proof (Photo)")}
                  className="mt-1 max-h-64 rounded-xl border border-gray-200 object-contain dark:border-gray-800"
                />
              </a>
            ) : (
              <p className="text-sm text-gray-800 dark:text-white/90">-</p>
            )}
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

function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  busy,
  assetName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
  assetName?: string;
}) {
  const { t } = useLang();
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[400px] m-4">
      <div className="w-full max-w-[400px] rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("Delete Transfer")}
        </h4>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {assetName
            ? t('Are you sure you want to delete this transfer record for "{asset}"? This action cannot be undone.', {
                asset: assetName,
              })
            : t("Are you sure you want to delete this transfer record? This action cannot be undone.")}
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button size="sm" variant="outline" onClick={onClose} disabled={busy}>
            {t("Cancel")}
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={busy}>
            {busy ? t("Deleting...") : t("Delete")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
