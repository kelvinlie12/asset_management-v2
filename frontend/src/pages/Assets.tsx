import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../components/common/PageMeta";
import ExportButton from "../components/common/ExportButton";
import AssetWordExportModal from "../components/assets/AssetWordExportModal";
import Input from "../components/form/input/InputField";
import TextArea from "../components/form/input/TextArea";
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
import { PlusIcon, EyeIcon, PencilIcon, TrashBinIcon, DocsIcon } from "../icons";
import {
  fetchAssets,
  fetchAllAssets,
  fetchAssetCode,
  createAsset,
  updateAsset,
  deleteAsset,
  conditionLabel,
  CONDITION_OPTIONS,
  USAGE_STATUS_OPTIONS,
  type Asset,
  type AssetFilters,
  type Paginated,
} from "../services/assets";
import { fetchLookups, type Lookups } from "../services/lookups";
import { useToast } from "../hooks/useToast";
import { extractApiError as extractError } from "../utils/error";

const PER_PAGE = 10;

type FormState = {
  asset_code: string;
  name: string;
  category_id: string;
  team_id: string;
  room_id: string;
  assigned_user_id: string;
  condition: string;
  usage_status: string;
  quantity: string;
  placement_date: string;
  description: string;
  photo: File | null;
};

const EMPTY_FORM: FormState = {
  asset_code: "",
  name: "",
  category_id: "",
  team_id: "",
  room_id: "",
  assigned_user_id: "",
  condition: "USED",
  usage_status: "IN_STORAGE",
  quantity: "1",
  placement_date: "",
  description: "",
  photo: null,
};

function conditionColor(c: string): "success" | "info" | "error" | "warning" | "light" {
  switch (c) {
    case "NEW":
      return "success";
    case "USED":
      return "info";
    case "DAMAGED":
      return "error";
    case "REFURBISHED":
      return "warning";
    default:
      return "light";
  }
}

