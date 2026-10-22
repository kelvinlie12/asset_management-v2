import React from "react";
import {
  BoxCubeIcon,
  GridIcon,
  GroupIcon,
  ListIcon,
  PieChartIcon,
  PlugInIcon,
  TaskIcon,
} from "../icons";
import type { User } from "../context/AuthContext";
import { hasAnyPermission } from "../context/AuthContext";

// Which permission(s) each menu item requires to be visible (any-of).
export interface MenuItem {
  name: string;
  icon: React.ReactNode;
  path?: string;
  permissions: string[];
  // Self-service entries (e.g. Profile) that every signed-in user may open,
  // regardless of the permissions granted by their role.
  alwaysVisible?: boolean;
  // Sidebar section: "main" has no heading, "manage" and "tools" get one.
  group?: "main" | "manage" | "tools";
  subItems?: { name: string; path: string; permissions: string[] }[];
}

export const NAV_ITEMS: MenuItem[] = [
  {
    name: "Dashboard",
    icon: <GridIcon />,
    path: "/",
    permissions: ["assets.view"],
    group: "main",
  },
   {
     name: "Assets",
     group: "manage",
     icon: <BoxCubeIcon />,
     permissions: ["assets.view"],
     subItems: [
       { name: "Asset Data", path: "/assets", permissions: ["assets.view"] },
       { name: "Purchases", path: "/purchases", permissions: ["purchases.view"] },
       { name: "Asset Transfers", path: "/transfers", permissions: ["transfers.view"] },
       { name: "Damaged Items", path: "/damages", permissions: ["damages.view"] },
       { name: "Storage", path: "/storage", permissions: ["assets.view"] },
       { name: "Categories", path: "/categories", permissions: ["categories.view"] },
     ],
   },
   {
     name: "Vehicles",
     group: "manage",
     icon: <ListIcon />,
     permissions: ["vehicles.view"],
     subItems: [
       // Every company owns its vehicles outright, so the fleet is split into
       // the unit's own list and a per-unit overview.
       { name: "Vehicle Data", path: "/vehicles", permissions: ["vehicles.view"] },
       { name: "Vehicles per Team", path: "/vehicles/units", permissions: ["vehicles.view"] },
     ],
   },
   {
     name: "Network (FTTH)",
     group: "manage",
     icon: <PlugInIcon />,
     permissions: ["network.view"],
     subItems: [
       { name: "Topology", path: "/network/topology", permissions: ["network.view"] },
       { name: "Network Nodes", path: "/network/nodes", permissions: ["network.view"] },
     ],
   },
  {
    name: "Organization",
     group: "manage",
    icon: <GroupIcon />,
    permissions: ["teams.view", "work_teams.view"],
    subItems: [
      { name: "Company", path: "/companies", permissions: ["teams.view"] },
      { name: "Team", path: "/teams", permissions: ["work_teams.view"] },
      { name: "Rooms", path: "/rooms", permissions: ["rooms.view"] },
      { name: "Users", path: "/users", permissions: ["users.view"] },
    ],
  },
  {
    name: "Reports",
    icon: <ListIcon />,
    path: "/reports",
    permissions: ["assets.view"],
    group: "tools",
  },
  {
    name: "Task",
    icon: <TaskIcon />,
    path: "/tasks",
    permissions: ["tasks.view", "tasks.manage_all"],
    group: "tools",
  },
  {
    name: "Settings",
    group: "tools",
    icon: <PieChartIcon />,
    permissions: ["roles.view", "permissions.view", "audit_logs.view"],
    subItems: [
      { name: "Roles", path: "/roles", permissions: ["roles.view"] },
      { name: "Permissions", path: "/permissions", permissions: ["permissions.view"] },
      { name: "Audit Log", path: "/audit-logs", permissions: ["audit_logs.view"] },
    ],
  },
];

export const ROUTE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/assets": "Asset Data",
  "/purchases": "Purchases",
  "/transfers": "Asset Transfers",
  "/damages": "Damaged Items",
  "/storage": "Storage",
  "/categories": "Categories",
  "/vehicles": "Vehicle Data",
  "/vehicles/units": "Vehicles per Team",
  "/vehicles/:id/taxes": "Vehicle Tax",
  "/network/topology": "Topology",
  "/network/nodes": "Network Nodes",
  "/teams": "Team",
  "/companies": "Company",
  "/rooms": "Rooms",
  "/audit-logs": "Audit Log",
  "/users": "Users",
  "/roles": "Roles",
  "/permissions": "Permissions",
  "/reports": "Reports",
  "/tasks": "Task",
  "/tasks/:id": "Task Details",
  "/profile": "User Profile",
};

export function canAccess(
  user: User | null | undefined,
  permissions?: string[],
): boolean {
  if (!user) return false;
  if (!permissions || permissions.length === 0) return false;
  return hasAnyPermission(user, permissions);
}