import api from "./api";

export interface Team {
  id: number;
  name: string;
  slug: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  role_label: string;
  status: string;
  team_id?: number | null;
  team: Team | null;
  modules: string[];
  created_at?: string;
  updated_at?: string;
}

/** One permission on its own: no module or menu grouping. */
export interface AccessPermission {
  name: string;
  selected: boolean;
  grantable: boolean;
}

export interface AccessModule {
  key: string;
  label: string;
  description: string;
  /** Sidebar section the menu sits under, e.g. "assets" or "organization". */
  group: string;
  group_label: string;
  /** Sidebar menu names this single checkbox opens. */
  menus: string[];
  default: boolean;
  selected: boolean;
  grantable: boolean;
}

/** The menu access of a single user, as configured on the Access Rights screen. */
export interface UserAccess {
  target: {
    id: number;
    name: string;
    role: string;
    role_label: string;
    team_id: number | null;
  };
  modules: AccessModule[];
  /** Every permission as its own switch, alphabetical. */
  permissions: AccessPermission[];
  editable: boolean;
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

export const ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "owner", label: "Owner Team" },
  { value: "staff", label: "Staff" },
  { value: "viewer", label: "Viewer" },
];

/**
 * Roles allowed only to a super admin and an owner respectively.
 *
 * Mirrors the guards in UserController. The API rejects anything else with a
 * 403, so the UI filters the list rather than offering an option that cannot
 * be submitted.
 */
const SUPER_ADMIN_ONLY_ROLES = ["super_admin"];

/**
 * Narrow the role (job title) choices to what the acting user may assign.
 *
 * A super admin sees everything. An owner staffs their own unit with admins,
 * staff and viewers. Everyone else who may manage users is limited to staff
 * and viewer.
 */
export function assignableRoleOptions(actorRole: string | undefined) {
  if (actorRole === "super_admin") return ROLE_OPTIONS;

  if (actorRole === "owner") {
    return ROLE_OPTIONS.filter((role) =>
      ["admin", "staff", "viewer"].includes(role.value),
    );
  }

  return ROLE_OPTIONS.filter(
    (role) =>
      !SUPER_ADMIN_ONLY_ROLES.includes(role.value) &&
      !["admin", "owner"].includes(role.value),
  );
}

export interface UserFilters {
  search?: string;
  role?: string;
  status?: string;
  team_id?: string;
  page?: number;
  per_page?: number;
}

export function fetchUsers(filters: UserFilters = {}) {
  const params: Record<string, string | number> = {};
  if (filters.search) params.search = filters.search;
  if (filters.role) params.role = filters.role;
  if (filters.status) params.status = filters.status;
  if (filters.team_id) params.team_id = filters.team_id;
  if (filters.page) params.page = filters.page;
  if (filters.per_page) params.per_page = filters.per_page;
  return api.get<Paginated<User>>("/users", { params });
}

export function fetchUser(id: number) {
  return api.get<{ user: User }>(`/users/${id}`);
}

export function createUser(payload: Record<string, unknown>) {
  return api.post<{ user: User }>("/users", payload);
}

export function updateUser(id: number, payload: Record<string, unknown>) {
  return api.put<{ user: User }>(`/users/${id}`, payload);
}

export function deleteUser(id: number) {
  return api.delete<{ message: string }>(`/users/${id}`);
}

export function assignRole(id: number, role: string) {
  return api.put<{ user: User }>(`/users/${id}/assign-role`, { role });
}

export function assignTeam(id: number, teamId: string) {
  return api.put<{ user: User }>(`/users/${id}/assign-team`, { team_id: teamId });
}

/** Replace the individual permissions a user holds, which drives their menu. */
export function updateUserAccess(id: number, permissions: string[]) {
  return api.put<{ user: User }>(`/users/${id}/access`, { permissions });
}

/** Read the module matrix of a single user for the Access Rights screen. */
export function fetchUserAccess(id: number) {
  return api.get<UserAccess>(`/users/${id}/access`);
}

/**
 * Every user of the unit, fetched a page at a time.
 *
 * The API caps a page at 100 rows, so an export that must hold the whole unit
 * walks the pages instead of asking for one big list. `filters` are passed
 * through untouched, so the exported rows match what the screen filters show.
 */
export async function fetchAllUsers(filters: UserFilters = {}) {
  const first = await fetchUsers({ ...filters, page: 1, per_page: 100 });
  const rows = [...first.data.data];
  const lastPage = first.data.meta.last_page;

  for (let page = 2; page <= lastPage; page += 1) {
    const res = await fetchUsers({ ...filters, page, per_page: 100 });
    rows.push(...res.data.data);
  }

  return rows;
}

export function resetPassword(id: number, password: string) {
  return api.post<{ message: string }>(`/users/${id}/reset-password`, {
    password,
    password_confirmation: password,
  });
}

export function deactivateUser(id: number) {
  return api.post<{ user: User }>(`/users/${id}/deactivate`);
}

export function activateUser(id: number) {
  return api.post<{ user: User }>(`/users/${id}/activate`);
}

export function fetchTeams() {
  return api.get<{ data: Team[] }>("/teams");
}
