import { BARANGAY_BY_CODE, NAGA_BARANGAYS } from "../data/nagaBarangays.ts";
import type { BarangayBoundary, MonitoringNode, TelemetryReading, PolygonGeometry, MultiPolygonGeometry } from "../types/barangay";

export type BoundaryLoadResult = { boundaries: BarangayBoundary[]; message: string; attribution?: string };
const NAGA_PSGC_PREFIX = "0501724";

type BoundaryMetadata = {
  source?: string;
  license?: string;
  licenseUrl?: string;
  attribution?: string;
  datasetVersion?: string;
  retrievedAt?: string;
  modifications?: string;
  crs?: string;
  rightsVerified?: boolean;
  rightsReference?: string;
  rightsBasis?: "explicit-open-license" | "written-permission";
};

function validRing(ring: number[][]): boolean {
  if (ring.length < 4) return false;
  if (!ring.every((point) => Array.isArray(point) && point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]) && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90)) return false;
  const first = ring[0]; const last = ring[ring.length - 1];
  if (Math.abs(first[0] - last[0]) > 1e-8 || Math.abs(first[1] - last[1]) > 1e-8) return false;
  let twiceArea = 0;
  for (let i = 0; i < ring.length - 1; i++) twiceArea += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  if (Math.abs(twiceArea) <= 1e-12) return false;
  const orient = (a: number[], b: number[], c: number[]) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const onSegment = (a: number[], b: number[], point: number[]) =>
    point[0] >= Math.min(a[0], b[0]) - 1e-10 && point[0] <= Math.max(a[0], b[0]) + 1e-10 &&
    point[1] >= Math.min(a[1], b[1]) - 1e-10 && point[1] <= Math.max(a[1], b[1]) + 1e-10;
  const intersects = (a: number[], b: number[], c: number[], d: number[]) => {
    const ab1 = orient(a, b, c); const ab2 = orient(a, b, d); const cd1 = orient(c, d, a); const cd2 = orient(c, d, b);
    if (((ab1 > 1e-10 && ab2 < -1e-10) || (ab1 < -1e-10 && ab2 > 1e-10)) &&
      ((cd1 > 1e-10 && cd2 < -1e-10) || (cd1 < -1e-10 && cd2 > 1e-10))) return true;
    return (Math.abs(ab1) <= 1e-10 && onSegment(a, b, c)) || (Math.abs(ab2) <= 1e-10 && onSegment(a, b, d)) ||
      (Math.abs(cd1) <= 1e-10 && onSegment(c, d, a)) || (Math.abs(cd2) <= 1e-10 && onSegment(c, d, b));
  };
  const segmentCount = ring.length - 1;
  for (let i = 0; i < segmentCount; i++) for (let j = i + 1; j < segmentCount; j++) {
    if (j === i + 1 || (i === 0 && j === segmentCount - 1)) continue;
    if (intersects(ring[i], ring[i + 1], ring[j], ring[j + 1])) return false;
  }
  return true;
}

function validGeometry(geometry: PolygonGeometry | MultiPolygonGeometry): boolean {
  if (!geometry || !Array.isArray(geometry.coordinates)) return false;
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return (geometry.type === "Polygon" || geometry.type === "MultiPolygon") && polygons.length > 0 && polygons.every((polygon) => {
    if (!Array.isArray(polygon) || polygon.length === 0 || !polygon.every((ring) => Array.isArray(ring) && validRing(ring))) return false;
    const outer = polygon[0];
    return polygon.slice(1).every((hole) => pointInsideRing(hole[0] as [number, number], outer));
  });
}

