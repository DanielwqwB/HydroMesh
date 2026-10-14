import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import mapboxgl, { type Map as MapboxMap, type GeoJSONSource, type MapMouseEvent } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { demoAssets } from "../data/assets";
import { NAGA_BARANGAYS } from "../data/nagaBarangays";
import type { HydromeshMapHandle } from "./HydromeshMap";
import { createMapboxInfrastructureLayer } from "./MapboxInfrastructureLayer";
import type { BarangayBoundary, MonitoringNode } from "../types/barangay";

export type MapboxStyle = "satellite" | "light" | "dark";
export type BuildingMode = "mapbox" | "illustrative";
const STYLES: Record<MapboxStyle, string> = {
  satellite: "mapbox://styles/mapbox/standard-satellite",
  light: "mapbox://styles/mapbox/standard",
  dark: "mapbox://styles/mapbox/standard",
};
const CENTER: [number, number] = [123.1965, 13.6262];
const LINES = "hydromesh-pipelines";
const GLOW = "hydromesh-pipeline-glow";
const FLOW = "hydromesh-flow-particles";
const JUNCTIONS = "hydromesh-junctions";
const ANOMALY = "hydromesh-critical-anomaly";
const TERRAIN = "hydromesh-terrain-dem";
const ILLUSTRATIVE = "hydromesh-illustrative-buildings";
const ILLUSTRATIVE_LAYER = "hydromesh-illustrative-buildings-3d";
const BARANGAYS = "hydromesh-barangay-boundaries";
const BARANGAY_FILL = "hydromesh-barangay-fill";
const BARANGAY_LINE = "hydromesh-barangay-outline";
const BARANGAY_LABEL = "hydromesh-barangay-labels";
const MONITORING_NODES = "hydromesh-monitoring-nodes";
const MONITORING_NODES_LAYER = "hydromesh-monitoring-nodes-circles";

function makeData() {
  const lines = demoAssets.filter((asset) => asset.type === "pipeline" && asset.path).map((asset) => ({
    type: "Feature" as const,
    id: asset.id,
    properties: { assetId: asset.id, status: asset.status, color: asset.status === "normal" ? "#08b9d6" : asset.status === "warning" ? "#ef9c39" : "#e35c69" },
    geometry: { type: "LineString" as const, coordinates: asset.path! },
  }));
  return { type: "FeatureCollection" as const, features: lines };
}

// These block footprints and heights are deliberately invented demonstration geometry.
function makeIllustrativeBuildings() {
  const features: Array<{ type: "Feature"; properties: { height: number; color: string }; geometry: { type: "Polygon"; coordinates: Array<Array<[number, number]>> } }> = [];
  const lat = 13.6262;
  const lon = 123.1965;
  for (let row = -4; row <= 4; row += 1) {
    for (let column = -5; column <= 5; column += 1) {
      if ((row * 3 + column * 5) % 7 === 0) continue;
      const east = column * 128 + ((row % 2) * 28);
      const north = row * 112;
      const x = lon + east / (111320 * Math.cos((lat * Math.PI) / 180));
      const y = lat + north / 111320;
      const width = 31 + ((Math.abs(row * 7 + column * 11) % 3) * 8);
      const depth = 27 + ((Math.abs(row * 13 + column * 3) % 3) * 9);
      const dx = width / (111320 * Math.cos((lat * Math.PI) / 180));
      const dy = depth / 111320;
      const height = 8 + (Math.abs(row * 17 + column * 13) % 7) * 3;
      features.push({ type: "Feature", properties: { height, color: height > 20 ? "#a8bfbb" : "#c1d2cc" }, geometry: { type: "Polygon", coordinates: [[[x-dx,y-dy],[x+dx,y-dy],[x+dx,y+dy],[x-dx,y+dy],[x-dx,y-dy]]] } });
    }
  }
  return { type: "FeatureCollection" as const, features };
}

