import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import PageMeta from "../components/common/PageMeta";
import TextArea from "../components/form/input/TextArea";
import Label from "../components/form/Label";
import Select from "../components/form/Select";
import Badge from "../components/ui/badge/Badge";
import Button from "../components/ui/button/Button";
import { useAuth, hasPermission } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import {
  ChevronLeftIcon,
  PaperPlaneIcon,
  PlayIcon,
  PauseIcon,
  CheckLineIcon,
  TimeIcon,
} from "../icons";
import {
  fetchTask,
  fetchAssignableUsers,
  updateTask,
  createComment,
  updateComment,
  deleteComment,
  resolveTaskAttachment,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type AssignableUser,
} from "../services/tasks";
import {
  STATUS_META,
  PRIORITY_META,
  CATEGORY_META,
  formatDate,
  activityText,
  PersonAvatar,
  WorkTimer,
} from "../components/tasks/taskShared";
import { useToast } from "../hooks/useToast";
import { extractApiError as extractError } from "../utils/error";

/**
 * Full ticket view. The Task list opens it in a new browser tab, so a report
 * can be read, discussed and worked on next to the list.
 */
export default function TaskDetail() {
  const { id } = useParams();
  const taskId = Number(id);
  const { t } = useLang();
  const { user } = useAuth();
  const { pushToast } = useToast();

  // A super admin — or a user handed the cross-unit grant — may open any
  // unit's report; everyone else may only open their own unit's reports.
  // Mirrors the backend's Task::userSeesEveryTask().
  const canViewAll =
    user?.role === "super_admin" ||
    (user?.permissions?.includes("tasks.manage_all") ?? false);
  const canView = hasPermission(user, "tasks.view") || canViewAll;
  // Owners/admins manage the report (reassign / delete); the user it is
  // assigned to does the actual work on it.
  const canAssign = hasPermission(user, "tasks.update") || canViewAll;
  const currentUserId = user?.id ?? null;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AssignableUser[]>([]);

  // Draft values of the triage form.
  const [status, setStatus] = useState<TaskStatus>("open");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  // The shared Select uses "" for "nothing picked", so "none" stands for an
  // explicit "Unassigned" choice.
  const [assignee, setAssignee] = useState<string>("none");

  const [working, setWorking] = useState(false);

  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const applyTask = useCallback((next: Task) => {
    setTask(next);
    setStatus(next.status);
    setPriority(next.priority);
    setAssignee(next.assigned_to ? String(next.assigned_to) : "none");
  }, []);

  useEffect(() => {
    if (!canView) return;
    if (!Number.isFinite(taskId) || taskId <= 0) {
      setError(t("Task not found."));
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    fetchTask(taskId)
      .then((res) => {
        if (active) applyTask(res.data.task);
      })
      .catch((err) => {
        if (active) setError(extractError(err, t("Failed to load tasks.")));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, canView]);

  useEffect(() => {
    if (!canView) return;
    let active = true;
    fetchAssignableUsers()
      .then((res) => {
        if (active) setUsers(res.data.users);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [canView]);

  async function submitUpdate(payload: {
    status?: TaskStatus;
    priority?: TaskPriority;
    assigned_to?: number | null;
  }) {
    if (!task) return;
    setWorking(true);
    try {
      const res = await updateTask(task.id, payload);
      applyTask(res.data.task);
      pushToast("success", t("Task updated."));
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to update task.")));
    } finally {
      setWorking(false);
    }
  }

  // Take the report for yourself so you can start working on it. The server
  // records the assignment in the report's history.
  async function claimTask() {
    if (currentUserId == null) return;
    await submitUpdate({ assigned_to: currentUserId });
  }

  async function submitComment() {
    const body = comment.trim();
    if (!task || !body) return;
    setPosting(true);
    try {
      const res = await createComment(task.id, body);
      const created = res.data.comment;
      setTask((prev) =>
        prev ? { ...prev, comments: [...(prev.comments ?? []), created] } : prev,
      );
      setComment("");
      pushToast("success", t("Comment posted."));
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to post comment.")));
    } finally {
      setPosting(false);
    }
  }

  async function removeComment(commentId: number) {
    if (!task) return;
    try {
      await deleteComment(task.id, commentId);
      setTask((prev) =>
        prev
          ? { ...prev, comments: (prev.comments ?? []).filter((c) => c.id !== commentId) }
          : prev,
      );
      setEditingId((prev) => (prev === commentId ? null : prev));
      pushToast("success", t("Comment deleted."));
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to delete comment.")));
    }
  }

  function startEdit(commentId: number, body: string) {
    setEditingId(commentId);
    setEditBody(body);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditBody("");
  }

  async function saveEdit() {
    const commentId = editingId;
    const body = editBody.trim();
    if (!task || commentId === null || !body) return;
    setSavingEdit(true);
    try {
      const res = await updateComment(task.id, commentId, body);
      const updated = res.data.comment;
      setTask((prev) =>
        prev
          ? {
              ...prev,
              comments: (prev.comments ?? []).map((c) => (c.id === updated.id ? updated : c)),
            }
          : prev,
      );
      cancelEdit();
      pushToast("success", t("Comment updated."));
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to update comment.")));
    } finally {
      setSavingEdit(false);
    }
  }

  if (!canView) {
    return (
      <>
        <PageMeta title={`${t("Task")} | ${t("Access Denied")}`} description={t("Task management")} />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-error-600 dark:text-error-400">
            {t("You do not have permission to view tasks.")}
          </p>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03]">
        {t("Loading...")}
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-sm text-error-600 dark:text-error-400">
          {error ?? t("Task not found.")}
        </p>
        <Link
          to="/tasks"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-brand-500 hover:underline"
        >
          <ChevronLeftIcon />
          {t("Back to Tasks")}
        </Link>
      </div>
    );
  }

  const attachment = resolveTaskAttachment(task);
  // Only the user a report is assigned to may work on it: drive its status and
  // priority. Owners/admins can still (re)assign it, but not work it.
  const isAssignee = currentUserId !== null && task.assigned_to === currentUserId;
  const canWork = isAssignee;
  const isOpen = task.status === "open";
  // A report that has been worked on is frozen to its assignee. It can only be
  // pointed at somebody else once the assignee reopens it.
  const canReassignNow = canAssign && isOpen;
  // Anybody may pick up a report, but only while it is still open.
  const canClaim = isOpen && !isAssignee;
  const assigneeChanged =
    canReassignNow && assignee !== (task.assigned_to ? String(task.assigned_to) : "none");
  // Only the fields this viewer is allowed to edit count towards "dirty".
  const dirty =
    (canWork && (status !== task.status || priority !== task.priority)) || assigneeChanged;

  // Which quick actions make sense for the report's current status.
  const canStart = task.status === "open" || task.status === "paused";
  const canPause = task.status === "in_progress";
  const canResolve = ["open", "in_progress", "paused"].includes(task.status);
  // Reopening returns the report to "open"; it is also how the assignee
  // releases it so it can be reassigned.
  const canReopen = task.status !== "open";

  const assigneeOptions = [
    { value: "none", label: t("Unassigned") },
    ...users.map((u) => ({ value: String(u.id), label: u.name })),
  ];

  return (
    <>
      <PageMeta
        title={`#${task.id} ${task.title}`}
        description={t("Task Details")}
      />

      <div className="space-y-6">
        {/* Header: back link, title, badges and the quick workflow buttons */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <Link
            to="/tasks"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-500 dark:text-gray-400"
          >
            <ChevronLeftIcon />
            {t("Back to Tasks")}
          </Link>

          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-theme-xs text-gray-400 dark:text-gray-500">
                {t("Task")} #{task.id}
              </p>
              <h3 className="mt-1 break-words text-xl font-semibold text-gray-800 dark:text-white/90">
                {task.title}
              </h3>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge size="sm" variant="light" color={CATEGORY_META[task.category]?.color ?? "light"}>
                  {t(CATEGORY_META[task.category]?.label ?? task.category)}
                </Badge>
                <Badge size="sm" variant="light" color={STATUS_META[task.status]?.color ?? "light"}>
                  {t(STATUS_META[task.status]?.label ?? task.status)}
                </Badge>
                <Badge size="sm" variant="light" color={PRIORITY_META[task.priority]?.color ?? "light"}>
                  {t(PRIORITY_META[task.priority]?.label ?? task.priority)}
                </Badge>
              </div>
            </div>

            {canWork && (
              <div className="flex flex-wrap items-center gap-2">
                {canStart && (
                  <Button
                    size="sm"
                    startIcon={<PlayIcon />}
                    disabled={working}
                    onClick={() => submitUpdate({ status: "in_progress" })}
                  >
                    {task.status === "paused" ? t("Resume") : t("Start")}
                  </Button>
                )}
                {canPause && (
                  <Button
                    size="sm"
                    variant="outline"
                    startIcon={<PauseIcon />}
                    disabled={working}
                    onClick={() => submitUpdate({ status: "paused" })}
                  >
                    {t("Pause")}
                  </Button>
                )}
                {canResolve && (
                  <Button
                    size="sm"
                    startIcon={<CheckLineIcon />}
                    disabled={working}
                    onClick={() => submitUpdate({ status: "resolved" })}
                  >
                    {t("Resolve")}
                  </Button>
                )}
                {canReopen && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={working}
                    onClick={() => submitUpdate({ status: "open" })}
                  >
                    {t("Reopen")}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main column: description, screenshot, discussion */}
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
              <Label>{t("Description")}</Label>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-white/90">
                {task.description}
              </p>

              {attachment && (
                <div className="mt-5">
                  <Label>{t("Screenshot")}</Label>
                  <a href={attachment} target="_blank" rel="noreferrer">
                    <img
                      src={attachment}
                      alt={t("Screenshot")}
                      className="mt-1 max-h-96 w-auto max-w-full rounded-xl border border-gray-200 dark:border-gray-700"
                    />
                  </a>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("Discussion")}
              </p>

              <div className="mt-4 space-y-4">
                {!(task.comments && task.comments.length > 0) && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("No comments yet. Start the discussion.")}
                  </p>
                )}
                {(task.comments ?? []).map((c) => {
                  const isOwner = currentUserId !== null && c.user?.id === currentUserId;
                  const canEditComment = isOwner;
                  const canDeleteComment = canAssign || isOwner;
                  const editing = editingId === c.id;
                  return (
                    <div key={c.id} className="flex items-start gap-3">
                      <PersonAvatar
                        name={c.user?.name}
                        avatarUrl={c.user?.avatar_url}
                        tone="brand"
                        title={c.user?.name ?? t("System")}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                            {c.user?.name ?? t("System")}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-theme-xs text-gray-400 dark:text-gray-500">
                              {formatDate(c.created_at)}
                              {!!c.edited_at && ` · ${t("edited")}`}
                            </span>
                            {!editing && canEditComment && (
                              <button
                                type="button"
                                onClick={() => startEdit(c.id, c.body)}
                                className="text-theme-xs text-brand-500 hover:underline"
                              >
                                {t("Edit")}
                              </button>
                            )}
                            {!editing && canDeleteComment && (
                              <button
                                type="button"
                                onClick={() => removeComment(c.id)}
                                className="text-theme-xs text-error-500 hover:underline"
                              >
                                {t("Delete")}
                              </button>
                            )}
                          </div>
                        </div>
                        {editing ? (
                          <div className="mt-2">
                            <TextArea value={editBody} onChange={(v) => setEditBody(v)} rows={3} />
                            <div className="mt-2 flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="text-theme-xs text-gray-500 hover:underline dark:text-gray-400"
                              >
                                {t("Cancel")}
                              </button>
                              <Button
                                size="sm"
                                disabled={savingEdit || !editBody.trim()}
                                onClick={saveEdit}
                              >
                                {savingEdit ? t("Saving...") : t("Save")}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-300">
                            {c.body}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5">
                <TextArea
                  value={comment}
                  onChange={(v) => setComment(v)}
                  placeholder={t("Write a comment...")}
                  rows={3}
                />
                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    disabled={posting || !comment.trim()}
                    startIcon={<PaperPlaneIcon />}
                    onClick={submitComment}
                  >
                    {posting ? t("Sending...") : t("Send")}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Side column: facts, triage, history */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
              <div className="space-y-4">
                <div>
                  <Label>{t("Timer")}</Label>
                  {task.worked_seconds > 0 || task.timer_running ? (
                    <p className="inline-flex items-center gap-1.5 text-sm font-medium tabular-nums text-gray-800 dark:text-white/90">
                      <TimeIcon />
                      <WorkTimer baseSeconds={task.worked_seconds} running={task.timer_running} />
                      {task.timer_running ? (
                        <span className="text-theme-xs font-normal text-success-500">
                          {t("Running")}
                        </span>
                      ) : (
                        <span className="text-theme-xs font-normal text-gray-400 dark:text-gray-500">
                          {t("Stopped")}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-800 dark:text-white/90">{t("Not started")}</p>
                  )}
                </div>
                <div>
                  <Label>{t("Page / Menu")}</Label>
                  <p className="text-sm text-gray-800 dark:text-white/90">{task.page || "-"}</p>
                </div>
                <div>
                  <Label>{t("Team")}</Label>
                  <p className="text-sm text-gray-800 dark:text-white/90">
                    {task.team?.name ?? t("No team")}
                  </p>
                </div>
                <div>
                  <Label>{t("Reporter")}</Label>
                  <p className="text-sm text-gray-800 dark:text-white/90">
                    {task.reporter?.name ?? "-"}
                  </p>
                </div>
                <div>
                  <Label>{t("Assigned To")}</Label>
                  <p className="text-sm text-gray-800 dark:text-white/90">
                    {task.assignee?.name ?? t("Unassigned")}
                  </p>
                </div>
                <div>
                  <Label>{t("Handled by")}</Label>
                  <p className="text-sm text-gray-800 dark:text-white/90">
                    {task.handler?.name ?? "-"}
                  </p>
                </div>
                <div>
                  <Label>{t("Reported at")}</Label>
                  <p className="text-sm text-gray-800 dark:text-white/90">
                    {formatDate(task.created_at)}
                  </p>
                </div>
                {task.resolved_at && (
                  <div>
                    <Label>{t("Resolved at")}</Label>
                    <p className="text-sm text-gray-800 dark:text-white/90">
                      {formatDate(task.resolved_at)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {canWork ? t("Update Progress") : t("Triage")}
              </p>
              <p className="mb-4 mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
                {canWork
                  ? t("You are assigned to this task.")
                  : !isOpen
                    ? t("This task has already been worked on. Only the assignee can reopen it before it is reassigned.")
                    : canAssign
                      ? t("Assign the task to a teammate.")
                      : t("Assign this task to yourself to start working on it.")}
              </p>

              {/* Anybody may pick a report up while it is still open; only
                  owners/admins can hand it to somebody else (the dropdown
                  below). Once it has been worked on it is frozen to its
                  assignee until they reopen it. */}
              {canClaim && !canAssign && (
                <Button
                  size="sm"
                  disabled={working}
                  onClick={claimTask}
                >
                  {t("Assign to me")}
                </Button>
              )}

              {(canWork || canReassignNow) && (
                <div className="space-y-4">
                  {canWork && (
                    <div>
                      <Label>{t("Status")}</Label>
                      <Select
                        options={STATUS_OPTIONS}
                        placeholder={t("Select status")}
                        defaultValue={status}
                        onChange={(v) => setStatus(v as TaskStatus)}
                      />
                    </div>
                  )}
                  {canWork && (
                    <div>
                      <Label>{t("Priority")}</Label>
                      <Select
                        options={PRIORITY_OPTIONS}
                        placeholder={t("Select priority")}
                        defaultValue={priority}
                        onChange={(v) => setPriority(v as TaskPriority)}
                      />
                    </div>
                  )}
                  {canReassignNow && (
                    <div>
                      <Label>{t("Assigned To")}</Label>
                      <Select
                        options={assigneeOptions}
                        placeholder={t("Select user")}
                        defaultValue={assignee}
                        onChange={(v) => setAssignee(v)}
                      />
                    </div>
                  )}
                </div>
              )}
              {(canWork || canReassignNow) && (
                <div className="mt-4 flex justify-end">
                  <Button
                    size="sm"
                    disabled={working || !dirty}
                    onClick={() =>
                      submitUpdate({
                        ...(canWork ? { status, priority } : {}),
                        ...(canReassignNow
                          ? { assigned_to: assignee === "none" ? null : Number(assignee) }
                          : {}),
                      })
                    }
                  >
                    {working ? t("Saving...") : t("Save Changes")}
                  </Button>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("Activity History")}
              </p>
              {task.activities && task.activities.length > 0 ? (
                <ol className="mt-4 space-y-4">
                  {task.activities.map((activity) => (
                    <li key={activity.id} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-gray-400">
                        <TimeIcon />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800 dark:text-white/90">
                          <span className="font-medium">
                            {activity.user?.name ?? t("System")}
                          </span>{" "}
                          {activityText(activity, t)}
                        </p>
                        <p className="mt-0.5 text-theme-xs text-gray-400 dark:text-gray-500">
                          {formatDate(activity.created_at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {t("No activity yet.")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