export default function Assets() {
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const canView = hasPermission(user, "assets.view");
  const canCreate = hasPermission(user, "assets.create");
  const canUpdate = hasPermission(user, "assets.update");
  const canDelete = hasPermission(user, "assets.delete");

  const [assets, setAssets] = useState<Asset[]>([]);
  const [meta, setMeta] = useState<Paginated<Asset>["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const { pushToast } = useToast();

  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [filters, setFilters] = useState<AssetFilters>({
    search: "",
    condition: "",
    usage_status: "",
    category_id: "",
    page: 1,
    per_page: PER_PAGE,
  });

  const [selected, setSelected] = useState<Asset | null>(null);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [saving, setSaving] = useState(false);

  const formModal = useModal();
  const detailModal = useModal();
  const deleteModal = useModal();
  const wordModal = useModal();

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAssets(filters);
      setAssets(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to load assets.")));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchLookups();
        if (!cancelled) setLookups(res.data);
      } catch {
        // dropdown options are non-critical
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateFilter(key: keyof AssetFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  async function handleSave(form: FormState) {
    const originalCondition = editing?.condition;

    // Rule 1: a NEW item is a purchase. The purchase form creates the asset
    // itself, so hand the details over instead of creating it here.
    if (!editing && form.condition === "NEW") {
      if (!hasPermission(user, "purchases.create")) {
        pushToast(
          "error",
          t("Aset baru dicatat lewat Pembayaran, tetapi Anda tidak punya izin mencatat pembayaran."),
        );
        return;
      }
      formModal.closeModal();
      navigate("/purchases", {
        state: {
          prefill: {
            name: form.name,
            category_id: form.category_id,
            room_id: form.room_id,
          },
        },
      });
      return;
    }

    // Rule 2: a DAMAGED item is a damage report. The damage form is what flips
    // the asset to DAMAGED, so the asset is saved with its previous condition
    // (USED for a brand new record) and the user continues in Damages.
    const goToDamages = form.condition === "DAMAGED" && originalCondition !== "DAMAGED";
    if (goToDamages && !hasPermission(user, "damages.create")) {
      pushToast(
        "error",
        t("Aset rusak dicatat lewat Barang Rusak, tetapi Anda tidak punya izin membuat laporan kerusakan."),
      );
      return;
    }
    const conditionToSave = goToDamages ? originalCondition ?? "USED" : form.condition;

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        category_id: form.category_id || null,
        team_id: form.team_id || null,
        room_id: form.room_id || null,
        assigned_user_id:
          form.usage_status === "IN_USE" ? form.assigned_user_id || null : null,
        condition: conditionToSave,
        usage_status: form.usage_status,
        quantity: form.quantity || "1",
        placement_date: form.placement_date || null,
        description: form.description || null,
        ...(form.photo ? { photo: form.photo } : {}),
      };

      let assetId: number;
      if (editing) {
        await updateAsset(editing.id, payload);
        assetId = editing.id;
        pushToast("success", t("Asset updated."));
      } else {
        const res = await createAsset({ ...payload, asset_code: form.asset_code });
        assetId = res.data.asset.id;
        pushToast("success", t("Asset created."));
      }
      formModal.closeModal();
      setEditing(null);

      if (goToDamages) {
        navigate("/damages", { state: { prefillAssetId: String(assetId) } });
        return;
      }
      await loadAssets();
    } catch (err) {
      pushToast(
        "error",
        extractError(err, editing ? t("Failed to update asset.") : t("Failed to save asset.")),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setSaving(true);
    try {
      await deleteAsset(selected.id);
      deleteModal.closeModal();
      setSelected(null);
      pushToast("success", t("Asset deleted."));
      await loadAssets();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to delete asset.")));
    } finally {
      setSaving(false);
    }
  }

  if (!canView) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-sm text-error-600 dark:text-error-400">
          {t("You do not have permission to view assets.")}
        </p>
      </div>
    );
  }

  const header = "px-5 py-3 text-sm text-gray-500 dark:text-gray-400";

  return (
    <>
      <PageMeta title={t("Asset Data")} description={t("Create a new asset.")} />

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("Asset Data")}
          </h3>
          <div className="flex items-center gap-2">
            <ExportButton
              fileStem={t("Asset Data")}
              headers={() => [
                t("Asset"),
                t("Code"),
                t("Category"),
                t("Condition"),
                t("Usage Status"),
                t("Location"),
                t("Team"),
              ]}
              rows={async () => {
                const all = await fetchAllAssets(filters);
                return all.map((a) => [
                  a.name,
                  a.asset_code,
                  a.category?.name ?? "",
                  conditionLabel(a.condition),
                  t(
                    USAGE_STATUS_OPTIONS.find((o) => o.value === a.usage_status)
                      ?.label ?? a.usage_status,
                  ),
                  a.room?.name ?? "",
                  a.team?.name ?? "",
                ]);
              }}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={wordModal.openModal}
              startIcon={<DocsIcon className="h-4 w-4" />}
            >
              {t("Export Word")}
            </Button>
            {canCreate && (
              <Button
                onClick={() => {
                  setEditing(null);
                  formModal.openModal();
                }}
                startIcon={<PlusIcon />}
              >
                {t("Add Asset")}
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 dark:border-gray-800 lg:flex-row lg:items-center">
            <Input
              type="text"
              value={filters.search || ""}
              onChange={(e) => updateFilter("search", e.target.value)}
              placeholder={t("Search by code, name, or description...")}
              className="lg:max-w-[300px]"
            />
            <div className="lg:w-52">
              <Select
                options={[
                  { value: "", label: t("All conditions") },
                  ...CONDITION_OPTIONS,
                ]}
                defaultValue={filters.condition || ""}
                onChange={(v) => updateFilter("condition", v)}
              />
            </div>
            <div className="lg:w-52">
              <Select
                options={[
                  { value: "", label: t("All usage") },
                  ...USAGE_STATUS_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) })),
                ]}
                defaultValue={filters.usage_status || ""}
                onChange={(v) => updateFilter("usage_status", v)}
              />
            </div>
            <div className="lg:w-52">
              <Select
                options={[
                  { value: "", label: t("All categories") },
                  ...(lookups?.categories ?? []).map((c) => ({
                    value: String(c.id),
                    label: c.name,
                  })),
                ]}
                defaultValue={filters.category_id || ""}
                onChange={(v) => updateFilter("category_id", v)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className={header}>{t("Asset")}</TableCell>
                  <TableCell isHeader className={header}>{t("Category")}</TableCell>
                  <TableCell isHeader className={header}>{t("Condition")}</TableCell>
                  <TableCell isHeader className={header}>{t("Usage Status")}</TableCell>
                  <TableCell isHeader className={header}>{t("Location")}</TableCell>
                  <TableCell isHeader className={`${header} text-right`}>{t("Actions")}</TableCell>
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
                {!loading && assets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("No assets found.")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  assets.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {a.photo_url ? (
                            <img
                              src={a.photo_url}
                              alt={a.name}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-xs font-semibold text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                              {a.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                              {a.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {a.asset_code}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {a.category?.name || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <Badge size="sm" color={conditionColor(a.condition)}>
                          {conditionLabel(a.condition)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {t(USAGE_STATUS_OPTIONS.find((o) => o.value === a.usage_status)?.label ?? a.usage_status)}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {a.room?.name || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
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
                          {canUpdate && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditing(a);
                                formModal.openModal();
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
                                setSelected(a);
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
            <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 text-sm text-gray-500 dark:border-gray-800">
              <span>
                {meta.current_page} / {meta.last_page} ({meta.total})
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={meta.current_page <= 1}
                  onClick={() => setFilters((p) => ({ ...p, page: meta.current_page - 1 }))}
                >
                  {t("Previous")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={meta.current_page >= meta.last_page}
                  onClick={() => setFilters((p) => ({ ...p, page: meta.current_page + 1 }))}
                >
                  {t("Next")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {(canCreate || canUpdate) && (
        <AssetFormModal
          isOpen={formModal.isOpen}
          onClose={() => {
            formModal.closeModal();
            setEditing(null);
          }}
          saving={saving}
          editing={editing}
          lookups={lookups}
          onSubmit={handleSave}
        />
      )}

      <Modal isOpen={detailModal.isOpen} onClose={detailModal.closeModal} className="max-w-[600px] m-4">
        {selected && (
          <div className="no-scrollbar relative w-full max-w-[600px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
            <h4 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
              {selected.name}
            </h4>
            {selected.photo_url && (
              <img src={selected.photo_url} alt={selected.name} className="mb-4 max-h-56 rounded-xl object-cover" />
            )}
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {[
                [t("Code"), selected.asset_code],
                [t("Category"), selected.category?.name || "-"],
                [t("Condition"), conditionLabel(selected.condition)],
                [t("Usage Status"), t(USAGE_STATUS_OPTIONS.find((o) => o.value === selected.usage_status)?.label ?? selected.usage_status)],
                [t("Quantity"), String(selected.quantity)],
                [t("Room / Location"), selected.room?.name || "-"],
                [t("Assigned User"), selected.assigned_user?.name || "-"],
                [t("Placement Date"), selected.placement_date || "-"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-gray-500 dark:text-gray-400">{k}</dt>
                  <dd className="font-medium text-gray-800 dark:text-white/90">{v}</dd>
                </div>
              ))}
              <div className="sm:col-span-2">
                <dt className="text-gray-500 dark:text-gray-400">{t("Description")}</dt>
                <dd className="text-gray-800 dark:text-white/90">{selected.description || "-"}</dd>
              </div>
            </dl>
            <div className="mt-6 flex justify-end">
              <Button size="sm" variant="outline" onClick={detailModal.closeModal}>
                {t("Close")}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {canDelete && selected && (
        <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.closeModal} className="max-w-[450px] m-4">
          <div className="no-scrollbar relative w-full max-w-[450px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
            <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              {t("Delete Asset")}
            </h4>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {selected.name} ({selected.asset_code})
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button size="sm" variant="outline" onClick={deleteModal.closeModal}>
                {t("Cancel")}
              </Button>
              <Button size="sm" disabled={saving} onClick={handleDelete}>
                {saving ? t("Deleting...") : t("Delete")}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <AssetWordExportModal
        isOpen={wordModal.isOpen}
        onClose={wordModal.closeModal}
        loadAssets={fetchAllAssets}
        filters={filters}
      />
    </>
  );
}

function AssetFormModal({
  isOpen,
  onClose,
  saving,
  editing,
  lookups,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  saving: boolean;
  editing: Asset | null;
  lookups: Lookups | null;
  onSubmit: (form: FormState) => void;
}) {
  const { t } = useLang();
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setForm({
        asset_code: editing.asset_code,
        name: editing.name,
        category_id: editing.category?.id ? String(editing.category.id) : "",
        team_id: editing.team?.id ? String(editing.team.id) : "",
        room_id: editing.room?.id ? String(editing.room.id) : "",
        assigned_user_id: editing.assigned_user?.id ? String(editing.assigned_user.id) : "",
        condition: editing.condition === "GOOD" ? "USED" : editing.condition,
        usage_status: editing.usage_status,
        quantity: String(editing.quantity ?? 1),
        placement_date: editing.placement_date?.slice(0, 10) || "",
        description: editing.description || "",
        photo: null,
      });
      return;
    }
    setForm({ ...EMPTY_FORM });
    fetchAssetCode()
      .then((res) => setForm((f) => ({ ...f, asset_code: res.data.asset_code })))
      .catch(() => {
        // the server assigns a code if none is sent
      });
  }, [isOpen, editing]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const teamId = user?.team_id ? String(user.team_id) : form.team_id;
  const categories = (lookups?.categories ?? []).filter(
    (c) => !teamId || !c.team_id || String(c.team_id) === teamId,
  );
  const rooms = (lookups?.rooms ?? []).filter(
    (r) => !teamId || !r.team_id || String(r.team_id) === teamId,
  );
  const users = (lookups?.users ?? []).filter(
    (u) => !teamId || !u.team_id || String(u.team_id) === teamId,
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit(form);
  }

  const creating = !editing;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[700px] m-4">
      <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8">
        <h4 className="mb-5 text-2xl font-semibold text-gray-800 dark:text-white/90">
          {editing ? t("Edit Asset") : t("Add Asset")}
        </h4>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>{t("Code")}</Label>
            <Input type="text" value={form.asset_code} disabled />
          </div>
          <div>
            <Label>{t("Name")}</Label>
            <Input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </div>
          <div>
            <Label>{t("Condition")}</Label>
            <Select
              options={CONDITION_OPTIONS}
              placeholder={t("Select condition")}
              defaultValue={form.condition}
              onChange={(v) => set("condition", v)}
            />
          </div>
          <div>
            <Label>{t("Usage Status")}</Label>
            <Select
              options={USAGE_STATUS_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))}
              placeholder={t("Select usage status")}
              defaultValue={form.usage_status}
              onChange={(v) => set("usage_status", v)}
            />
          </div>

          {creating && form.condition === "NEW" && (
            <p className="rounded-lg bg-success-50 p-3 text-xs text-success-700 dark:bg-success-500/15 dark:text-success-400 sm:col-span-2">
              Barang baru dicatat lewat Pembayaran. Setelah menekan Simpan, nama, kategori, dan
              ruangan dibawa ke form Pembayaran untuk melengkapi data pembelian.
            </p>
          )}
          {form.condition === "DAMAGED" && editing?.condition !== "DAMAGED" && (
            <p className="rounded-lg bg-error-50 p-3 text-xs text-error-700 dark:bg-error-500/15 dark:text-error-400 sm:col-span-2">
              Barang rusak dicatat lewat Barang Rusak. Setelah menekan Simpan, Anda diarahkan ke
              form laporan kerusakan untuk aset ini.
            </p>
          )}

          {!user?.team_id && (
            <div>
              <Label>{t("Team")}</Label>
              <Select
                options={[
                  { value: "", label: "-" },
                  ...(lookups?.teams ?? []).map((tm) => ({ value: String(tm.id), label: tm.name })),
                ]}
                defaultValue={form.team_id}
                onChange={(v) => set("team_id", v)}
              />
            </div>
          )}
          <div>
            <Label>{t("Category")}</Label>
            <Select
              options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
              placeholder={t("Select category")}
              defaultValue={form.category_id}
              onChange={(v) => set("category_id", v)}
            />
          </div>
          <div>
            <Label>{t("Room / Location")}</Label>
            <Select
              options={rooms.map((r) => ({ value: String(r.id), label: r.name }))}
              placeholder={t("Select room")}
              defaultValue={form.room_id}
              onChange={(v) => set("room_id", v)}
            />
          </div>
          {form.usage_status === "IN_USE" && (
            <div>
              <Label>{t("Assigned User")}</Label>
              <Select
                options={users.map((u) => ({ value: String(u.id), label: u.name }))}
                placeholder={t("Select user")}
                defaultValue={form.assigned_user_id}
                onChange={(v) => set("assigned_user_id", v)}
              />
            </div>
          )}
          <div>
            <Label>{t("Quantity")}</Label>
            <Input
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
            />
          </div>
          <div>
            <Label>{t("Placement Date")}</Label>
            <Input
              type="date"
              value={form.placement_date}
              onChange={(e) => set("placement_date", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>{t("Photo")}</Label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png"
              onChange={(e) => set("photo", e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-600 hover:file:bg-brand-100 dark:file:bg-brand-500/15 dark:file:text-brand-400"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>{t("Description")}</Label>
            <TextArea
              rows={3}
              value={form.description}
              onChange={(v) => set("description", v)}
            />
          </div>
          <div className="mt-2 flex items-center justify-end gap-3 sm:col-span-2">
            <Button size="sm" variant="outline" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button size="sm" disabled={saving}>
              {saving ? t("Saving...") : t("Save")}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
