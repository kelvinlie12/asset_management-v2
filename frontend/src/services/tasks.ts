import api from "./api";

export type TaskCategory = "bug_system" | "menu" | "other";
export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "open" | "in_progress" | "paused" | "resolved" | "rejected";

export type TaskActivityAction =
  | "created"
  | "started"
  | "resumed"
  | "paused"
  | "resolved"
  | "rejected"
  | "reopened"
  | "status_changed"
  | "priority_changed"
  | "assigned"
  | "unassigned";

export interface TaskActivity {
  id: number;
  action: TaskActivityAction;
  /** Extra detail for the action, e.g. old/new priority or the assignee name. */
  meta: Record<string, string | number | null> | null;
  user: TaskPerson | null;
  created_at: string;
}

export interface TaskComment {
  id: number;
  body: string;
  user: TaskPerson | null;
  /** Set once the author edits the message. */
  edited_at: string | null;
  created_at: string;
}

export interface TaskPerson {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar_url: string | null;
}

export interface Task {
  id: number;
  title: string;
  category: TaskCategory;
  /** The menu / page the report is about. */
  page: string | null;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  /** Server-relative path, e.g. "uploads/tasks/task_abc.png". */
  attachment_path: string | null;
  /** Absolute URL built from APP_URL. */
  attachment_url: string | null;
  reporter: TaskPerson | null;
  handler: TaskPerson | null;
  /** Unit the report belongs to (its reporter's team), or null when unit-less. */
  team_id: number | null;
  team: { id: number; name: string } | null;
  /** Id of the user the report is assigned to, or null when unassigned. */
  assigned_to: number | null;
  assignee: TaskPerson | null;
  /** Present on the detail endpoint; newest first. */
  activities?: TaskActivity[];
  /** Present on the detail endpoint; oldest first. */
  comments?: TaskComment[];
  /** Present on the list endpoint. */
  comments_count?: number;
  /** Seconds worked from start to resolve, excluding pauses (includes the run still ticking). */
  worked_seconds: number;
  /** True while the stopwatch is counting. */
  timer_running: boolean;
  /** Start of the run currently ticking, or null. */
  work_started_at: string | null;
  resolved_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AssignableUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface Paginated<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export const CATEGORY_OPTIONS = [
  { value: "bug_system", label: "System Bug" },
  { value: "menu", label: "Menu / Page" },
  { value: "other", label: "Other" },
];

export const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "paused", label: "Paused" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
];

export interface TaskFilters {
  search?: string;
  status?: string;
  category?: string;
  priority?: string;
  /** "", "me", "none", or a user id. */
  assigned_to?: string;
  /** Only meaningful for global viewers (super admin / tasks.manage_all). */
  team_id?: string;
  page?: number;
  per_page?: number;
}

// In development VITE_API_URL is empty and uploads are reached through the Vite
// proxy, so a relative path works. In production the backend lives on its own
// origin, so the absolute URL is the safe choice.
const apiRoot = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

/**
 * Resolve an attachment to a URL the browser can load in the current environment.
 */
export function resolveTaskAttachment(
  task: Pick<Task, "attachment_path" | "attachment_url">,
): string | null {
  if (!apiRoot && task.attachment_path) return `/${task.attachment_path}`;
  return task.attachment_url;
}

export function fetchTasks(filters: TaskFilters = {}) {
  const params: Record<string, string | number> = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params[key] = value;
    }
  });
  return api.get<Paginated<Task>>("/tasks", { params });
}

export function fetchTask(id: number) {
  return api.get<{ task: Task }>(`/tasks/${id}`);
}

export interface CreateTaskPayload {
  title: string;
  category: TaskCategory;
  page?: string | null;
  description: string;
  priority: TaskPriority;
  /** Optional assignee chosen while filing the report. */
  assigned_to?: number | null;
  attachment?: File | null;
}

export function createTask(payload: CreateTaskPayload) {
  // Sent as multipart/form-data so the optional screenshot can ride along.
  const form = new FormData();
  form.append("title", payload.title);
  form.append("category", payload.category);
  if (payload.page) form.append("page", payload.page);
  form.append("description", payload.description);
  form.append("priority", payload.priority);
  if (payload.assigned_to) form.append("assigned_to", String(payload.assigned_to));
  if (payload.attachment) form.append("attachment", payload.attachment);
  return api.post<{ task: Task }>("/tasks", form);
}

export function updateTask(
  id: number,
  payload: { status?: TaskStatus; priority?: TaskPriority; assigned_to?: number | null },
) {
  return api.put<{ task: Task }>(`/tasks/${id}`, payload);
}

/** Active users a report may be assigned to. */
export function fetchAssignableUsers() {
  return api.get<{ users: AssignableUser[] }>("/tasks/assignable-users");
}

/** Post a message to a report's discussion. */
export function createComment(taskId: number, body: string) {
  return api.post<{ comment: TaskComment }>(`/tasks/${taskId}/comments`, { body });
}

/** Edit one of your own discussion messages. */
export function updateComment(taskId: number, commentId: number, body: string) {
  return api.put<{ comment: TaskComment }>(`/tasks/${taskId}/comments/${commentId}`, { body });
}

/** Delete a discussion message (author or owner/admin). */
export function deleteComment(taskId: number, commentId: number) {
  return api.delete(`/tasks/${taskId}/comments/${commentId}`);
}

export function deleteTask(id: number) {
  return api.delete(`/tasks/${id}`);
}
