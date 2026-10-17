import { demoAssets } from "./assets.ts";
export type UserRole = "Administrator" | "Operator" | "Technician" | "Viewer";
export type DemoUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "Active" | "Suspended" | "Pending";
  location: string;
  lastLogin: string;
};
export type DemoNode = {
  id: string;
  name: string;
  asset: string;
  type: string;
  status: "Online" | "Offline" | "Maintenance";
  firmware: string;
  interval: number;
  calibration: string;
};
export type Rule = {
  id: string;
  name: string;
  parameter: string;
  asset: string;
  comparison: "above" | "below" | "outside";
  value: number;
  upper: number;
  severity: "Info" | "Warning" | "Critical";
  enabled: boolean;
  autoResponse: boolean;
  response: string;
  channels: string[];
};
export type SavedReport = {
  id: string;
  name: string;
  type: string;
  at: string;
  generatedBy: string;
  rows: (string | number)[][];
};
export const seedUsers: DemoUser[] = [
  {
    id: "admin-1",
    name: "Maria Santos",
    email: "maria.santos@example.com",
    role: "Administrator",
    status: "Active",
    location: "Main Office",
    lastLogin: "2026-10-18T02:24:00Z",
  },
  {
    id: "operator-1",
    name: "Juan Dela Cruz",
    email: "juan.delacruz@example.com",
    role: "Operator",
    status: "Active",
    location: "Control Center",
    lastLogin: "2026-10-18T01:15:00Z",
  },
  {
    id: "operator-2",
    name: "Ana Reyes",
    email: "ana.reyes@example.com",
    role: "Operator",
    status: "Active",
    location: "North District",
    lastLogin: "2026-10-17T08:42:00Z",
  },
  {
    id: "tech-1",
    name: "Luis Gomez",
    email: "luis.gomez@example.com",
    role: "Technician",
    status: "Active",
    location: "Field Unit A",
    lastLogin: "2026-10-17T06:20:00Z",
  },
  {
    id: "viewer-1",
    name: "Sarah Lim",
    email: "sarah.lim@example.com",
    role: "Viewer",
    status: "Active",
    location: "Public Portal",
    lastLogin: "2026-10-17T03:03:00Z",
  },
  {
    id: "tech-2",
    name: "Carlos Mendez",
    email: "carlos.mendez@example.com",
    role: "Technician",
    status: "Suspended",
    location: "Field Unit B",
    lastLogin: "2026-10-15T00:11:00Z",
  },
  {
    id: "operator-3",
    name: "Elena Cruz",
    email: "elena.cruz@example.com",
    role: "Operator",
    status: "Active",
    location: "Treatment Plant",
    lastLogin: "2026-10-15T05:55:00Z",
  },
  {
    id: "tech-3",
    name: "Mark Rivera",
    email: "mark.rivera@example.com",
    role: "Technician",
    status: "Pending",
    location: "South District",
    lastLogin: "2026-10-14T01:30:00Z",
  },
];
export const modules = [
  "Dashboard",
  "Map",
  "Assets",
  "Alerts",
  "Operations",
  "Water Quality",
  "Reports",
  "Work Orders",
  "Users",
  "IoT Nodes",
  "System Settings",
  "Audit Logs",
];
export const seedPermissions: Record<UserRole, string[]> = {
  Administrator: [...modules],
  Operator: modules.slice(0, 9),
  Technician: ["Dashboard", "Map", "Assets", "Alerts", "Work Orders"],
  Viewer: ["Dashboard", "Map", "Reports"],
};
export const seedNodes: DemoNode[] = demoAssets
  .filter((a) =>
    ["sensor", "pump_station", "reservoir", "treatment_plant"].includes(a.type),
  )
  .map((a, i) => ({
    id: `NODE-${String(i + 1).padStart(3, "0")}`,
    name: a.name,
    asset: a.id,
    type:
      a.type === "sensor"
        ? "Water Quality Sensor"
        : a.type === "pump_station"
          ? "Pump Controller"
          : a.type === "reservoir"
            ? "Water Level Sensor"
            : "Treatment Monitor",
    status: i === 5 ? "Offline" : i === 6 ? "Maintenance" : "Online",
    firmware: "v2.4.1",
    interval: 60,
    calibration: "2026-10-12",
  }));
export const seedRules: Rule[] = [
  {
    id: "RULE-001",
    name: "High Reservoir Level",
    parameter: "Water Level",
    asset: "demo-reservoir-a",
    comparison: "above",
    value: 95,
    upper: 100,
    severity: "Critical",
    enabled: true,
    autoResponse: false,
    response: "Create work order",
    channels: ["In-App"],
  },
  {
    id: "RULE-002",
    name: "Low Mainline Pressure",
    parameter: "Pressure",
    asset: "demo-pipe-05",
    comparison: "below",
    value: 2.5,
    upper: 5,
    severity: "Critical",
    enabled: true,
    autoResponse: false,
    response: "Create work order",
    channels: ["In-App"],
  },
  {
    id: "RULE-003",
    name: "High Turbidity",
    parameter: "Turbidity",
    asset: "demo-node-02",
    comparison: "above",
    value: 5,
    upper: 10,
    severity: "Warning",
    enabled: true,
    autoResponse: false,
    response: "Create work order",
    channels: ["In-App"],
  },
  {
    id: "RULE-004",
    name: "Device Offline",
    parameter: "Offline Minutes",
    asset: "demo-node-04",
    comparison: "above",
    value: 10,
    upper: 30,
    severity: "Critical",
    enabled: true,
    autoResponse: true,
    response: "Create work order",
    channels: ["In-App"],
  },
];
export const parameters: Record<
  string,
  { unit: string; min: number; max: number; sample: number }
> = {
  "Water Level": { unit: "%", min: 0, max: 100, sample: 96 },
  Pressure: { unit: "bar", min: 0, max: 20, sample: 2.1 },
  "Flow Rate": { unit: "L/s", min: 0, max: 2000, sample: 85 },
  pH: { unit: "pH", min: 0, max: 14, sample: 7.2 },
  Turbidity: { unit: "NTU", min: 0, max: 100, sample: 6.1 },
  Chlorine: { unit: "mg/L", min: 0, max: 10, sample: 0.8 },
  "Offline Minutes": { unit: "min", min: 0, max: 1440, sample: 15 },
};
export function ruleTriggered(rule: Rule, reading: number) {
  return (
    rule.enabled &&
    (rule.comparison === "above"
      ? reading > rule.value
      : rule.comparison === "below"
        ? reading < rule.value
        : reading < rule.value || reading > rule.upper)
  );
}
