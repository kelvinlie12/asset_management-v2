import api from "./api";
import type { Room } from "./rooms";
import type { Team } from "./teams";
import type { User } from "./users";

export interface Vehicle {
  id: number;
  asset_code: string;
  photo: string | null;
  photo_url: string | null;
  brand: string;
  model: string;
  year: string | null;
  plate_number: string | null;
  engine_number: string | null;
  chassis_number: string | null;
  placement_date: string | null;
  purchase_date: string | null;
  purchase_price: string | null;
  last_tax_amount: string | null;
  tax_due_date: string | null;
  tax_status: string | null;
  tax_health: { key: VehicleTaxHealth; label: string; color: string } | null;
  description: string | null;
  condition: string;
  usage_status: string;
  team: Team | null;
  room: Room | null;
  assigned_user: User | null;
  latest_tax: VehicleTax | null;
  created_at?: string;
  updated_at?: string;
}

export interface VehicleTax {
  id: number;
  vehicle_id: number;
  tax_due_date: string | null;
  pkb: string | null;
  swdkllj: string | null;
  opsen_pkb: string | null;
  administrative_fee: string | null;
  penalty: string | null;
  other_fee: string | null;
  total_tax: string | null;
  payment_date: string | null;
  payment_status: string;
  payment_proof: string | null;
  notes: string | null;
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

export const VEHICLE_CONDITION_OPTIONS = [
  { value: "GOOD", label: "Good" },
  { value: "DAMAGED", label: "Damaged" },
];

export const VEHICLE_USAGE_OPTIONS = [
  { value: "IN_USE", label: "In Use" },
  { value: "IN_STORAGE", label: "In Storage" },
];

export const VEHICLE_TAX_PAYMENT_OPTIONS = [
  { value: "UNPAID", label: "Belum Lunas" },
  { value: "PAID", label: "Lunas" },
];

export type VehicleTaxHealth = "paid" | "safe" | "soon" | "due_7" | "overdue";

export const VEHICLE_TAX_HEALTH_META: Record<
  VehicleTaxHealth,
  { label: string; color: "success" | "warning" | "error" }
> = {
  paid: { label: "Lunas", color: "success" },
  safe: { label: "Aman", color: "success" },
  soon: { label: "Segera Jatuh Tempo", color: "warning" },
  due_7: { label: "Akan Jatuh Tempo", color: "error" },
  overdue: { label: "Terlambat", color: "error" },
};

export const VEHICLE_TAX_OPTIONS = [
  { value: "paid", label: "Lunas" },
  { value: "safe", label: "Aman" },
  { value: "soon", label: "Segera Jatuh Tempo" },
  { value: "due_7", label: "Akan Jatuh Tempo (<=7 hari)" },
  { value: "overdue", label: "Terlambat" },
];

export interface VehicleFilters {
  search?: string;
  condition?: string;
  usage_status?: string;
  team_id?: string;
  room_id?: string;
  tax_status?: string;
  page?: number;
  per_page?: number;
}

export function formatRupiah(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return "-";
  return `Rp ${num.toLocaleString("id-ID")}`;
}

export function fetchVehicles(filters: VehicleFilters = {}) {
  const params: Record<string, string | number> = {};
  if (filters.search) params.search = filters.search;
  if (filters.condition) params.condition = filters.condition;
  if (filters.usage_status) params.usage_status = filters.usage_status;
  if (filters.team_id) params.team_id = filters.team_id;
  if (filters.room_id) params.room_id = filters.room_id;
  if (filters.tax_status) params.tax_status = filters.tax_status;
  if (filters.page) params.page = filters.page;
  if (filters.per_page) params.per_page = filters.per_page;
  return api.get<Paginated<Vehicle>>("/vehicles", { params });
}

export function fetchVehicle(id: number) {
  return api.get<{ vehicle: Vehicle }>(`/vehicles/${id}`);
}

/** Fleet size and tax standing of each unit the caller may see. */
export interface VehicleUnitSummary {
  team: Team;
  total: number;
  tax_paid: number;
  tax_overdue: number;
  tax_due_soon: number;
}

export function fetchVehicleUnitSummary() {
  return api.get<{ units: VehicleUnitSummary[] }>("/vehicles/unit-summary");
}

export function fetchVehicleCode() {
  return api.get<{ asset_code: string }>("/vehicles/generate-code");
}

/**
 * Every vehicle matching the filters, fetched a page at a time.
 *
 * The API caps a page at 100 rows, so an export that must hold the whole fleet
 * walks the pages rather than asking for one big list.
 */
export async function fetchAllVehicles(filters: VehicleFilters = {}) {
  const first = await fetchVehicles({ ...filters, page: 1, per_page: 100 });
  const rows = [...first.data.data];
  const lastPage = first.data.meta.last_page;

  for (let page = 2; page <= lastPage; page += 1) {
    const res = await fetchVehicles({ ...filters, page, per_page: 100 });
    rows.push(...res.data.data);
  }

  return rows;
}

export function createVehicle(payload: FormData | Record<string, unknown>) {
  return api.post<{ message: string; vehicle: Vehicle }>("/vehicles", payload);
}

export function updateVehicle(id: number, payload: FormData | Record<string, unknown>) {
  return api.put<{ message: string; vehicle: Vehicle }>(
    `/vehicles/${id}`,
    payload,
  );
}

export function deleteVehicle(id: number) {
  return api.delete<{ message: string }>(`/vehicles/${id}`);
}

// ---- Vehicle Taxes (nested under /vehicles/:id/taxes) ----

export function fetchVehicleTaxes(
  vehicleId: number,
  filters: { page?: number; per_page?: number } = {},
) {
  const params: Record<string, string | number> = {};
  if (filters.page) params.page = filters.page;
  if (filters.per_page) params.per_page = filters.per_page;
  return api.get<Paginated<VehicleTax>>(`/vehicles/${vehicleId}/taxes`, {
    params,
  });
}

export function createVehicleTax(
  vehicleId: number,
  payload: Record<string, unknown>,
) {
  return api.post<{ message: string; vehicle_tax: VehicleTax }>(
    `/vehicles/${vehicleId}/taxes`,
    payload,
  );
}

export function updateVehicleTax(
  vehicleId: number,
  taxId: number,
  payload: Record<string, unknown>,
) {
  return api.put<{ message: string; vehicle_tax: VehicleTax }>(
    `/vehicles/${vehicleId}/taxes/${taxId}`,
    payload,
  );
}

export function deleteVehicleTax(vehicleId: number, taxId: number) {
  return api.delete<{ message: string }>(
    `/vehicles/${vehicleId}/taxes/${taxId}`,
  );
}