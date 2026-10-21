import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import PageMeta from "../components/common/PageMeta";
import ExportButton from "../components/common/ExportButton";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import Select from "../components/form/Select";
import Badge from "../components/ui/badge/Badge";
import Button from "../components/ui/button/Button";
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
  PlugInIcon,
} from "../icons";
import {
  fetchNetworkNodes,
  fetchAllNetworkNodes,
  fetchNetworkNode,
  createNetworkNode,
  updateNetworkNode,
  deleteNetworkNode,
  fetchAvailableAssets,
  NODE_TYPE_OPTIONS,
  NODE_STATUS_OPTIONS,
  type NetworkNode,
  type Paginated,
  type NetworkNodeFilters,
  type NetworkNodePayload,
  type AvailableAsset,
} from "../services/networkNodes";
import { fetchRooms, type Room } from "../services/rooms";
import { useToast } from "../hooks/useToast";
import { extractApiError as extractError } from "../utils/error";

const PER_PAGE = 10;

const EMPTY_FORM = {
  asset_id: 0,
  room_id: "",
  parent_id: "",
  node_type: "OLT",
  label: "",
  pon_port: "",
  splitter_ratio: "",
  port_capacity: "",
  port_used: "0",
  customer_count: "0",
  rx_power_dbm: "",
  area: "",
  status: "ACTIVE",
  notes: "",
};

type BadgeTone =
  | "primary"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "light"
  | "dark";

const LIGHT_COLORS: Record<string, BadgeTone> = {
  OLT: "primary",
  ODC: "info",
  ODP: "success",
  SPLITTER: "warning",
  ONT: "error",
  SWITCH: "primary",
  ROUTER: "info",
  OTHER: "light",
};

function statusColor(status: string) {
  if (status === "ACTIVE") return "success";
  if (status === "MAINTENANCE") return "warning";
  return "error";
}

type FlatNode = Pick<NetworkNode, "id" | "parent_id">;

function descendantIds<T extends FlatNode>(all: T[], nodeId: number, acc: Set<number>) {
  acc.add(nodeId);
  for (const n of all) {
    if (!acc.has(n.id) && n.parent_id === nodeId) {
      descendantIds(all, n.id, acc);
    }
  }
  return acc;
}

