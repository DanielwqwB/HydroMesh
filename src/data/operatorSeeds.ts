export type Incident = {
  id: string;
  title: string;
  asset: string;
  severity: string;
  time: string;
  status: string;
  team: string;
};
export type WorkOrder = {
  id: string;
  title: string;
  asset: string;
  priority: string;
  status: string;
  team: string;
  due: string;
};
export const seedIncidents: Incident[] = [
  {
    id: "AL-001",
    title: "Low Pressure Detected",
    asset: "demo-pipe-05",
    severity: "Critical",
    time: "2 min ago",
    status: "Open",
    team: "Unassigned",
  },
  {
    id: "AL-002",
    title: "High Turbidity Level",
    asset: "demo-node-02",
    severity: "Warning",
    time: "15 min ago",
    status: "Open",
    team: "Unassigned",
  },
  {
    id: "AL-003",
    title: "Pump Station Inspection",
    asset: "demo-pump-b",
    severity: "Warning",
    time: "28 min ago",
    status: "Open",
    team: "Team B",
  },
  {
    id: "AL-004",
    title: "Unusual Flow Pattern",
    asset: "demo-pipe-03",
    severity: "Warning",
    time: "42 min ago",
    status: "Open",
    team: "Unassigned",
  },
  {
    id: "AL-005",
    title: "Scheduled Maintenance",
    asset: "demo-treatment-c",
    severity: "Info",
    time: "1 hour ago",
    status: "Open",
    team: "Team C",
  },
  {
    id: "AL-006",
    title: "Chlorine Level Low",
    asset: "demo-node-04",
    severity: "Warning",
    time: "2 hours ago",
    status: "Open",
    team: "Team B",
  },
  {
    id: "AL-007",
    title: "Pipeline Inspection Required",
    asset: "demo-pipe-02",
    severity: "Critical",
    time: "3 hours ago",
    status: "Open",
    team: "Team A",
  },
  {
    id: "AL-008",
    title: "Sensor Calibration Due",
    asset: "demo-node-01",
    severity: "Info",
    time: "4 hours ago",
    status: "Open",
    team: "Team C",
  },
];
export const seedOrders: WorkOrder[] = [
  {
    id: "WO-001",
    title: "Inspect mainline pressure drop",
    asset: "demo-pipe-05",
    priority: "High",
    status: "Open",
    team: "Team A",
    due: "2026-10-18",
  },
  {
    id: "WO-002",
    title: "Pump routine inspection",
    asset: "demo-pump-b",
    priority: "Medium",
    status: "In Progress",
    team: "Team B",
    due: "2026-10-20",
  },
  {
    id: "WO-003",
    title: "Check and lubricate valve",
    asset: "demo-valve-2",
    priority: "Low",
    status: "Open",
    team: "Team A",
    due: "2026-10-21",
  },
  {
    id: "WO-004",
    title: "Reservoir structural inspection",
    asset: "demo-reservoir-a",
    priority: "Medium",
    status: "In Progress",
    team: "Team C",
    due: "2026-10-22",
  },
  {
    id: "WO-005",
    title: "Water quality sensor calibration",
    asset: "demo-node-02",
    priority: "High",
    status: "Open",
    team: "Team B",
    due: "2026-10-19",
  },
  {
    id: "WO-006",
    title: "Treatment filter replacement",
    asset: "demo-treatment-c",
    priority: "Medium",
    status: "Completed",
    team: "Team C",
    due: "2026-10-17",
  },
];
