import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import PageMeta from "../components/common/PageMeta";
import Input from "../components/form/input/InputField";
import TextArea from "../components/form/input/TextArea";
import FileInput from "../components/form/input/FileInput";
import Label from "../components/form/Label";
import Select from "../components/form/Select";
import Badge from "../components/ui/badge/Badge";
import Button from "../components/ui/button/Button";
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
  TrashBinIcon,
  PaperPlaneIcon,
  PlayIcon,
  PauseIcon,
  CheckLineIcon,
  TimeIcon,
} from "../icons";
import {
  STATUS_META,
  PRIORITY_META,
  CATEGORY_META,
  formatDate,
  PersonAvatar,
  WorkTimer,
  type BadgeColor,
} from "../components/tasks/taskShared";
import {
  fetchTasks,
  fetchAssignableUsers,
  createTask,
  updateTask,
  deleteTask,
  CATEGORY_OPTIONS,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  type Task,
  type TaskCategory,
  type TaskPriority,
  type TaskStatus,
  type AssignableUser,
  type Paginated,
  type TaskFilters,
} from "../services/tasks";
import { useToast } from "../hooks/useToast";
import { extractApiError as extractError } from "../utils/error";

const PER_PAGE = 10;

// Menus a report may point at. The label is stored as the value so the report
// stays readable in the database; "Other" reveals a free-text field.
const PAGE_OPTIONS = [
  "Dashboard",
  "Asset Data",
  "Purchases",
  "Asset Transfers",
  "Damaged Items",
  "Storage",
  "Categories",
  "Vehicle Data",
  "Vehicles per Team",
  "Topology",
  "Network Nodes",
  "Team",
  "Rooms",
  "Users",
  "Roles",
  "Permissions",
  "Audit Log",
  "Reports",
  "Task",
];

// The table is stacked as one layer per status, in workflow order: New →
// Proses → Postpone, then the reports that are already finished.
const STATUS_LAYERS: TaskStatus[] = [
  "open",
  "in_progress",
  "paused",
  "resolved",
  "rejected",
];

type StatusLayer = {
  key: TaskStatus;
  label: string;
  color: BadgeColor;
  count: number;
  tasks: Task[];
};

// Stack the page's reports into one layer per status, all inside a single
// table. Within a layer the reports stay grouped by the user working on them
// (Unassigned pushed to the end).
function stackByStatus(tasks: Task[]): StatusLayer[] {
  const buckets = new Map<TaskStatus, Task[]>();
  for (const task of tasks) {
    const bucket = buckets.get(task.status);
    if (bucket) {
      bucket.push(task);
    } else {
      buckets.set(task.status, [task]);
    }
  }

  const layers: StatusLayer[] = [];
  for (const key of STATUS_LAYERS) {
    const list = buckets.get(key);
    if (!list || list.length === 0) continue;

    list.sort((a, b) => {
      const an = a.assignee?.name ?? "";
      const bn = b.assignee?.name ?? "";
      if (!an && !bn) return 0;
      if (!an) return 1;
      if (!bn) return -1;
      return an.localeCompare(bn);
    });

    layers.push({
      key,
      label: STATUS_META[key].label,
      color: STATUS_META[key].color,
      count: list.length,
      tasks: list,
    });
  }

  return layers;
}

type FormState = {
  title: string;
  category: string;
  page: string;
  pageOther: string;
  description: string;
  priority: string;
  assigned_to: string;
  attachment: File | null;
};

const EMPTY_FORM: FormState = {
  title: "",
  category: "bug_system",
  page: "",
  pageOther: "",
  description: "",
  priority: "medium",
  assigned_to: "none",
  attachment: null,
};

