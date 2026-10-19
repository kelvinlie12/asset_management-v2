import api from "./api";
import type { Asset } from "./assets";
import type { Room } from "./rooms";
import type { Team } from "./teams";
import type { User } from "./users";

export interface AssetTransfer {
  id: number;
  transfer_date: string | null;
  reason: string | null;
  /** Photo proof of the transfer: server-relative path and absolute URL. */
  proof_path?: string | null;
  proof_url?: string | null;
  asset: Asset | null;
  from_team: Team | null;
  to_team: Team | null;
  from_room: Room | null;
  to_room: Room | null;
  from_user: User | null;
  to_user: User | null;
  performed_by: User | null;
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

export interface TransferFilters {
  search?: string;
  asset_id?: string;
  page?: number;
  per_page?: number;
}

export function fetchTransfers(filters: TransferFilters = {}) {
  const params: Record<string, string | number> = {};
  if (filters.search) params.search = filters.search;
  if (filters.asset_id) params.asset_id = filters.asset_id;
  if (filters.page) params.page = filters.page;
  if (filters.per_page) params.per_page = filters.per_page;
  return api.get<Paginated<AssetTransfer>>("/transfers", { params });
}

export function fetchTransfer(id: number) {
  return api.get<{ transfer: AssetTransfer }>(`/transfers/${id}`);
}

// The proof photo travels as a file, so transfers are sent as multipart form
// data. A null value is sent as an empty string so a cleared target (team,
// room or user) is still cleared on the server.
function toFormData(payload: Record<string, unknown>): FormData {
  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) return;
    form.append(key, value === null ? "" : (value as Blob | string));
  });
  return form;
}

export function createTransfer(payload: Record<string, unknown>) {
  return api.post<{ message: string; transfer: AssetTransfer }>(
    "/transfers",
    toFormData(payload),
  );
}
export function updateTransfer(id: number, payload: Record<string, unknown>) {
  const form = toFormData(payload);
  form.append("_method", "PUT");
  return api.post<{ message: string; transfer: AssetTransfer }>(
    `/transfers/${id}`,
    form,
  );
}
 
export function deleteTransfer(id: number) {
  return api.delete<{ message: string }>(`/transfers/${id}`);
}
 