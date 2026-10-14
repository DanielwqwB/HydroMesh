import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Bell,
  Boxes,
  Check,
  ChevronDown,
  CircleHelp,
  Droplets,
  LocateFixed,
  Layers3,
  RotateCcw,
  RotateCw,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Mountain,
  Building2,
  MapPinned,
  Search,
  Settings2,
  SlidersHorizontal,
  Waves,
  X,
} from "lucide-react";
import {
  assetTypeLabels,
  demoAssets,
  type DemoAsset,
} from "./data/assets";
import {
  HydromeshMap,
  type HydromeshMapHandle,
  getAssetSubtitle,
} from "./components/HydromeshMap";
import type { BuildingMode, MapboxStyle } from "./components/MapboxDigitalTwin";
import { NAGA_BARANGAYS } from "./data/nagaBarangays";
import { createMonitoringNodes, createSimulatedTelemetry, loadBarangayBoundaries } from "./services/barangayData";
import type { BarangayBoundary, MonitoringNode, TelemetryReading } from "./types/barangay";

const MapboxDigitalTwin = lazy(() => import("./components/MapboxDigitalTwin").then((module) => ({ default: module.MapboxDigitalTwin })));

type View = "overview" | "map" | "assets";

const navItems: Array<{ id: View; label: string; icon: typeof Activity }> = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "map", label: "3D GIS", icon: MapPinned },
  { id: "assets", label: "Assets", icon: Boxes },
];

