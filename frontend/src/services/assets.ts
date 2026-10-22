import api from "./api";
import type { Category } from "./categories";
import type { Room } from "./rooms";
import type { Team } from "./teams";
import type { WorkTeam } from "./workTeams";
import type { User } from "./users";
import type { Purchase } from "./purchases";
import type { AssetTransfer } from "./transfers";
import type { AssetDamage } from "./damages";
import type { NetworkNode } from "./networkNodes";

export interface Asset {
  id: number;
  asset_code: string;
  name: string;
  category: Category | null;
  photo: string | null;
  photo_url: string | null;
  purchase_price: string | null;
  purchase_date: string | null;
  placement_date: string | null;
  purchase_receipt: string | null;
  purchase_receipt_url: string | null;
  description: string | null;
  condition: string;
  usage_status: string;
  team: Team | null;
  work_team?: WorkTeam | null;
  room: Room | null;
  assigned_user: User | null;
  quantity: number;
  network_node?: NetworkNode | null;
  purchases?: Purchase[] | null;
  transfers?: AssetTransfer[] | null;
  assignments?: unknown[] | null;
  damages?: AssetDamage[] | null;
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

export const CONDITION_OPTIONS = [
  { value: "NEW", label: "Baru (New)" },
  { value: "USED", label: "Bekas (Used)" },
  { value: "DAMAGED", label: "Rusak (Damaged)" },
  { value: "REFURBISHED", label: "Rekondisi (Refurbished)" },
];

// "GOOD" is the legacy value used before the four conditions above existed.
export function conditionLabel(value: string | null | undefined): string {
  if (value === "GOOD") return "Baik (Good)";
  return CONDITION_OPTIONS.find((o) => o.value === value)?.label ?? value ?? "-";
}

export const USAGE_STATUS_OPTIONS = [
  { value: "IN_USE", label: "In Use" },
  { value: "IN_STORAGE", label: "In Storage" },
];

export interface AssetFilters {
  search?: string;
  condition?: string;
  usage_status?: string;
  category_id?: string;
  room_id?: string;
  team_id?: string;
  assigned_user_id?: string;
  page?: number;
  per_page?: number;
}

export function fetchAssets(filters: AssetFilters = {}) {
  const params: Record<string, string | number> = {};
  if (filters.search) params.search = filters.search;
  if (filters.condition) params.condition = filters.condition;
  if (filters.usage_status) params.usage_status = filters.usage_status;
  if (filters.category_id) params.category_id = filters.category_id;
  if (filters.room_id) params.room_id = filters.room_id;
  if (filters.team_id) params.team_id = filters.team_id;
  if (filters.assigned_user_id) params.assigned_user_id = filters.assigned_user_id;
  if (filters.page) params.page = filters.page;
  if (filters.per_page) params.per_page = filters.per_page;
  return api.get<Paginated<Asset>>("/assets", { params });
}

export function fetchAsset(id: number) {
  return api.get<{ asset: Asset }>(`/assets/${id}`);
}

/**
 * Every asset matching the filters, fetched a page at a time.
 *
 * The API caps a page at 100 rows, so an export that must hold the whole list
 * walks the pages rather than asking for one big list.
 */
export async function fetchAllAssets(filters: AssetFilters = {}) {
  const first = await fetchAssets({ ...filters, page: 1, per_page: 100 });
  const rows = [...first.data.data];
  const lastPage = first.data.meta.last_page;

  for (let page = 2; page <= lastPage; page += 1) {
    const res = await fetchAssets({ ...filters, page, per_page: 100 });
    rows.push(...res.data.data);
  }

  return rows;
}

export function fetchAssetCode(params: {
  category_id?: string | number;
  placement_date?: string;
} = {}) {
  const query: Record<string, string | number> = {};
  if (params.category_id) query.category_id = params.category_id;
  if (params.placement_date) query.placement_date = params.placement_date;
  return api.get<{
    asset_code: string;
    sequence: number;
    category_code: string | null;
  }>("/assets/generate-code", { params: query });
}

/**
 * Build an asset code in the format KODE-BULAN-TAHUN-URUT.
 *
 * Example: "ITE-10-2026-001" — category code, month and year of placement,
 * then the item's sequence. Kept in sync with Asset::buildAssetCode() on the
 * server so the value shown in the form is exactly what gets stored.
 */
export function buildAssetCode(
  categoryCode: string | null | undefined,
  placementDate: string | null | undefined,
  sequence: number,
): string {
  const prefix = categoryCode?.trim() ? categoryCode.trim().toUpperCase() : "AST";

  const base = placementDate ? new Date(placementDate) : new Date();
  const valid = !Number.isNaN(base.getTime()) ? base : new Date();
  const month = String(valid.getMonth() + 1).padStart(2, "0");
  const year = String(valid.getFullYear());
  const number = String(Math.max(sequence, 1)).padStart(3, "0");

  return `${prefix}-${month}-${year}-${number}`;
}

export interface AssetPayload {
  asset_code?: string;
  name?: string;
  category_id?: string | number | null;
  photo?: File | string | null;
  placement_date?: string | null;
  description?: string | null;
  condition?: string;
  usage_status?: string;
  quantity?: string | number;
  team_id?: string | number | null;
  work_team_id?: string | number | null;
  room_id?: string | number | null;
  assigned_user_id?: string | number | null;
}

function toFormData(payload: AssetPayload): FormData {
  const form = new FormData();
  (Object.entries(payload) as [keyof AssetPayload, unknown][]).forEach(
    ([key, value]) => {
      if (value === undefined || value === null) return;
      form.append(key, value as Blob | string);
    },
  );
  return form;
}

export function createAsset(payload: AssetPayload) {
  return api.post<{ message: string; asset: Asset }>(
    "/assets",
    toFormData(payload),
  );
}

export function updateAsset(id: number, payload: AssetPayload) {
  const form = toFormData(payload);
  form.append("_method", "PUT");
  return api.post<{ message: string; asset: Asset }>(
    `/assets/${id}`,
    form,
  );
}

export function deleteAsset(id: number) {
  return api.delete<{ message: string }>(`/assets/${id}`);
}