export default function NetworkNodes() {
  const { t } = useLang();
  const { user } = useAuth();
  const canView = hasPermission(user, "network.view");
  const canCreate = hasPermission(user, "network.create");
  const canUpdate = hasPermission(user, "network.update");
  const canDelete = hasPermission(user, "network.delete");

  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [meta, setMeta] = useState<Paginated<NetworkNode>["meta"] | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const { pushToast } = useToast();

  const [filters, setFilters] = useState<NetworkNodeFilters>({
    search: "",
    node_type: "",
    status: "",
    room_id: "",
    page: 1,
    per_page: PER_PAGE,
  });

  const [selected, setSelected] = useState<NetworkNode | null>(null);

  const addModal = useModal();
  const detailModal = useModal();
  const editModal = useModal();
  const deleteModal = useModal();

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState<string>("");

  const siteRooms = rooms.filter((r) => !r.is_storage);
  const warehouseRooms = rooms.filter((r) => r.is_storage);

  const loadNodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchNetworkNodes(filters);
      setNodes(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to load network nodes.")));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadNodes();
  }, [loadNodes]);

  const loadRooms = useCallback(async () => {
    try {
      const res = await fetchRooms({ per_page: 1000 });
      setRooms(res.data.data);
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to load rooms.")));
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  function updateFilter(key: keyof NetworkNodeFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  function goToPage(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  function refresh() {
    loadNodes();
  }

  async function handleSaveNode(payload: NetworkNodePayload & { editing: NetworkNode | null }) {
    setSaving(true);
    try {
      const { editing, ...body } = payload;
      if (editing) {
        await updateNetworkNode(editing.id, body);
        pushToast("success", t("Network node updated."));
        editModal.closeModal();
      } else {
        await createNetworkNode(body);
        pushToast("success", t("Network node created."));
        addModal.closeModal();
      }
      setSelected(null);
      refresh();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to save network node.")));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setSubmitting("delete");
    try {
      await deleteNetworkNode(selected.id, Number(warehouseId));
      deleteModal.closeModal();
      setSelected(null);
      pushToast("success", t("Network node deleted. Asset returned to warehouse."));
      refresh();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to delete network node.")));
    } finally {
      setSubmitting(null);
    }
  }

  if (!canView) {
    return (
      <>
        <PageMeta
          title={`${t("Network Nodes")} | ${t("Access Denied")}`}
          description={t("FTTH network node management")}
        />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-error-600 dark:text-error-400">
            {t("You do not have permission to view network nodes.")}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title={t("Network Nodes")}
        description={t("Manage FTTH network nodes.")}
      />

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("Network Nodes")}
          </h3>
          <div className="flex items-center gap-2">
            <ExportButton
              fileStem={t("Network Nodes")}
              headers={() => [
                t("Node"),
                t("Type"),
                t("Site"),
                t("PON Port"),
                t("Ports Used"),
                t("Status"),
              ]}
              rows={async () => {
                const all = await fetchAllNetworkNodes(filters);
                return all.map((n) => [
                  n.label || n.asset?.name || "",
                  n.node_type,
                  n.room?.name ?? "",
                  n.pon_port ?? "",
                  n.port_capacity
                    ? `${n.port_used ?? 0} / ${n.port_capacity}`
                    : (n.port_used ?? 0),
                  t(n.status),
                ]);
              }}
            />
            {canCreate && (
              <Button
                onClick={() => {
                  setSelected(null);
                  addModal.openModal();
                }}
                startIcon={<PlusIcon />}
              >
                {t("Add Node")}
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
              placeholder={t("Search by node label or asset code...")}
              className="lg:max-w-[300px]"
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Select
                options={NODE_TYPE_OPTIONS}
                placeholder={t("All types")}
                defaultValue=""
                onChange={(v) => updateFilter("node_type", v)}
              />
              <Select
                options={NODE_STATUS_OPTIONS}
                placeholder={t("All statuses")}
                defaultValue=""
                onChange={(v) => updateFilter("status", v)}
              />
              <Select
                options={rooms.map((r) => ({ value: String(r.id), label: r.name }))}
                placeholder={t("All sites")}
                defaultValue=""
                onChange={(v) => updateFilter("room_id", v)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Node")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Type")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Site")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("PON Port")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Ports Used")}
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
                    <TableCell colSpan={7} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("Loading...")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading && nodes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("No network nodes found.")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  nodes.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                            <PlugInIcon />
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                              {n.label || n.asset?.name || "-"}
                            </p>
                            <p className="max-w-[240px] truncate text-xs text-gray-500 dark:text-gray-400">
                              {n.asset ? n.asset.asset_code : "-"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <Badge size="sm" variant="light" color={LIGHT_COLORS[n.node_type] ?? "light"}>
                          {n.node_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {n.room?.name || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {n.pon_port || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {n.port_used ?? 0}
                        {n.port_capacity ? ` / ${n.port_capacity}` : ""}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <Badge size="sm" variant="light" color={statusColor(n.status)}>
                          {n.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelected(n);
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
                                setSelected(n);
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
                                setSelected(n);
                                setWarehouseId(warehouseRooms[0] ? String(warehouseRooms[0].id) : "");
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
        <NodeModal
          mode="create"
          isOpen={addModal.isOpen}
          onClose={addModal.closeModal}
          editing={null}
          sites={siteRooms}
          nodes={nodes}
          saving={saving}
          onSubmit={handleSaveNode}
        />
      )}

      {canUpdate && (
        <NodeModal
          key={selected?.id || "edit"}
          mode="edit"
          isOpen={editModal.isOpen}
          onClose={editModal.closeModal}
          editing={selected}
          sites={siteRooms}
          nodes={nodes}
          saving={saving}
          onSubmit={handleSaveNode}
        />
      )}

      <NodeDetailModal
        isOpen={detailModal.isOpen}
        onClose={detailModal.closeModal}
        node={selected}
      />

      {canDelete && selected && (
        <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.closeModal} className="max-w-[450px] m-4">
          <div className="no-scrollbar relative w-full max-w-[450px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
            <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              {t("Delete Node")}
            </h4>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t("Delete {name}?", { name: selected.label || selected.asset?.name || `#${selected.id}` })}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("The asset will be returned to the warehouse. Choose the destination warehouse.")}
            </p>
            <div className="mt-4">
              <Label>{t("Warehouse")}</Label>
              <Select
                options={warehouseRooms.map((r) => ({ value: String(r.id), label: r.name }))}
                placeholder={t("Select warehouse")}
                defaultValue={warehouseId}
                onChange={(v) => setWarehouseId(v)}
              />
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button size="sm" variant="outline" onClick={deleteModal.closeModal}>
                {t("Cancel")}
              </Button>
              <Button
                size="sm"
                disabled={submitting === "delete" || !warehouseId}
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

function NodeModal({
  mode,
  isOpen,
  onClose,
  editing,
  sites,
  nodes,
  saving,
  onSubmit,
}: {
  mode: "create" | "edit";
  isOpen: boolean;
  onClose: () => void;
  editing: NetworkNode | null;
  sites: Room[];
  nodes: NetworkNode[];
  saving: boolean;
  onSubmit: (payload: NetworkNodePayload & { editing: NetworkNode | null }) => void;
}) {
  const { t } = useLang();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [asset, setAsset] = useState<AvailableAsset | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      editing
        ? {
            asset_id: editing.asset_id,
            room_id: editing.room_id ? String(editing.room_id) : "",
            parent_id: editing.parent_id ? String(editing.parent_id) : "",
            node_type: editing.node_type,
            label: editing.label || "",
            pon_port: editing.pon_port || "",
            splitter_ratio: editing.splitter_ratio || "",
            port_capacity: editing.port_capacity != null ? String(editing.port_capacity) : "",
            port_used: editing.port_used != null ? String(editing.port_used) : "0",
            customer_count: editing.customer_count != null ? String(editing.customer_count) : "0",
            rx_power_dbm: editing.rx_power_dbm != null ? String(editing.rx_power_dbm) : "",
            area: editing.area || "",
            status: editing.status,
            notes: editing.notes || "",
          }
        : { ...EMPTY_FORM },
    );
    if (editing?.asset) {
      setAsset({
        id: editing.asset_id,
        asset_code: editing.asset.asset_code,
        name: editing.asset.name,
        description: editing.asset.description,
      });
    } else {
      setAsset(null);
    }
  }, [isOpen, editing]);

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const excludedParentIds =
    editing && nodes.length
      ? descendantIds(nodes.map((n) => ({ id: n.id, parent_id: n.parent_id })), editing.id, new Set<number>())
      : new Set<number>();

  const parentOptions = nodes
    .filter((n) => !excludedParentIds.has(n.id))
    .map((n) => ({ value: String(n.id), label: `${n.node_type} — ${n.label || n.asset?.name || n.id}` }));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload: NetworkNodePayload = { ...form };
    if (mode === "create") {
      if (!form.asset_id) return;
      payload.asset_id = Number(form.asset_id);
    }
    payload.room_id = form.room_id ? Number(form.room_id) : undefined;
    payload.parent_id = form.parent_id ? Number(form.parent_id) : null;
    payload.port_capacity = form.port_capacity === "" ? null : Number(form.port_capacity);
    payload.port_used = form.port_used === "" ? 0 : Number(form.port_used);
    payload.customer_count = form.customer_count === "" ? 0 : Number(form.customer_count);
    payload.rx_power_dbm = form.rx_power_dbm === "" ? null : Number(form.rx_power_dbm);
    payload.label = form.label || null;
    payload.pon_port = form.pon_port || null;
    payload.splitter_ratio = form.splitter_ratio || null;
    payload.area = form.area || null;
    payload.notes = form.notes || null;
    onSubmit({ ...payload, editing });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[640px] m-4">
      <div className="no-scrollbar max-h-[90vh] w-full max-w-[640px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {mode === "edit" ? t("Edit Node") : t("Add Node")}
        </h4>
        <p className="mb-6 mt-1 text-sm text-gray-500 dark:text-gray-400">
          {mode === "edit"
            ? t("Update the network node details.")
            : t("Install an asset as a new FTTH network node.")}
        </p>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {mode === "create" && (
            <div className="sm:col-span-2">
              <Label>{t("Asset")}</Label>
              <AssetPicker
                value={asset}
                onChange={(a) => {
                  setAsset(a);
                  set("asset_id", String(a.id));
                }}
              />
            </div>
          )}
          <div>
            <Label>{t("Node Type")}</Label>
            <Select
              options={NODE_TYPE_OPTIONS}
              placeholder={t("Select node type")}
              defaultValue={form.node_type}
              onChange={(v) => set("node_type", v)}
            />
          </div>
          <div>
            <Label>{t("Site")}</Label>
            <Select
              options={sites.map((r) => ({ value: String(r.id), label: r.name }))}
              placeholder={t("Select site")}
              defaultValue={form.room_id}
              onChange={(v) => set("room_id", v)}
            />
          </div>
          <div>
            <Label>{t("Parent Node")}</Label>
            <Select
              options={parentOptions}
              placeholder={t("None (root node)")}
              defaultValue={form.parent_id}
              onChange={(v) => set("parent_id", v)}
            />
          </div>
          <div>
            <Label>{t("Label")}</Label>
            <Input
              type="text"
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
              placeholder={t("e.g. OLT Site A")}
            />
          </div>
          <div>
            <Label>{t("PON Port")}</Label>
            <Input
              type="text"
              value={form.pon_port}
              onChange={(e) => set("pon_port", e.target.value)}
              placeholder={t("e.g. PON 0/1/2")}
            />
          </div>
          <div>
            <Label>{t("Splitter Ratio")}</Label>
            <Input
              type="text"
              value={form.splitter_ratio}
              onChange={(e) => set("splitter_ratio", e.target.value)}
              placeholder={t("e.g. 1:8")}
            />
          </div>
          <div>
            <Label>{t("Port Capacity")}</Label>
            <Input
              type="number"
              min="0"
              value={form.port_capacity}
              onChange={(e) => set("port_capacity", e.target.value)}
              placeholder={t("e.g. 8")}
            />
          </div>
          <div>
            <Label>{t("Ports Used")}</Label>
            <Input
              type="number"
              min="0"
              value={form.port_used}
              onChange={(e) => set("port_used", e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <Label>{t("Customers")}</Label>
            <Input
              type="number"
              min="0"
              value={form.customer_count}
              onChange={(e) => set("customer_count", e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <Label>{t("RX Power (dBm)")}</Label>
            <Input
              type="number"
              step={0.01}
              value={form.rx_power_dbm}
              onChange={(e) => set("rx_power_dbm", e.target.value)}
              placeholder={t("e.g. -22.50")}
            />
          </div>
          <div>
            <Label>{t("Area")}</Label>
            <Input
              type="text"
              value={form.area}
              onChange={(e) => set("area", e.target.value)}
              placeholder={t("e.g. Kelurahan Sukamaju")}
            />
          </div>
          <div>
            <Label>{t("Status")}</Label>
            <Select
              options={NODE_STATUS_OPTIONS}
              placeholder={t("Select status")}
              defaultValue={form.status}
              onChange={(v) => set("status", v)}
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
          <div className="sm:col-span-2 mt-2 flex items-center justify-end gap-3">
            <Button size="sm" variant="outline" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button
              size="sm"
              disabled={saving || (mode === "create" && !form.asset_id) || !form.room_id}
            >
              {saving
                ? t("Saving...")
                : mode === "edit"
                  ? t("Save Changes")
                  : t("Install Node")}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

function AssetPicker({
  value,
  onChange,
}: {
  value: AvailableAsset | null;
  onChange: (asset: AvailableAsset) => void;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AvailableAsset[]>([]);
  const [searching, setSearching] = useState(false);
  const debounced = useDebouncedValue(query, 400);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let stale = false;
    setSearching(true);
    fetchAvailableAssets(debounced)
      .then((res) => {
        if (!stale) setResults(res.data.assets);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!stale) setSearching(false);
      });
    return () => {
      stale = true;
    };
  }, [debounced]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <div className="relative" onClick={() => setOpen(true)}>
        <Input
          type="text"
          value={value ? `${value.asset_code} — ${value.name}` : query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value) onChange({ id: 0, asset_code: "", name: "", description: null } as AvailableAsset);
            setOpen(true);
          }}
          placeholder={t("Search an asset to install...")}
        />
      </div>
      {open && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {searching && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              {t("Searching...")}
            </div>
          )}
          {!searching && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              {t("No available assets found.")}
            </div>
          )}
          {!searching &&
            results.map((a) => (
              <button
                type="button"
                key={a.id}
                className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => {
                  onChange(a);
                  setOpen(false);
                }}
              >
                <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {a.asset_code}
                </span>
                <span className="max-w-[60%] truncate text-xs text-gray-500 dark:text-gray-400">
                  {a.name}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

function NodeDetailModal({
  isOpen,
  onClose,
  node,
}: {
  isOpen: boolean;
  onClose: () => void;
  node: NetworkNode | null;
}) {
  const { t } = useLang();
  const [loaded, setLoaded] = useState<NetworkNode | null>(node);

  useEffect(() => {
    if (isOpen && node) {
      setLoaded(node);
    }
  }, [isOpen, node]);

  useEffect(() => {
    if (isOpen && node) {
      fetchNetworkNode(node.id)
        .then((res) => setLoaded(res.data.node))
        .catch(() => undefined);
    }
  }, [isOpen, node]);

  if (!node || !loaded) return null;

  const rows: { label: string; value: string | number | null }[] = [
    { label: t("Asset"), value: loaded.asset ? `${loaded.asset.asset_code} — ${loaded.asset.name}` : "-" },
    { label: t("Node Type"), value: loaded.node_type },
    { label: t("Site"), value: loaded.room?.name || "-" },
    { label: t("Label"), value: loaded.label || "-" },
    { label: t("PON Port"), value: loaded.pon_port || "-" },
    { label: t("Splitter Ratio"), value: loaded.splitter_ratio || "-" },
    { label: t("Ports Used"), value: loaded.port_capacity ? `${loaded.port_used ?? 0} / ${loaded.port_capacity}` : (loaded.port_used ?? 0) },
    { label: t("Customers"), value: loaded.customer_count ?? 0 },
    { label: t("RX Power (dBm)"), value: loaded.rx_power_dbm != null ? String(loaded.rx_power_dbm) : "-" },
    { label: t("Area"), value: loaded.area || "-" },
    { label: t("Notes"), value: loaded.notes || "-" },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[560px] m-4">
      <div className="no-scrollbar max-h-[85vh] w-full max-w-[560px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              {t("Node Details")}
            </h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {loaded.label || loaded.asset?.name || `#${loaded.id}`}
            </p>
          </div>
          <Badge size="sm" variant="light" color={statusColor(loaded.status)}>
            {loaded.status}
          </Badge>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.label}>
              <Label>{r.label}</Label>
              <p className="text-sm text-gray-800 dark:text-white/90">{r.value}</p>
            </div>
          ))}
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