function App() {
  const [view, setView] = useState<View>("overview");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mapProvider, setMapProvider] = useState<"cesium" | "mapbox">("cesium");
  const [mapStyle, setMapStyle] = useState<MapboxStyle>("light");
  const [buildingMode, setBuildingMode] = useState<BuildingMode>("mapbox");
  const [mapSettingsOpen, setMapSettingsOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [terrainVisible, setTerrainVisible] = useState(true);
  const [layerVisibility, setLayerVisibility] = useState({ boundaries: true, nodes: true, reservoirs: true, pumps: true, treatment: true, pipelines: true, buildings: true });
  const [selectedBarangayCode, setSelectedBarangayCode] = useState("");
  const [selectedMonitoringNodeId, setSelectedMonitoringNodeId] = useState<string | null>(null);
  const [barangayBoundaries, setBarangayBoundaries] = useState<BarangayBoundary[]>([]);
  const [boundaryMessage, setBoundaryMessage] = useState("Checking for verified boundary data…");
  const [boundaryAttribution, setBoundaryAttribution] = useState("");
  const [monitoringNodes, setMonitoringNodes] = useState<MonitoringNode[]>([]);
  const [barangayTelemetry, setBarangayTelemetry] = useState<TelemetryReading[]>([]);
  const mapRef = useRef<HydromeshMapHandle>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectedAsset = demoAssets.find((asset) => asset.id === selectedAssetId) ?? null;
  const selectedMonitoringNode = monitoringNodes.find((node) => node.id === selectedMonitoringNodeId) ?? null;
  const selectedMonitoringReading = selectedMonitoringNode ? barangayTelemetry.find((reading) => reading.nodeId === selectedMonitoringNode.id) ?? null : null;
  useEffect(() => { loadBarangayBoundaries().then((result) => { setBarangayBoundaries(result.boundaries); const nodes = createMonitoringNodes(result.boundaries); setMonitoringNodes(nodes); setBarangayTelemetry(createSimulatedTelemetry(nodes)); setBoundaryMessage(result.message); setBoundaryAttribution(result.attribution ?? ""); }).catch((error: unknown) => setBoundaryMessage(error instanceof Error ? error.message : "Boundary data could not be loaded.")); }, []);
  useEffect(() => { const node = monitoringNodes.find((candidate) => candidate.barangayCode === selectedBarangayCode && candidate.position); setSelectedMonitoringNodeId(node?.id ?? null); }, [selectedBarangayCode, monitoringNodes]);
  const storageAssets = demoAssets.filter((asset) => asset.type === "reservoir" || asset.type === "elevated_tank");
  const totalSupply = storageAssets.reduce((total, asset) => {
    const capacity = Number.parseFloat(asset.snapshot.find((item) => item.label === "Capacity")?.value ?? "0");
    const storage = Number.parseFloat(asset.snapshot.find((item) => item.label === "Storage")?.value ?? "0");
    return total + capacity * storage / 100;
  }, 0);
  const pressureValues = demoAssets
    .filter((asset) => asset.type === "pipeline")
    .map((asset) => Number.parseFloat(asset.snapshot.find((item) => item.label === "Pressure")?.value ?? "0"));
  const averagePressure = pressureValues.reduce((total, value) => total + value, 0) / pressureValues.length;
  const geographicallyPlacedNodes = monitoringNodes.filter((node) => node.position).length;
  const qualityValues = demoAssets
    .filter((asset) => asset.type === "sensor")
    .flatMap((asset) => asset.snapshot.filter((item) => item.label === "pH" || item.label === "Turbidity")
      .map((item) => Number.parseFloat(item.value)));
  const qualityWithinDemoBand = qualityValues.every((value) => value >= 0.1 && value <= 8.5);
  const results = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return demoAssets;
    return demoAssets.filter((asset) =>
      `${asset.name} ${assetTypeLabels[asset.type]} ${asset.zone}`
        .toLowerCase()
        .includes(query),
    );
  }, [search]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  const selectAsset = (assetId: string) => {
    setSelectedMonitoringNodeId(null);
    setSelectedAssetId(assetId);
    setSearch("");
    setSearchOpen(false);
  };

  const selectMonitoringNode = (nodeId: string) => {
    const node = monitoringNodes.find((candidate) => candidate.id === nodeId);
    if (!node) return;
    setSelectedAssetId(null);
    setSelectedMonitoringNodeId(node.id);
    setSelectedBarangayCode(node.barangayCode);
  };

  const onNav = (next: View) => {
    setView(next);
    if (next === "overview" || next === "map") mapRef.current?.overview();
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><Droplets size={20} strokeWidth={2.5} /></div>
          <div className="brand-name-wrap">
            <div className="brand-name">HydroMesh<span>-GIS</span></div>
            <div className="brand-caption">WATER NETWORK COMMAND</div>
          </div>
        </div>

        <div className="topbar-divider" />
        <div className="location-meta">
          <span className="location-pulse" />
          <div>
            <strong>Naga City</strong>
            <small>Camarines Sur · Philippines</small>
          </div>
          <ChevronDown size={15} />
        </div>

        <div className="global-search-wrap">
          <Search size={16} />
          <input
            ref={searchInputRef}
            aria-label="Search demo assets"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setSearchOpen(false);
              if (event.key === "Enter" && results[0]) selectAsset(results[0].id);
            }}
            placeholder="Search assets..."
          />
          <kbd>CTRL K</kbd>
          {searchOpen && (
            <>
              <button
                className="search-dismiss"
                aria-label="Close search results"
                onClick={() => setSearchOpen(false)}
              />
              <div className="search-results">
                <div className="search-results-label">DEMO ASSETS</div>
                {results.length ? results.map((asset) => (
                  <button key={asset.id} onClick={() => selectAsset(asset.id)}>
                    <span className={`mini-asset-icon ${asset.type}`}><AssetGlyph type={asset.type} /></span>
                    <span><strong>{asset.name}</strong><small>{getAssetSubtitle(asset)}</small></span>
                    <ArrowUpRight size={14} />
                  </button>
                )) : <div className="search-empty">No demo assets match that search.</div>}
              </div>
            </>
          )}
        </div>

        <div className="topbar-actions">
          <div className="mode-pill"><span /> SIMULATION MODE</div>
          <button className="icon-button notification-button" aria-label="Notifications">
            <Bell size={18} />
            <span className="notification-dot" />
          </button>
          <div className="user-chip">
            <div className="avatar">HM</div>
            <div><strong>Demo operator</strong><small>Local preview</small></div>
            <ChevronDown size={14} />
          </div>
        </div>
      </header>

      <div className={`body-shell ${inspectorOpen ? "" : "inspector-collapsed"}`}>
        <aside className="sidebar">
          <div className="sidebar-top-label">WORKSPACE</div>
          <nav className="primary-nav" aria-label="Main navigation">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                className={`nav-item ${view === id ? "active" : ""}`}
                key={id}
                onClick={() => onNav(id)}
                aria-current={view === id ? "page" : undefined}
              >
                <Icon size={18} strokeWidth={1.9} />
                <span>{label}</span>
                {id === "assets" && <span className="nav-count">{String(demoAssets.length).padStart(2, "0")}</span>}
              </button>
            ))}
          </nav>

          <div className="sidebar-section-label">DEMO AREA</div>
          <button className="area-card" onClick={() => mapRef.current?.overview()}>
            <div className="area-icon"><MapPinned size={17} /></div>
            <div><strong>Naga City pilot</strong><small>Illustrative view</small></div>
            <span className="area-status" />
          </button>

          <div className="sidebar-bottom">
            <div className="connection-card">
              <div className="connection-head"><span className="connection-led" /> LOCAL DEMO</div>
              <p>Map scene ready</p>
              <div className="connection-meter"><span /></div>
              <small>No sensor connection</small>
            </div>
            <button className="nav-item quiet-nav"><Settings2 size={18} /><span>Settings</span></button>
            <button className="nav-item quiet-nav"><CircleHelp size={18} /><span>Help center</span></button>
            <div className="sidebar-version">HYDROMESH · PHASE 01</div>
          </div>
        </aside>

        <section className="workspace">
          <div className="page-heading">
            <div>
              <div className="eyebrow"><span /> PILOT ENVIRONMENT <span className="eyebrow-separator">/</span> {viewLabel(view)}</div>
              <h1>{view === "assets" ? "Infrastructure assets" : view === "map" ? "3D network map" : "Operations overview"}</h1>
              <p>{view === "assets" ? `Explore ${demoAssets.length} illustrative assets in the Naga City demo area.` : "A spatial view of simulated water infrastructure in Naga City."}</p>
            </div>
            <div className="heading-actions">
              <div className="time-chip"><span className="time-dot" /> DEMO SCENE READY</div>
              <div className="map-provider-switch" aria-label="Map provider">
                <button className={mapProvider === "cesium" ? "active" : ""} onClick={() => setMapProvider("cesium")}>Cesium</button>
                <button className={mapProvider === "mapbox" ? "active" : ""} onClick={() => setMapProvider("mapbox")}>Mapbox 3D</button>
              </div>
              <button className="filter-button" onClick={() => setInspectorOpen((open) => !open)}>{inspectorOpen ? "Hide" : "Show"} inspector</button>
            </div>
          </div>

          <section className="metric-strip" aria-label="Simulated network overview">
            <MetricCard icon={<Droplets size={17} />} label="TOTAL WATER SUPPLY" value={`${totalSupply.toFixed(2)} ML`} detail="Illustrative stored volume" tone="cyan" />
            <MetricCard icon={<Activity size={17} />} label="GEOGRAPHICALLY VERIFIED" value={`${geographicallyPlacedNodes} / 27`} detail="Verified barangay placements" tone="green" title="Monitoring node placement is pending verified barangay boundary data." />
            <MetricCard icon={<Waves size={17} />} label="NETWORK PRESSURE" value={`${averagePressure.toFixed(1)} bar`} detail="Pipeline sample average" tone="blue" />
            <MetricCard icon={<Check size={17} />} label="WATER QUALITY" value={qualityWithinDemoBand ? "Within demo range" : "Review sample"} detail="Static pH & turbidity values" tone="amber" />
          </section>

          <div className="map-toolbar" role="toolbar" aria-label="Map controls">
            <label className="toolbar-select"><span>Barangay</span><select aria-label="Barangay" value={selectedBarangayCode} onChange={(event) => { setSelectedBarangayCode(event.target.value); if (!event.target.value) mapRef.current?.overview(); }}><option value="">All Naga City</option>{NAGA_BARANGAYS.map((barangay) => <option key={barangay.code} value={barangay.code}>{barangay.name}{barangayBoundaries.some((boundary) => boundary.code === barangay.code) ? "" : " · Unmapped"}</option>)}</select></label>
            <label className="toolbar-select style-select"><span>Map style</span><select aria-label="Map style" value={mapStyle} disabled={mapProvider !== "mapbox"} onChange={(event) => { const style = event.target.value as MapboxStyle; setMapStyle(style); if (style === "satellite" && buildingMode === "illustrative") setBuildingMode("mapbox"); }}><option value="light">Standard 3D</option><option value="satellite">Satellite</option><option value="dark">Night</option></select></label>
            <div className="toolbar-popover-wrap"><button className={`toolbar-icon ${layersOpen ? "active" : ""}`} aria-label="Map layers" aria-expanded={layersOpen} title="Map layers" onClick={() => { setLayersOpen((open) => !open); setMapSettingsOpen(false); }}><Layers3 size={17} /><span>Layers</span></button>{layersOpen && <div className="map-popover layers-popover" role="group" aria-label="Map layer visibility">{([["boundaries","Barangay boundaries"],["nodes","Monitoring nodes"],["reservoirs","Reservoirs"],["pumps","Pump stations"],["treatment","Treatment plants"],["pipelines","Pipelines"],["buildings","Buildings"]] as const).map(([key,label]) => { const unavailable = mapProvider === "cesium" && (key === "boundaries" || key === "nodes"); return <label key={key} title={unavailable ? "Select Mapbox 3D to view geographic boundary and node layers." : undefined}><input type="checkbox" disabled={unavailable} checked={layerVisibility[key]} onChange={(event) => setLayerVisibility((current) => ({ ...current, [key]: event.target.checked }))}/><span>{label}{unavailable ? " · Mapbox" : ""}</span></label>; })}{layerVisibility.nodes && <div className="compact-legend"><i className="normal"/>Normal <i className="warning"/>Warning <i className="critical"/>Critical <i className="offline"/>Offline</div>}</div>}</div>
            <button className="toolbar-icon reset-view" aria-label="Reset camera to Naga City" title="Reset camera" onClick={() => { setSelectedBarangayCode(""); mapRef.current?.overview(); }}><LocateFixed size={17}/><span>Reset view</span></button>
            <div className="toolbar-popover-wrap settings-wrap"><button className="toolbar-icon" aria-label="Map settings" aria-expanded={mapSettingsOpen} title="Map settings" onClick={() => { setMapSettingsOpen((open) => !open); setLayersOpen(false); }}><Settings2 size={17}/><span>Settings</span></button>{mapSettingsOpen && <div className="map-popover settings-popover" role="group" aria-label="Map settings">{mapProvider === "mapbox" && <><div className="popover-section-title">CAMERA</div><div className="camera-actions"><button title="Rotate left" aria-label="Rotate left" onClick={() => mapRef.current?.rotate("left")}><RotateCcw size={15}/></button><button title="Rotate right" aria-label="Rotate right" onClick={() => mapRef.current?.rotate("right")}><RotateCw size={15}/></button><button title="Tilt up" aria-label="Tilt up" onClick={() => mapRef.current?.tilt("up")}><ArrowUp size={15}/></button><button title="Tilt down" aria-label="Tilt down" onClick={() => mapRef.current?.tilt("down")}><ArrowDown size={15}/></button></div><div className="popover-section-title">BUILDINGS</div><select aria-label="Building mode" value={buildingMode} onChange={(event) => { const mode = event.target.value as BuildingMode; setBuildingMode(mode); if (mode === "illustrative") setMapStyle("light"); }}><option value="mapbox">Mapbox 3D data</option><option value="illustrative">Illustrative blocks</option></select><small>{buildingMode === "illustrative" ? "Illustrative heights, not surveyed." : "Native geometry where available."}</small></> }<label className="settings-toggle" title={mapProvider === "cesium" ? "Terrain elevation is not configured for Cesium fallback." : undefined}><input type="checkbox" disabled={mapProvider === "cesium"} checked={terrainVisible} onChange={(event) => setTerrainVisible(event.target.checked)} /><Mountain size={15}/> Terrain</label><label className="settings-toggle"><input type="checkbox" checked={layerVisibility.buildings} onChange={(event) => setLayerVisibility((current) => ({ ...current, buildings: event.target.checked }))}/><Building2 size={15}/> Building visibility</label><button className="fullscreen-action" onClick={() => { const stage = document.querySelector(".map-stage"); if (document.fullscreenElement) void document.exitFullscreen(); else void stage?.requestFullscreen(); }}><Maximize2 size={15}/> Fullscreen</button></div>}</div>
          </div>

          <section className="map-stage" aria-label="Naga City infrastructure map">
            {mapProvider === "cesium" ? (
              <HydromeshMap ref={mapRef} selectedAssetId={selectedAssetId} onSelectAsset={selectAsset} layerVisibility={layerVisibility} />
            ) : (
              <Suspense fallback={<div className="mapbox-loading">Loading 3D map…</div>}>
                <MapboxDigitalTwin ref={mapRef} selectedAssetId={selectedAssetId} onSelectAsset={selectAsset} onSelectBarangay={setSelectedBarangayCode} onSelectMonitoringNode={selectMonitoringNode} styleMode={mapStyle} buildingMode={buildingMode} selectedBarangayCode={selectedBarangayCode} selectedMonitoringNodeId={selectedMonitoringNodeId} barangayBoundaries={barangayBoundaries} monitoringNodes={monitoringNodes} layerVisibility={layerVisibility} terrainVisible={terrainVisible} />
              </Suspense>
            )}
            <div className="map-vignette" />
            <div className="map-top-left glass-panel">
              <div className="map-title-line"><span className="map-pin"><MapPinned size={15} /></span><div><strong>Naga City</strong><small>13.6218° N&nbsp;&nbsp;123.1948° E</small></div></div>
              <span className="map-live-tag"><i /> {mapProvider === "mapbox" ? "MAPBOX" : "DEMO"}</span>
            </div>

            <div className="map-controls glass-panel" aria-label="Zoom map"><button title="Zoom in" aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()}><ZoomIn size={17}/></button><button title="Zoom out" aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()}><ZoomOut size={17}/></button></div>
            <div className="map-simulation-tag">SIMULATION MODE · {geographicallyPlacedNodes} / 27 GEOGRAPHICALLY VERIFIED</div>

            <div className="map-attribution-note">{mapProvider === "mapbox" ? "© Mapbox" : "Imagery © OpenStreetMap contributors"}{boundaryAttribution && <> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">{boundaryAttribution} · ODbL</a></>}</div>
          </section>
          <section className="map-bottom-widgets" aria-label="Illustrative network widgets">
            <article className="bottom-widget"><div><span>RESERVOIR LEVEL</span><strong>78%</strong></div><div className="widget-track"><i style={{ width: "78%" }} /></div><small>Reservoir A · simulated storage</small></article>
            <article className="bottom-widget"><div><span>FLOW DISTRIBUTION</span><strong>143 <small>L/s</small></strong></div><div className="widget-bars"><i /><i /><i /><i /><i /><i /><i /><i /></div><small>Illustrative network sample</small></article>
            <article className="bottom-widget"><div><span>WATER QUALITY</span><strong>7.2 <small>pH</small></strong></div><div className="quality-band"><i /></div><small>Example reading · within demo band</small></article>
          </section>
          <section className="barangay-monitoring-panel">
            <div className="barangay-panel-heading"><div><div className="eyebrow"><span /> GEOGRAPHIC COVERAGE</div><h2>Barangay monitoring network</h2><p>PSGC-registered areas · simulated node identities await verified boundaries</p></div><div className="barangay-coverage-count"><strong>{barangayBoundaries.length} / 27</strong><small>BOUNDARIES MAPPED</small></div></div>
            <div className="boundary-source-note"><span className={barangayBoundaries.length ? "loaded" : "pending"} />{boundaryMessage} <span>· No node coordinates are shown until matching polygons load.</span></div>
            <div className="barangay-list">{NAGA_BARANGAYS.filter((barangay) => !selectedBarangayCode || barangay.code === selectedBarangayCode).map((barangay) => {
              const node = monitoringNodes.find((item) => item.barangayCode === barangay.code);
              const reading = node ? barangayTelemetry.find((item) => item.nodeId === node.id) : undefined;
              const placed = Boolean(node?.position);
              return <button className={`barangay-row ${selectedBarangayCode === barangay.code ? "selected" : ""}`} key={barangay.code} onClick={() => setSelectedBarangayCode(barangay.code)}><span className="barangay-row-name"><strong>{barangay.name}</strong><small>PSGC {barangay.code} · {node?.id ?? `NAGA-${barangay.name.toUpperCase()}-001`}</small></span><span className="barangay-node-count">{placed ? "1 node" : "1 unplaced"}</span><span className={`barangay-map-status ${placed ? "mapped" : "unmapped"}`}>{placed ? "PLACED" : "UNMAPPED"}</span><span className="barangay-reading">{reading ? `${reading.pressureBar} bar · ${reading.flowLitresPerSecond} L/s · pH ${reading.pH} · ${reading.turbidityNTU} NTU` : "No location data"}</span></button>;
            })}</div>
            <small className="barangay-data-attribution">Registry: Philippine Statistics Authority, PSGC, 31 July 2025. {boundaryAttribution && `Boundary data: ${boundaryAttribution}. `}Telemetry is simulated and illustrative. Boundary file expected at <code>/data/naga-city-barangays.geojson</code> with matching city, province, PSGC code, and barangay name properties; metadata at <code>/data/naga-city-boundaries-attribution.json</code> must document source, license, rights basis and reference, attribution, and EPSG:4326.</small>
          </section>
        </section>

        {inspectorOpen && <aside className="inspector">
          <div className="right-summary">
            <div className="right-summary-heading"><span>NETWORK HEALTH</span><b>SIMULATED</b></div>
            <div className="health-score"><strong>94</strong><span>/ 100</span><i><em /></i></div>
            <div className="health-foot"><span><i className="health-green" /> 13 normal</span><span><i className="health-amber" /> 1 warning</span><span><i className="health-red" /> 1 critical</span></div>
            <div className="alert-heading"><strong>Recent alerts</strong><span>2 demo</span></div>
            <div className="mini-alert warning"><i /> <span><b>Low pressure sample</b><small>Monitoring Node 03 · illustrative</small></span></div>
            <div className="mini-alert critical"><i /> <span><b>Flow anomaly sample</b><small>Mainline Segment 05 · illustrative</small></span></div>
          </div>
          {selectedMonitoringNode ? (
            <MonitoringNodeInspector node={selectedMonitoringNode} reading={selectedMonitoringReading} onClear={() => { setSelectedMonitoringNodeId(null); setSelectedBarangayCode(""); }} />
          ) : view === "assets" ? (
            <AssetList selectedAssetId={selectedAssetId} onSelect={selectAsset} />
          ) : (
            <AssetInspector
              asset={selectedAsset}
              onClear={() => setSelectedAssetId(null)}
              onSelect={selectAsset}
              onFocus={(assetId) => mapRef.current?.focusAsset(assetId)}
            />
          )}
          <div className="inspector-footer"><span className="footer-shield"><Check size={13} /></span><span>Demo environment only</span><button aria-label="About demo environment"><CircleHelp size={15} /></button></div>
        </aside>}
      </div>
    </main>
  );
}

