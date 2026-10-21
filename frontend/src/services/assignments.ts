import api from "./api";
import type { Asset } from "./assets";
import type { Room } from "./rooms";
import type { Team } from "./teams";
import type { User } from "./users";

export interface AssetAssignment {
  id: number;
  assigned_date: string | null;
  notes: string | null;
  asset: Asset | null;
  team: Team | null;
  room: Room | null;
  assigned_user: User | null;
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

export interface AssignmentFilters {
  search?: string;
  asset_id?: string;
  page?: number;
  per_page?: number;
}

export function fetchAssignments(filters: AssignmentFilters = {}) {
  const params: Record<string, string | number> = {};
  if (filters.search) params.search = filters.search;
  if (filters.asset_id) params.asset_id = filters.asset_id;
  if (filters.page) params.page = filters.page;
  if (filters.per_page) params.per_page = filters.per_page;
  return api.get<Paginated<AssetAssignment>>("/assignments", { params });
}

export function fetchAssignment(id: number) {
  return api.get<{ assignment: AssetAssignment }>(`/assignments/${id}`);
}

/**
 * Every placement record matching the filters, fetched a page at a time.
 *
 * The API caps a page at 100 rows, so an export that must hold the whole list
 * walks the pages rather than asking for one big list.
 */
export async function fetchAllAssignments(filters: AssignmentFilters = {}) {
  const first = await fetchAssignments({ ...filters, page: 1, per_page: 100 });
  const rows = [...first.data.data];
  const lastPage = first.data.meta.last_page;

  for (let page = 2; page <= lastPage; page += 1) {
    const res = await fetchAssignments({ ...filters, page, per_page: 100 });
    rows.push(...res.data.data);
  }

  return rows;
}

export function createAssignment(payload: Record<string, unknown>) {
  return api.post<{ message: string; assignment: AssetAssignment }>(
    "/assignments",
    payload,
  );
}