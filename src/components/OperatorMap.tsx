import { Suspense, lazy, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Layers3,
  LocateFixed,
  MapPin,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  X,
} from "lucide-react";
import type { MapHandle, MapboxStyle } from "./MapboxDigitalTwin";
import { seedNodes } from "../data/adminSeeds";
import { useSharedState } from "../services/workspaceStore";
import { demoAssets, assetTypeLabels } from "../data/assets";
import {
  createMonitoringNodes,
  loadBarangayBoundaries,
} from "../services/barangayData";
import type { BarangayBoundary, MonitoringNode } from "../types/barangay";
const MapboxDigitalTwin = lazy(() =>
  import("./MapboxDigitalTwin").then((m) => ({ default: m.MapboxDigitalTwin })),
);

export function OperatorMap({
  selectedAssetId,
  onSelectAsset,
}: {
  selectedAssetId: string | null;
  onSelectAsset: (id: string | null) => void;
}) {
  const [registeredNodes] = useSharedState("nodes", seedNodes);
  const [positions] = useSharedState<Record<string, number>>("positions", {
    "demo-valve-1": 100,
    "demo-valve-2": 0,
    "demo-pump-b": 100,
  });
  const registeredNode = registeredNodes.find(
    (node) => node.asset === selectedAssetId,
  );
  const mapRef = useRef<MapHandle>(null);
  const [style, setStyle] = useState<MapboxStyle>("light");
  const [expanded, setExpanded] = useState(false);
  const [dismissedAsset, setDismissedAsset] = useState<string | null>(null);
  const selectAsset = (id: string) => { setDismissedAsset(null); setLayersOpen(false); onSelectAsset(id); };
  const [layersOpen, setLayersOpen] = useState(false);
  const [layers, setLayers] = useState({
    boundaries: true,
    nodes: true,
    reservoirs: true,
    pumps: true,
    treatment: true,
    pipelines: true,
    buildings: true,
  });
  const [boundaries, setBoundaries] = useState<BarangayBoundary[]>([]);
  const [nodes, setNodes] = useState<MonitoringNode[]>([]);
  const [barangay, setBarangay] = useState("");
  const [node, setNode] = useState<string | null>(null);
  const asset = demoAssets.find((a) => a.id === selectedAssetId);
  useEffect(() => {
    let mounted = true;
    loadBarangayBoundaries()
      .then((result) => {
        if (mounted) {
          setBoundaries(result.boundaries);
          setNodes(createMonitoringNodes(result.boundaries));
        }
      })
      .catch(() => {
        /* The map remains usable without optional boundary data. */
      });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setExpanded(false); setLayersOpen(false); }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  return (
    <div className={`op-map ${expanded ? "expanded" : ""}`}>
      <div className="op-map-top">
        <div className="op-map-location">
          <MapPin size={15} />
          <span>
            <strong>Naga City water network</strong>
            <small>Interactive 3D · Illustrative infrastructure</small>
          </span>
        </div>
        <select aria-label="Map style" value={style} onChange={(e) => setStyle(e.target.value as MapboxStyle)}>
          <option value="light">Standard</option>
          <option value="satellite">Satellite</option>
          <option value="dark">Night</option>
        </select>
      </div>
      <Suspense fallback={<div className="op-map-loading">Loading 3D map…</div>}>
        <MapboxDigitalTwin
          ref={mapRef}
          selectedAssetId={selectedAssetId}
          onSelectAsset={selectAsset}
          onSelectBarangay={setBarangay}
          onSelectMonitoringNode={setNode}
          styleMode={style}
          buildingMode="mapbox"
          selectedBarangayCode={barangay}
          selectedMonitoringNodeId={node}
          barangayBoundaries={boundaries}
          monitoringNodes={nodes}
          layerVisibility={layers}
          terrainVisible
        />
      </Suspense>
      <div className="op-map-left">
        <button
          aria-label="Toggle map layers"
          aria-expanded={layersOpen}
          title="Map layers"
          onClick={() => setLayersOpen(!layersOpen)}
        >
          <Layers3 size={19} />
        </button>
        <button
          aria-label="Reset map view"
          title="Reset view"
          onClick={() => {
            setBarangay("");
            setNode(null);
            onSelectAsset(null);
            mapRef.current?.overview();
          }}
        >
          <LocateFixed size={19} />
        </button>
        <button
          aria-label="Rotate map left"
          title="Rotate left"
          onClick={() => mapRef.current?.rotate("left")}
        >
          <RotateCcw size={18} />
        </button>
        <button
          aria-label="Rotate map right"
          title="Rotate right"
          onClick={() => mapRef.current?.rotate("right")}
        >
          <RotateCw size={18} />
        </button>
      </div>
      {layersOpen && (
        <div className="op-map-layers" role="group" aria-label="Map layer controls">
          <div className="op-map-layer-heading"><strong>Map layers</strong><button aria-label="Close map layers" onClick={() => setLayersOpen(false)}><X size={15}/></button></div>
          {(Object.keys(layers) as (keyof typeof layers)[]).map((key) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={layers[key]}
                onChange={(e) =>
                  setLayers((current) => ({
                    ...current,
                    [key]: e.target.checked,
                  }))
                }
              />
              {key[0].toUpperCase() + key.slice(1)}
            </label>
          ))}
        </div>
      )}
      <div className="op-map-right">
        <button aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()}>
          <Plus size={19} />
        </button>
        <button aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()}>
          <Minus size={19} />
        </button>
        <button
          aria-label="Tilt map up"
          title="Tilt up"
          onClick={() => mapRef.current?.tilt("up")}
        >
          <ArrowUp size={17} />
        </button>
        <button
          aria-label="Tilt map down"
          title="Tilt down"
          onClick={() => mapRef.current?.tilt("down")}
        >
          <ArrowDown size={17} />
        </button>
        <button
          aria-label={expanded ? "Exit fullscreen map" : "Expand map"}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <X size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>
      {asset && !layersOpen && dismissedAsset !== asset.id && (
        <div className="op-map-inspector">
          <button
            aria-label="Close asset details"
            onClick={() => { setDismissedAsset(asset.id); onSelectAsset(null); }}
          >
            <X size={15} />
          </button>
          <small>
            {assetTypeLabels[asset.type]} · {asset.zone}
          </small>
          <strong>{asset.name}</strong>
          {registeredNode && (
            <p className="op-map-shared-state">
              {registeredNode.name} ? {registeredNode.status} ?{" "}
              {registeredNode.interval}s interval
            </p>
          )}
          {positions[asset.id] !== undefined && (
            <p className="op-map-shared-state">
              Shared actuator output: {positions[asset.id]}% (simulated)
            </p>
          )}
          <div>
            {asset.snapshot.map((s) => (
              <span key={s.label}>
                <small>{s.label}</small>
                <b>
                  {s.value} {s.unit}
                </b>
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="op-map-legend">
        <span>
          <i className="op-dot" />
          Normal
        </span>
        <span>
          <i className="op-dot amber" />
          Warning
        </span>
        <span>
          <i className="op-dot red" />
          Critical
        </span>
        <span className="op-map-legend-tip">
          Drag to explore · Scroll to zoom
        </span>
      </div>
    </div>
  );
}
