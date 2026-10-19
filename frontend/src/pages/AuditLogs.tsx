import { useCallback, useEffect, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import Input from "../components/form/input/InputField";
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
import { useToast } from "../hooks/useToast";
import { extractApiError as extractError } from "../utils/error";
import { EyeIcon, TaskIcon } from "../icons";
import {
  fetchAuditLogs,
  EVENT_OPTIONS,
  type AuditLog,
  type Paginated,
  type AuditLogFilters,
} from "../services/auditLogs";
import { fetchUsers, type User } from "../services/users";
import { formatDateTime } from "../utils/format";

const PER_PAGE = 10;

export const MODULE_OPTIONS = [
  { value: "Asset", label: "Asset" },
  { value: "AssetAssignment", label: "Assignment" },
  { value: "AssetTransfer", label: "Transfer" },
  { value: "AssetDamage", label: "Damaged Goods" },
  { value: "VehicleAsset", label: "Vehicles" },
  { value: "Purchase", label: "Purchases" },
  { value: "Category", label: "Category" },
  { value: "Room", label: "Rooms" },
  { value: "Team", label: "Team" },
  { value: "User", label: "User" },
  { value: "Role", label: "Role" },
  { value: "Permission", label: "Permission" },
];

const EVENT_BADGE: Record<string, "success" | "warning" | "error"> = {
  created: "success",
  updated: "warning",
  deleted: "error",
};

function formatValues(values: Record<string, unknown> | null): string {
  if (!values) return "-";
  try {
    return JSON.stringify(values, null, 2);
  } catch {
    return "-";
  }
}

export default function AuditLogs() {
  const { t } = useLang();
  const { user } = useAuth();
  const canView = hasPermission(user, "audit_logs.view");

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState<Paginated<AuditLog>["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const { pushToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);

  const [filters, setFilters] = useState<AuditLogFilters>({
    search: "",
    event: "",
    auditable_type: "",
    user_id: "",
    date_from: "",
    date_to: "",
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

  const [selected, setSelected] = useState<AuditLog | null>(null);
  const detailModal = useModal();

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAuditLogs(filters);
      setLogs(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to load audit logs.")));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const usersRes = await fetchUsers({ per_page: 100 });
        if (!cancelled) setUsers(usersRes.data.data);
      } catch {
        // options are non-critical
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateFilter(key: keyof AuditLogFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  function goToPage(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  function resetFilters() {
    setFilters({
      search: "",
      event: "",
      auditable_type: "",
      user_id: "",
      date_from: "",
      date_to: "",
      page: 1,
      per_page: PER_PAGE,
    });
    setSearchInput("");
  }

  if (!canView) {
    return (
      <>
        <PageMeta
          title={t("Audit Log | Access Denied")}
          description={t("Audit log")}
        />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-error-600 dark:text-error-400">
            {t("You do not have permission to view audit logs.")}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title={t("Audit Log")}
        description={t("Track every action performed across the system.")}
      />

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("Audit Log")}
          </h3>
          <Button size="sm" variant="outline" onClick={resetFilters}>
            {t("Reset Filters")}
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 dark:border-gray-800">
            <Input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("Search by user, module, or IP...")}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Select
                options={EVENT_OPTIONS.map((o) => ({
                  value: o.value,
                  label: t(o.label),
                }))}
                placeholder={t("All events")}
                defaultValue=""
                onChange={(v) => updateFilter("event", v)}
              />
              <Select
                options={MODULE_OPTIONS.map((o) => ({
                  value: o.value,
                  label: t(o.label),
                }))}
                placeholder={t("All modules")}
                defaultValue=""
                onChange={(v) => updateFilter("auditable_type", v)}
              />
              <Select
                options={users.map((u) => ({
                  value: String(u.id),
                  label: u.name,
                }))}
                placeholder={t("All users")}
                defaultValue=""
                onChange={(v) => updateFilter("user_id", v)}
              />
              <Input
                type="date"
                value={filters.date_from as string}
                onChange={(e) => updateFilter("date_from", e.target.value)}
                className="h-11 w-full"
              />
              <Input
                type="date"
                value={filters.date_to as string}
                onChange={(e) => updateFilter("date_to", e.target.value)}
                className="h-11 w-full"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("User")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Event")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Module")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Record ID")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("IP Address")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Time")}
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
                {!loading && logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("No audit logs found.")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                            <TaskIcon />
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                              {log.user?.name || t("System")}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {log.user?.email || "-"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <Badge
                          size="sm"
                          variant="light"
                          color={EVENT_BADGE[log.event] ?? "light"}
                        >
                          {log.event_label}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {log.auditable_label || log.auditable_type}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        #{log.auditable_id}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {log.ip_address || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDateTime(log.created_at)}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelected(log);
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

      <DetailModal
        isOpen={detailModal.isOpen}
        onClose={detailModal.closeModal}
        log={selected}
      />
    </>
  );
}

function DetailModal({
  isOpen,
  onClose,
  log,
}: {
  isOpen: boolean;
  onClose: () => void;
  log: AuditLog | null;
}) {
  const { t } = useLang();
  if (!log) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[620px] m-4">
      <div className="no-scrollbar max-h-[85vh] w-full max-w-[620px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {t("Audit Log Details")}
        </h4>
        <p className="mb-6 mt-1 text-sm text-gray-500 dark:text-gray-400">
          {formatDateTime(log.created_at)}
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">
              {t("User")}
            </p>
            <p className="mt-1 text-sm text-gray-800 dark:text-white/90">
              {log.user?.name || t("System")}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">
              {t("Event")}
            </p>
            <div className="mt-1">
              <Badge
                size="sm"
                variant="light"
                color={EVENT_BADGE[log.event] ?? "light"}
              >
                {log.event_label}
              </Badge>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">
              {t("Module")}
            </p>
            <p className="mt-1 text-sm text-gray-800 dark:text-white/90">
              {log.auditable_label || log.auditable_type} (#{log.auditable_id})
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">
              {t("IP Address")}
            </p>
            <p className="mt-1 text-sm text-gray-800 dark:text-white/90">
              {log.ip_address || "-"}
            </p>
          </div>
          {log.user_agent && (
            <div className="sm:col-span-2">
              <p className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">
                {t("User Agent")}
              </p>
              <p className="mt-1 break-all text-xs text-gray-800 dark:text-white/90">
                {log.user_agent}
              </p>
            </div>
          )}
          {log.url && (
            <div className="sm:col-span-2">
              <p className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">
                {t("URL")}
              </p>
              <p className="mt-1 break-all text-xs text-gray-800 dark:text-white/90">
                {log.url}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4">
          <div>
            <p className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">
              {t("Old Values")}
            </p>
            <pre className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300">
              {formatValues(log.old_values)}
            </pre>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">
              {t("New Values")}
            </p>
            <pre className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300">
              {formatValues(log.new_values)}
            </pre>
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