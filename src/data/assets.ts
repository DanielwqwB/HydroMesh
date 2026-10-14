export type AssetType =
  | "reservoir"
  | "elevated_tank"
  | "pump_station"
  | "treatment_plant"
  | "control_valve"
  | "sensor"
  | "pipeline";

export type AssetStatus = "normal" | "warning" | "critical";

export interface DemoAsset {
  id: string;
  name: string;
  type: AssetType;
  latitude: number;
  longitude: number;
  elevation: number;
  zone: string;
  description: string;
  color: string;
  status: AssetStatus;
  snapshot: Array<{ label: string; value: string; unit?: string }>;
  path?: Array<[longitude: number, latitude: number]>;
}

// Synthetic points and sample values for a visual prototype around Naga City.
// None of these names, locations, readings, or conditions are verified utility data.
export const demoAssets: DemoAsset[] = [
  {
    id: "demo-reservoir-a",
    name: "Reservoir A",
    type: "reservoir",
    latitude: 13.6285,
    longitude: 123.1886,
    elevation: 16,
    zone: "North district",
    description: "Simulated ground storage basin",
    color: "#39b9dc",
    status: "normal",
    snapshot: [
      { label: "Storage", value: "78", unit: "%" },
      { label: "Outflow", value: "24", unit: "L/s" },
      { label: "Capacity", value: "4.1", unit: "ML" },
    ],
  },
  {
    id: "demo-tank-d",
    name: "Elevated Tank D",
    type: "elevated_tank",
    latitude: 13.6247,
    longitude: 123.1974,
    elevation: 12,
    zone: "Central district",
    description: "Simulated elevated balancing tank",
    color: "#60c4db",
    status: "normal",
    snapshot: [
      { label: "Storage", value: "64", unit: "%" },
      { label: "Head", value: "18", unit: "m" },
      { label: "Capacity", value: "1.8", unit: "ML" },
    ],
  },
  {
    id: "demo-pump-b",
    name: "Pump Station B",
    type: "pump_station",
    latitude: 13.6172,
    longitude: 123.2014,
    elevation: 9,
    zone: "Central district",
    description: "Simulated distribution pump hall",
    color: "#35c9a1",
    status: "normal",
    snapshot: [
      { label: "Flow", value: "41", unit: "L/s" },
      { label: "Pressure", value: "2.8", unit: "bar" },
      { label: "Load", value: "72", unit: "%" },
    ],
  },
  {
    id: "demo-treatment-c",
    name: "Treatment Plant C",
    type: "treatment_plant",
    latitude: 13.6331,
    longitude: 123.2037,
    elevation: 10,
    zone: "East district",
    description: "Simulated filtration and treatment works",
    color: "#8297f3",
    status: "normal",
    snapshot: [
      { label: "Turbidity", value: "0.42", unit: "NTU" },
      { label: "pH", value: "7.2" },
      { label: "Throughput", value: "36", unit: "L/s" },
    ],
  },
  {
    id: "demo-valve-1",
    name: "Control Valve 01",
    type: "control_valve",
    latitude: 13.6254,
    longitude: 123.1915,
    elevation: 6,
    zone: "North district",
    description: "Simulated network isolation valve",
    color: "#f4af56",
    status: "normal",
    snapshot: [
      { label: "Position", value: "68", unit: "%" },
      { label: "Pressure", value: "2.4", unit: "bar" },
      { label: "Mode", value: "Demo" },
    ],
  },
  {
    id: "demo-valve-2",
    name: "Control Valve 02",
    type: "control_valve",
    latitude: 13.6201,
    longitude: 123.1987,
    elevation: 6,
    zone: "Central district",
    description: "Simulated pressure-zone valve",
    color: "#f4af56",
    status: "normal",
    snapshot: [
      { label: "Position", value: "54", unit: "%" },
      { label: "Pressure", value: "2.1", unit: "bar" },
      { label: "Mode", value: "Demo" },
    ],
  },
  {
    id: "demo-node-01",
    name: "Monitoring Node 01",
    type: "sensor",
    latitude: 13.6304,
    longitude: 123.1943,
    elevation: 4,
    zone: "North district",
    description: "Simulated water-quality monitor",
    color: "#9b85ed",
    status: "normal",
    snapshot: [
      { label: "Turbidity", value: "0.38", unit: "NTU" },
      { label: "pH", value: "7.1" },
      { label: "Battery", value: "96", unit: "%" },
    ],
  },
  {
    id: "demo-node-02",
    name: "Monitoring Node 02",
    type: "sensor",
    latitude: 13.6191,
    longitude: 123.1921,
    elevation: 4,
    zone: "West district",
    description: "Simulated pressure monitor",
    color: "#9b85ed",
    status: "normal",
    snapshot: [
      { label: "Pressure", value: "2.5", unit: "bar" },
      { label: "Flow", value: "18", unit: "L/s" },
      { label: "Battery", value: "91", unit: "%" },
    ],
  },
  {
    id: "demo-node-03",
    name: "Monitoring Node 03",
    type: "sensor",
    latitude: 13.6271,
    longitude: 123.2067,
    elevation: 4,
    zone: "East district",
    description: "Simulated flow monitor",
    color: "#9b85ed",
    status: "warning",
    snapshot: [
      { label: "Flow", value: "14", unit: "L/s" },
      { label: "Pressure", value: "1.8", unit: "bar" },
      { label: "Battery", value: "42", unit: "%" },
    ],
  },
  {
    id: "demo-node-04",
    name: "Monitoring Node 04",
    type: "sensor",
    latitude: 13.6352,
    longitude: 123.1985,
    elevation: 4,
    zone: "East district",
    description: "Simulated water-quality monitor",
    color: "#9b85ed",
    status: "normal",
    snapshot: [
      { label: "Turbidity", value: "0.47", unit: "NTU" },
      { label: "pH", value: "7.3" },
      { label: "Battery", value: "88", unit: "%" },
    ],
  },
  {
    id: "demo-pipe-01",
    name: "Mainline Segment 01",
    type: "pipeline",
    latitude: 13.6280,
    longitude: 123.1911,
    elevation: 4,
    zone: "North district",
    description: "Simulated transmission main",
    color: "#21c5ec",
    status: "normal",
    snapshot: [
      { label: "Flow", value: "28", unit: "L/s" },
      { label: "Pressure", value: "2.9", unit: "bar" },
      { label: "Condition", value: "Normal" },
    ],
    path: [[123.1886, 13.6285], [123.1915, 13.6254], [123.1943, 13.6304]],
  },
  {
    id: "demo-pipe-02",
    name: "Mainline Segment 02",
    type: "pipeline",
    latitude: 13.6250,
    longitude: 123.1958,
    elevation: 4,
    zone: "Central district",
    description: "Simulated distribution main",
    color: "#21c5ec",
    status: "normal",
    snapshot: [
      { label: "Flow", value: "21", unit: "L/s" },
      { label: "Pressure", value: "2.6", unit: "bar" },
      { label: "Condition", value: "Normal" },
    ],
    path: [[123.1943, 13.6304], [123.1974, 13.6247], [123.2014, 13.6172]],
  },
  {
    id: "demo-pipe-03",
    name: "Mainline Segment 03",
    type: "pipeline",
    latitude: 13.6291,
    longitude: 123.2006,
    elevation: 4,
    zone: "East district",
    description: "Simulated treatment supply main",
    color: "#21c5ec",
    status: "normal",
    snapshot: [
      { label: "Flow", value: "36", unit: "L/s" },
      { label: "Pressure", value: "3.1", unit: "bar" },
      { label: "Condition", value: "Normal" },
    ],
    path: [[123.2037, 13.6331], [123.1985, 13.6352], [123.1943, 13.6304]],
  },
  {
    id: "demo-pipe-04",
    name: "Mainline Segment 04",
    type: "pipeline",
    latitude: 13.6214,
    longitude: 123.1962,
    elevation: 4,
    zone: "Central district",
    description: "Simulated distribution branch with a warning state",
    color: "#f1a750",
    status: "warning",
    snapshot: [
      { label: "Flow", value: "14", unit: "L/s" },
      { label: "Pressure", value: "1.8", unit: "bar" },
      { label: "Condition", value: "Demo warning" },
    ],
    path: [[123.1974, 13.6247], [123.1987, 13.6201], [123.2014, 13.6172]],
  },
  {
    id: "demo-pipe-05",
    name: "Mainline Segment 05",
    type: "pipeline",
    latitude: 13.6301,
    longitude: 123.1972,
    elevation: 4,
    zone: "East district",
    description: "Simulated transmission branch with a critical state",
    color: "#ee6672",
    status: "critical",
    snapshot: [
      { label: "Flow", value: "8", unit: "L/s" },
      { label: "Pressure", value: "1.1", unit: "bar" },
      { label: "Condition", value: "Demo critical" },
    ],
    path: [[123.2037, 13.6331], [123.1972, 13.6298], [123.1943, 13.6304]],
  },
];

export const assetTypeLabels: Record<AssetType, string> = {
  reservoir: "Reservoir",
  elevated_tank: "Elevated tank",
  pump_station: "Pump station",
  treatment_plant: "Treatment plant",
  control_valve: "Control valve",
  sensor: "Simulated sensor node",
  pipeline: "Pipeline segment",
};

export const assetStatusLabels: Record<AssetStatus, string> = {
  normal: "Normal",
  warning: "Warning",
  critical: "Critical",
};
