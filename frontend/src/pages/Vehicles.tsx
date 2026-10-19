import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import PageMeta from "../components/common/PageMeta";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import Select from "../components/form/Select";
import Button from "../components/ui/button/Button";
import Badge from "../components/ui/badge/Badge";
import { Modal } from "../components/ui/modal";
import { useModal } from "../hooks/useModal";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
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
  PencilIcon,
  TrashBinIcon,
  EyeIcon,
  BoxIconLine,
  CalenderIcon,
  AlertIcon,
  ArrowUpIcon,
} from "../icons";
import {
  fetchVehicles,
  fetchVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  VEHICLE_CONDITION_OPTIONS,
  VEHICLE_USAGE_OPTIONS,
  VEHICLE_TAX_OPTIONS,
  VEHICLE_TAX_HEALTH_META,
  formatRupiah,
  type Vehicle,
  type Paginated,
  type VehicleFilters,
} from "../services/vehicles";
import { fetchLookups, type Lookups } from "../services/lookups";
import { useToast } from "../hooks/useToast";
import { extractApiError as extractError } from "../utils/error";

const PER_PAGE = 10;

const EN_LABELS: Record<string, string> = {
  Lunas: "Sudah Bayar",
  "Belum Lunas": "Belum Bayar",
  Aman: "Safe",
  "Segera Jatuh Tempo": "Due Soon",
  "Akan Jatuh Tempo": "Due Within 7 Days",
  "Akan Jatuh Tempo (<=7 hari)": "Due Within 7 Days",
  Terlambat: "Overdue",
};

function translateLabel(t: (s: string) => string, label: string) {
  return t(EN_LABELS[label] ?? label);
}

function translateOptions(
  t: (s: string) => string,
  options: { value: string; label: string }[],
) {
  return options.map((o) => ({ ...o, label: translateLabel(t, o.label) }));
}

type FormState = {
  asset_code: string;
  photo: File | string;
  brand: string;
  model: string;
  year: string;
  plate_number: string;
  engine_number: string;
  chassis_number: string;
  condition: string;
  usage_status: string;
  placement_date: string;
  tax_due_date: string;
  description: string;
  team_id: string;
  room_id: string;
  assigned_user_id: string;
  purchase_price: string;
  purchase_date: string;
};

const EMPTY_FORM: FormState = {
  asset_code: "",
  photo: "",
  brand: "",
  model: "",
  year: "",
  plate_number: "",
  engine_number: "",
  chassis_number: "",
  condition: "GOOD",
  usage_status: "IN_STORAGE",
  placement_date: new Date().toISOString().slice(0, 10),
  tax_due_date: "",
  description: "",
  team_id: "",
  room_id: "",
  assigned_user_id: "",
  purchase_price: "",
  purchase_date: "",
};

function toForm(v: Vehicle): FormState {
  return {
    asset_code: v.asset_code,
    photo: v.photo || "",
    brand: v.brand,
    model: v.model,
    year: v.year || "",
    plate_number: v.plate_number || "",
    engine_number: v.engine_number || "",
    chassis_number: v.chassis_number || "",
    condition: v.condition,
    usage_status: v.usage_status,
    placement_date: v.placement_date || new Date().toISOString().slice(0, 10),
    tax_due_date: v.tax_due_date || "",
    description: v.description || "",
    team_id: v.team ? String(v.team.id) : "",
    room_id: v.room ? String(v.room.id) : "",
    assigned_user_id: v.assigned_user ? String(v.assigned_user.id) : "",
    purchase_price: v.purchase_price != null ? String(v.purchase_price) : "",
    purchase_date: v.purchase_date || "",
  };
}

