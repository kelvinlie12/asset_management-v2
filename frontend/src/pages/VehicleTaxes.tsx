import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
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
import { useAuth, hasPermission } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { useToast } from "../hooks/useToast";
import { extractApiError as extractError } from "../utils/error";
import { formatDate } from "../utils/format";
import {
  PlusIcon,
  PencilIcon,
  TrashBinIcon,
  ChevronLeftIcon,
  CalenderIcon,
} from "../icons";
import {
  fetchVehicle,
  fetchVehicleTaxes,
  createVehicleTax,
  updateVehicleTax,
  deleteVehicleTax,
  VEHICLE_TAX_PAYMENT_OPTIONS,
  VEHICLE_TAX_HEALTH_META,
  formatRupiah,
  type Vehicle,
  type VehicleTax,
  type Paginated,
} from "../services/vehicles";

const PER_PAGE = 10;

const EN_LABELS: Record<string, string> = {
  Lunas: "Paid",
  "Belum Lunas": "Unpaid",
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

const FEE_LABELS: { key: keyof TaxFormState; label: string }[] = [
  { key: "pkb", label: "PKB" },
  { key: "swdkllj", label: "SWDKLLJ" },
  { key: "opsen_pkb", label: "Opsen PKB" },
  { key: "administrative_fee", label: "Administrative Fee" },
  { key: "penalty", label: "Penalty" },
  { key: "other_fee", label: "Other Fee" },
];

type TaxFormState = {
  tax_due_date: string;
  pkb: string;
  swdkllj: string;
  opsen_pkb: string;
  administrative_fee: string;
  penalty: string;
  other_fee: string;
  payment_date: string;
  payment_status: string;
  payment_proof: string;
  notes: string;
};

function toNumber(s: string | null | undefined): number {
  const n = Number(s);
  return Number.isNaN(n) ? 0 : n;
}

function totalOf(form: TaxFormState): number {
  return FEE_LABELS.reduce((sum, f) => sum + toNumber(form[f.key]), 0);
}

function toForm(t: VehicleTax): TaxFormState {
  return {
    tax_due_date: t.tax_due_date || "",
    pkb: t.pkb || "",
    swdkllj: t.swdkllj || "",
    opsen_pkb: t.opsen_pkb || "",
    administrative_fee: t.administrative_fee || "",
    penalty: t.penalty || "",
    other_fee: t.other_fee || "",
    payment_date: t.payment_date || "",
    payment_status: t.payment_status || "UNPAID",
    payment_proof: t.payment_proof || "",
    notes: t.notes || "",
  };
}

const EMPTY_FORM: TaxFormState = {
  tax_due_date: "",
  pkb: "",
  swdkllj: "",
  opsen_pkb: "",
  administrative_fee: "",
  penalty: "",
  other_fee: "",
  payment_date: "",
  payment_status: "UNPAID",
  payment_proof: "",
  notes: "",
};

export default function VehicleTaxes() {
  const { id } = useParams<{ id: string }>();
  const vehicleId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLang();
  const canView = hasPermission(user, "vehicle_taxes.view");
  const canCreate = hasPermission(user, "vehicle_taxes.create");
  const canUpdate = hasPermission(user, "vehicle_taxes.update");
  const canDelete = hasPermission(user, "vehicle_taxes.delete");

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [taxes, setTaxes] = useState<VehicleTax[]>([]);
  const [meta, setMeta] = useState<Paginated<VehicleTax>["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const { pushToast } = useToast();
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<VehicleTax | null>(null);

  const addModal = useModal();
  const editModal = useModal();
  const deleteModal = useModal();

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const loadTaxes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchVehicleTaxes(vehicleId, { page, per_page: PER_PAGE });
      setTaxes(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      pushToast(
        "error",
        extractError(err, t("Failed to load vehicle tax records.")),
      );
    } finally {
      setLoading(false);
    }
  }, [vehicleId, page]);

  useEffect(() => {
    loadTaxes();
  }, [loadTaxes]);

  useEffect(() => {
    if (!Number.isFinite(vehicleId) || vehicleId <= 0) return;
    let cancelled = false;
    fetchVehicle(vehicleId)
      .then((res) => {
        if (!cancelled) setVehicle(res.data.vehicle);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  async function handleSave(payload: TaxFormState & { editing: VehicleTax | null }) {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        tax_due_date: payload.tax_due_date || null,
        pkb: payload.pkb || 0,
        swdkllj: payload.swdkllj || 0,
        opsen_pkb: payload.opsen_pkb || 0,
        administrative_fee: payload.administrative_fee || 0,
        penalty: payload.penalty || 0,
        other_fee: payload.other_fee || 0,
        payment_date: payload.payment_date || null,
        payment_status: payload.payment_status,
        payment_proof: payload.payment_proof || null,
        notes: payload.notes || null,
      };
      if (payload.editing) {
        await updateVehicleTax(vehicleId, payload.editing.id, body);
        pushToast("success", t("Tax record updated."));
        editModal.closeModal();
      } else {
        await createVehicleTax(vehicleId, body);
        pushToast("success", t("Tax record created."));
        addModal.closeModal();
      }
      await loadTaxes();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to save tax record.")));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setSubmitting("delete");
    try {
      await deleteVehicleTax(vehicleId, selected.id);
      deleteModal.closeModal();
      setSelected(null);
      pushToast("success", t("Tax record deleted."));
      await loadTaxes();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to delete tax record.")));
    } finally {
      setSubmitting(null);
    }
  }

  const taxMeta =
    vehicle && vehicle.tax_health && vehicle.tax_health.key in VEHICLE_TAX_HEALTH_META
      ? VEHICLE_TAX_HEALTH_META[vehicle.tax_health.key]
      : null;

  if (!canView) {
    return (
      <>
        <PageMeta
          title={t("Vehicle Taxes | Access Denied")}
          description={t("Vehicle tax management")}
        />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-error-600 dark:text-error-400">
            {t("You do not have permission to view vehicle taxes.")}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title={t("Vehicle Tax")}
        description={t("Manage vehicle tax records.")}
      />

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/vehicles")}
              startIcon={<ChevronLeftIcon />}
            >
              {t("Back")}
            </Button>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {vehicle ? `${vehicle.brand} ${vehicle.model}` : t("Vehicle Tax")}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {vehicle
                  ? `${vehicle.asset_code}${vehicle.plate_number ? ` • ${vehicle.plate_number}` : ""}`
                  : t("Loading vehicle...")}
              </p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={addModal.openModal} startIcon={<PlusIcon />}>
              {t("Add Tax Record")}
            </Button>
          )}
        </div>

        {vehicle && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <div>
              <Label>{t("Tax Due Date")}</Label>
              <div className="flex items-center gap-1">
                <CalenderIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {vehicle.tax_due_date || "-"}
                </span>
              </div>
            </div>
            <div>
              <Label>{t("Last Tax Amount")}</Label>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {formatRupiah(vehicle.last_tax_amount)}
              </p>
            </div>
            <div>
              <Label>{t("Tax Status")}</Label>
              <p>
                {taxMeta ? (
                  <Badge size="sm" variant="light" color={taxMeta.color}>
                    {translateLabel(t, taxMeta.label)}
                  </Badge>
                ) : (
                  <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                )}
              </p>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Tax Due Date")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Components")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Total Tax")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Payment")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Notes")}
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
                {!loading && taxes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("No tax records found.")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  taxes.map((tax) => (
                    <TableRow key={tax.id}>
                      <TableCell className="px-5 py-4">
                        <p className="text-sm text-gray-800 dark:text-white/90">
                          {tax.tax_due_date || "-"}
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                          {tax.created_at ? formatDate(tax.created_at) : "-"}
                        </p>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="space-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                          <p>{t("PKB")}: {formatRupiah(tax.pkb)}</p>
                          <p>{t("SWDKLLJ")}: {formatRupiah(tax.swdkllj)}</p>
                          <p>{t("Opsen PKB")}: {formatRupiah(tax.opsen_pkb)}</p>
                          <p>
                            {t("Admin/Penalty/Other")}:{" "}
                            {formatRupiah(
                              toNumber(tax.administrative_fee) +
                                toNumber(tax.penalty) +
                                toNumber(tax.other_fee),
                            )}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                          {formatRupiah(tax.total_tax)}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <Badge
                          size="sm"
                          variant="light"
                          color={tax.payment_status === "PAID" ? "success" : "warning"}
                        >
                          {tax.payment_status === "PAID" ? t("Paid") : t("Unpaid")}
                        </Badge>
                        {tax.payment_date && (
                          <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                            {tax.payment_date}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {tax.notes || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          {canUpdate && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelected(tax);
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
                                  setSelected(tax);
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
                  onClick={() => setPage((p) => p - 1)}
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
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t("Next")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {canCreate && (
        <TaxModal
          isOpen={addModal.isOpen}
          onClose={addModal.closeModal}
          editing={null}
          saving={saving}
          onSubmit={handleSave}
        />
      )}

      {canUpdate && selected && (
        <TaxModal
          isOpen={editModal.isOpen}
          onClose={editModal.closeModal}
          key={selected.id}
          editing={selected}
          saving={saving}
          onSubmit={handleSave}
        />
      )}

      {canDelete && selected && (
        <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.closeModal} className="max-w-[450px] m-4">
          <div className="no-scrollbar relative w-full max-w-[450px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
            <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              {t("Delete Tax Record")}
            </h4>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t("Are you sure you want to delete the tax record due {date} (total {total})? This action cannot be undone.", {
                date: selected.tax_due_date || "-",
                total: formatRupiah(selected.total_tax),
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

function TaxModal({
  isOpen,
  onClose,
  editing,
  saving,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  editing: VehicleTax | null;
  saving: boolean;
  onSubmit: (payload: TaxFormState & { editing: VehicleTax | null }) => void;
}) {
  const { t } = useLang();
  const [form, setForm] = useState<TaxFormState>(() =>
    editing ? toForm(editing) : EMPTY_FORM,
  );
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(editing ? toForm(editing) : EMPTY_FORM);
      setFormError(null);
    }
  }, [isOpen, editing]);

  function set<K extends keyof TaxFormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.tax_due_date) {
      setFormError(t("Tax due date is required."));
      return;
    }
    if (form.payment_status === "PAID" && !form.payment_date) {
      setFormError(t("Payment date is required when the tax is paid."));
      return;
    }
    onSubmit({
      ...form,
      pkb: form.pkb.trim(),
      swdkllj: form.swdkllj.trim(),
      opsen_pkb: form.opsen_pkb.trim(),
      administrative_fee: form.administrative_fee.trim(),
      penalty: form.penalty.trim(),
      other_fee: form.other_fee.trim(),
      notes: form.notes.trim(),
      editing,
    });
  }

  const total = totalOf(form);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[640px] m-4">
      <div className="no-scrollbar max-h-[85vh] w-full max-w-[640px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {editing ? t("Edit Tax Record") : t("Add Tax Record")}
        </h4>
        <p className="mb-6 mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("Total Tax = PKB + SWDKLLJ + Opsen PKB + Admin Fee + Penalty + Other Fee.")}
        </p>

        {formError && (
          <div className="mb-4 rounded-lg border border-error-500 bg-error-50 p-3 text-xs text-error-600 dark:bg-error-500/10 dark:text-error-400">
            {formError}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <div>
            <Label>{t("Tax Due Date")}</Label>
            <Input
              type="date"
              value={form.tax_due_date}
              onChange={(e) => set("tax_due_date", e.target.value)}
              required
            />
          </div>
          <div>
            <Label>{t("Payment Date")}</Label>
            <Input
              type="date"
              value={form.payment_date}
              onChange={(e) => set("payment_date", e.target.value)}
            />
          </div>

          {FEE_LABELS.map((f) => (
            <div key={f.key}>
              <Label>{t(f.label)} (Rp)</Label>
              <Input
                type="number"
                min="0"
                step={0.01}
                value={form[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder="0"
              />
            </div>
          ))}

          <div>
            <Label>{t("Payment Status")}</Label>
            <Select
              options={translateOptions(t, VEHICLE_TAX_PAYMENT_OPTIONS)}
              placeholder={t("Select payment status")}
              defaultValue={form.payment_status}
              onChange={(v) => set("payment_status", v)}
            />
          </div>
          <div>
            <Label>{t("Payment Proof (URL)")}</Label>
            <Input
              type="text"
              value={form.payment_proof}
              onChange={(e) => set("payment_proof", e.target.value)}
              placeholder={t("Optional proof URL")}
            />
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

          <div className="sm:col-span-2 rounded-lg border border-brand-200 bg-brand-50 p-3 dark:border-brand-500/20 dark:bg-brand-500/10">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("Total Tax")}
            </p>
            <p className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {formatRupiah(total)}
            </p>
          </div>

          <div className="sm:col-span-2 mt-2 flex items-center gap-3 justify-end">
            <Button size="sm" variant="outline" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button size="sm" disabled={saving}>
              {saving ? t("Saving...") : editing ? t("Save Changes") : t("Create Record")}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}