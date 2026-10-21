import api from "./api";
import type { Team } from "./teams";

export interface Category {
  id: number;
  /**
   * The unit that owns this copy of the category.
   * null = shared global category, kept for assets that belong to no unit.
   */
  team_id: number | null;
  team?: Team;
  name: string;
  code: string;
  description: string | null;
  status: string;
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

export interface CategoryFilters {
  search?: string;
  status?: string;
  team_id?: string;
  page?: number;
  per_page?: number;
}

export function fetchCategories(filters: CategoryFilters = {}) {
  const params: Record<string, string | number> = {};
  if (filters.search) params.search = filters.search;
  if (filters.status) params.status = filters.status;
  if (filters.team_id) params.team_id = filters.team_id;
  if (filters.page) params.page = filters.page;
  if (filters.per_page) params.per_page = filters.per_page;
  return api.get<Paginated<Category>>("/categories", { params });
}

export function fetchCategory(id: number) {
  return api.get<{ category: Category }>(`/categories/${id}`);
}

/**
 * Every category matching the filters, fetched a page at a time.
 *
 * The API caps a page at 100 rows, so an export that must hold the whole list
 * walks the pages rather than asking for one big list.
 */
export async function fetchAllCategories(filters: CategoryFilters = {}) {
  const first = await fetchCategories({ ...filters, page: 1, per_page: 100 });
  const rows = [...first.data.data];
  const lastPage = first.data.meta.last_page;

  for (let page = 2; page <= lastPage; page += 1) {
    const res = await fetchCategories({ ...filters, page, per_page: 100 });
    rows.push(...res.data.data);
  }

  return rows;
}

export function createCategory(payload: Record<string, unknown>) {
  return api.post<{ message: string; category: Category }>("/categories", payload);
}

export function updateCategory(id: number, payload: Record<string, unknown>) {
  return api.put<{ message: string; category: Category }>(`/categories/${id}`, payload);
}

export function deleteCategory(id: number) {
  return api.delete<{ message: string }>(`/categories/${id}`);
}