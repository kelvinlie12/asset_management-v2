import api from "./api";

export interface Team {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  /** Server-relative path, e.g. "uploads/teams/logo_abc.png". */
  logo?: string | null;
  /** Absolute URL built from APP_URL. */
  logo_url?: string | null;
  status: string;
  users_count?: number;
  /** Rooms owned by this unit; counted, not listed. */
  rooms_count?: number;
  created_at?: string;
  updated_at?: string;
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

export const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export interface TeamFilters {
  search?: string;
  status?: string;
  page?: number;
  per_page?: number;
}

export function fetchTeams(filters: TeamFilters = {}) {
  const params: Record<string, string | number> = {};
  if (filters.search) params.search = filters.search;
  if (filters.status) params.status = filters.status;
  if (filters.page) params.page = filters.page;
  if (filters.per_page) params.per_page = filters.per_page;
  return api.get<Paginated<Team>>("/teams", { params });
}

export function fetchTeam(id: number) {
  return api.get<{ team: Team }>(`/teams/${id}`);
}

// In development VITE_API_URL is empty and the API is reached through the Vite
// proxy, so a relative path works. In production the backend lives on its own
// origin, so the absolute URL is the safe choice.
const apiRoot = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

/**
 * Resolve a unit's logo to a URL the browser can load in this environment.
 */
export function resolveTeamLogo(
  team: { logo?: string | null; logo_url?: string | null } | null | undefined,
): string | null {
  if (!team) return null;
  if (!apiRoot && team.logo) return `/${team.logo}`;
  return team.logo_url ?? null;
}

export interface TeamPayload {
  name: string;
  description?: string | null;
  status?: string;
  /** New logo file to upload. */
  logo?: File | null;
  /** Delete the stored logo (edit only). */
  remove_logo?: boolean;
}

function toFormData(payload: TeamPayload): FormData {
  const form = new FormData();
  form.append("name", payload.name);
  form.append("description", payload.description ?? "");
  if (payload.status) form.append("status", payload.status);
  if (payload.logo) form.append("logo", payload.logo);
  if (payload.remove_logo) form.append("remove_logo", "1");
  return form;
}

export function createTeam(payload: TeamPayload) {
  return api.post<{ message: string; team: Team }>(
    "/teams",
    toFormData(payload),
  );
}

export function updateTeam(id: number, payload: TeamPayload) {
  // PHP does not parse multipart bodies on PUT, so send POST + _method=PUT.
  const form = toFormData(payload);
  form.append("_method", "PUT");
  return api.post<{ message: string; team: Team }>(`/teams/${id}`, form);
}

export function deleteTeam(id: number) {
  return api.delete<{ message: string }>(`/teams/${id}`);
}