export default function Vehicles() {
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSuperAdmin = user?.role === "super_admin";
  const canView = hasPermission(user, "vehicles.view");
  const canCreate = hasPermission(user, "vehicles.create");
  const canUpdate = hasPermission(user, "vehicles.update");
  const canDelete = hasPermission(user, "vehicles.delete");
  const canViewTaxes = hasPermission(user, "vehicle_taxes.view");

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [meta, setMeta] = useState<Paginated<Vehicle>["meta"] | null>(null);
  const [units, setUnits] = useState<Lookups["teams"]>([]);
  const [rooms, setRooms] = useState<Lookups["rooms"]>([]);
  const [people, setPeople] = useState<Lookups["users"]>([]);
  const [loading, setLoading] = useState(true);
  const { pushToast } = useToast();

  const [filters, setFilters] = useState<VehicleFilters>({
    search: "",
    condition: "",
    usage_status: "",
    tax_status: "",
    // Arriving from "Vehicles per Team" lands on one unit's fleet directly.
    // A scoped user is never filtered by unit; the API pins them anyway.
    team_id: isSuperAdmin ? searchParams.get("team_id") ?? "" : "",
    page: 1,
    per_page: PER_PAGE,
  });

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setFilters((prev) =>
      prev.search === debouncedSearch
        ? prev
        : { ...prev, search: debouncedSearch, page: 1 },
    );
  }, [debouncedSearch]);

  // Picking another unit from the per-unit overview changes the query string,
  // so keep the list in step with it.
  const teamParam = isSuperAdmin ? searchParams.get("team_id") ?? "" : "";
  useEffect(() => {
    setFilters((prev) =>
      prev.team_id === teamParam ? prev : { ...prev, team_id: teamParam, page: 1 },
    );
  }, [teamParam]);

   const [selected, setSelected] = useState<Vehicle | null>(null);

   const addModal = useModal();
  const detailModal = useModal();
  const editModal = useModal();
  const deleteModal = useModal();

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const loadVehicles = useCallback(async () => {
    setLoading(true);

    try {
      const res = await fetchVehicles(filters);
      setVehicles(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to load vehicles.")));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  // Unit list for the ownership picker. Gated on assets.view so an owner who
  // holds only the vehicles module can still load it.
  useEffect(() => {
    let cancelled = false;
    fetchLookups()
      .then((res) => {
        if (cancelled) return;
        setUnits(res.data.teams);
        setRooms(res.data.rooms);
        setPeople(res.data.users);
      })
      .catch(() => {
        if (cancelled) return;
        setUnits([]);
        setRooms([]);
        setPeople([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function updateFilter(key: keyof VehicleFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  function goToPage(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  function showTempSuccess(msg: string) {
    pushToast("success", msg);
  }

   const openAddModal = () => {
     addModal.openModal();
   };

  async function refresh() {
    await loadVehicles();
  }

  async function handleSave(
    payload: FormState & { editing: Vehicle | null; unitChanged: boolean },
  ) {
     setSaving(true);

     try {
       const damaged = payload.condition === "DAMAGED";
       const formData = new FormData();
       formData.append("asset_code", payload.asset_code);
       if (payload.photo instanceof File) {
         formData.append("photo", payload.photo);
       }
       formData.append("brand", payload.brand.trim());
       formData.append("model", payload.model.trim());
       if (payload.year) formData.append("year", payload.year);
       formData.append("plate_number", payload.plate_number.trim().toUpperCase());
       formData.append("engine_number", payload.engine_number.trim());
       formData.append("chassis_number", payload.chassis_number.trim());
       formData.append("placement_date", payload.placement_date);
       formData.append("tax_due_date", payload.tax_due_date);
       if (payload.description) formData.append("description", payload.description.trim());
formData.append("condition", payload.condition);
        formData.append("usage_status", damaged ? "IN_STORAGE" : payload.usage_status);
        if (payload.purchase_price) formData.append("purchase_price", payload.purchase_price);
        if (payload.purchase_date) formData.append("purchase_date", payload.purchase_date);
        // Every vehicle belongs to a company; unit-scoped users are pinned to
        // their own unit by the API regardless of what is sent here.
        if (payload.team_id) formData.append("team_id", payload.team_id);
        // A room or user from another unit would contradict the owning unit, so
        // a deliberate unit change drops the placement instead.
        if (payload.room_id && !payload.unitChanged)
          formData.append("room_id", payload.room_id);
        if (payload.assigned_user_id && !payload.unitChanged)
          formData.append("assigned_user_id", payload.assigned_user_id);
        if (payload.unitChanged) {
          formData.append("room_id", "");
          formData.append("assigned_user_id", "");
        }

if (payload.editing) {
          await updateVehicle(payload.editing.id, formData);
          if (payload.unitChanged) {
            showTempSuccess(
              t("Vehicle updated and moved to another team."),
            );
          } else {
            showTempSuccess(t("Vehicle updated."));
          }
          editModal.closeModal();
        } else {
         await createVehicle(formData);
         showTempSuccess(t("Vehicle created."));
         addModal.closeModal();
       }
       await refresh();
     } catch (err) {
       pushToast("error", extractError(err, t("Failed to save vehicle.")));
     } finally {
       setSaving(false);
     }
   }

  async function handleDelete() {
    if (!selected) return;
    setSubmitting("delete");

    try {
      await deleteVehicle(selected.id);
      deleteModal.closeModal();
      setSelected(null);
      showTempSuccess(t("Vehicle deleted."));
      await refresh();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to delete vehicle.")));
    } finally {
      setSubmitting(null);
    }
  }

  if (!canView) {
    return (
      <>
        <PageMeta
          title={t("Vehicles | Access Denied")}
          description={t("Vehicle asset management")}
        />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-error-600 dark:text-error-400">
            {t("You do not have permission to view vehicles.")}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title={t("Vehicle Assets")}
        description={t("Manage motorcycle vehicle assets.")}
      />
      

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("Vehicle Assets")}
          </h3>
          {canCreate && (
            <Button onClick={openAddModal} startIcon={<PlusIcon />}>
              {t("Add Vehicle")}
            </Button>
          )}
        </div>


        {(() => {
          const needAttention = vehicles.filter(
            (v) =>
              v.tax_health &&
              ["soon", "due_7", "overdue"].includes(v.tax_health.key),
          );
          if (needAttention.length === 0) return null;
          const overdueCount = needAttention.filter(
            (v) => v.tax_health?.key === "overdue",
          ).length;
          return (
            <div className="rounded-xl border border-warning-500 bg-warning-50 p-4 text-sm text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
              <div className="flex items-start gap-2">
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">
                    {t("{count} vehicles need tax attention", {
                      count: needAttention.length,
                    })}
                    {overdueCount > 0 && (
                      <>
                        {" "}
                        {t(" {count} of them are overdue", { count: overdueCount })}
                      </>
                    )}
                    .
                  </p>
                  <p className="mt-0.5 text-xs text-warning-700/80 dark:text-warning-400/80">
                    {t("Update the tax payment for these vehicles soon:")}{" "}
                    {needAttention
                      .slice(0, 4)
                      .map((v) => `${v.asset_code} (${v.plate_number || "-"})`)
                      .join(", ")}
                    {needAttention.length > 4 ? ", ..." : ""}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
            <Input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("Search by code, plate, brand, or model...")}
              className="lg:max-w-[300px]"
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              {isSuperAdmin && (
                <Select
                  options={units.map((unit) => ({
                    value: String(unit.id),
                    label: unit.name,
                  }))}
                  placeholder={t("All teams")}
                  defaultValue={filters.team_id || ""}
                  onChange={(v) => updateFilter("team_id", v)}
                />
              )}
              <Select
                options={translateOptions(t, VEHICLE_CONDITION_OPTIONS)}
                placeholder={t("All conditions")}
                defaultValue=""
                onChange={(v) => updateFilter("condition", v)}
              />
              <Select
                options={translateOptions(t, VEHICLE_USAGE_OPTIONS)}
                placeholder={t("All usage")}
                defaultValue=""
                onChange={(v) => updateFilter("usage_status", v)}
              />
              <Select
                options={translateOptions(t, VEHICLE_TAX_OPTIONS)}
                placeholder={t("All tax status")}
                defaultValue=""
                onChange={(v) => updateFilter("tax_status", v)}
              />
            </div>
          </div>

              <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Vehicle")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Plate Number")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Team")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Condition")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Date Entered")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Tax Due")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Tax Status")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                    {t("Actions")}
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("Loading...")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading && vehicles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("No vehicles found.")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  vehicles.map((v) => {
                    const taxMeta =
                      v.tax_health && v.tax_health.key in VEHICLE_TAX_HEALTH_META
                        ? VEHICLE_TAX_HEALTH_META[v.tax_health.key]
                        : null;
                    return (
                      <TableRow key={v.id}>
                        <TableCell className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {v.photo_url || v.photo ? (
                              <img
                                src={v.photo_url || v.photo || ""}
                                alt={`${v.brand} ${v.model}`}
                                className="h-10 w-10 rounded-full border border-gray-200 object-cover dark:border-gray-700"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                                <BoxIconLine />
                              </span>
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                {v.brand} {v.model}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {v.asset_code}
                                {v.year ? ` - ${v.year}` : ""}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          <Badge size="sm" variant="light" color="info">
                            {v.plate_number || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {v.team?.name || "-"}
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          <Badge
                            size="sm"
                            variant="light"
                            color={v.condition === "GOOD" ? "success" : "error"}
                          >
                            {v.condition}
                          </Badge>
                          <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                            {v.usage_status}
                          </p>
                        </TableCell>
                        <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {v.placement_date || "-"}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {v.tax_due_date || "-"}
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          {taxMeta ? (
                            <Badge
                              size="sm"
                              variant="light"
                              color={taxMeta.color}
                            >
                              {translateLabel(t, taxMeta.label)}
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-400 dark:text-gray-500">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            {canViewTaxes && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/vehicles/${v.id}/taxes`)}
                                startIcon={<CalenderIcon />}
                              >
                                {t("Tax")}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelected(v);
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
                                  setSelected(v);
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
                                  setSelected(v);
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
        <VehicleModal
          isOpen={addModal.isOpen}
          onClose={addModal.closeModal}
          editing={null}
          saving={saving}
          units={units}
          rooms={rooms}
          people={people}
          onSubmit={handleSave}
        />
      )}

      {canUpdate && selected && (
        <VehicleModal
          isOpen={editModal.isOpen}
          onClose={editModal.closeModal}
          key={selected.id}
          editing={selected}
          saving={saving}
          units={units}
          rooms={rooms}
          people={people}
          onSubmit={handleSave}
        />
      )}

      <DetailModal
        isOpen={detailModal.isOpen}
        onClose={detailModal.closeModal}
        vehicle={selected}
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
              {t("Delete Vehicle")}
            </h4>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t("Are you sure you want to delete {vehicle} ({code})? This action cannot be undone.", {
                vehicle: `${selected.brand} ${selected.model}`,
                code: selected.asset_code,
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

 function PhotoUploadDropzone({
  photo,
  onChange,
  onError,
}: {
  photo: File | string;
  onChange: (file: File | string | null) => void;
  onError: (err: string) => void;
}) {
  const { t } = useLang();
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_SIZE = 2 * 1024 * 1024;
  const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

  function validateFile(file: File): boolean {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      const err = t("Only PNG, JPG, JPEG, WEBP images are allowed");
      setError(err);
      onError(err);
      return false;
    }
    if (file.size > MAX_SIZE) {
      const err = t("File size must be less than 2 MB");
      setError(err);
      onError(err);
      return false;
    }
    setError(null);
    onError("");
    return true;
  }

  function handleFile(file: File | null) {
    if (!file) return;
    if (validateFile(file)) {
      onChange(file);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    handleFile(e.dataTransfer.files[0] ?? null);
  }

  function handleRemove() {
    onChange("");
    setError(null);
    onError("");
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (photo instanceof File) {
    return (
      <div className="relative rounded-lg border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900 p-2">
        <div className="flex items-center gap-3">
          <img
            src={URL.createObjectURL(photo)}
            alt={photo.name}
            className="h-16 w-16 rounded-lg object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">
              {photo.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatFileSize(photo.size)}
            </p>
            {error && (
              <p className="text-xs text-error-500 mt-1">{error}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="shrink-0 rounded-full p-1 text-gray-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 focus:outline-hidden focus:ring-2 focus:ring-error-300"
            aria-label={t("Remove photo")}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div
      className={`
        relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition-colors duration-200
        ${isDragOver
          ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
          : "border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900 hover:border-brand-400 hover:bg-gray-50 dark:hover:border-brand-500 dark:hover:bg-gray-800"
        }
        h-32
      `}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById("vehicle-photo-input")?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          document.getElementById("vehicle-photo-input")?.click();
        }
      }}
    >
      <input
        id="vehicle-photo-input"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        className="hidden"
      />
      <ArrowUpIcon className="h-8 w-8 text-gray-400" />
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t("Klik untuk unggah foto atau seret file ke sini")}
      </p>
      <p className="text-[11px] text-gray-400">
        PNG, JPG, JPEG, WEBP - maks. 2 MB
      </p>
      {error && (
        <p className="absolute bottom-2 text-xs text-error-500">{error}</p>
      )}
    </div>
  );
}

 function VehicleModal({
  isOpen,
  onClose,
  editing,
  saving,
  units,
  rooms,
  people,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  editing: Vehicle | null;
  saving: boolean;
  units: Lookups["teams"];
  rooms: Lookups["rooms"];
  people: Lookups["users"];
  onSubmit: (payload: FormState & { editing: Vehicle | null; unitChanged: boolean }) => void;
}) {
  const { t } = useLang();
  const { pushToast } = useToast();
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === "super_admin";
  const [form, setForm] = useState<FormState>(() =>
    editing ? toForm(editing) : { ...EMPTY_FORM }
  );
  // The unit the vehicle is registered to right now, so a deliberate change by
  // a super admin can be told apart from the value simply being loaded in.
  const originalTeamId = editing?.team ? String(editing.team.id) : "";

  useEffect(() => {
    if (isOpen) {
      setForm(
        editing
          ? toForm(editing)
          : {
              ...EMPTY_FORM,
              // Unit-scoped users always register a vehicle to their own unit.
              team_id: isSuperAdmin
                ? ""
                : currentUser?.team_id
                  ? String(currentUser.team_id)
                  : "",
            }
      );
    }
  }, [isOpen, editing, isSuperAdmin, currentUser?.team_id]);

  const unitChanged = isSuperAdmin && form.team_id !== originalTeamId;

  const damaged = form.condition === "DAMAGED";

  // A super admin sees every unit's rooms and people in the lookups, so the
  // placement pickers have to follow the unit chosen above; otherwise the form
  // would offer a room that the API then rejects as belonging to another unit.
  const selectedUnitId = form.team_id ? Number(form.team_id) : null;
  const roomOptions = (rooms ?? []).filter(
    (r) => selectedUnitId === null || r.team_id === selectedUnitId,
  );
  const peopleOptions = (people ?? []).filter(
    (p) => selectedUnitId === null || p.team_id === selectedUnitId,
  );

  function set<K extends keyof FormState>(key: K, value: string | File | null) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "condition" && value === "DAMAGED") {
        next.usage_status = "IN_STORAGE";
      }
      return next;
    });
  }

function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // A vehicle with no owning unit is invisible to every owner, so require it
    // here instead of letting the request come back as a bare 422.
    if (isSuperAdmin && !form.team_id) {
      pushToast("error", t("Please select the team that owns this vehicle."));
      return;
    }
    if (!form.model.trim()) {
       pushToast("error", t("Model is required."));
       return;
     }
     if (form.year.trim() && !/^\d{4}$/.test(form.year.trim())) {
       pushToast("error", t("Year must be a valid 4-digit year (e.g. 2023)."));
       return;
     }
     if (form.plate_number.trim() && !/^[A-Z]{1,2}[ ]?\d{1,4}[ ]?[A-Z]{1,3}$/.test(form.plate_number.trim().toUpperCase())) {
       pushToast("error", t("Plate number format is invalid (e.g. B 1234 ABC)."));
       return;
     }
     if (form.tax_due_date && form.placement_date && form.tax_due_date < form.placement_date) {
       pushToast("error", t("Tax due date cannot be before the date entered company."));
       return;
     }
onSubmit({
        ...form,
        brand: form.brand.trim(),
        model: form.model.trim(),
        plate_number: form.plate_number.trim().toUpperCase(),
        engine_number: form.engine_number.trim(),
        chassis_number: form.chassis_number.trim(),
        description: form.description.trim(),
        editing,
        unitChanged,
      });
   }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[640px] m-4">
      <div className="no-scrollbar max-h-[85vh] w-full max-w-[640px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {editing ? t("Edit Vehicle") : t("Add Vehicle")}
        </h4>
         <p className="mb-6 mt-1 text-sm text-gray-500 dark:text-gray-400">
           {editing
             ? t("Update details for {code}.", { code: editing.asset_code })
             : t("Register a new motorcycle asset.")}
         </p>

         {damaged && (
          <div className="mb-4 rounded-lg border border-warning-500 bg-warning-50 p-3 text-xs text-warning-600 dark:bg-warning-500/10 dark:text-warning-400">
            {t("Damaged vehicles are forced to {status} and must be placed in a storage room (warehouse).", {
              status: "IN_STORAGE",
            })}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>{t("Team")}</Label>
            {isSuperAdmin ? (
              <>
                <Select
                  options={units.map((u) => ({
                    value: String(u.id),
                    label: u.name,
                  }))}
                  placeholder={t("Select team")}
                  defaultValue={form.team_id}
                  onChange={(v) => set("team_id", v)}
                />
                {units.length === 0 && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t("Loading teams...")}
                  </p>
                )}
              </>
            ) : (
              <div className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-300">
                {currentUser?.team?.name ?? t("Your own team")}
              </div>
            )}
            {!isSuperAdmin && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("This vehicle is always registered to your own team.")}
              </p>
            )}
            {unitChanged && (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-warning-500 bg-warning-50 p-3 text-xs text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-400">
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {t(
                    "Moving this vehicle to another team also clears its current room and assigned user, because those belong to the previous team."
                  )}
                </span>
              </div>
            )}
          </div>
          <div className="sm:col-span-2">
            <Label>{t("Asset Code")}</Label>
            <Input
              type="text"
              value={form.asset_code}
              onChange={(e) => set("asset_code", e.target.value)}
              placeholder={t("e.g. VHC-001")}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label>{t("Photo")}</Label>
            <PhotoUploadDropzone
              photo={form.photo}
              onChange={(file) => set("photo", file)}
              onError={(err) => {
                if (err) pushToast("error", err);
              }}
            />
          </div>
          <div>
            <Label>{t("Room / Location")}</Label>
            <Select
              options={roomOptions.map((r) => ({
                value: String(r.id),
                label: r.is_storage ? t("{name} (storage)", { name: r.name }) : r.name,
              }))}
              placeholder={damaged ? t("Select storage room") : t("Select room")}
              defaultValue={form.room_id}
              onChange={(v) => set("room_id", v)}
            />
          </div>
          <div>
            <Label>{t("Assigned User")}</Label>
            <Select
              options={peopleOptions.map((p) => ({ value: String(p.id), label: p.name }))}
              placeholder={t("Select user")}
              defaultValue={form.assigned_user_id}
              onChange={(v) => set("assigned_user_id", v)}
            />
          </div>
          <div>
            <Label>{t("Purchase Price (Rp)")}</Label>
            <Input
              type="number"
              min="0"
              step={0.01}
              value={form.purchase_price}
              onChange={(e) => set("purchase_price", e.target.value)}
              placeholder={t("e.g. 1000000")}
            />
          </div>
          <div>
            <Label>{t("Purchase Date")}</Label>
            <Input
              type="date"
              value={form.purchase_date}
              onChange={(e) => set("purchase_date", e.target.value)}
            />
          </div>
          <div>
            <Label>{t("Brand")}</Label>
            <Input
              type="text"
              value={form.brand}
              onChange={(e) => set("brand", e.target.value)}
              placeholder={t("e.g. Honda")}
              required
            />
          </div>
          <div>
            <Label>{t("Model")}</Label>
            <Input
              type="text"
              value={form.model}
              onChange={(e) => set("model", e.target.value)}
              placeholder={t("e.g. Vario 160")}
              required
            />
          </div>
          <div>
            <Label>{t("Year")}</Label>
            <Input
              type="number"
              min="1900"
              max="2100"
              value={form.year}
              onChange={(e) => set("year", e.target.value)}
              placeholder={t("e.g. 2023")}
              required
            />
          </div>
          <div>
            <Label>{t("Plate Number")}</Label>
            <Input
              type="text"
              value={form.plate_number}
              onChange={(e) => set("plate_number", e.target.value.toUpperCase())}
              placeholder={t("e.g. B 1234 ABC")}
              required
            />
          </div>
          <div>
            <Label>{t("Engine Number")}</Label>
            <Input
              type="text"
              value={form.engine_number}
              onChange={(e) => set("engine_number", e.target.value)}
              placeholder={t("Engine number")}
              required
            />
          </div>
          <div>
            <Label>{t("Chassis Number")}</Label>
            <Input
              type="text"
              value={form.chassis_number}
              onChange={(e) => set("chassis_number", e.target.value)}
              placeholder={t("Chassis number")}
              required
            />
          </div>
          <div>
            <Label>{t("Condition")}</Label>
            <Select
              options={translateOptions(t, VEHICLE_CONDITION_OPTIONS)}
              placeholder={t("Select condition")}
              defaultValue={form.condition}
              onChange={(v) => set("condition", v)}
            />
          </div>
          <div>
            <Label>{t("Usage Status")}</Label>
            <Select
              options={translateOptions(t, VEHICLE_USAGE_OPTIONS)}
              placeholder={t("Select usage status")}
              defaultValue={form.usage_status}
              disabled={damaged}
              onChange={(v) => set("usage_status", v)}
            />
          </div>
          <div>
            <Label>{t("Date Entered")}</Label>
            <Input
              type="date"
              value={form.placement_date}
              onChange={(e) => set("placement_date", e.target.value)}
              required
            />
          </div>
          <div>
            <Label>{t("Tax Due Date")}</Label>
            <Input
              type="date"
              value={form.tax_due_date}
              onChange={(e) => set("tax_due_date", e.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label>{t("Description")}</Label>
            <Input
              type="text"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder={t("Optional description")}
            />
          </div>
          <div className="sm:col-span-2 mt-2 flex items-center gap-3 justify-end">
            <Button size="sm" variant="outline" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button size="sm" disabled={saving}>
              {saving ? (editing ? t("Saving...") : t("Saving...")) : editing ? t("Save Changes") : t("Create Vehicle")}
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
  vehicle,
  onEdit,
}: {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  onEdit?: () => void;
}) {
  const { t } = useLang();
  const [loaded, setLoaded] = useState<Vehicle | null>(vehicle);

  useEffect(() => {
    if (isOpen && vehicle) {
      setLoaded(vehicle);
      fetchVehicle(vehicle.id)
        .then((res) => setLoaded(res.data.vehicle))
        .catch(() => undefined);
    }
  }, [isOpen, vehicle]);

  if (!vehicle || !loaded) return null;

  const taxMeta =
    loaded.tax_health && loaded.tax_health.key in VEHICLE_TAX_HEALTH_META
      ? VEHICLE_TAX_HEALTH_META[loaded.tax_health.key]
      : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[560px] m-4">
      <div className="no-scrollbar max-h-[85vh] w-full max-w-[560px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {t("Vehicle Details")}
        </h4>
        <div className="mt-4">
          <p className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {loaded.brand} {loaded.model}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge size="sm" variant="light" color="info">
              {loaded.asset_code}
            </Badge>
            <Badge size="sm" variant="light" color="info">
              {loaded.plate_number || "-"}
            </Badge>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>{t("Condition")}</Label>
            <Badge
              size="sm"
              variant="light"
              color={loaded.condition === "GOOD" ? "success" : "error"}
            >
              {loaded.condition}
            </Badge>
          </div>
          <div>
            <Label>{t("Usage Status")}</Label>
            <Badge
              size="sm"
              variant="light"
              color={loaded.usage_status === "IN_USE" ? "info" : "warning"}
            >
              {loaded.usage_status}
            </Badge>
          </div>
          <div>
            <Label>{t("Year")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.year || "-"}
            </p>
          </div>
          <div>
            <Label>{t("Engine Number")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.engine_number || "-"}
            </p>
          </div>
          <div>
            <Label>{t("Chassis Number")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.chassis_number || "-"}
            </p>
          </div>
          <div>
            <Label>{t("Purchase Date")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.purchase_date || "-"}
            </p>
          </div>
          <div>
            <Label>{t("Tax Due Date")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.tax_due_date || "-"}
            </p>
          </div>
          <div>
            <Label>{t("Last Tax Amount")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {formatRupiah(loaded.last_tax_amount)}
            </p>
          </div>
          <div>
            <Label>{t("Tax Status")}</Label>
            {taxMeta ? (
              <Badge
                size="sm"
                variant="light"
                color={taxMeta.color}
              >
                {translateLabel(t, taxMeta.label)}
              </Badge>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">-</p>
            )}
            {loaded.tax_status && (
              <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                {loaded.tax_status === "PAID" ? t("Sudah Bayar") : t("Belum Bayar")}
              </p>
            )}
          </div>
          <div>
            <Label>{t("Purchase Price")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.purchase_price
                ? `Rp ${Number(loaded.purchase_price).toLocaleString("id-ID")}`
                : "-"}
            </p>
          </div>
          <div>
            <Label>{t("Team")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.team?.name || "-"}
            </p>
          </div>
          <div>
            <Label>{t("Room / Location")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.room ? loaded.room.name : "-"}
            </p>
          </div>
          <div>
            <Label>{t("Assigned User")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.assigned_user?.name || "-"}
            </p>
          </div>
          {loaded.photo_url && (
            <div className="sm:col-span-2">
              <Label>{t("Photo")}</Label>
              <img
                src={loaded.photo_url}
                alt={`${loaded.brand} ${loaded.model}`}
                className="mt-1 h-40 w-full rounded-lg border border-gray-200 object-cover dark:border-gray-700"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
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