interface Props {
  selectedAssetId: string | null;
  onSelectAsset: (assetId: string) => void;
  onSelectBarangay: (code: string) => void;
  onSelectMonitoringNode: (id: string) => void;
  styleMode: MapboxStyle;
  buildingMode: BuildingMode;
  selectedBarangayCode: string;
  selectedMonitoringNodeId: string | null;
  barangayBoundaries: BarangayBoundary[];
  monitoringNodes: MonitoringNode[];
  layerVisibility: { boundaries: boolean; nodes: boolean; reservoirs: boolean; pumps: boolean; treatment: boolean; pipelines: boolean; buildings: boolean };
  terrainVisible: boolean;
}

export const MapboxDigitalTwin = forwardRef<HydromeshMapHandle, Props>(function MapboxDigitalTwin({ selectedAssetId, onSelectAsset, onSelectBarangay, onSelectMonitoringNode, styleMode, buildingMode, selectedBarangayCode, selectedMonitoringNodeId, barangayBoundaries, monitoringNodes, layerVisibility, terrainVisible }, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const onSelectRef = useRef(onSelectAsset);
  const onSelectBarangayRef = useRef(onSelectBarangay);
  const onSelectNodeRef = useRef(onSelectMonitoringNode);
  const selectedRef = useRef(selectedAssetId);
  const selectedNodeRef = useRef(selectedMonitoringNodeId);
  const selectedBarangayRef = useRef(selectedBarangayCode);
  const boundariesRef = useRef(barangayBoundaries);
  const nodesRef = useRef(monitoringNodes);
  const styleRef = useRef(styleMode);
  const activeStyleRef = useRef(styleMode);
  const buildingModeRef = useRef(buildingMode);
  const visibilityRef = useRef(layerVisibility);
  const terrainVisibleRef = useRef(terrainVisible);
  const infrastructureRef = useRef<ReturnType<typeof createMapboxInfrastructureLayer> | null>(null);
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim();
  useEffect(() => { onSelectRef.current = onSelectAsset; }, [onSelectAsset]);
  useEffect(() => { onSelectBarangayRef.current = onSelectBarangay; }, [onSelectBarangay]);
  useEffect(() => { onSelectNodeRef.current = onSelectMonitoringNode; }, [onSelectMonitoringNode]);
  useEffect(() => { selectedRef.current = selectedAssetId; }, [selectedAssetId]);
  useEffect(() => { selectedNodeRef.current = selectedMonitoringNodeId; }, [selectedMonitoringNodeId]);
  useEffect(() => { selectedBarangayRef.current = selectedBarangayCode; }, [selectedBarangayCode]);
  useEffect(() => { boundariesRef.current = barangayBoundaries; }, [barangayBoundaries]);
  useEffect(() => { nodesRef.current = monitoringNodes; }, [monitoringNodes]);
  useEffect(() => { styleRef.current = styleMode; }, [styleMode]);
  useEffect(() => { buildingModeRef.current = buildingMode; }, [buildingMode]);
  useEffect(() => { visibilityRef.current = layerVisibility; }, [layerVisibility]);
  useEffect(() => { terrainVisibleRef.current = terrainVisible; }, [terrainVisible]);

  useEffect(() => {
    if (!hostRef.current || !token) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: hostRef.current,
      style: STYLES[styleRef.current],
      config: { basemap: { lightPreset: "day", ...(styleRef.current === "satellite" || buildingModeRef.current === "illustrative" || !visibilityRef.current.buildings ? {} : { show3dObjects: true }) } },
      center: CENTER,
      zoom: 15.15,
      pitch: 66,
      bearing: -28,
      antialias: true,
      maxPitch: 78,
      cooperativeGestures: true,
    });
    mapRef.current = map;
    let hoverPopup: mapboxgl.Popup | null = null;
    map.on("click", (event: MapMouseEvent) => {
      const modelId = infrastructureRef.current?.pick(event.point);
      if (modelId) { onSelectRef.current(modelId); return; }
      const nodeId = infrastructureRef.current?.pickMonitoringNode(event.point);
      if (nodeId) { onSelectNodeRef.current(nodeId); return; }
      if (map.getLayer(MONITORING_NODES_LAYER)) {
        const node = map.queryRenderedFeatures(event.point, { layers: [MONITORING_NODES_LAYER] })[0] as { properties?: Record<string, unknown> } | undefined;
        const code = node?.properties?.barangayCode;
        if (typeof code === "string") { onSelectBarangayRef.current(code); return; }
      }
      if (map.getLayer(BARANGAY_FILL)) {
        const boundary = map.queryRenderedFeatures(event.point, { layers: [BARANGAY_FILL] })[0] as { properties?: Record<string, unknown> } | undefined;
        const code = boundary?.properties?.code;
        if (typeof code === "string") { onSelectBarangayRef.current(code); return; }
      }
      const available = [LINES].filter((layer) => map.getLayer(layer));
      if (!available.length) return;
      const feature = map.queryRenderedFeatures(event.point, { layers: available })[0] as { properties?: Record<string, unknown> } | undefined;
      const id = feature?.properties?.assetId;
      if (typeof id === "string") onSelectRef.current(id);
    });
    map.on("mousemove", (event: MapMouseEvent) => {
      const modelId = infrastructureRef.current?.pick(event.point);
      const nodeId = infrastructureRef.current?.pickMonitoringNode(event.point);
      const featureLayers = [MONITORING_NODES_LAYER, BARANGAY_FILL, LINES].filter((layer) => map.getLayer(layer));
      const feature = featureLayers.length ? map.queryRenderedFeatures(event.point, { layers: featureLayers })[0] as { properties?: Record<string, unknown> } | undefined : undefined;
      const nodeFeature = feature?.properties?.barangayCode;
      const boundaryFeatureName = feature?.properties?.name;
      const assetId = feature?.properties?.assetId;
      const hoveredName = modelId ? demoAssets.find((asset) => asset.id === modelId)?.name
        : nodeId ? nodesRef.current.find((node) => node.id === nodeId)?.barangayCode && NAGA_BARANGAYS.find((barangay) => barangay.code === nodesRef.current.find((node) => node.id === nodeId)?.barangayCode)?.name
        : typeof nodeFeature === "string" ? NAGA_BARANGAYS.find((barangay) => barangay.code === nodeFeature)?.name
        : typeof boundaryFeatureName === "string" ? boundaryFeatureName
        : typeof assetId === "string" ? demoAssets.find((asset) => asset.id === assetId)?.name : undefined;
      const interactive = Boolean(modelId || nodeId || feature);
      map.getCanvas().style.cursor = interactive ? "pointer" : "";
      if (hoveredName) {
        if (!hoverPopup) hoverPopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 12, className: "hydromesh-hover-tip" });
        hoverPopup.setLngLat(event.lngLat).setText(hoveredName).addTo(map);
      } else hoverPopup?.remove();
    });
    map.on("style.load", () => {
      activeStyleRef.current = styleRef.current;
      map.setConfigProperty("basemap", "lightPreset", styleRef.current === "dark" ? "night" : "day");
      if (styleRef.current !== "satellite") {
        map.setConfigProperty("basemap", "showPointOfInterestLabels", false);
        map.setConfigProperty("basemap", "showTransitLabels", false);
      }
      if (styleRef.current !== "satellite") map.setConfigProperty("basemap", "show3dObjects", buildingModeRef.current === "mapbox" && visibilityRef.current.buildings);
      if (!map.getSource(TERRAIN)) map.addSource(TERRAIN, { type: "raster-dem", url: "mapbox://mapbox.mapbox-terrain-dem-v1", tileSize: 512, maxzoom: 14 });
      map.setTerrain(terrainVisibleRef.current ? { source: TERRAIN, exaggeration: 1.15 } : null);
      const data = makeData();
      if (!map.getSource(LINES)) map.addSource(LINES, { type: "geojson", data, promoteId: "assetId" });
      else (map.getSource(LINES) as GeoJSONSource).setData(data);
      if (!map.getLayer(GLOW)) map.addLayer({ id: GLOW, type: "line", source: LINES, slot: "middle", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ["get", "color"], "line-width": 15, "line-opacity": 0.34, "line-blur": 5 } });
      if (!map.getLayer(LINES)) map.addLayer({ id: LINES, type: "line", source: LINES, slot: "top", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ["case", ["boolean", ["feature-state", "selected"], false], "#fff2a6", ["get", "color"]], "line-width": ["case", ["boolean", ["feature-state", "selected"], false], 8, 6], "line-opacity": 0.98 } });
      if (!map.getSource(FLOW)) map.addSource(FLOW, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      if (!map.getLayer(FLOW)) map.addLayer({ id: FLOW, type: "circle", source: FLOW, slot: "top", paint: { "circle-radius": 5, "circle-color": ["get", "color"], "circle-stroke-color": "#f3feff", "circle-stroke-width": 1.8, "circle-blur": 0.08 } });
      const selected = selectedRef.current;
      const selectedAsset = demoAssets.find((asset) => asset.id === selected);
      for (const route of demoAssets.filter((asset) => asset.type === "pipeline")) {
        const touchesSelected = selectedAsset?.type !== "pipeline" && selectedAsset
          ? route.path?.some(([lon, lat]) => Math.abs(lon - selectedAsset.longitude) < 0.0005 && Math.abs(lat - selectedAsset.latitude) < 0.0005) ?? false
          : route.id === selected;
        map.setFeatureState({ source: LINES, id: route.id }, { selected: touchesSelected });
      }
      if (selected) {
        if (selectedAsset) map.flyTo({ center: [selectedAsset.longitude, selectedAsset.latitude], zoom: selectedAsset.type === "pipeline" ? 15 : 16, pitch: 64, duration: 0 });
      }
      if (!map.getSource(ILLUSTRATIVE)) map.addSource(ILLUSTRATIVE, { type: "geojson", data: makeIllustrativeBuildings() });
      if (!map.getLayer(ILLUSTRATIVE_LAYER)) map.addLayer({ id: ILLUSTRATIVE_LAYER, type: "fill-extrusion", source: ILLUSTRATIVE, slot: "middle", layout: { visibility: buildingModeRef.current === "illustrative" && visibilityRef.current.buildings ? "visible" : "none" }, paint: { "fill-extrusion-color": ["get", "color"], "fill-extrusion-height": ["get", "height"], "fill-extrusion-base": 0, "fill-extrusion-opacity": 0.56, "fill-extrusion-vertical-gradient": true } });
      const boundaryData = { type: "FeatureCollection" as const, features: boundariesRef.current.map((boundary) => ({ type: "Feature" as const, id: boundary.code, properties: { code: boundary.code, name: boundary.name }, geometry: boundary.geometry })) };
      if (!map.getSource(BARANGAYS)) map.addSource(BARANGAYS, { type: "geojson", data: boundaryData, promoteId: "code" });
      if (!map.getLayer(BARANGAY_FILL)) map.addLayer({ id: BARANGAY_FILL, type: "fill", source: BARANGAYS, slot: "middle", paint: { "fill-color": ["case", ["boolean", ["feature-state", "selected"], false], "#26bed0", "#4fb6c3"], "fill-opacity": ["case", ["boolean", ["feature-state", "selected"], false], 0.2, 0.045] } });
      if (!map.getLayer(BARANGAY_LINE)) map.addLayer({ id: BARANGAY_LINE, type: "line", source: BARANGAYS, slot: "top", paint: { "line-color": ["case", ["boolean", ["feature-state", "selected"], false], "#007e92", "#33a8b5"], "line-width": ["case", ["boolean", ["feature-state", "selected"], false], 3, 1.3], "line-opacity": 0.9 } });
      if (!map.getLayer(BARANGAY_LABEL)) map.addLayer({ id: BARANGAY_LABEL, type: "symbol", source: BARANGAYS, slot: "top", minzoom: 14.1, layout: { "text-field": ["get", "name"], "text-size": ["interpolate", ["linear"], ["zoom"], 14.1, 9, 16, 11], "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Regular"], "text-allow-overlap": false, "text-ignore-placement": false }, paint: { "text-color": "#315660", "text-halo-color": "#f7ffff", "text-halo-width": 1.5, "text-opacity": 0.85 } });
      const nodeData = { type: "FeatureCollection" as const, features: nodesRef.current.filter((node) => node.position && (!selectedBarangayRef.current || node.barangayCode === selectedBarangayRef.current)).map((node) => ({ type: "Feature" as const, id: node.id, properties: { id: node.id, barangayCode: node.barangayCode, status: node.status }, geometry: { type: "Point" as const, coordinates: [node.position!.longitude, node.position!.latitude] } })) };
      if (!map.getSource(MONITORING_NODES)) map.addSource(MONITORING_NODES, { type: "geojson", data: nodeData, promoteId: "id" });
      if (!map.getLayer(MONITORING_NODES_LAYER)) map.addLayer({ id: MONITORING_NODES_LAYER, type: "circle", source: MONITORING_NODES, slot: "top", paint: { "circle-radius": ["case", ["boolean", ["feature-state", "selected"], false], 9, 5], "circle-color": ["case", ["boolean", ["feature-state", "selected"], false], "#ffe184", ["match", ["get", "status"], "normal", "#36b985", "warning", "#f1a344", "critical", "#e45059", "#82939a"]], "circle-stroke-width": 2, "circle-stroke-color": "#f6ffff" } });
      if (!map.getSource(ANOMALY)) {
        const critical = demoAssets.find((asset) => asset.id === "demo-pipe-05");
        const point = critical?.path?.[1] ?? CENTER;
        map.addSource(ANOMALY, { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: point } } });
      }
      if (!map.getLayer(ANOMALY)) map.addLayer({ id: ANOMALY, type: "circle", source: ANOMALY, slot: "top", paint: { "circle-radius": 9, "circle-color": "#e34e5c", "circle-opacity": 0.7, "circle-stroke-color": "#fff3ed", "circle-stroke-width": 2, "circle-blur": 0.5 } });
      if (!map.getSource(JUNCTIONS)) {
        const endpoints = demoAssets.filter((asset) => asset.type === "pipeline" && asset.path).flatMap((asset) => [asset.path![0], asset.path![asset.path!.length - 1]]);
        map.addSource(JUNCTIONS, { type: "geojson", data: { type: "FeatureCollection", features: endpoints.map((coordinates) => ({ type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates } })) } });
      }
      if (!map.getLayer(JUNCTIONS)) map.addLayer({ id: JUNCTIONS, type: "circle", source: JUNCTIONS, slot: "top", paint: { "circle-radius": 4, "circle-color": "#f4ffff", "circle-stroke-color": "#16abc4", "circle-stroke-width": 2, "circle-opacity": 0.94 } });
      const infrastructureLayer = createMapboxInfrastructureLayer(map);
      if (!map.getLayer(infrastructureLayer.id)) map.addLayer(infrastructureLayer);
      infrastructureRef.current = infrastructureLayer;
      infrastructureLayer.setSelected(selectedRef.current);
      infrastructureLayer.setMonitoringNodes(nodesRef.current.filter((node) => !selectedBarangayRef.current || node.barangayCode === selectedBarangayRef.current));
      infrastructureLayer.setSelectedMonitoringNode(selectedNodeRef.current);
      infrastructureLayer.setAssetVisibility({ reservoir: visibilityRef.current.reservoirs, elevated_tank: visibilityRef.current.reservoirs, pump_station: visibilityRef.current.pumps, treatment_plant: visibilityRef.current.treatment });
      infrastructureLayer.setNodesVisible(visibilityRef.current.nodes);
      for (const id of [LINES, GLOW, FLOW, JUNCTIONS, ANOMALY]) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visibilityRef.current.pipelines ? "visible" : "none");
      for (const id of [BARANGAY_FILL, BARANGAY_LINE, BARANGAY_LABEL]) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visibilityRef.current.boundaries ? "visible" : "none");
      if (map.getLayer(MONITORING_NODES_LAYER)) map.setLayoutProperty(MONITORING_NODES_LAYER, "visibility", visibilityRef.current.nodes ? "visible" : "none");
      if (map.getLayer(ILLUSTRATIVE_LAYER)) map.setLayoutProperty(ILLUSTRATIVE_LAYER, "visibility", visibilityRef.current.buildings && buildingModeRef.current === "illustrative" ? "visible" : "none");
      if (styleRef.current !== "satellite") map.setConfigProperty("basemap", "show3dObjects", visibilityRef.current.buildings && buildingModeRef.current === "mapbox");
      for (const boundary of boundariesRef.current) map.setFeatureState({ source: BARANGAYS, id: boundary.code }, { selected: boundary.code === selectedBarangayRef.current });
      for (const node of nodesRef.current) map.setFeatureState({ source: MONITORING_NODES, id: node.id }, { selected: node.barangayCode === selectedBarangayRef.current });
      const selectedNode = nodesRef.current.find((node) => node.id === selectedNodeRef.current);
      if (selectedNode?.position) map.flyTo({ center: [selectedNode.position.longitude, selectedNode.position.latitude], zoom: 17, pitch: 68, duration: 0 });
      else {
        const selectedBoundary = boundariesRef.current.find(({ code }) => code === selectedBarangayRef.current);
        if (selectedBoundary) {
          const points: number[][] = [];
          const collect = (value: unknown) => { if (Array.isArray(value) && typeof value[0] === "number" && typeof value[1] === "number") points.push(value as number[]); else if (Array.isArray(value)) value.forEach(collect); };
          collect(selectedBoundary.geometry.coordinates);
          if (points.length) {
            const bounds = points.reduce((box, [lon, lat]) => [[Math.min(box[0][0], lon), Math.min(box[0][1], lat)], [Math.max(box[1][0], lon), Math.max(box[1][1], lat)]] as [[number, number], [number, number]], [[Infinity, Infinity], [-Infinity, -Infinity]] as [[number, number], [number, number]]);
            map.fitBounds(bounds, { padding: 90, maxZoom: 15.5, pitch: 58, duration: 0 });
          }
        }
      }
    });
    const routes = demoAssets.filter((asset) => asset.type === "pipeline" && asset.path);
    let frame = 0;
    const flowTimer = window.setInterval(() => {
      const source = map.getSource(FLOW) as GeoJSONSource | undefined;
      if (!source) return;
      frame += 1;
      const features = routes.map((asset, index) => {
        const path = asset.path!;
        const phase = ((frame / 48 + index * 0.19) % 1 + 1) % 1;
        const scaled = phase * (path.length - 1);
        const segment = Math.min(Math.floor(scaled), path.length - 2);
        const part = scaled - segment;
        const start = path[segment];
        const end = path[segment + 1];
        return { type: "Feature" as const, properties: { assetId: asset.id, color: asset.status === "warning" ? "#ef9c39" : asset.status === "critical" ? "#ed5963" : "#e8fdff" }, geometry: { type: "Point" as const, coordinates: [start[0] + (end[0] - start[0]) * part, start[1] + (end[1] - start[1]) * part] } };
      });
      source.setData({ type: "FeatureCollection", features });
      if (map.getLayer(ANOMALY)) {
        const pulse = 8 + 4 * (0.5 + 0.5 * Math.sin(frame / 5));
        map.setPaintProperty(ANOMALY, "circle-radius", pulse);
        map.setPaintProperty(ANOMALY, "circle-opacity", 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(frame / 5)));
      }
    }, 65);
    const resize = () => map.resize();
    window.addEventListener("resize", resize);
    const resizeObserver = new ResizeObserver(resize);
    if (hostRef.current) resizeObserver.observe(hostRef.current);
    return () => { window.clearInterval(flowTimer); window.removeEventListener("resize", resize); resizeObserver.disconnect(); hoverPopup?.remove(); map.remove(); mapRef.current = null; infrastructureRef.current = null; };
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource(BARANGAYS) as GeoJSONSource | undefined;
    if (source) source.setData({ type: "FeatureCollection", features: barangayBoundaries.map((boundary) => ({ type: "Feature" as const, id: boundary.code, properties: { code: boundary.code, name: boundary.name }, geometry: boundary.geometry })) });
  }, [barangayBoundaries]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource(MONITORING_NODES) as GeoJSONSource | undefined;
    if (source) source.setData({ type: "FeatureCollection", features: monitoringNodes.filter((node) => node.position && (!selectedBarangayRef.current || node.barangayCode === selectedBarangayRef.current)).map((node) => ({ type: "Feature" as const, id: node.id, properties: { id: node.id, barangayCode: node.barangayCode, status: node.status }, geometry: { type: "Point" as const, coordinates: [node.position!.longitude, node.position!.latitude] } })) });
    infrastructureRef.current?.setMonitoringNodes(monitoringNodes.filter((node) => !selectedBarangayRef.current || node.barangayCode === selectedBarangayRef.current));
  }, [monitoringNodes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const v = layerVisibility;
    for (const id of [LINES, GLOW, FLOW, JUNCTIONS, ANOMALY]) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", v.pipelines ? "visible" : "none");
    for (const id of [BARANGAY_FILL, BARANGAY_LINE, BARANGAY_LABEL]) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", v.boundaries ? "visible" : "none");
    if (map.getLayer(MONITORING_NODES_LAYER)) map.setLayoutProperty(MONITORING_NODES_LAYER, "visibility", v.nodes ? "visible" : "none");
    if (map.getLayer(ILLUSTRATIVE_LAYER)) map.setLayoutProperty(ILLUSTRATIVE_LAYER, "visibility", v.buildings && buildingMode === "illustrative" ? "visible" : "none");
    if (activeStyleRef.current !== "satellite") map.setConfigProperty("basemap", "show3dObjects", v.buildings && buildingMode === "mapbox");
    infrastructureRef.current?.setAssetVisibility({ reservoir: v.reservoirs, elevated_tank: v.reservoirs, pump_station: v.pumps, treatment_plant: v.treatment });
    infrastructureRef.current?.setNodesVisible(v.nodes);
  }, [layerVisibility, buildingMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (map?.isStyleLoaded()) map.setTerrain(terrainVisible ? { source: TERRAIN, exaggeration: 1.15 } : null);
  }, [terrainVisible]);

  useEffect(() => { infrastructureRef.current?.setSelectedMonitoringNode(selectedMonitoringNodeId); }, [selectedMonitoringNodeId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getSource(BARANGAYS)) return;
    const nodesSource = map.getSource(MONITORING_NODES) as GeoJSONSource | undefined;
    if (nodesSource) nodesSource.setData({ type: "FeatureCollection", features: monitoringNodes.filter((node) => node.position && (!selectedBarangayCode || node.barangayCode === selectedBarangayCode)).map((node) => ({ type: "Feature" as const, id: node.id, properties: { id: node.id, barangayCode: node.barangayCode, status: node.status }, geometry: { type: "Point" as const, coordinates: [node.position!.longitude, node.position!.latitude] } })) });
    infrastructureRef.current?.setMonitoringNodes(monitoringNodes.filter((node) => !selectedBarangayCode || node.barangayCode === selectedBarangayCode));
    for (const boundary of barangayBoundaries) map.setFeatureState({ source: BARANGAYS, id: boundary.code }, { selected: boundary.code === selectedBarangayCode });
    for (const node of monitoringNodes) map.setFeatureState({ source: MONITORING_NODES, id: node.id }, { selected: node.barangayCode === selectedBarangayCode });
    const selected = barangayBoundaries.find(({ code }) => code === selectedBarangayCode);
    if (!selected) return;
    const coordinates: number[][] = [];
    const collect = (value: unknown) => { if (Array.isArray(value) && typeof value[0] === "number" && typeof value[1] === "number") coordinates.push(value as number[]); else if (Array.isArray(value)) value.forEach(collect); };
    collect(selected.geometry.coordinates);
    if (coordinates.length) {
      const bounds = coordinates.reduce((box, [lon, lat]) => [[Math.min(box[0][0], lon), Math.min(box[0][1], lat)], [Math.max(box[1][0], lon), Math.max(box[1][1], lat)]] as [[number, number], [number, number]], [[Infinity, Infinity], [-Infinity, -Infinity]] as [[number, number], [number, number]]);
      map.fitBounds(bounds, { padding: 90, maxZoom: 15.5, pitch: 58, duration: 900 });
    }
  }, [selectedBarangayCode, barangayBoundaries, monitoringNodes]);

  useEffect(() => {
    const node = monitoringNodes.find((candidate) => candidate.id === selectedMonitoringNodeId);
    if (node?.position) mapRef.current?.flyTo({ center: [node.position.longitude, node.position.latitude], zoom: 17, pitch: 68, duration: 850 });
  }, [selectedMonitoringNodeId, monitoringNodes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layerId = infrastructureRef.current?.id;
    if (layerId && map.getLayer(layerId)) map.removeLayer(layerId);
    infrastructureRef.current = null;
    map.setStyle(STYLES[styleMode]);
  }, [styleMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const selected = demoAssets.find((asset) => asset.id === selectedAssetId);
    infrastructureRef.current?.setSelected(selectedAssetId);
    for (const route of demoAssets.filter((asset) => asset.type === "pipeline")) {
      const touchesSelected = selected?.type !== "pipeline" && selected
        ? route.path?.some(([lon, lat]) => Math.abs(lon - selected.longitude) < 0.0005 && Math.abs(lat - selected.latitude) < 0.0005) ?? false
        : route.id === selectedAssetId;
      map.setFeatureState({ source: LINES, id: route.id }, { selected: touchesSelected });
    }
    if (selectedAssetId) {
      const asset = demoAssets.find((item) => item.id === selectedAssetId);
      if (asset) map.flyTo({ center: [asset.longitude, asset.latitude], zoom: asset.type === "pipeline" ? 15 : 16, pitch: 64, duration: 1000 });
    }
  }, [selectedAssetId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (activeStyleRef.current !== "satellite") map.setConfigProperty("basemap", "show3dObjects", buildingMode === "mapbox" && visibilityRef.current.buildings);
    if (map.getLayer(ILLUSTRATIVE_LAYER)) map.setLayoutProperty(ILLUSTRATIVE_LAYER, "visibility", buildingMode === "illustrative" && visibilityRef.current.buildings ? "visible" : "none");
  }, [buildingMode, styleMode]);

  useImperativeHandle(ref, () => ({
    focusAsset(id) { const asset = demoAssets.find((item) => item.id === id); if (asset) mapRef.current?.flyTo({ center: [asset.longitude, asset.latitude], zoom: 16, pitch: 64, duration: 900 }); },
    overview() { mapRef.current?.flyTo({ center: CENTER, zoom: 15.15, pitch: 66, bearing: -28, duration: 1000 }); },
    zoomIn() { mapRef.current?.zoomIn({ duration: 250 }); },
    zoomOut() { mapRef.current?.zoomOut({ duration: 250 }); },
    rotate(direction) { const map = mapRef.current; if (map) map.easeTo({ bearing: map.getBearing() + (direction === "left" ? -15 : 15), duration: 300 }); },
    tilt(direction) { const map = mapRef.current; if (map) map.easeTo({ pitch: Math.max(20, Math.min(78, map.getPitch() + (direction === "up" ? 8 : -8))), duration: 300 }); },
  }), []);

  if (!token) return <div className="mapbox-setup" role="status">
    <div className="mapbox-setup-icon">3D</div>
    <strong>Mapbox needs an access token</strong>
    <p>Add your public token as <code>VITE_MAPBOX_ACCESS_TOKEN</code> in <code>.env.local</code>, then restart the dev server. Your Cesium map is still available from the map switch.</p>
  </div>;
  return <div aria-label="Mapbox 3D map of Naga City" className="mapbox-host" ref={hostRef} />;
});
