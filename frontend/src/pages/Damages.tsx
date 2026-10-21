import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
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
import { PlusIcon, EyeIcon, AlertIcon, PencilIcon, TrashBinIcon } from "../icons";
import {
  fetchDamages,
  fetchAllDamages,
  fetchDamage,
  createDamage,
  updateDamage,
  deleteDamage,
  type AssetDamage,
  type Paginated,
  type DamageFilters,
} from "../services/damages";
import { fetchAsset, fetchAssets, type Asset } from "../services/assets";
import { fetchLookups } from "../services/lookups";
import { type User } from "../services/users";
import { useToast } from "../hooks/useToast";
import { extractApiError as extractError } from "../utils/error";

const PER_PAGE = 10;

type FormState = {
  asset_id: string;
  damage_date: string;
  user_id: string;
  responsible_id: string;
  description: string;
  notes: string;
  photo: File | null;
};

const EMPTY_FORM: FormState = {
  asset_id: "",
  damage_date: new Date().toISOString().slice(0, 10),
  user_id: "",
  responsible_id: "",
  description: "",
  notes: "",
  photo: null,
};

export default function Damages() {
  const { user } = useAuth();
  const { t } = useLang();
  const canView = hasPermission(user, "damages.view");
  const canCreate = hasPermission(user, "damages.create");
  const canUpdate = hasPermission(user, "damages.update");
  const canDelete = hasPermission(user, "damages.delete");

  const [damages, setDamages] = useState<AssetDamage[]>([]);
  const [meta, setMeta] = useState<Paginated<AssetDamage>["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const { pushToast } = useToast();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [filters, setFilters] = useState<DamageFilters>({
    search: "",
    date_from: "",
    date_to: "",
    page: 1,
    per_page: PER_PAGE,
  });

  const [selected, setSelected] = useState<AssetDamage | null>(null);

  const addModal = useModal();

  // Arriving from Asset Data with a DAMAGED item: open the report for it.
  const location = useLocation();
  const navigate = useNavigate();
  const [prefillAssetId, setPrefillAssetId] = useState("");
  useEffect(() => {
    const state = location.state as { prefillAssetId?: string } | null;
    if (state?.prefillAssetId && canCreate) {
      setPrefillAssetId(state.prefillAssetId);
      addModal.openModal();
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state]);
  const detailModal = useModal();
  const editModal = useModal();
  const deleteModal = useModal();

  const [editing, setEditing] = useState<AssetDamage | null>(null);
  const [deleting, setDeleting] = useState<AssetDamage | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const loadDamages = useCallback(async () => {
    setLoading(true);

    try {
      const res = await fetchDamages(filters);
      setDamages(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to load damage reports.")));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadDamages();
  }, [loadDamages]);

  const loadAssets = useCallback(async () => {
    try {
      const res = await fetchAssets({ per_page: 100 });
      setAssets(res.data.data);
    } catch {
      // options are non-critical
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Damages only needs damages.view, so the asset and reporter pickers
        // come from the shared lookup endpoint.
        const res = await fetchLookups();
        if (cancelled) return;
        setAssets(res.data.assets as Asset[]);
        setUsers(res.data.users as User[]);
      } catch {
        // options are non-critical
      }
    })();
    loadAssets();
    return () => {
      cancelled = true;
    };
  }, [loadAssets]);

  function updateFilter(key: keyof DamageFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  function goToPage(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  function showTempSuccess(msg: string) {
    pushToast("success", msg);
  }

  async function refresh() {
    await loadDamages();
  }

  async function handleSaveDamage(payload: FormState) {
    setSaving(true);

    try {
      const body: Record<string, unknown> = {
        damage_date: payload.damage_date,
        user_id: payload.user_id || null,
        responsible_id: payload.responsible_id || null,
        description: payload.description,
        notes: payload.notes || null,
      };
      if (payload.photo) {
        body.photo = payload.photo;
      }
      if (editing) {
        await updateDamage(
          editing.id,
          body as Record<string, unknown> & { photo?: File },
        );
        editModal.closeModal();
        setEditing(null);
        showTempSuccess(t("Damage report updated successfully."));
        await refresh();
      } else {
        body.asset_id = payload.asset_id;
        await createDamage(body as Record<string, unknown> & { photo?: File });
        await refresh();
        try {
          const resp = await fetchAsset(Number(payload.asset_id));
          const asset = resp.data.asset;
          showTempSuccess(
            t("Damage report recorded. Asset {code} now has status {status} ({usage}), moved to storage.", {
              code: asset?.asset_code || "",
              status: asset?.condition || "DAMAGED",
              usage: asset?.usage_status || "IN_STORAGE",
            }),
          );
        } catch {
          showTempSuccess(
            t("Damage report recorded. Asset marked as DAMAGED and moved to storage."),
          );
        }
        addModal.closeModal();
      }
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to save damage report.")));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setSubmitting("delete");

    try {
      await deleteDamage(deleting.id);
      deleteModal.closeModal();
      setDeleting(null);
      showTempSuccess(t("Damage report deleted."));
      await refresh();
      await loadAssets();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to delete damage report.")));
    } finally {
      setSubmitting(null);
    }
  }

  if (!canView) {
    return (
      <>
        <PageMeta
          title={t("Damages | Access Denied")}
          description={t("Asset damage report management")}
        />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-error-600 dark:text-error-400">
            {t("You do not have permission to view asset damage reports.")}
          </p>
        </div>
      </>
    );
  }

  const reportableAssets = assets.filter(
    (a) => (a.condition ?? "GOOD") !== "DAMAGED",
  );

  return (
    <>
      <PageMeta
        title={t("Asset Damages")}
        description={t("Track asset damage reports (barang rusak).")}
      />
      

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("Asset Damage Report")}
          </h3>
          <div className="flex items-center gap-2">
            <ExportButton
              fileStem={t("Asset Damage Report")}
              headers={() => [
                t("Asset"),
                t("Damage Date"),
                t("User / Responsible"),
                t("Description"),
                t("Done By"),
              ]}
              rows={async () => {
                const all = await fetchAllDamages(filters);
                return all.map((d) => [
                  d.asset?.name ?? "",
                  d.damage_date ?? "",
                  d.responsible?.name
                    ? `${d.user?.name ?? "-"} (${t("resp. {name}", {
                        name: d.responsible.name,
                      })})`
                    : (d.user?.name ?? ""),
                  d.description,
                  d.performed_by?.name ?? "",
                ]);
              }}
            />
            {canCreate && (
              <Button onClick={addModal.openModal} startIcon={<PlusIcon />}>
                {t("Report Damage")}
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
              placeholder={t("Search by asset, description, or date...")}
              className="lg:max-w-[300px]"
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500 dark:text-gray-400">
                  {t("From")}
                </label>
                <Input
                  type="date"
                  value={filters.date_from || ""}
                  onChange={(e) => updateFilter("date_from", e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500 dark:text-gray-400">
                  {t("To")}
                </label>
                <Input
                  type="date"
                  value={filters.date_to || ""}
                  onChange={(e) => updateFilter("date_to", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Asset")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Damage Date")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("User / Responsible")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Description")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Done By")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                    {t("Detail")}
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
                {!loading && damages.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("No damage reports found.")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  damages.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                            <AlertIcon />
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                              {d.asset?.name || "-"}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {d.asset?.asset_code || ""}
                              {d.asset
                                ? ` · ${d.asset.condition || ""}`
                                : ""}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {d.damage_date || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {d.user?.name || "-"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t("resp. {name}", { name: d.responsible?.name || "-" })}
                        </p>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <p className="max-w-[220px] truncate text-sm text-gray-600 dark:text-gray-400">
                          {d.description || "-"}
                        </p>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {d.performed_by?.name || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelected(d);
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
                                  setEditing(d);
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
                                  setDeleting(d);
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
        <DamageModal
          isOpen={addModal.isOpen}
          onClose={addModal.closeModal}
          saving={saving}
          assets={reportableAssets}
          users={users}
          editing={null}
          prefillAssetId={prefillAssetId}
          onSubmit={handleSaveDamage}
        />
      )}

      {canUpdate && (
        <DamageModal
          isOpen={editModal.isOpen}
          onClose={() => {
            editModal.closeModal();
            setEditing(null);
          }}
          saving={saving}
          assets={assets}
          users={users}
          editing={editing}
          onSubmit={handleSaveDamage}
        />
      )}

      {canDelete && deleting && (
        <Modal
          isOpen={deleteModal.isOpen}
          onClose={deleteModal.closeModal}
          className="max-w-[450px] m-4"
        >
          <div className="no-scrollbar relative w-full max-w-[450px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
            <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              {t("Delete Damage Report")}
            </h4>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('Are you sure you want to delete the damage report for "{asset}" ({date})? This action cannot be undone.', {
                asset: deleting.asset?.name || t("this asset"),
                date: deleting.damage_date || "-",
              })}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
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

      <DetailModal
        isOpen={detailModal.isOpen}
        onClose={detailModal.closeModal}
        damage={selected}
      />
    </>
  );
}

function DamageModal({
  isOpen,
  onClose,
  saving,
  assets,
  users,
  editing,
  prefillAssetId,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  saving: boolean;
  assets: Asset[];
  users: User[];
  editing: AssetDamage | null;
  prefillAssetId?: string;
  onSubmit: (payload: FormState) => void;
}) {
  const { t } = useLang();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(
        editing
          ? {
              asset_id: String(editing.asset_id),
              damage_date:
                editing.damage_date ||
                new Date().toISOString().slice(0, 10),
              user_id: editing.user_id ? String(editing.user_id) : "",
              responsible_id: editing.responsible_id
                ? String(editing.responsible_id)
                : "",
              description: editing.description || "",
              notes: editing.notes || "",
              photo: null,
            }
          : {
              ...EMPTY_FORM,
              asset_id: prefillAssetId || "",
              damage_date: new Date().toISOString().slice(0, 10),
            },
      );
      setFormError(null);
    }
  }, [isOpen, editing]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.asset_id) {
      setFormError(t("Please select an asset to report as damaged."));
      return;
    }
    if (!form.description.trim()) {
      setFormError(t("Please describe the damage."));
      return;
    }
    onSubmit({
      ...form,
      description: form.description.trim(),
      notes: form.notes.trim(),
    });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[560px] m-4">
      <div className="no-scrollbar max-h-[85vh] w-full max-w-[560px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {editing ? t("Edit Damage Report") : t("Report Damage")}
        </h4>
        <p className="mb-6 mt-1 text-sm text-gray-500 dark:text-gray-400">
          {editing
            ? t("Update the damage report details. The linked asset stays unchanged.")
            : t("Recording damage marks the asset as DAMAGED, sets it to IN_STORAGE and moves it to a warehouse (Gudang).")}
        </p>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>{t("Asset")}</Label>
            {editing ? (
              <Input
                type="text"
                value={
                  editing.asset
                    ? `${editing.asset.name} (${editing.asset.asset_code})`
                    : ""
                }
                disabled
              />
            ) : (
              <Select
                options={assets.map((a) => ({
                  value: String(a.id),
                  label: `${a.name} (${a.asset_code} — ${a.usage_status})`,
                }))}
                placeholder={t("Select asset to report")}
                defaultValue={form.asset_id}
                onChange={(v) => set("asset_id", v)}
              />
            )}
          </div>
          <div>
            <Label>{t("Damage Date")}</Label>
            <Input
              type="date"
              value={form.damage_date}
              onChange={(e) => set("damage_date", e.target.value)}
              required
            />
          </div>
          <div>
            <Label>{t("User")}</Label>
            <Select
              options={users.map((u) => ({ value: String(u.id), label: u.name }))}
              placeholder={t("Select user")}
              defaultValue={form.user_id}
              onChange={(v) => set("user_id", v)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>{t("Responsible Person")}</Label>
            <Select
              options={users.map((u) => ({ value: String(u.id), label: u.name }))}
              placeholder={t("Select responsible person")}
              defaultValue={form.responsible_id}
              onChange={(v) => set("responsible_id", v)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>{t("Damage Description")}</Label>
            <Input
              type="text"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder={t("Describe the damage")}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label>{t("Damage Photo")}</Label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png"
              onChange={(e) => set("photo", e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-500 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-600 hover:file:bg-brand-100 dark:file:bg-brand-500/15 dark:file:text-brand-400"
            />
            {form.photo && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("Selected: {name} ({size} KB)", {
                  name: form.photo.name,
                  size: (form.photo.size / 1024).toFixed(0),
                })}
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <Label>{t("Notes")}</Label>
            <Input
              type="text"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder={t("Optional notes")}
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
              {saving
                ? t("Saving...")
                : editing
                  ? t("Save Changes")
                  : t("Report Damage")}
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
  damage,
}: {
  isOpen: boolean;
  onClose: () => void;
  damage: AssetDamage | null;
}) {
  const { t } = useLang();
  const [loaded, setLoaded] = useState<AssetDamage | null>(damage);
  const [timeline, setTimeline] = useState<AssetDamage[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  useEffect(() => {
    if (isOpen && damage) {
      setLoaded(damage);
      fetchDamage(damage.id)
        .then((res) => setLoaded(res.data.damage))
        .catch(() => undefined);
      if (damage.asset_id) {
        setTimelineLoading(true);
        fetchDamages({ asset_id: String(damage.asset_id), per_page: 50 })
          .then((res) => {
            setTimeline(res.data.data);
          })
          .catch(() => undefined)
          .finally(() => setTimelineLoading(false));
      } else {
        setTimeline([]);
      }
    }
  }, [isOpen, damage]);

  if (!damage || !loaded) return null;
  const asset = loaded.asset;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[620px] m-4">
      <div className="no-scrollbar max-h-[85vh] w-full max-w-[620px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {t("Damage Report Details")}
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
              <Badge size="sm" variant="light" color="error">
                {asset.condition}
              </Badge>
            )}
            {asset && (
              <Badge size="sm" variant="light" color="warning">
                {asset.usage_status}
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>{t("Damage Date")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.damage_date || "-"}
            </p>
          </div>
          <div>
            <Label>{t("Done By")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.performed_by?.name || "-"}
            </p>
          </div>
          <div>
            <Label>{t("User")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.user?.name || "-"}
            </p>
          </div>
          <div>
            <Label>{t("Responsible")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.responsible?.name || "-"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <Label>{t("Description")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.description || "-"}
            </p>
          </div>
          {loaded.photo_url && (
            <div className="sm:col-span-2">
              <Label>{t("Damage Photo")}</Label>
              <img
                src={loaded.photo_url}
                alt={t("Damage")}
                className="mt-1 h-40 w-full rounded-lg border border-gray-200 object-cover dark:border-gray-700"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
          {loaded.notes && (
            <div className="sm:col-span-2">
              <Label>{t("Notes")}</Label>
              <p className="text-sm text-gray-800 dark:text-white/90">
                {loaded.notes}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6">
          <h5 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
            {t("Damage Timeline")}
          </h5>
          {timelineLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("Loading...")}</p>
          ) : timeline.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("No damage timeline available.")}
            </p>
          ) : (
            <ol className="relative ml-2 space-y-5 border-l border-gray-200 dark:border-gray-700">
              {timeline.map((entry) => (
                <li key={entry.id} className="ml-4">
                  <span
                    className={`absolute -left-[5.5px] mt-1 h-3 w-3 rounded-full ring-4 ring-white dark:ring-gray-900 ${
                      entry.id === loaded.id
                        ? "bg-error-500"
                        : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  ></span>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-white/[0.03]">
                    <p className="text-xs font-semibold text-gray-700 dark:text-white/90">
                      {entry.damage_date || "-"}
                      {entry.id === loaded.id && (
                        <span className="ml-2">
                          <Badge size="sm" variant="light" color="error">
                            {t("Current")}
                          </Badge>
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-gray-700 dark:text-white/90">
                      {entry.description || "-"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {t("resp. {responsible} · by {user}", {
                        responsible: entry.responsible?.name || "-",
                        user: entry.performed_by?.name || "-",
                      })}
                    </p>
                    {entry.photo_url && (
                      <img
                        src={entry.photo_url}
                        alt={t("Damage")}
                        className="mt-2 h-24 w-full rounded-lg border border-gray-200 object-cover dark:border-gray-700"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
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