function pointInsideRing(point: [number, number], ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]; const [xj, yj] = ring[j];
    if ((yi > point[1]) !== (yj > point[1]) && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Reads an operator-supplied WGS84 GeoJSON. No geometry or location is synthesized on failure. */
export async function loadBarangayBoundaries(url = "/data/naga-city-barangays.geojson"): Promise<BoundaryLoadResult> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    return { boundaries: [], message: "Boundary data could not be reached; no polygons or node coordinates were loaded." };
  }
  if (response.status === 404) return { boundaries: [], message: "Verified boundary GeoJSON has not been installed." };
  if (!response.ok) throw new Error(`Boundary data request failed (${response.status}).`);
  let metadataResponse: Response;
  try {
    metadataResponse = await fetch("/data/naga-city-boundaries-attribution.json");
  } catch {
    return { boundaries: [], message: "Boundary usage metadata could not be reached; polygons were not loaded." };
  }
  if (!metadataResponse.ok) return { boundaries: [], message: "Boundary source/license metadata is missing; polygons were not loaded." };
  const metadata = await metadataResponse.json() as BoundaryMetadata;
  if (!metadata.source || !metadata.license || !metadata.attribution || metadata.crs !== "EPSG:4326" || metadata.rightsVerified !== true || !metadata.rightsReference || !metadata.rightsBasis) return { boundaries: [], message: "Boundary data needs a documented open-license or written-permission reference, source, attribution, and EPSG:4326 CRS; polygons were not loaded." };
  if (/georisk/i.test(metadata.source) && metadata.rightsBasis !== "written-permission") return { boundaries: [], message: "GeoRiskPH boundary reuse needs explicit written permission; PSA registry terms alone do not authorize this hosted copy." };
  const collection = await response.json() as { type: string; features: Array<{ properties?: Record<string, unknown> | null; geometry?: PolygonGeometry | MultiPolygonGeometry | null }> };
  if (collection.type !== "FeatureCollection" || !Array.isArray(collection.features)) return { boundaries: [], message: "Boundary file is not a GeoJSON FeatureCollection; dataset rejected." };
  const found = new Map<string, BarangayBoundary>();
  const duplicates = new Set<string>();
  let rejected = 0;
  for (const feature of collection.features) {
    const props = feature.properties as Record<string, unknown> | null;
    const code = String(props?.psgc_10d ?? props?.ref ?? props?.code ?? "");
    const official = BARANGAY_BY_CODE.get(code);
    const geometry = feature.geometry;
    if (!official || !code.startsWith(NAGA_PSGC_PREFIX) || !geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") || !validGeometry(geometry)) { rejected++; continue; }
    if (found.has(code) || duplicates.has(code)) { found.delete(code); duplicates.add(code); rejected++; continue; }
    const name = String(props?.name ?? props?.brgy_name ?? "");
    const city = String(props?.city_name ?? "").normalize("NFC").trim().toLocaleLowerCase();
    const province = String(props?.prov_name ?? "").normalize("NFC").trim().toLocaleLowerCase();
    if ((city !== "naga" && city !== "naga city") || province !== "camarines sur" || name.normalize("NFC").trim().toLocaleLowerCase() !== official.name.normalize("NFC").toLocaleLowerCase()) { rejected++; continue; }
    found.set(code, { code, name: official.name, geometry });
  }
  const candidates = NAGA_BARANGAYS.flatMap(({ code }) => found.has(code) ? [found.get(code)!] : []);
  const candidateNodes = createMonitoringNodes(candidates);
  const positions = new Map(candidateNodes.filter((node) => node.position).map((node) => [node.barangayCode, node]));
  const boundaries = candidates.filter((boundary) => {
    const node = positions.get(boundary.code);
    return Boolean(node?.position && pointBelongsToBoundary([node.position.longitude, node.position.latitude], boundary));
  });
  const missing = NAGA_BARANGAYS.filter(({ code }) => !boundaries.some((boundary) => boundary.code === code)).map(({ name }) => name);
  const dropped = rejected + candidates.length - boundaries.length;
  const message = `${boundaries.length} / 27 OSM boundaries and interior simulated nodes verified${dropped ? ` · ${dropped} invalid or duplicate feature(s) rejected` : ""}${missing.length ? ` · unmapped: ${missing.join(", ")}` : ""} · ${metadata.source} · ${metadata.datasetVersion ?? metadata.license}`;
  return { boundaries, message, attribution: metadata.attribution };
}

// Logical placeholders make coverage gaps explicit; no arbitrary coordinates are assigned.
export const UNMAPPED_MONITORING_NODES: MonitoringNode[] = NAGA_BARANGAYS.map(({ code }) => ({
  id: `NAGA-${BARANGAY_BY_CODE.get(code)!.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "-").toUpperCase()}-001`,
  barangayCode: code,
  type: "pressure_flow",
  position: null,
  status: "unmapped",
}));