function viewLabel(view: View) {
  return view === "assets" ? "ASSET REGISTER" : view === "map" ? "SPATIAL VIEW" : "DASHBOARD";
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  tone,
  title,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "cyan" | "green" | "blue" | "amber";
  title?: string;
}) {
  return (
    <article className={`metric-card metric-${tone}`} title={title} aria-label={title} tabIndex={title ? 0 : undefined}>
      <div className="metric-icon">{icon}</div>
      <div className="metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
      <span className="metric-badge">SIM</span>
    </article>
  );
}

function MonitoringNodeInspector({ node, reading, onClear }: { node: MonitoringNode; reading: TelemetryReading | null; onClear: () => void }) {
  const barangay = NAGA_BARANGAYS.find((item) => item.code === node.barangayCode);
  const statusLabel = node.status.replace("_", " ").toUpperCase();
  return <div className="inspector-content">
    <div className="inspector-heading"><div><div className="eyebrow">ASSET INSPECTOR · SIMULATION</div><h2>Barangay monitoring node</h2></div><button className="small-icon-button" aria-label="Clear selected node" onClick={onClear}><X size={15} /></button></div>
    <div className="selected-asset-card">
      <div className="selected-card-top"><span className="asset-type-icon sensor"><LocateFixed size={16} /></span><span className={`synthetic-badge status-${node.status}`}><i /> SIM {statusLabel}</span></div>
      <h3>{node.id}</h3><p>{barangay?.name ?? "Naga City barangay"} · PSGC {node.barangayCode}</p>
      <div className="asset-type-row"><span>{node.position ? `${node.position.latitude.toFixed(5)}, ${node.position.longitude.toFixed(5)}` : "Unmapped"}</span><span className="type-divider" /><span>Illustrative sensor</span></div>
    </div>
    {reading ? <div className="inspector-section"><div className="section-title-row"><div><h3>Simulated telemetry</h3><span>No physical device connection</span></div><span className="tiny-count">DEMO</span></div><div className="telemetry-grid">
      <TelemetryCell label="Pressure" value={reading.pressureBar.toFixed(1)} unit="bar" />
      <TelemetryCell label="Flow rate" value={reading.flowLitresPerSecond.toFixed(1)} unit="L/s" />
      <TelemetryCell label="pH" value={reading.pH.toFixed(1)} unit="" />
      <TelemetryCell label="Turbidity" value={reading.turbidityNTU.toFixed(1)} unit="NTU" />
      <TelemetryCell label="TDS" value={String(reading.tdsMgPerL)} unit="mg/L" />
      <TelemetryCell label="Chlorine residual" value={reading.chlorineMgPerL.toFixed(2)} unit="mg/L" />
    </div><small className="barangay-data-attribution">Simulated at {new Date(reading.recordedAt).toLocaleString()} · fictional values for demonstration only.</small></div> : <div className="empty-tip"><span>UNMAPPED</span> Geographic boundary data and usage permission are required to place this node.</div>}
  </div>;
}

