import api from "./api";
import type { Team } from "./teams";

export interface Room {
  id: number;
  name: string;
  location: string | null;
  description: string | null;
  status: string;
  is_storage?: boolean;
  assets_count?: number;
  /** A room belongs to exactly one unit. */
  team_id?: number | null;
  team?: Team | null;
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

export interface RoomFilters {
  search?: string;
  status?: string;
  team_id?: number;
  page?: number;
  per_page?: number;
}

export function fetchRooms(filters: RoomFilters = {}) {
  const params: Record<string, string | number> = {};
  if (filters.search) params.search = filters.search;
  if (filters.status) params.status = filters.status;
  if (filters.team_id) params.team_id = filters.team_id;
  if (filters.page) params.page = filters.page;
  if (filters.per_page) params.per_page = filters.per_page;
  return api.get<Paginated<Room>>("/rooms", { params });
}

export function fetchRoom(id: number) {
  return api.get<{ room: Room }>(`/rooms/${id}`);
}

/**
 * Every room matching the filters, fetched a page at a time.
 *
 * The API caps a page at 100 rows, so an export that must hold the whole list
 * walks the pages rather than asking for one big list.
 */
export async function fetchAllRooms(filters: RoomFilters = {}) {
  const first = await fetchRooms({ ...filters, page: 1, per_page: 100 });
  const rows = [...first.data.data];
  const lastPage = first.data.meta.last_page;

  for (let page = 2; page <= lastPage; page += 1) {
    const res = await fetchRooms({ ...filters, page, per_page: 100 });
    rows.push(...res.data.data);
  }

  return rows;
}

export function createRoom(payload: Record<string, unknown>) {
  return api.post<{ message: string; room: Room }>("/rooms", payload);
}

export function updateRoom(id: number, payload: Record<string, unknown>) {
  return api.put<{ message: string; room: Room }>(`/rooms/${id}`, payload);
}

export function deleteRoom(id: number) {
  return api.delete<{ message: string }>(`/rooms/${id}`);
}