export default function Tasks() {
  const { t } = useLang();
  const { user } = useAuth();
  // A super admin — or a user handed the cross-unit grant (tasks.manage_all) —
  // sees the whole board; everyone else only sees their own unit's reports.
  // Mirrors the backend's Task::userSeesEveryTask().
  const canViewAll =
    user?.role === "super_admin" ||
    (user?.permissions?.includes("tasks.manage_all") ?? false);
  const canView = hasPermission(user, "tasks.view") || canViewAll;
  const canCreate = hasPermission(user, "tasks.create");
  const canDelete = hasPermission(user, "tasks.delete");
  // The Unit column is only meaningful to a viewer who sees more than one unit.
  const columnCount = canViewAll ? 10 : 9;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [meta, setMeta] = useState<Paginated<Task>["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const { pushToast } = useToast();

  const [filters, setFilters] = useState<TaskFilters>({
    search: "",
    status: "",
    category: "",
    priority: "",
    // The board opens on the reports assigned to the signed-in user; other
    // people's reports are reached through the filter bar.
    assigned_to: "me",
    page: 1,
    per_page: PER_PAGE,
  });

  const [selected, setSelected] = useState<Task | null>(null);
  const [addKey, setAddKey] = useState(0);
  const [users, setUsers] = useState<AssignableUser[]>([]);

  const addModal = useModal();
  const deleteModal = useModal();

  const [saving, setSaving] = useState(false);
  // Row whose Start / Resolve / Reopen request is in flight.
  const [busyId, setBusyId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchTasks(filters);
      setTasks(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to load tasks.")));
    } finally {
      setLoading(false);
    }
  }, [filters, pushToast, t]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Reports stacked into one layer per status (New / Proses / Postpone / ...).
  const layers = useMemo(() => stackByStatus(tasks), [tasks]);

  // The roster powers both the create-time "Assigned To" picker and the
  // (re)assign control in the detail view, so every viewer loads it.
  useEffect(() => {
    let active = true;
    fetchAssignableUsers()
      .then((res) => {
        if (active) setUsers(res.data.users);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  function updateFilter(key: keyof TaskFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  function goToPage(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  async function refresh() {
    await loadTasks();
  }

  async function handleCreate(payload: FormState) {
    setSaving(true);
    try {
      await createTask({
        title: payload.title,
        category: payload.category as TaskCategory,
        page: payload.page || null,
        description: payload.description,
        priority: payload.priority as TaskPriority,
        assigned_to:
          payload.assigned_to && payload.assigned_to !== "none"
            ? Number(payload.assigned_to)
            : null,
        attachment: payload.attachment,
      });
      pushToast("success", t("Task submitted."));
      addModal.closeModal();
      await refresh();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to submit task.")));
    } finally {
      setSaving(false);
    }
  }

  // Quick workflow actions straight from the list (Start / Resume / Resolve /
  // Reopen). Only the status is sent; the server keeps priority and assignment
  // untouched and records the change in the report's history.
  async function handleRowWorkflow(task: Task, status: TaskStatus) {
    setBusyId(task.id);
    try {
      await updateTask(task.id, { status });
      pushToast("success", t("Task updated."));
      await refresh();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to update task.")));
    } finally {
      setBusyId(null);
    }
  }

  // Claim a report for yourself so you can work on it. The server writes the
  // assignment into the report's history.
  async function handleClaim(task: Task) {
    if (user?.id == null) return;
    setBusyId(task.id);
    try {
      await updateTask(task.id, { assigned_to: user.id });
      pushToast("success", t("Task assigned to you."));
      await refresh();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to update task.")));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setSubmitting("delete");
    try {
      await deleteTask(selected.id);
      deleteModal.closeModal();
      setSelected(null);
      pushToast("success", t("Task deleted."));
      await refresh();
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to delete task.")));
    } finally {
      setSubmitting(null);
    }
  }

  if (!canView) {
    return (
      <>
        <PageMeta
          title={`${t("Task")} | ${t("Access Denied")}`}
          description={t("Task management")}
        />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-error-600 dark:text-error-400">
            {t("You do not have permission to view tasks.")}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title={t("Task Management")}
        description={t("Report and follow up on system or menu issues.")}
      />

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {t("Task Management")}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("Report a bug or an issue with a system menu.")}
            </p>
          </div>
          {canCreate && (
            <Button
              onClick={() => {
                setAddKey((k) => k + 1);
                addModal.openModal();
              }}
              startIcon={<PlusIcon />}
            >
              {t("Report a Task")}
            </Button>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
            <Input
              type="text"
              value={filters.search || ""}
              onChange={(e) => updateFilter("search", e.target.value)}
              placeholder={t("Search by title, description, or page...")}
              className="lg:max-w-[300px]"
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Select
                options={[{ value: "", label: t("All statuses") }, ...STATUS_OPTIONS]}
                placeholder={t("All statuses")}
                defaultValue=""
                onChange={(v) => updateFilter("status", v)}
              />
              <Select
                options={[{ value: "", label: t("All categories") }, ...CATEGORY_OPTIONS]}
                placeholder={t("All categories")}
                defaultValue=""
                onChange={(v) => updateFilter("category", v)}
              />
              <Select
                options={[{ value: "", label: t("All priorities") }, ...PRIORITY_OPTIONS]}
                placeholder={t("All priorities")}
                defaultValue=""
                onChange={(v) => updateFilter("priority", v)}
              />
              <Select
                options={[
                  { value: "", label: t("All assignments") },
                  { value: "me", label: t("Assigned to me") },
                  { value: "none", label: t("Unassigned") },
                  ...users.map((u) => ({ value: String(u.id), label: u.name })),
                ]}
                placeholder={t("All assignments")}
                defaultValue="me"
                onChange={(v) => updateFilter("assigned_to", v)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Task")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Category")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Page")}
                  </TableCell>
                  {canViewAll && (
                    <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {t("Team")}
                    </TableCell>
                  )}
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Reporter")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Assigned To")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Priority")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Status")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Timer")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                    {t("Actions")}
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={columnCount} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("Loading...")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading && tasks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columnCount} className="px-5 py-6 text-center text-sm text-gray-500">
                      {filters.assigned_to === "me"
                        ? t("No tasks are assigned to you. Use the filter bar to see other tasks.")
                        : t("No tasks found.")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  layers.map((layer) => (
                    <Fragment key={layer.key}>
                      <TableRow className="bg-gray-50 dark:bg-white/[0.02]">
                        <TableCell colSpan={columnCount} className="px-5 py-2.5">
                          <div className="flex items-center gap-2">
                            <Badge size="sm" variant="light" color={layer.color}>
                              {t(layer.label)}
                            </Badge>
                            <span className="text-theme-xs text-gray-400 dark:text-gray-500">
                              {layer.count}{" "}
                              {layer.count === 1 ? t("task") : t("tasks")}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {layer.tasks.map((task) => {
                        // Work a report only once it is assigned to you. A
                        // report that has been worked on is frozen to its
                        // assignee, so only an open one can be claimed.
                        const isAssignee =
                          user?.id != null && task.assigned_to === user.id;
                        const canWork = isAssignee;
                        const isOpen = task.status === "open";
                        const canClaim = isOpen && !isAssignee;
                        const canStart = task.status === "open" || task.status === "paused";
                        const canPause = task.status === "in_progress";
                        const canResolve = ["open", "in_progress", "paused"].includes(task.status);
                        // Reopening (returning it to "open") is how the
                        // assignee releases a report for reassignment.
                        const canReopen = task.status !== "open";
                        const busy = busyId === task.id;
                        return (
                        <TableRow key={task.id}>
                          <TableCell className="px-5 py-4">
                            <div className="flex items-start gap-3">
                              {/* Who filed it (brand) and who has to work on it (muted). */}
                              <div className="mt-0.5 flex shrink-0 items-center">
                                <PersonAvatar
                                  name={task.reporter?.name}
                                  avatarUrl={task.reporter?.avatar_url}
                                  tone="brand"
                                  title={`${t("Created by")}: ${task.reporter?.name ?? "-"}`}
                                />
                                <PersonAvatar
                                  name={task.assignee?.name}
                                  avatarUrl={task.assignee?.avatar_url}
                                  tone="muted"
                                  title={`${t("Assigned to")}: ${task.assignee?.name ?? t("Unassigned")}`}
                                  className="-ml-2"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                  {task.title}
                                </p>
                                <p className="max-w-[280px] truncate text-xs text-gray-500 dark:text-gray-400">
                                  {task.description}
                                </p>
                                <p className="mt-0.5 flex items-center gap-1.5 text-theme-xs text-gray-400 dark:text-gray-500">
                                  <span>{formatDate(task.created_at)}</span>
                                  {!!task.comments_count && (
                                    <span className="text-gray-400 dark:text-gray-500">
                                      · {task.comments_count}{" "}
                                      {task.comments_count === 1 ? t("comment") : t("comments")}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-5 py-4">
                            <Badge size="sm" variant="light" color={CATEGORY_META[task.category]?.color ?? "light"}>
                              {t(CATEGORY_META[task.category]?.label ?? task.category)}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {task.page || "-"}
                          </TableCell>
                          {canViewAll && (
                            <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                              {task.team?.name ?? (
                                <span className="text-gray-400 dark:text-gray-500">{t("No team")}</span>
                              )}
                            </TableCell>
                          )}
                          <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {task.reporter?.name ?? "-"}
                          </TableCell>
                          <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {task.assignee?.name ?? (
                              <span className="text-gray-400 dark:text-gray-500">{t("Unassigned")}</span>
                            )}
                          </TableCell>
                          <TableCell className="px-5 py-4">
                            <Badge size="sm" variant="light" color={PRIORITY_META[task.priority]?.color ?? "light"}>
                              {t(PRIORITY_META[task.priority]?.label ?? task.priority)}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-5 py-4">
                            <Badge size="sm" variant="light" color={STATUS_META[task.status]?.color ?? "light"}>
                              {t(STATUS_META[task.status]?.label ?? task.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-5 py-4">
                            {task.worked_seconds > 0 || task.timer_running ? (
                              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                <TimeIcon />
                                <WorkTimer
                                  baseSeconds={task.worked_seconds}
                                  running={task.timer_running}
                                  className="tabular-nums"
                                />
                                {task.timer_running && (
                                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success-500" />
                                )}
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500">-</span>
                            )}
                          </TableCell>
                          <TableCell className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                              {canClaim && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busy}
                                  onClick={() => handleClaim(task)}
                                >
                                  {t("Assign to me")}
                                </Button>
                              )}
                              {canWork && canStart && (
                                <Button
                                  size="sm"
                                  startIcon={<PlayIcon />}
                                  disabled={busy}
                                  onClick={() => handleRowWorkflow(task, "in_progress")}
                                >
                                  {task.status === "paused" ? t("Resume") : t("Start")}
                                </Button>
                              )}
                              {canWork && canPause && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  startIcon={<PauseIcon />}
                                  disabled={busy}
                                  onClick={() => handleRowWorkflow(task, "paused")}
                                >
                                  {t("Pause")}
                                </Button>
                              )}
                              {canWork && canResolve && (
                                <Button
                                  size="sm"
                                  startIcon={<CheckLineIcon />}
                                  disabled={busy}
                                  onClick={() => handleRowWorkflow(task, "resolved")}
                                >
                                  {t("Resolve")}
                                </Button>
                              )}
                              {canWork && canReopen && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busy}
                                  onClick={() => handleRowWorkflow(task, "open")}
                                >
                                  {t("Reopen")}
                                </Button>
                              )}
                              {/* A real link so the ticket opens in its own tab
                                  (and middle/ctrl-click works too). */}
                              <a
                                href={`/tasks/${task.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 dark:bg-white/[0.04] dark:text-gray-300 dark:ring-white/10 dark:hover:bg-white/[0.08] dark:hover:text-white"
                              >
                                <span className="flex items-center">
                                  <EyeIcon />
                                </span>
                                {t("Detail")}
                              </a>
                              {canDelete && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelected(task);
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
                    </Fragment>
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
        <TaskFormModal
          key={addKey}
          isOpen={addModal.isOpen}
          onClose={addModal.closeModal}
          saving={saving}
          users={users}
          onSubmit={handleCreate}
        />
      )}

      {canDelete && selected && (
        <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.closeModal} className="max-w-[450px] m-4">
          <div className="no-scrollbar relative w-full max-w-[450px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
            <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              {t("Delete Task")}
            </h4>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t("Are you sure you want to delete {name}? This action cannot be undone.", {
                name: selected.title,
              })}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button size="sm" variant="outline" onClick={deleteModal.closeModal}>
                {t("Cancel")}
              </Button>
              <Button size="sm" disabled={submitting === "delete"} onClick={handleDelete}>
                {submitting === "delete" ? t("Deleting...") : t("Delete")}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function TaskFormModal({
  isOpen,
  onClose,
  saving,
  users,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  saving: boolean;
  users: AssignableUser[];
  onSubmit: (payload: FormState) => void;
}) {
  const { t } = useLang();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const assigneeOptions = [
    { value: "none", label: t("Unassigned") },
    ...users.map((u) => ({ value: String(u.id), label: u.name })),
  ];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;

    const page = form.page === "other" ? form.pageOther.trim() : form.page;
    onSubmit({
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      page,
    });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[560px] m-4">
      <div className="no-scrollbar relative max-h-[85vh] w-full max-w-[560px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {t("Report a Task")}
        </h4>
        <p className="mb-6 mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("Describe the bug or menu issue you found.")}
        </p>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>{t("Title")}</Label>
            <Input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder={t("Short summary of the issue")}
              required
            />
          </div>
          <div>
            <Label>{t("Category")}</Label>
            <Select
              options={CATEGORY_OPTIONS}
              placeholder={t("Select category")}
              defaultValue={form.category}
              onChange={(v) => set("category", v)}
            />
          </div>
          <div>
            <Label>{t("Priority")}</Label>
            <Select
              options={PRIORITY_OPTIONS}
              placeholder={t("Select priority")}
              defaultValue={form.priority}
              onChange={(v) => set("priority", v)}
            />
          </div>
          <div>
            <Label>{t("Assigned To")}</Label>
            <Select
              options={assigneeOptions}
              placeholder={t("Select user")}
              defaultValue={form.assigned_to}
              onChange={(v) => set("assigned_to", v)}
            />
          </div>
          <div>
            <Label>{t("Page / Menu")}</Label>
            <Select
              options={[
                { value: "", label: t("Not specific") },
                ...PAGE_OPTIONS.map((page) => ({ value: page, label: t(page) })),
                { value: "other", label: t("Other") },
              ]}
              placeholder={t("Select a page")}
              defaultValue={form.page}
              onChange={(v) => set("page", v)}
            />
          </div>
          {form.page === "other" && (
            <div>
              <Label>{t("Page name")}</Label>
              <Input
                type="text"
                value={form.pageOther}
                onChange={(e) => set("pageOther", e.target.value)}
                placeholder={t("e.g. Login page")}
              />
            </div>
          )}
          <div className="sm:col-span-2">
            <Label>{t("Description")}</Label>
            <TextArea
              value={form.description}
              onChange={(v) => set("description", v)}
              placeholder={t("What happened? What did you expect?")}
              rows={4}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>{t("Screenshot (optional)")}</Label>
            <FileInput
              onChange={(e) => set("attachment", e.target.files?.[0] ?? null)}
            />
            <p className="mt-1 text-theme-xs text-gray-400">
              {t("PNG, JPG, WEBP, or GIF up to 4 MB.")}
            </p>
          </div>
          <div className="sm:col-span-2 mt-2 flex items-center justify-end gap-3">
            <Button size="sm" variant="outline" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button size="sm" disabled={saving} startIcon={<PaperPlaneIcon />}>
              {saving ? t("Submitting...") : t("Submit Task")}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
