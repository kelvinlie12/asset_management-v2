import api from "./api";
import type { Team } from "./teams";

/**
 * A working group inside a company (unit).
 *
 * Separate from Team (the company/unit that owns the data): a WorkTeam marks
 * who uses an asset, e.g. "asset A is used by the network team". The owning
 * company is kept in `team_id`, so two companies can each have their own
 * "Tim Jaringan".
 */
export interface WorkTeam {
  id: number;
  /** Owning company (unit); null = shared/global team. */
  team_id: number | null;
  team?: Team | null;
  name: string;
  description: string | null;
  status: string;
  /** Assets marked as used by this team. */
  assets_count?: number;
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

export interface WorkTeamFilters {
  search?: string;
  status?: string;
  team_id?: string;
  page?: number;
  per_page?: number;
}

export function fetchWorkTeams(filters: WorkTeamFilters = {}) {
  const params: Record<string, string | number> = {};
  if (filters.search) params.search = filters.search;
  if (filters.status) params.status = filters.status;
  if (filters.team_id) params.team_id = filters.team_id;
  if (filters.page) params.page = filters.page;
  if (filters.per_page) params.per_page = filters.per_page;
  return api.get<Paginated<WorkTeam>>("/work-teams", { params });
}

export function fetchWorkTeam(id: number) {
  return api.get<{ work_team: WorkTeam }>(`/work-teams/${id}`);
}

/**
 * Every team matching the filters, fetched a page at a time.
 *
 * The API caps a page at 100 rows, so an export that must hold the whole list
 * walks the pages rather than asking for one big list.
 */
export async function fetchAllWorkTeams(filters: WorkTeamFilters = {}) {
  const first = await fetchWorkTeams({ ...filters, page: 1, per_page: 100 });
  const rows = [...first.data.data];
  const lastPage = first.data.meta.last_page;

  for (let page = 2; page <= lastPage; page += 1) {
    const res = await fetchWorkTeams({ ...filters, page, per_page: 100 });
    rows.push(...res.data.data);
  }

  return rows;
}

export interface WorkTeamPayload {
  name: string;
  description?: string | null;
  status?: string;
  /** Owning company (unit). Scoped users are pinned to their own server-side. */
  team_id?: number | null;
}

export function createWorkTeam(payload: WorkTeamPayload) {
  return api.post<{ message: string; work_team: WorkTeam }>(
    "/work-teams",
    payload,
  );
}

export function updateWorkTeam(id: number, payload: WorkTeamPayload) {
  return api.put<{ message: string; work_team: WorkTeam }>(
    `/work-teams/${id}`,
    payload,
  );
}

export function deleteWorkTeam(id: number) {
  return api.delete<{ message: string }>(`/work-teams/${id}`);
}
