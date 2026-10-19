import api from "./api";
import type { Asset } from "./assets";
import type { Category } from "./categories";
import type { Room } from "./rooms";
import type { Team } from "./teams";
import type { User } from "./users";

export interface Lookups {
  categories: Pick<Category, "id" | "name" | "code" | "team_id">[];
  rooms: Pick<Room, "id" | "name" | "is_storage" | "team_id">[];
  teams: Pick<Team, "id" | "name" | "slug">[];
  users: Pick<User, "id" | "name" | "role" | "team_id">[];
  assets: Pick<Asset, "id" | "name" | "asset_code">[];
}

/**
 * Dropdown data for forms, gathered in one request.
 *
 * Replaces the four separate master-data fetches the asset form used to make.
 * Those required permissions an owner may not hold, which broke the asset page
 * as soon as a super admin trimmed their modules.
 */
export function fetchLookups() {
  return api.get<Lookups>("/lookups");
}