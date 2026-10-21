import api from "./api";

export interface NetworkNodeAsset {
  id: number;
  asset_code: string;
  name: string;
  description: string | null;
  photo_url: string | null;
}

export interface NetworkNodeRoom {
  id: number;
  name: string;
  is_storage: boolean;
}

export interface NetworkNode {
  id: number;
  asset_id: number;
  asset: NetworkNodeAsset | null;
  room_id: number | null;
  room: NetworkNodeRoom | null;
  parent_id: number | null;
  node_type: string;
  label: string | null;
  pon_port: string | null;
  splitter_ratio: string | null;
  port_capacity: number | null;
  port_used: number | null;
  customer_count: number | null;
  rx_power_dbm: number | null;
  area: string | null;
  status: string;
  notes: string | null;
  children?: NetworkNode[] | null;
  created_at?: string;
  updated_at?: string;
}

export interface AvailableAsset {
  id: number;
  asset_code: string;
  name: string;
  description: string | null;
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

export const NODE_TYPE_OPTIONS = [
  { value: "OLT", label: "OLT" },
  { value: "ODC", label: "ODC" },
  { value: "ODP", label: "ODP" },
  { value: "SPLITTER", label: "Splitter" },
  { value: "ONT", label: "ONT" },
  { value: "SWITCH", label: "Switch" },
  { value: "ROUTER", label: "Router" },
  { value: "OTHER", label: "Other" },
];

export const NODE_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "MAINTENANCE", label: "Maintenance" },
];

export interface NetworkNodeFilters {
  search?: string;
  node_type?: string;
  status?: string;
  room_id?: string;
  page?: number;
  per_page?: number;
}

export function fetchNetworkNodes(filters: NetworkNodeFilters = {}) {
  const params: Record<string, string | number> = {};
  if (filters.search) params.search = filters.search;
  if (filters.node_type) params.node_type = filters.node_type;
  if (filters.status) params.status = filters.status;
  if (filters.room_id) params.room_id = filters.room_id;
  if (filters.page) params.page = filters.page;
  if (filters.per_page) params.per_page = filters.per_page;
  return api.get<Paginated<NetworkNode>>("/network-nodes", { params });
}

export function fetchNetworkNode(id: number) {
  return api.get<{ node: NetworkNode }>(`/network-nodes/${id}`);
}

/**
 * Every network node matching the filters, fetched a page at a time.
 *
 * The API caps a page at 100 rows, so an export that must hold the whole list
 * walks the pages rather than asking for one big list.
 */
export async function fetchAllNetworkNodes(filters: NetworkNodeFilters = {}) {
  const first = await fetchNetworkNodes({ ...filters, page: 1, per_page: 100 });
  const rows = [...first.data.data];
  const lastPage = first.data.meta.last_page;

  for (let page = 2; page <= lastPage; page += 1) {
    const res = await fetchNetworkNodes({ ...filters, page, per_page: 100 });
    rows.push(...res.data.data);
  }

  return rows;
}

export interface NetworkNodePayload {
  asset_id?: number;
  room_id?: string | number;
  parent_id?: string | number | null;
  node_type?: string;
  label?: string | null;
  pon_port?: string | null;
  splitter_ratio?: string | null;
  port_capacity?: string | number | null;
  port_used?: string | number | null;
  customer_count?: string | number | null;
  rx_power_dbm?: string | number | null;
  area?: string | null;
  status?: string;
  notes?: string | null;
}

export function createNetworkNode(payload: NetworkNodePayload) {
  return api.post<{ message: string; node: NetworkNode }>(
    "/network-nodes",
    payload,
  );
}

export function updateNetworkNode(id: number, payload: NetworkNodePayload) {
  return api.put<{ message: string; node: NetworkNode }>(
    `/network-nodes/${id}`,
    payload,
  );
}

export function deleteNetworkNode(id: number, warehouseRoomId: number) {
  return api.delete<{ message: string }>(`/network-nodes/${id}`, {
    data: { warehouse_room_id: warehouseRoomId },
  });
}

export function fetchNetworkTree(roomId?: string) {
  const params: Record<string, string> = {};
  if (roomId) params.room_id = roomId;
  return api.get<{ tree: NetworkNode[] }>("/network-nodes/tree", { params });
}

export function fetchAvailableAssets(search?: string) {
  const params: Record<string, string> = {};
  if (search) params.search = search;
  return api.get<{ assets: AvailableAsset[] }>("/network-nodes/available-assets", {
    params,
  });
}