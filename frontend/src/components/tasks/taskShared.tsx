import { useEffect, useRef, useState } from "react";
import type {
  TaskActivity,
  TaskCategory,
  TaskPriority,
  TaskStatus,
} from "../../services/tasks";

export type BadgeColor = "primary" | "success" | "error" | "warning" | "info" | "light" | "dark";

export const STATUS_META: Record<TaskStatus, { label: string; color: BadgeColor }> = {
  open: { label: "Open", color: "warning" },
  in_progress: { label: "In Progress", color: "info" },
  paused: { label: "Paused", color: "dark" },
  resolved: { label: "Resolved", color: "success" },
  rejected: { label: "Rejected", color: "error" },
};

export const PRIORITY_META: Record<TaskPriority, { label: string; color: BadgeColor }> = {
  low: { label: "Low", color: "light" },
  medium: { label: "Medium", color: "warning" },
  high: { label: "High", color: "error" },
};

export const CATEGORY_META: Record<TaskCategory, { label: string; color: BadgeColor }> = {
  bug_system: { label: "System Bug", color: "error" },
  menu: { label: "Menu / Page", color: "info" },
  other: { label: "Other", color: "light" },
};

export function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Turn a history entry into a sentence. The action verb is translated, while
// the names/values it references come from the server-side snapshot in `meta`.
export function activityText(
  activity: TaskActivity,
  t: (s: string, vars?: Record<string, string | number>) => string,
): string {
  const meta = activity.meta ?? {};
  const priority = (value: unknown) =>
    value
      ? t(PRIORITY_META[value as TaskPriority]?.label ?? String(value))
      : "-";

  switch (activity.action) {
    case "created":
      return t("created the task");
    case "started":
      return t("started the task");
    case "resumed":
      return t("resumed the task");
    case "paused":
      return t("paused the task");
    case "resolved":
      return t("resolved the task");
    case "rejected":
      return t("rejected the task");
    case "reopened":
      return t("reopened the task");
    case "priority_changed":
      return t("changed priority from {from} to {to}", {
        from: priority(meta.from),
        to: priority(meta.to),
      });
    case "assigned":
      return t("assigned the task to {name}", { name: String(meta.to_name ?? "-") });
    case "unassigned":
      return t("unassigned the task");
    case "status_changed":
      return t("changed the status");
    default:
      return activity.action;
  }
}

// A person's avatar: their uploaded profile photo when they have one,
// otherwise their initials as a stand-in.
export function PersonAvatar({
  name,
  avatarUrl,
  tone,
  title,
  className = "",
}: {
  name?: string | null;
  avatarUrl?: string | null;
  tone: "brand" | "muted";
  title: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={`flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-theme-xs font-medium ring-2 ring-white dark:ring-gray-900 ${
        tone === "brand"
          ? "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400"
          : "bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-gray-400"
      } ${className}`}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={name ?? "User"} className="h-full w-full object-cover" />
      ) : (
        (name || "?").charAt(0).toUpperCase()
      )}
    </span>
  );
}

// Stopwatch formatting: hours:minutes:seconds, e.g. "01:23:45".
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

// A live stopwatch. The server sends the seconds already worked; while the run
// is ticking we keep counting locally so the display stays in sync.
export function WorkTimer({
  baseSeconds,
  running,
  className = "",
}: {
  baseSeconds: number;
  running: boolean;
  className?: string;
}) {
  const [elapsed, setElapsed] = useState(baseSeconds);
  const anchorRef = useRef(Date.now());

  useEffect(() => {
    anchorRef.current = Date.now();
    setElapsed(baseSeconds);
  }, [baseSeconds, running]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setElapsed(baseSeconds + Math.floor((Date.now() - anchorRef.current) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, baseSeconds]);

  return <span className={className}>{formatDuration(elapsed)}</span>;
}
