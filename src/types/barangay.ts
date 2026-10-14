export type Barangay = {
  code: string;
  name: string;
  city: "Naga City";
};

export type Position = { longitude: number; latitude: number };
export type PolygonGeometry = { type: "Polygon"; coordinates: number[][][] };
export type MultiPolygonGeometry = { type: "MultiPolygon"; coordinates: number[][][][] };
export type BarangayBoundary = {
  code: string;
  name: string;
  geometry: PolygonGeometry | MultiPolygonGeometry;
};
export type MonitoringNode = {
  id: string;
  barangayCode: string;
  type: "pressure_flow";
  position: Position | null;
  status: "unmapped" | "pending_simulation" | "normal" | "warning" | "critical" | "offline";
};
export type TelemetryReading = {
  nodeId: string;
  recordedAt: string;
  pressureBar: number;
  flowLitresPerSecond: number;
  pH: number;
  turbidityNTU: number;
  tdsMgPerL: number;
  chlorineMgPerL: number;
};
export type AnomalyEvent = {
  id: string;
  nodeId: string;
  kind: "pressure_drop" | "high_turbidity" | "low_supply" | "offline";
  occurredAt: string;
  active: boolean;
};
