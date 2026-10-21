import api from "./api";
import type { Asset } from "./assets";

export interface Purchase {
  id: number;
  purchase_number: string;
  supplier: string;
  invoice_number: string;
  purchase_date: string | null;
  amount: string;
  notes: string | null;
  proof_path: string | null;
  proof_url: string | null;
  asset: Asset | null;
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

export interface PurchaseFilters {
  search?: string;
  page?: number;
  per_page?: number;
}

export function fetchPurchases(filters: PurchaseFilters = {}) {
  const params: Record<string, string | number> = {};
  if (filters.search) params.search = filters.search;
  if (filters.page) params.page = filters.page;
  if (filters.per_page) params.per_page = filters.per_page;
  return api.get<Paginated<Purchase>>("/purchases", { params });
}

export function fetchPurchase(id: number) {
  return api.get<{ purchase: Purchase }>(`/purchases/${id}`);
}

/**
 * Every purchase matching the filters, fetched a page at a time.
 *
 * The API caps a page at 100 rows, so an export that must hold the whole list
 * walks the pages rather than asking for one big list.
 */
export async function fetchAllPurchases(filters: PurchaseFilters = {}) {
  const first = await fetchPurchases({ ...filters, page: 1, per_page: 100 });
  const rows = [...first.data.data];
  const lastPage = first.data.meta.last_page;

  for (let page = 2; page <= lastPage; page += 1) {
    const res = await fetchPurchases({ ...filters, page, per_page: 100 });
    rows.push(...res.data.data);
  }

  return rows;
}

export function createPurchase(
  payload: Record<string, unknown> & { proof: File },
) {
  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      form.append(key, value as Blob | string);
    }
  });
  return api.post<{ message: string; purchase: Purchase }>("/purchases", form);
}

export function deletePurchase(id: number) {
  return api.delete<{ message: string }>(`/purchases/${id}`);
}