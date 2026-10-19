import { useCallback, useEffect, useMemo, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import Badge from "../components/ui/badge/Badge";
import Select from "../components/form/Select";
import Button from "../components/ui/button/Button";
import { useAuth, hasPermission } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlugInIcon,
  PlusIcon,
} from "../icons";
import {
  fetchNetworkTree,
  type NetworkNode,
} from "../services/networkNodes";
import { fetchRooms, type Room } from "../services/rooms";
import { useToast } from "../hooks/useToast";
import { extractApiError as extractError } from "../utils/error";
import { Link } from "react-router";

type BadgeTone =
  | "primary"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "light"
  | "dark";

const TYPE_COLORS: Record<string, BadgeTone> = {
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

function TreeNodeView({
  node,
  depth,
}: {
  node: NetworkNode;
  depth: number;
}) {
  const { t } = useLang();
  const [expanded, setExpanded] = useState(true);
  const hasChildren = !!node.children && node.children.length > 0;

  return (
    <div>
      <div
        className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 hover:border-brand-200 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/40"
        style={{ marginLeft: depth * 24 }}
      >
        <button
          type="button"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            hasChildren
              ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
              : "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400"
          }`}
          onClick={() => hasChildren && setExpanded((v) => !v)}
          aria-label={expanded ? t("Collapse") : t("Expand")}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronUpIcon />
            ) : (
              <ChevronDownIcon />
            )
          ) : (
            <PlugInIcon />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge size="sm" variant="light" color={TYPE_COLORS[node.node_type] ?? "light"}>
              {node.node_type}
            </Badge>
            <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
              {node.label || node.asset?.name || `#${node.id}`}
            </p>
            {node.asset && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {node.asset.asset_code}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span>
              {t("Site")}: {node.room?.name || "-"}
            </span>
            {node.pon_port && <span>{t("PON")}: {node.pon_port}</span>}
            {node.port_capacity != null && (
              <span>
                {t("Ports")}: {node.port_used ?? 0} / {node.port_capacity}
              </span>
            )}
            <Badge size="sm" variant="light" color={statusColor(node.status)}>
              {node.status}
            </Badge>
          </div>
        </div>
      </div>
      {hasChildren && expanded && (
        <div className="mt-2 space-y-2">
          {node.children!.map((child) => (
            <TreeNodeView key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function NetworkTopology() {
  const { t } = useLang();
  const { user } = useAuth();
  const canView = hasPermission(user, "network.view");
  const canCreate = hasPermission(user, "network.create");

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomFilter, setRoomFilter] = useState("");
  const [tree, setTree] = useState<NetworkNode[]>([]);
  const [loading, setLoading] = useState(true);
  const { pushToast } = useToast();

  const loadTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchNetworkTree(roomFilter || undefined);
      setTree(res.data.tree);
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to load topology.")));
    } finally {
      setLoading(false);
    }
  }, [roomFilter]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  useEffect(() => {
    fetchRooms({ per_page: 1000 })
      .then((res) => setRooms(res.data.data))
      .catch(() => undefined);
  }, []);

  const siteRooms = useMemo(() => rooms.filter((r) => !r.is_storage), [rooms]);
  const rootCount = tree.length;
  const customerTotal = useMemo(() => {
    let acc = 0;
    const walk = (nodes: NetworkNode[]) => {
      for (const n of nodes) {
        acc += n.customer_count ?? 0;
        if (n.children) walk(n.children);
      }
    };
    walk(tree);
    return acc;
  }, [tree]);

  if (!canView) {
    return (
      <>
        <PageMeta
          title={`${t("Topology")} | ${t("Access Denied")}`}
          description={t("FTTH network topology")}
        />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-error-600 dark:text-error-400">
            {t("You do not have permission to view the network topology.")}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title={t("Network Topology")}
        description={t("FTTH network topology tree.")}
      />

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {t("Network Topology")}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("Expand and collapse the FTTH nodes per site.")}
            </p>
          </div>
          {canCreate && (
            <Link to="/network/nodes">
              <Button startIcon={<PlusIcon />}>
                {t("Manage Nodes")}
              </Button>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("Root Nodes")}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
              {rootCount}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("Sites")}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
              {siteRooms.length}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("Customers")}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
              {customerTotal}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
            <Select
              options={siteRooms.map((r) => ({ value: String(r.id), label: r.name }))}
              placeholder={t("All sites")}
              defaultValue=""
              onChange={(v) => setRoomFilter(v)}
            />
            <Button variant="outline" size="sm" onClick={loadTree}>
              {t("Refresh")}
            </Button>
          </div>
          <div className="space-y-2 p-4">
            {loading && (
              <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {t("Loading...")}
              </p>
            )}
            {!loading && tree.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {t("No nodes installed yet. Add nodes from the Network Nodes page.")}
              </p>
            )}
            {!loading &&
              tree.map((node) => <TreeNodeView key={node.id} node={node} depth={0} />)}
          </div>
        </div>
      </div>
    </>
  );
}