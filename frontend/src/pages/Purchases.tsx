import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
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
import { PlusIcon, TrashBinIcon, EyeIcon, DollarLineIcon } from "../icons";
import {
  fetchPurchases,
  fetchPurchase,
  createPurchase,
  deletePurchase,
  type Purchase,
  type Paginated,
  type PurchaseFilters,
} from "../services/purchases";
import { fetchCategories, type Category } from "../services/categories";
import { fetchRooms, type Room } from "../services/rooms";
import { useToast } from "../hooks/useToast";
import { extractApiError as extractError } from "../utils/error";

const PER_PAGE = 10;

type FormState = {
  name: string;
  category_id: string;
  room_id: string;
  amount: string;
  purchase_date: string;
  supplier: string;
  invoice_number: string;
  notes: string;
  proof: File | null;
};

const EMPTY_FORM: FormState = {
  name: "",
  category_id: "",
  room_id: "",
  amount: "",
  purchase_date: "",
  supplier: "",
  invoice_number: "",
  notes: "",
  proof: null,
};

export default function Purchases() {
  const { user } = useAuth();
  const { t } = useLang();
  const canView = hasPermission(user, "purchases.view");
  const canCreate = hasPermission(user, "purchases.create");
  const canDelete = hasPermission(user, "purchases.delete");

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [meta, setMeta] = useState<Paginated<Purchase>["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const { pushToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const [filters, setFilters] = useState<PurchaseFilters>({
    search: "",
    page: 1,
    per_page: PER_PAGE,
  });

  const [selected, setSelected] = useState<Purchase | null>(null);

  const addModal = useModal();
  const detailModal = useModal();
  const deleteModal = useModal();

  // Arriving from Asset Data with a NEW item: open the form with its details.
  const location = useLocation();
  const navigate = useNavigate();
  const [prefill, setPrefill] = useState<Partial<FormState> | null>(null);
  useEffect(() => {
    const state = location.state as { prefill?: Partial<FormState> } | null;
    if (state?.prefill && canCreate) {
      setPrefill(state.prefill);
      addModal.openModal();
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state]);

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const loadPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPurchases(filters);
      setPurchases(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to load purchases.")));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cats, roomsRes] = await Promise.all([
          fetchCategories({ per_page: 100 }),
          fetchRooms({ per_page: 100 }),
        ]);
        if (cancelled) return;
        setCategories(cats.data.data);
        setRooms(roomsRes.data.data);
      } catch {
        // options are non-critical
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateFilter(key: keyof PurchaseFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  function goToPage(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  function showTempSuccess(msg: string) {
    pushToast("success", msg);
  }

  async function refresh() {
    await loadPurchases();
  }

  async function handleSavePurchase(payload: FormState) {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: payload.name,
        category_id: payload.category_id || null,
        room_id: payload.room_id || null,
        amount: payload.amount,
        purchase_date: payload.purchase_date,
        supplier: payload.supplier,
        invoice_number: payload.invoice_number,
        notes: payload.notes || null,
      };
      if (payload.proof) {
        body.proof = payload.proof;
      }
      await createPurchase(body as Record<string, unknown> & { proof: File });
      showTempSuccess(t("Purchase recorded and asset created."));
      addModal.closeModal();
      await refresh();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to save purchase.")));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setSubmitting("delete");
    try {
      await deletePurchase(selected.id);
      deleteModal.closeModal();
      setSelected(null);
      showTempSuccess(t("Purchase record deleted."));
      await refresh();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to delete purchase record.")));
    } finally {
      setSubmitting(null);
    }
  }

  if (!canView) {
    return (
      <>
        <PageMeta title={t("Purchases | Access Denied")} description={t("Purchase management")} />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-error-600 dark:text-error-400">
            {t("You do not have permission to view purchases.")}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title={t("Purchase Management")}
        description={t("Record asset purchases and proof of transactions.")}
      />
      

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("Purchase Management")}
          </h3>
          {canCreate && (
            <Button onClick={addModal.openModal} startIcon={<PlusIcon />}>
              {t("Record Purchase")}
            </Button>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
            <Input
              type="text"
              value={filters.search || ""}
              onChange={(e) => updateFilter("search", e.target.value)}
              placeholder={t("Search by number, supplier, invoice, or asset...")}
              className="lg:max-w-[300px]"
            />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Purchase")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Supplier")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Asset")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Date")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                    {t("Amount")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Proof")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                    {t("Actions")}
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
                {!loading && purchases.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("No purchases found.")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  purchases.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                            <DollarLineIcon />
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                              {p.purchase_number}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {p.invoice_number}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {p.supplier}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                            {p.asset?.name || "-"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {p.asset?.asset_code || ""}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {p.purchase_date || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                        Rp {Number(p.amount).toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        {p.proof_url ? (
                          <a
                            href={p.proof_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
                          >
                            {t("View file")}
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelected(p);
                              detailModal.openModal();
                            }}
                            startIcon={<EyeIcon />}
                          >
                            {t("View")}
                          </Button>
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelected(p);
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
        <PurchaseModal
          isOpen={addModal.isOpen}
          onClose={addModal.closeModal}
          saving={saving}
          categories={categories}
          rooms={rooms}
          prefill={prefill}
          onSubmit={handleSavePurchase}
        />
      )}

      <DetailModal
        isOpen={detailModal.isOpen}
        onClose={detailModal.closeModal}
        purchase={selected}
      />

      {canDelete && selected && (
        <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.closeModal} className="max-w-[450px] m-4">
          <div className="no-scrollbar relative w-full max-w-[450px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
            <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              {t("Delete Purchase Record")}
            </h4>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t("Are you sure you want to delete the purchase record {number}? The associated asset and its proof file will be kept (only the history record is removed).", {
                number: selected.purchase_number,
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

function PurchaseModal({
  isOpen,
  onClose,
  saving,
  categories,
  rooms,
  prefill,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  saving: boolean;
  categories: Category[];
  rooms: Room[];
  prefill?: Partial<FormState> | null;
  onSubmit: (payload: FormState) => void;
}) {
  const { t } = useLang();
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fileError, setFileError] = useState<string | null>(null);

  // A purchase creates the asset under the buyer's unit (none at all for a
  // super admin), so the category has to belong to that same unit: the shared
  // globals are the only ones a unit-less asset may use.
  const unitCategories = user?.team_id
    ? categories.filter((c) => c.team_id && String(c.team_id) === String(user.team_id))
    : categories.filter((c) => !c.team_id);

  useEffect(() => {
    if (isOpen) {
      setForm({ ...EMPTY_FORM, ...(prefill ?? {}) });
      setFileError(null);
    }
  }, [isOpen]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setFileError(null);
    if (file) {
      const okType = /\.(jpg|jpeg|png|pdf)$/i.test(file.name);
      const okSize = file.size <= 5 * 1024 * 1024;
      if (!okType) {
        setFileError(t("Only JPG, PNG, or PDF files are allowed."));
        set("proof", null);
        return;
      }
      if (!okSize) {
        setFileError(t("Proof file must be 5MB or smaller."));
        set("proof", null);
        return;
      }
    }
    set("proof", file);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.supplier.trim() || !form.invoice_number.trim()) return;
    if (!form.amount || !form.purchase_date) return;
    if (!form.proof) {
      setFileError(t("Proof file (JPG/PNG/PDF) is required."));
      return;
    }
    onSubmit({
      ...form,
      name: form.name.trim(),
      supplier: form.supplier.trim(),
      invoice_number: form.invoice_number.trim(),
    });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[560px] m-4">
      <div className="no-scrollbar max-h-[85vh] w-full max-w-[560px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {t("Record Purchase")}
        </h4>
        <p className="mb-6 mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("Record a new asset purchase. A new asset entry with a generated code and IN_STORAGE status will be created automatically.")}
        </p>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>{t("Asset Name")}</Label>
            <Input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={t("e.g. Monitor Samsung 24inch")}
              required
            />
          </div>
          <div>
            <Label>{t("Category")}</Label>
            <Select
              options={unitCategories.map((c) => ({
                value: String(c.id),
                label: c.name,
              }))}
              placeholder={t("Select category")}
              defaultValue={form.category_id}
              onChange={(v) => set("category_id", v)}
            />
          </div>
          <div>
            <Label>{t("Room / Location")}</Label>
            <Select
              options={rooms.map((r) => ({
                value: String(r.id),
                label: r.is_storage ? t("{name} (storage)", { name: r.name }) : r.name,
              }))}
              placeholder={t("Select room")}
              defaultValue={form.room_id}
              onChange={(v) => set("room_id", v)}
            />
          </div>
          <div>
            <Label>{t("Amount (Rp)")}</Label>
            <Input
              type="number"
              min="0"
              step={0.01}
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              placeholder={t("e.g. 2450000")}
              required
            />
          </div>
          <div>
            <Label>{t("Purchase Date")}</Label>
            <Input
              type="date"
              value={form.purchase_date}
              onChange={(e) => set("purchase_date", e.target.value)}
              required
            />
          </div>
          <div>
            <Label>{t("Supplier")}</Label>
            <Input
              type="text"
              value={form.supplier}
              onChange={(e) => set("supplier", e.target.value)}
              placeholder={t("e.g. PT Monitor Indo")}
              required
            />
          </div>
          <div>
            <Label>{t("Invoice Number")}</Label>
            <Input
              type="text"
              value={form.invoice_number}
              onChange={(e) => set("invoice_number", e.target.value)}
              placeholder={t("e.g. INV-2026/077")}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label>{t("Proof of Transaction")}</Label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFile}
              className="block w-full text-sm text-gray-500 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-600 hover:file:bg-brand-100 dark:file:bg-brand-500/15 dark:file:text-brand-400"
            />
            {fileError && (
              <p className="mt-1 text-xs text-error-600 dark:text-error-400">
                {fileError}
              </p>
            )}
            {form.proof && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("Selected: {name} ({size} KB)", {
                  name: form.proof.name,
                  size: (form.proof.size / 1024).toFixed(0),
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
          <div className="sm:col-span-2 mt-2 flex items-center gap-3 justify-end">
            <Button size="sm" variant="outline" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button size="sm" disabled={saving}>
              {saving ? t("Saving...") : t("Record Purchase")}
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
  purchase,
}: {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase | null;
}) {
  const { t } = useLang();
  const [loaded, setLoaded] = useState<Purchase | null>(purchase);

  useEffect(() => {
    if (isOpen && purchase) {
      setLoaded(purchase);
      fetchPurchase(purchase.id)
        .then((res) => setLoaded(res.data.purchase))
        .catch(() => undefined);
    }
  }, [isOpen, purchase]);

  if (!purchase || !loaded) return null;
  const asset = loaded.asset;
  const isPdf =
    (loaded.proof_url || "").toLowerCase().endsWith(".pdf") ||
    (loaded.proof_path || "").toLowerCase().endsWith(".pdf");

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[560px] m-4">
      <div className="no-scrollbar max-h-[85vh] w-full max-w-[560px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {t("Purchase Details")}
        </h4>
        <div className="mt-4">
          <p className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {loaded.purchase_number}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge size="sm" variant="light" color="info">
              {loaded.invoice_number}
            </Badge>
            {asset && (
              <Badge size="sm" variant="light" color="dark">
                {asset.asset_code}
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>{t("Supplier")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.supplier}
            </p>
          </div>
          <div>
            <Label>{t("Purchase Date")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {loaded.purchase_date || "-"}
            </p>
          </div>
          <div>
            <Label>{t("Amount")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              Rp {Number(loaded.amount).toLocaleString("id-ID")}
            </p>
          </div>
          <div>
            <Label>{t("Asset Created")}</Label>
            <p className="text-sm text-gray-800 dark:text-white/90">
              {asset ? `${asset.name} (${asset.asset_code})` : "-"}
            </p>
          </div>
          <div>
            <Label>{t("Asset Condition")}</Label>
            <Badge
              size="sm"
              variant="light"
              color={asset?.condition === "GOOD" ? "success" : "error"}
            >
              {asset?.condition || "-"}
            </Badge>
          </div>
          <div>
            <Label>{t("Asset Usage Status")}</Label>
            <Badge
              size="sm"
              variant="light"
              color={asset?.usage_status === "IN_USE" ? "info" : "warning"}
            >
              {asset?.usage_status || "-"}
            </Badge>
          </div>
          {loaded.proof_url && (
            <div className="sm:col-span-2">
              <Label>{t("Proof of Transaction")}</Label>
              {isPdf ? (
                <iframe
                  src={loaded.proof_url}
                  title={t("Proof")}
                  className="mt-1 h-48 w-full rounded-lg border border-gray-200 dark:border-gray-700"
                />
              ) : (
                <img
                  src={loaded.proof_url}
                  alt={t("Proof")}
                  className="mt-1 h-40 w-full rounded-lg border border-gray-200 object-contain dark:border-gray-700"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <a
                href={loaded.proof_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                {t("Open proof file")}
              </a>
            </div>
          )}
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