function TelemetryCell({ label, value, unit }: { label: string; value: string; unit: string }) {
  return <div className="telemetry-cell"><span>{label}</span><strong>{value}<small>{unit}</small></strong><em>SIM</em></div>;
}

function AssetGlyph({ type }: { type: DemoAsset["type"] }) {
  if (type === "reservoir") return <Droplets size={16} />;
  if (type === "elevated_tank") return <Boxes size={16} />;
  if (type === "pump_station") return <Activity size={16} />;
  if (type === "treatment_plant") return <Waves size={16} />;
  if (type === "control_valve") return <Settings2 size={16} />;
  if (type === "sensor") return <LocateFixed size={16} />;
  return <MapPinned size={16} />;
}

function AssetInspector({
  asset,
  onClear,
  onSelect,
  onFocus,
}: {
  asset: DemoAsset | null;
  onClear: () => void;
  onSelect: (assetId: string) => void;
  onFocus: (assetId: string) => void;
}) {
  if (!asset) {
    return (
      <div className="inspector-content empty-inspector">
        <div className="inspector-heading"><div><div className="eyebrow">ASSET INSPECTOR</div><h2>Asset details</h2></div><button className="small-icon-button" aria-label="Inspector options"><SlidersHorizontal size={15} /></button></div>
        <div className="empty-state">
          <div className="empty-orbit"><div className="empty-core"><LocateFixed size={22} /></div><span className="orbit-node" /></div>
          <h3>Select a map asset</h3>
          <p>Click one of the 3D structures or choose an item from the asset list to view its demonstration details.</p>
          <div className="empty-tip"><span>TIP</span> Drag the map to pan. Right-drag to tilt.</div>
        </div>
        <div className="inspector-section quick-list-section">
          <div className="section-title-row"><div><h3>Demo assets</h3><span>{demoAssets.length} selectable scene models</span></div><span className="tiny-count">{String(demoAssets.length).padStart(2, "0")}</span></div>
          <div className="quick-asset-list">
            {demoAssets.map((item) => <AssetRow key={item.id} asset={item} onSelect={() => onSelect(item.id)} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="inspector-content">
      <div className="inspector-heading"><div><div className="eyebrow">ASSET INSPECTOR</div><h2>Asset details</h2></div><button className="small-icon-button" aria-label="Clear selected asset" onClick={onClear}><X size={15} /></button></div>
      <div className="selected-asset-card">
        <div className="selected-card-top"><span className={`asset-type-icon ${asset.type}`}><AssetGlyph type={asset.type} /></span><span className={`synthetic-badge status-${asset.status}`}><i /> DEMO {asset.status.toUpperCase()}</span></div>
        <h3>{asset.name}</h3>
        <p>{asset.description}</p>
        <div className="asset-type-row"><span>{assetTypeLabels[asset.type]}</span><span className="type-divider" /><span>{asset.zone}</span></div>
      </div>

      <div className="inspector-section">
        <div className="section-title-row"><div><h3>Example snapshot</h3><span>Static illustrative values</span></div><span className="snapshot-icon"><Activity size={15} /></span></div>
        <div className="telemetry-grid">
          {asset.snapshot.map((item, index) => <div className="telemetry-cell" key={item.label}>
            <span>{item.label}</span><strong>{item.value}<small>{item.unit}</small></strong>
            {index === 0 && <em><ArrowUpRight size={11} /> DEMO</em>}
          </div>)}
        </div>
        <div className="sample-data-note"><span>!</span><p>Example values only. These are not live readings or verified utility data.</p></div>
      </div>

      <div className="inspector-section location-section">
        <div className="section-title-row"><div><h3>Location</h3><span>Illustrative coordinate</span></div><button className="text-action" onClick={() => onFocus(asset.id)}>Focus <ArrowUpRight size={13} /></button></div>
        <div className="coordinate-card"><div className="coordinate-icon"><LocateFixed size={15} /></div><div><strong>{asset.latitude.toFixed(4)}° N</strong><small>{asset.longitude.toFixed(4)}° E</small></div><span className="coord-copy">DEMO</span></div>
      </div>

      <div className="inspector-section asset-condition-section">
        <div className="section-title-row"><div><h3>Asset condition</h3><span>Prototype status only</span></div></div>
        <div className={`condition-row condition-${asset.status}`}><div className="condition-check"><Check size={14} /></div><div><strong>{asset.status === "normal" ? "Demo asset configured" : `Simulated ${asset.status} condition`}</strong><small>No operational status is connected</small></div><span className="condition-pill">MOCK</span></div>
      </div>
    </div>
  );
}

function AssetList({ selectedAssetId, onSelect }: { selectedAssetId: string | null; onSelect: (assetId: string) => void }) {
  const selectedAsset = demoAssets.find((asset) => asset.id === selectedAssetId) ?? null;
  return (
    <div className="inspector-content asset-register">
      <div className="inspector-heading"><div><div className="eyebrow">DEMO INVENTORY</div><h2>Asset register</h2></div><span className="tiny-count large-count">{String(demoAssets.length).padStart(2, "0")}</span></div>
      <div className="register-intro"><Boxes size={16} /><p>Fictional infrastructure models are positioned in this stylized Naga City scene.</p></div>
      <div className="register-list">
        {demoAssets.map((asset) => <button className={`register-card ${selectedAssetId === asset.id ? "selected" : ""}`} key={asset.id} onClick={() => onSelect(asset.id)}>
          <div className={`asset-type-icon ${asset.type}`}><AssetGlyph type={asset.type} /></div>
          <div className="register-card-copy"><strong>{asset.name}</strong><small>{getAssetSubtitle(asset)}</small><span className="register-coordinate">{asset.latitude.toFixed(4)}° N · {asset.longitude.toFixed(4)}° E</span></div>
          <ArrowUpRight size={15} />
        </button>)}
      </div>
      <div className="register-note"><span className="note-icon">i</span><div><strong>Fictional demo assets</strong><p>Names, coordinates, and sample measurements are illustrative and do not describe real Naga City utility infrastructure.</p></div></div>
      {selectedAsset && <div className="register-selected"><Check size={14} /> {selectedAsset.name} selected on map</div>}
    </div>
  );
}

function AssetRow({ asset, onSelect }: { asset: DemoAsset; onSelect: () => void }) {
  return <button className="quick-asset-row" onClick={onSelect}>
    <span className={`mini-asset-icon ${asset.type}`}><AssetGlyph type={asset.type} /></span>
    <span><strong>{asset.name}</strong><small>{assetTypeLabels[asset.type]}</small></span>
    <ArrowUpRight size={14} />
  </button>;
}

export default App;
