import api from "./api";
import type { User } from "./users";

export interface AuditLog {
  id: number;
  event: "created" | "updated" | "deleted";
  event_label: string;
  auditable_type: string;
  auditable_label: string;
  auditable_id: number;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  url: string | null;
  ip_address: string | null;
  user_agent: string | null;
  user: User | null;
  created_at: string | null;
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

export const EVENT_OPTIONS = [
  { value: "created", label: "Created" },
  { value: "updated", label: "Updated" },
  { value: "deleted", label: "Deleted" },
];

export interface AuditLogFilters {
  search?: string;
  event?: string;
  auditable_type?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}

export function fetchAuditLogs(filters: AuditLogFilters = {}) {
  const params: Record<string, string | number> = {};
  if (filters.search) params.search = filters.search;
  if (filters.event) params.event = filters.event;
  if (filters.auditable_type) params.auditable_type = filters.auditable_type;
  if (filters.user_id) params.user_id = filters.user_id;
  if (filters.date_from) params.date_from = filters.date_from;
  if (filters.date_to) params.date_to = filters.date_to;
  if (filters.page) params.page = filters.page;
  if (filters.per_page) params.per_page = filters.per_page;
  return api.get<Paginated<AuditLog>>("/audit-logs", { params });
}

export function fetchAuditLog(id: number) {
  return api.get<{ log: AuditLog }>(`/audit-logs/${id}`);
}