function insideRing(point: [number, number], ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]; const [xj, yj] = ring[j];
    if ((yi > point[1]) !== (yj > point[1]) && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function pointBelongsToBoundary(point: [number, number], boundary: BarangayBoundary): boolean {
  const polygons = boundary.geometry.type === "Polygon" ? [boundary.geometry.coordinates] : boundary.geometry.coordinates;
  return polygons.some((polygon) => insideRing(point, polygon[0]) && !polygon.slice(1).some((hole) => insideRing(point, hole)));
}

/** Deterministic point-on-surface candidate, checked against outer rings and holes. */
function pointInBoundary(boundary: BarangayBoundary): [number, number] | null {
  const polygons = boundary.geometry.type === "Polygon" ? [boundary.geometry.coordinates] : boundary.geometry.coordinates;
  for (const polygon of polygons) {
    const points = polygon.flat();
    const minX = Math.min(...points.map(([x]) => x)); const maxX = Math.max(...points.map(([x]) => x));
    const minY = Math.min(...points.map(([, y]) => y)); const maxY = Math.max(...points.map(([, y]) => y));
    // Search from each polygon component's center outward, checking holes before accepting a point.
    for (let divisions = 8; divisions <= 256; divisions *= 2) {
      const candidates: [number, number, number][] = [];
      for (let row = 0; row <= divisions; row++) for (let column = 0; column <= divisions; column++) {
        const x = minX + (maxX - minX) * column / divisions;
        const y = minY + (maxY - minY) * row / divisions;
        const centerDistance = (x - (minX + maxX) / 2) ** 2 + (y - (minY + maxY) / 2) ** 2;
        candidates.push([x, y, centerDistance]);
      }
      candidates.sort((a, b) => a[2] - b[2]);
      for (const [x, y] of candidates) {
        const candidate: [number, number] = [x, y];
        if (pointBelongsToBoundary(candidate, { ...boundary, geometry: { type: "Polygon", coordinates: polygon } })) return candidate;
      }
    }
  }
  return null;
}

export function createMonitoringNodes(boundaries: BarangayBoundary[]): MonitoringNode[] {
  const byCode = new Map(boundaries.map((boundary) => [boundary.code, boundary]));
  return NAGA_BARANGAYS.map((barangay) => {
    const node = UNMAPPED_MONITORING_NODES.find(({ barangayCode }) => barangayCode === barangay.code)!;
    const boundary = byCode.get(barangay.code);
    const point = boundary ? pointInBoundary(boundary) : null;
    const seed = Number.parseInt(barangay.code.slice(-3), 10) || 1;
    const status = !point ? "unmapped" : seed % 17 === 0 ? "offline" : seed % 13 === 0 ? "critical" : seed % 7 === 0 ? "warning" : "normal";
    return { ...node, position: point ? { longitude: point[0], latitude: point[1] } : null, status };
  });
}

/** Clearly labeled demo values, generated only for nodes with a validated geographic position. */
export function createSimulatedTelemetry(nodes: MonitoringNode[], now = new Date()): TelemetryReading[] {
  return nodes.filter((node) => node.position).map((node) => {
    const seed = Number.parseInt(node.barangayCode.slice(-3), 10) || 1;
    const pressure = node.status === "critical" ? 1.4 + (seed % 4) / 10 : node.status === "warning" ? 2.2 + (seed % 3) / 10 : 2.8 + (seed % 15) / 10;
    const turbidity = node.status === "critical" ? 4.8 + (seed % 8) / 10 : 0.3 + (seed % 17) / 10;
    return {
      nodeId: node.id,
      recordedAt: now.toISOString(),
      pressureBar: Number(pressure.toFixed(1)),
      flowLitresPerSecond: Number((12 + (seed * 7 % 390) / 10).toFixed(1)),
      pH: Number((6.8 + (seed % 12) / 10).toFixed(1)),
      turbidityNTU: Number(turbidity.toFixed(1)),
      tdsMgPerL: 110 + (seed * 13 % 241),
      chlorineMgPerL: Number((0.25 + (seed % 11) / 20).toFixed(2)),
    };
  });
}
