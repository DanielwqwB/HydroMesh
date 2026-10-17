import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  Bell,
  Boxes,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Droplets,
  FileText,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  Map,
  MapPin,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  Waves,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { demoAssets, assetTypeLabels } from "./data/assets";
import { OperatorMap } from "./components/OperatorMap";
import "./operator.css";
import {
  seedIncidents,
  seedOrders,
  type Incident,
  type WorkOrder,
} from "./data/operatorSeeds";
import { Badge, Panel, Chart, Metric } from "./components/OperatorUI";
import {
  useSharedState,
  recordEvent,
  downloadCsv,
} from "./services/workspaceStore";
import {
  seedPermissions,
  seedUsers,
  type SavedReport,
} from "./data/adminSeeds";
import { OperatorNotifications } from "./components/OperatorNotifications";
import { RoleSwitcher } from "./components/RoleSwitcher";

type View =
  | "Dashboard"
  | "Map"
  | "Assets"
  | "Alerts"
  | "Operations"
  | "Water Quality"
  | "Reports"
  | "Work Orders"
  | "Users";
const navigation: [View, LucideIcon][] = [
  ["Dashboard", LayoutDashboard],
  ["Map", Map],
  ["Assets", Boxes],
  ["Alerts", Bell],
  ["Operations", Gauge],
  ["Water Quality", FlaskConical],
  ["Reports", FileText],
  ["Work Orders", Wrench],
  ["Users", Users],
];
const headings: Record<View, [string, string]> = {
  Dashboard: [
    "Operations Dashboard",
    "Real-time visibility into your water network. Every asset, every reading, in one place.",
  ],
  Map: [
    "3D Network Map",
    "Explore water infrastructure and monitoring locations across Naga City.",
  ],
  Assets: [
    "Network Asset Register",
    "A connected view of reservoirs, pipelines, pump stations, and monitoring equipment.",
  ],
  Alerts: [
    "Alert Triage & Incident Management",
    "Monitor, assess, and coordinate a response to events across the water network.",
  ],
  Operations: [
    "Network Actuator & Valve Control",
    "Monitor and manage valves, pumps, and flow across the distribution network.",
  ],
  "Water Quality": [
    "Water Quality Compliance Monitoring",
    "Track water quality parameters and identify locations that need attention.",
  ],
  Reports: [
    "Reports & Analytics",
    "Your network performance, maintenance, and water quality reports in one place.",
  ],
  "Work Orders": [
    "Work Order & Maintenance Management",
    "Plan, assign, and track maintenance activities for your water network assets.",
  ],
  Users: [
    "Teams & Operators",
    "Coordinate the people keeping your municipal water network running.",
  ],
};
const quality = [
  { name: "pH", value: "7.2", range: "6.5–8.5", icon: FlaskConical },
  { name: "Turbidity", value: "2.1 NTU", range: "≤ 5 NTU", icon: Waves },
  {
    name: "Chlorine",
    value: "0.8 mg/L",
    range: "0.2–2.0 mg/L",
    icon: Droplets,
  },
  { name: "TDS", value: "320 ppm", range: "≤ 500 ppm", icon: Boxes },
];
const assetName = (id: string) =>
  demoAssets.find((a) => a.id === id)?.name ?? id;
export default function OperatorApp() {
  const [permissions] = useSharedState("permissions", seedPermissions);
  const [users] = useSharedState("users", seedUsers);
  const [, setReports] = useSharedState<SavedReport[]>(
    "reports",
    [],
    "Operator",
    "Reports",
  );
  const account = users.find((user) => user.id === "operator-1");
  const allowed = permissions[account?.role ?? "Operator"];
  const [view, setView] = useState<View>("Dashboard");
  const [incidents, setIncidents] = useSharedState(
    "incidents",
    seedIncidents,
    "Operator",
    "Alerts",
  );
  const [orders, setOrders] = useSharedState(
    "orders",
    seedOrders,
    "Operator",
    "Work Orders",
  );
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState("AL-001");
  const [selectedOrder, setSelectedOrder] = useState("WO-001");
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [globalQuery, setGlobalQuery] = useState("");
  const [modal, setModal] = useState<"incident" | "order" | null>(null);
  const [toast, setToast] = useState("");
  const [controlEnabled, setControlEnabled] = useState(false);
  const [controlAsset, setControlAsset] = useState("demo-valve-1");
  const [positions, setPositions] = useSharedState<Record<string, number>>(
    "positions",
    { "demo-valve-1": 100, "demo-valve-2": 0, "demo-pump-b": 100 },
    "Operator",
  );
  const [position, setPosition] = useState(100);
  const [operationLog, setOperationLog] = useSharedState(
    "operationLog",
    [
      { asset: "demo-valve-1", action: "Opened", time: "10:24 AM" },
      { asset: "demo-pump-b", action: "Started", time: "09:10 AM" },
    ],
    "Operator",
  );
  const [period, setPeriod] = useState("7");
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setModal(null);
        setGlobalQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timeout);
  }, [toast]);
  const navigate = (next: View) => {
    if (!allowed.includes(next)) {
      setToast("Your role does not have access to this module.");
      return;
    }
    setView(next);
    setFilter("All");
    setQuery("");
  };
  const incident = incidents.find((i) => i.id === selectedIncident)!;
  const order = orders.find((o) => o.id === selectedOrder)!;
  const activeAlerts = incidents.filter((i) => i.status !== "Resolved");
  const pickIncident = (item: Incident) => {
    setSelectedIncident(item.id);
    setSelectedAsset(item.asset);
  };
  const pickOrder = (item: WorkOrder) => {
    setSelectedOrder(item.id);
    setSelectedAsset(item.asset);
  };
  const updateIncident = (change: Partial<Incident>) => {
    setIncidents((items) =>
      items.map((i) => (i.id === selectedIncident ? { ...i, ...change } : i)),
    );
    setToast("Incident updated in the shared demo.");
  };
  const updateOrder = (change: Partial<WorkOrder>) => {
    setOrders((items) =>
      items.map((o) => (o.id === selectedOrder ? { ...o, ...change } : o)),
    );
    setToast("Work order updated in the shared demo.");
  };
  const operate = (value: number) => {
    if (!controlEnabled) return;
    setPositions((p) => ({ ...p, [controlAsset]: value }));
    setPosition(value);
    recordEvent(
      "Operator",
      "Operations",
      "Command",
      `${assetName(controlAsset)}: simulated output set to ${value}%`,
    );
    setOperationLog((log) => [
      {
        asset: controlAsset,
        action:
          value === 0
            ? "Closed / stopped"
            : value === 100
              ? "Opened / started"
              : `Set to ${value}%`,
        time: new Date().toLocaleTimeString("en-PH", {
          timeZone: "Asia/Manila",
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
      ...log,
    ]);
    setToast(
      "Simulated command completed. No physical equipment is connected.",
    );
  };
  const exportReport = (name: string) => {
    const rows =
      name === "Maintenance"
        ? [
            ["ID", "Title", "Status", "Team", "Due"],
            ...orders.map((o) => [o.id, o.title, o.status, o.team, o.due]),
          ]
        : name === "Water quality"
          ? [
              ["Parameter", "Sample reading", "Demo target"],
              ...quality.map((q) => [q.name, q.value, q.range]),
            ]
          : [
              ["Asset", "Type", "Zone", "Sample status"],
              ...demoAssets.map((a) => [
                a.name,
                assetTypeLabels[a.type],
                a.zone,
                a.status,
              ]),
            ];
    downloadCsv(`HydroMesh-${name.toLowerCase().replaceAll(" ", "-")}.csv`, [
      ["Demo data only"],
      ...rows,
    ]);
    setReports((items) => [
      {
        id: crypto.randomUUID(),
        name,
        type: name,
        at: new Date().toISOString(),
        generatedBy: "Operator",
        rows,
      },
      ...items,
    ]);
    recordEvent("Operator", "Reports", "Export", `${name} report exported`);
    setToast(`${name} report exported.`);
  };
  const map = (
    <OperatorMap
      selectedAssetId={selectedAsset}
      onSelectAsset={setSelectedAsset}
    />
  );
  const viewAll = (target: View, label = "View all") => (
    <button className="op-text-button" onClick={() => navigate(target)}>
      {label}
      <ArrowRight size={14} />
    </button>
  );
  const alertList = (
    <div className="op-alert-list">
      {activeAlerts.slice(0, 5).map((a) => (
        <button
          className={`op-alert ${a.severity.toLowerCase()}`}
          key={a.id}
          onClick={() => {
            pickIncident(a);
            navigate("Alerts");
          }}
        >
          <span className="op-alert-icon">
            <CircleAlert size={18} />
          </span>
          <span>
            <strong>{a.title}</strong>
            <small>{assetName(a.asset)}</small>
          </span>
          <time>{a.time}</time>
        </button>
      ))}
      {!activeAlerts.length && (
        <p className="op-empty">All incidents resolved.</p>
      )}
    </div>
  );
  if (account?.status !== "Active" || !allowed.includes(view))
    return (
      <div className="operator-app ad-access-denied">
        <ShieldCheck size={40} />
        <h1>
          {account?.status !== "Active"
            ? "Operator access suspended"
            : "Module access restricted"}
        </h1>
        <p>
          The administrator changed access for this demo account. Switch
          workspaces to review user permissions.
        </p>
        <OperatorNotifications />
        <RoleSwitcher role="Operator" />
        {account?.status === "Active" && (
          <button className="op-primary" onClick={() => setView("Dashboard")}>
            Return to dashboard
          </button>
        )}
      </div>
    );
  return (
    <div className="operator-app">
      <header className="op-header">
        <a
          className="op-brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("Dashboard");
          }}
        >
          <span className="op-logo">
            <Droplets size={29} />
          </span>
          <span>
            <strong>
              HydroMesh<span>-GIS</span>
            </strong>
            <small>Spatial Telemetry & Predictive Analytics</small>
          </span>
        </a>
        <div className="op-global-search">
          <Search size={18} />
          <input
            ref={searchRef}
            aria-label="Search network assets"
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
            placeholder="Search locations, assets, or monitoring stations…"
          />
          <kbd>Ctrl + K</kbd>
          {globalQuery && (
            <div className="op-search-results">
              {demoAssets
                .filter((a) =>
                  `${a.name} ${a.zone}`
                    .toLowerCase()
                    .includes(globalQuery.toLowerCase()),
                )
                .map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setSelectedAsset(a.id);
                      navigate("Map");
                      setGlobalQuery("");
                    }}
                  >
                    <MapPin size={16} />
                    <span>
                      {a.name}
                      <small>{a.zone}</small>
                    </span>
                    <ChevronRight size={15} />
                  </button>
                ))}
              {!demoAssets.some((a) =>
                `${a.name} ${a.zone}`
                  .toLowerCase()
                  .includes(globalQuery.toLowerCase()),
              ) && <p>No matching assets.</p>}
            </div>
          )}
        </div>
        <OperatorNotifications
          onOpenModule={(module) => navigate(module as View)}
        />
        <RoleSwitcher role="Operator" />
      </header>
      <aside className="op-sidebar">
        <div className="op-nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation
            .filter(([name]) => allowed.includes(name))
            .map(([name, Icon]) => (
              <button
                key={name}
                className={view === name ? "active" : ""}
                aria-current={view === name ? "page" : undefined}
                onClick={() => navigate(name)}
              >
                <Icon size={19} />
                <span>{name}</span>
                {name === "Alerts" && <b>{activeAlerts.length}</b>}
              </button>
            ))}
        </nav>
        <div className="op-sidebar-bottom">
          <div className="op-city">
            <MapPin size={18} />
            <span>
              <strong>Naga City</strong>
              <small>Camarines Sur, Philippines</small>
            </span>
          </div>
          <div className="op-demo-note">
            <span className="op-dot" /> DEMO WORKSPACE
            <small>Sample data · Shared browser demo</small>
          </div>
          <span className="op-version">
            HYDROMESH GIS <span>v1.0</span>
          </span>
        </div>
      </aside>
      <main className="op-main">
        <div className="op-breadcrumb">
          Municipal utility <ChevronRight size={13} /> <span>{view}</span>
        </div>
        <div className="op-page-heading">
          <div>
            <h1>{headings[view][0]}</h1>
            <p>{headings[view][1]}</p>
          </div>
          {view === "Alerts" || view === "Work Orders" ? (
            <button
              className="op-primary"
              onClick={() => setModal(view === "Alerts" ? "incident" : "order")}
            >
              <Plus size={17} />
              Create {view === "Alerts" ? "Incident" : "Work Order"}
            </button>
          ) : (
            <div className="op-date">
              <CalendarDays size={15} />
              Oct 18, 2026
              <span />
              <i className="op-dot" />
              Demo data
            </div>
          )}
        </div>
        <div className="op-metrics">
          {view === "Water Quality" ? (
            quality.map((q) => (
              <Metric
                key={q.name}
                label={`${q.name} (Average)`}
                value={q.value}
                detail="Within demo range"
                icon={q.icon}
              />
            ))
          ) : view === "Alerts" ? (
            <>
              <Metric
                label="Active Alerts"
                value={String(activeAlerts.length)}
                detail="Across the network"
                icon={Bell}
              />
              <Metric
                label="Critical Alerts"
                value={String(
                  activeAlerts.filter((a) => a.severity === "Critical").length,
                )}
                detail="Needs attention"
                icon={CircleAlert}
                tone="red"
              />
              <Metric
                label="Warning Alerts"
                value={String(
                  activeAlerts.filter((a) => a.severity === "Warning").length,
                )}
                detail="Under observation"
                icon={Activity}
                tone="amber"
              />
              <Metric
                label="Resolved"
                value={String(incidents.length - activeAlerts.length)}
                detail="This session"
                icon={ShieldCheck}
                tone="green"
              />
            </>
          ) : view === "Work Orders" ? (
            <>
              <Metric
                label="Total Work Orders"
                value={String(orders.length)}
                detail="Maintenance register"
                icon={ClipboardList}
              />
              <Metric
                label="Open Work Orders"
                value={String(orders.filter((o) => o.status === "Open").length)}
                detail="Awaiting action"
                icon={Wrench}
                tone="red"
              />
              <Metric
                label="In Progress"
                value={String(
                  orders.filter((o) => o.status === "In Progress").length,
                )}
                detail="Assigned to a team"
                icon={Activity}
              />
              <Metric
                label="Completed"
                value={String(
                  orders.filter((o) => o.status === "Completed").length,
                )}
                detail="Maintenance complete"
                icon={ShieldCheck}
                tone="green"
              />
            </>
          ) : view === "Operations" ? (
            <>
              <Metric
                label="Controllable Valves"
                value="2 / 2"
                detail="Available in demo"
                icon={Settings2}
              />
              <Metric
                label="Pump Stations"
                value="1"
                detail={positions["demo-pump-b"] ? "Running" : "Stopped"}
                icon={Activity}
                tone="green"
                bars
              />
              <Metric
                label="Flow Rate (Network)"
                value="420 L/s"
                detail="Sample reading"
                icon={Waves}
                tone="green"
              />
              <Metric
                label="System Pressure"
                value="3.4 bar"
                detail="Sample average"
                icon={Gauge}
              />
            </>
          ) : (
            <>
              <Metric
                label="Total Water Supply"
                value="4.35 ML"
                detail="Stored volume · sample"
                icon={Droplets}
              />
              <Metric
                label="Network Assets"
                value={String(demoAssets.length)}
                detail="Mapped infrastructure"
                icon={Activity}
                tone="green"
                bars
              />
              <Metric
                label="System Pressure"
                value="3.4 bar"
                detail="Sample average"
                icon={Gauge}
                tone="green"
              />
              <Metric
                label="Water Quality"
                value="98%"
                detail="Sample compliance"
                icon={ShieldCheck}
              />
            </>
          )}
        </div>
        {(view === "Dashboard" || view === "Map") && (
          <>
            <div
              className={`op-dashboard-grid ${view === "Map" ? "map-expanded" : ""}`}
            >
              <div className="op-map-card">{map}</div>
              <div className="op-right-stack">
                <Panel title="Active Alerts" action={viewAll("Alerts")}>
                  {alertList}
                </Panel>
                <Panel title="Network Status">
                  <div className="op-network">
                    <div className="op-ring">
                      <div>
                        <strong>
                          {Math.round(
                            (demoAssets.filter((a) => a.status === "normal")
                              .length /
                              demoAssets.length) *
                              100,
                          )}
                          %
                        </strong>
                        <small>Healthy assets</small>
                      </div>
                    </div>
                    <div className="op-network-list">
                      <span>
                        <i className="op-dot" />
                        Normal{" "}
                        <b>
                          {
                            demoAssets.filter((a) => a.status === "normal")
                              .length
                          }
                        </b>
                      </span>
                      <span>
                        <i className="op-dot amber" />
                        Warning{" "}
                        <b>
                          {
                            demoAssets.filter((a) => a.status === "warning")
                              .length
                          }
                        </b>
                      </span>
                      <span>
                        <i className="op-dot red" />
                        Critical{" "}
                        <b>
                          {
                            demoAssets.filter((a) => a.status === "critical")
                              .length
                          }
                        </b>
                      </span>
                      <span>
                        Total assets <b>{demoAssets.length}</b>
                      </span>
                    </div>
                  </div>
                </Panel>
              </div>
            </div>
            <div className="op-bottom-grid">
              <Panel
                title="Water Level Trend"
                action={
                  <span className="op-chart-key">
                    ● Reservoir A <i>● Tank D</i>
                  </span>
                }
              >
                <Chart />
              </Panel>
              <Panel
                title="Flow Rate (L/s)"
                action={
                  <span className="op-chart-key">
                    ● Inflow <i>● Outflow</i>
                  </span>
                }
              >
                <Chart bars />
              </Panel>
              <Panel
                title="Water Quality Overview"
                action={viewAll("Water Quality", "Details")}
              >
                <div className="op-quality-mini">
                  {quality.map((q) => (
                    <div key={q.name}>
                      <q.icon size={22} />
                      <span>{q.name}</span>
                      <strong>{q.value}</strong>
                      <small>Normal</small>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </>
        )}
        {view === "Alerts" && (
          <div className="op-triage-grid">
            <Panel title={`Alerts & Incidents (${incidents.length})`}>
              <div className="op-tabs">
                {["All", "Critical", "Warning", "Info", "Resolved"].map((f) => (
                  <button
                    key={f}
                    className={filter === f ? "active" : ""}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="op-list-search">
                <Search size={15} />
                <input
                  aria-label="Filter incidents"
                  placeholder="Search alerts or locations…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="op-incident-rows">
                {incidents
                  .filter(
                    (a) =>
                      (filter === "All" ||
                        (filter === "Resolved"
                          ? a.status === "Resolved"
                          : a.severity === filter &&
                            a.status !== "Resolved")) &&
                      `${a.title} ${assetName(a.asset)}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                  )
                  .map((a) => (
                    <button
                      key={a.id}
                      className={selectedIncident === a.id ? "selected" : ""}
                      onClick={() => pickIncident(a)}
                    >
                      <span
                        className={`op-severity ${a.severity.toLowerCase()}`}
                      >
                        <CircleAlert size={18} />
                      </span>
                      <span>
                        <strong>{a.title}</strong>
                        <small>{assetName(a.asset)}</small>
                      </span>
                      <span>
                        <Badge>
                          {a.status === "Open" ? a.severity : a.status}
                        </Badge>
                        <small>{a.time}</small>
                      </span>
                    </button>
                  ))}
              </div>
            </Panel>
            <div className="op-map-card">{map}</div>
            <Panel title="Alert Details">
              <div className="op-detail-title">
                <span
                  className={`op-severity ${incident.severity.toLowerCase()}`}
                >
                  <CircleAlert size={25} />
                </span>
                <div>
                  <h3>{incident.title}</h3>
                  <p>{assetName(incident.asset)}</p>
                </div>
              </div>
              <div className="op-section-label">INCIDENT OVERVIEW</div>
              <dl className="op-details">
                <dt>Alert ID</dt>
                <dd>{incident.id}</dd>
                <dt>Severity</dt>
                <dd>
                  <Badge>{incident.severity}</Badge>
                </dd>
                <dt>Location</dt>
                <dd>{demoAssets.find((a) => a.id === incident.asset)?.zone}</dd>
                <dt>Status</dt>
                <dd>
                  <Badge>{incident.status}</Badge>
                </dd>
                <dt>Detected</dt>
                <dd>{incident.time}</dd>
                <dt>Assigned team</dt>
                <dd>
                  <select
                    aria-label="Assign incident team"
                    value={incident.team}
                    onChange={(e) => updateIncident({ team: e.target.value })}
                  >
                    {["Unassigned", "Team A", "Team B", "Team C"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </dd>
              </dl>
              <div className="op-section-label">SAMPLE SENSOR TREND</div>
              <Chart />
              <div className="op-detail-actions">
                <button
                  className="op-primary"
                  disabled={incident.status !== "Open"}
                  onClick={() => updateIncident({ status: "Acknowledged" })}
                >
                  <Check size={15} />
                  Acknowledge
                </button>
                <button
                  className="op-secondary"
                  disabled={incident.status === "Resolved"}
                  onClick={() => updateIncident({ status: "Resolved" })}
                >
                  Resolve
                </button>
                <button
                  className="op-secondary full"
                  onClick={() => setModal("order")}
                >
                  <Wrench size={15} />
                  Create Work Order
                </button>
              </div>
            </Panel>
          </div>
        )}
        {view === "Work Orders" && (
          <div className="op-work-grid">
            <Panel title={`Work Orders (${orders.length})`}>
              <div className="op-tabs">
                {["All", "Open", "In Progress", "Completed"].map((f) => (
                  <button
                    key={f}
                    className={filter === f ? "active" : ""}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="op-list-search">
                <Search size={15} />
                <input
                  aria-label="Search work orders"
                  placeholder="Search work orders…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="op-table-scroll">
                <table className="op-table">
                  <thead>
                    <tr>
                      <th>Work order</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Team</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders
                      .filter(
                        (o) =>
                          (filter === "All" || o.status === filter) &&
                          `${o.id} ${o.title}`
                            .toLowerCase()
                            .includes(query.toLowerCase()),
                      )
                      .map((o) => (
                        <tr
                          key={o.id}
                          className={o.id === selectedOrder ? "selected" : ""}
                        >
                          <td>
                            <button
                              className="op-cell-button"
                              onClick={() => pickOrder(o)}
                            >
                              <small>{o.id}</small>
                              <strong>{o.title}</strong>
                              <small>{assetName(o.asset)}</small>
                            </button>
                          </td>
                          <td>
                            <Badge>{o.priority}</Badge>
                          </td>
                          <td>
                            <Badge>{o.status}</Badge>
                          </td>
                          <td>{o.team}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Panel>
            <div className="op-map-card">{map}</div>
            <Panel title="Work Order Details">
              <div className="op-detail-title">
                <span className="op-severity warning">
                  <Wrench size={24} />
                </span>
                <div>
                  <h3>{order.id}</h3>
                  <p>{order.title}</p>
                </div>
              </div>
              <dl className="op-details">
                <dt>Asset</dt>
                <dd>{assetName(order.asset)}</dd>
                <dt>Priority</dt>
                <dd>
                  <Badge>{order.priority}</Badge>
                </dd>
                <dt>Status</dt>
                <dd>
                  <Badge>{order.status}</Badge>
                </dd>
                <dt>Due date</dt>
                <dd>{order.due}</dd>
                <dt>Assigned to</dt>
                <dd>
                  <select
                    aria-label="Assign work order team"
                    value={order.team}
                    onChange={(e) => updateOrder({ team: e.target.value })}
                  >
                    {["Team A", "Team B", "Team C"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </dd>
              </dl>
              <div className="op-section-label">MAINTENANCE TIMELINE</div>
              <ol className="op-timeline">
                <li>
                  <strong>Work order created</strong>
                  <small>Municipal utility operator</small>
                </li>
                <li>
                  <strong>Assigned to {order.team}</strong>
                  <small>Maintenance response team</small>
                </li>
                <li>
                  <strong>{order.status}</strong>
                  <small>Current work order status</small>
                </li>
              </ol>
              <div className="op-detail-actions">
                <button
                  className="op-primary full"
                  disabled={order.status === "Completed"}
                  onClick={() =>
                    updateOrder({
                      status:
                        order.status === "Open" ? "In Progress" : "Completed",
                    })
                  }
                >
                  <Check size={16} />
                  {order.status === "Open"
                    ? "Start work"
                    : order.status === "Completed"
                      ? "Completed"
                      : "Mark completed"}
                </button>
              </div>
            </Panel>
          </div>
        )}
        {view === "Operations" && (
          <>
            <div className="op-operations-grid">
              <div className="op-map-card">{map}</div>
              <Panel
                title="Asset Control"
                action={
                  <Badge>
                    {controlEnabled ? "Control Enabled" : "Monitor Only"}
                  </Badge>
                }
              >
                <div className="op-mode-switch">
                  <button
                    className={!controlEnabled ? "active" : ""}
                    onClick={() => setControlEnabled(false)}
                  >
                    Monitor only
                  </button>
                  <button
                    className={controlEnabled ? "active" : ""}
                    onClick={() => setControlEnabled(true)}
                  >
                    Enable demo control
                  </button>
                </div>
                <label className="op-field">
                  Select actuator
                  <select
                    value={controlAsset}
                    onChange={(e) => {
                      setControlAsset(e.target.value);
                      setSelectedAsset(e.target.value);
                      setPosition(positions[e.target.value]);
                    }}
                  >
                    {demoAssets
                      .filter((a) =>
                        ["control_valve", "pump_station"].includes(a.type),
                      )
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                  </select>
                </label>
                <div className="op-actuator">
                  <Settings2 size={40} />
                  <h3>{assetName(controlAsset)}</h3>
                  <Badge>
                    {positions[controlAsset] === 0
                      ? "Closed / Stopped"
                      : positions[controlAsset] === 100
                        ? "Open / Running"
                        : "Partially Open"}
                  </Badge>
                </div>
                <dl className="op-details">
                  <dt>Position / output</dt>
                  <dd>{positions[controlAsset]}%</dd>
                  <dt>Sample flow</dt>
                  <dd>
                    {Math.round((85 * positions[controlAsset]) / 100)} L/s
                  </dd>
                  <dt>Inlet pressure</dt>
                  <dd>3.4 bar</dd>
                  <dt>Outlet pressure</dt>
                  <dd>3.1 bar</dd>
                </dl>
                <div className="op-detail-actions">
                  <button
                    className="op-success"
                    disabled={!controlEnabled}
                    onClick={() => operate(100)}
                  >
                    Open / Start
                  </button>
                  <button
                    className="op-danger"
                    disabled={!controlEnabled}
                    onClick={() => operate(0)}
                  >
                    Close / Stop
                  </button>
                </div>
                <label className="op-field">
                  Set position: {position}%
                  <input
                    aria-label="Actuator position"
                    type="range"
                    min="0"
                    max="100"
                    value={position}
                    disabled={!controlEnabled}
                    onChange={(e) => setPosition(Number(e.target.value))}
                  />
                </label>
                <button
                  className="op-secondary full"
                  disabled={!controlEnabled}
                  onClick={() => operate(position)}
                >
                  Apply position
                </button>
                <p className="op-hint">
                  Demo controls only. Commands are shared with the
                  administrator.
                </p>
              </Panel>
            </div>
            <div className="op-bottom-grid">
              <Panel title="Flow Rate Trend">
                <Chart />
              </Panel>
              <Panel title="Pressure Trend">
                <Chart green />
              </Panel>
              <Panel title="Recent Operations">
                <div className="op-operation-log">
                  {operationLog.slice(0, 4).map((l, i) => (
                    <div key={i}>
                      <span>
                        <strong>{assetName(l.asset)}</strong>
                        <small>{l.time}</small>
                      </span>
                      <span>{l.action}</span>
                      <Badge>Success</Badge>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </>
        )}
        {view === "Water Quality" && (
          <>
            <div className="op-quality-grid">
              <div className="op-map-card">{map}</div>
              <div className="op-right-stack">
                <Panel title="Parameter Compliance">
                  <div className="op-compliance">
                    {quality.map((q, i) => (
                      <div key={q.name}>
                        <q.icon size={23} />
                        <span>
                          <strong>{q.name}</strong>
                          <small>{q.range}</small>
                        </span>
                        <div className="op-progress">
                          <i style={{ width: `${52 + i * 7}%` }} />
                        </div>
                        <b>{q.value}</b>
                        <Check size={17} />
                      </div>
                    ))}
                  </div>
                  <p className="op-hint">
                    Illustrative target ranges and sample readings.
                  </p>
                </Panel>
                <Panel
                  title="Water Quality Trends"
                  action={
                    <select
                      aria-label="Trend range"
                      value={period}
                      onChange={(e) => setPeriod(e.target.value)}
                    >
                      <option value="7">Last 7 days</option>
                      <option value="14">Last 14 days</option>
                    </select>
                  }
                >
                  <div className="op-chart-key">
                    ● pH <i>● Turbidity (NTU)</i>
                  </div>
                  {period === "7" ? (
                    <Chart />
                  ) : (
                    <>
                      <Chart green />
                      <p className="op-hint">
                        Oct 5–18 · Sample daily averages
                      </p>
                    </>
                  )}
                </Panel>
              </div>
            </div>
            <div className="op-quality-bottom">
              <Panel
                title="Recent Water Quality Readings"
                action={
                  <button
                    className="op-text-button"
                    onClick={() => exportReport("Water quality")}
                  >
                    Export CSV
                    <ArrowDownToLine size={14} />
                  </button>
                }
              >
                <div className="op-table-scroll">
                  <table className="op-table">
                    <thead>
                      <tr>
                        {[
                          "Timestamp",
                          "Location",
                          "pH",
                          "Turbidity",
                          "Chlorine",
                          "TDS",
                          "Status",
                        ].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {demoAssets
                        .filter((a) => a.type === "sensor")
                        .map((a, i) => (
                          <tr key={a.id}>
                            <td>Oct 18, {10 - i}:24</td>
                            <td>
                              <button
                                className="op-text-button"
                                onClick={() => setSelectedAsset(a.id)}
                              >
                                {a.name}
                              </button>
                            </td>
                            <td>{i === 1 ? "6.4" : "7.2"}</td>
                            <td>{i === 1 ? "4.8" : "2.1"} NTU</td>
                            <td>0.8 mg/L</td>
                            <td>320 ppm</td>
                            <td>
                              <Badge>{i === 1 ? "Warning" : "Normal"}</Badge>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
              <Panel title="Compliance Overview">
                <div className="op-network">
                  <div className="op-ring">
                    <div>
                      <strong>98%</strong>
                      <small>Sample rate</small>
                    </div>
                  </div>
                  <p className="op-hint">
                    Water quality indicators are within the sample targets at
                    most monitoring locations. Review flagged readings before
                    taking action.
                  </p>
                </div>
              </Panel>
            </div>
          </>
        )}
        {view === "Assets" && (
          <div className="op-assets-grid">
            <Panel title={`Infrastructure Assets (${demoAssets.length})`}>
              <div className="op-list-search">
                <Search size={15} />
                <input
                  aria-label="Search asset register"
                  placeholder="Search assets…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="op-table-scroll">
                <table className="op-table">
                  <thead>
                    <tr>
                      <th>Asset name</th>
                      <th>Type</th>
                      <th>Zone</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demoAssets
                      .filter((a) =>
                        `${a.name} ${a.zone} ${assetTypeLabels[a.type]}`
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .map((a) => (
                        <tr
                          key={a.id}
                          className={a.id === selectedAsset ? "selected" : ""}
                        >
                          <td>
                            <button
                              className="op-cell-button"
                              onClick={() => setSelectedAsset(a.id)}
                            >
                              <strong>{a.name}</strong>
                              <small>{a.id}</small>
                            </button>
                          </td>
                          <td>{assetTypeLabels[a.type]}</td>
                          <td>{a.zone}</td>
                          <td>
                            <Badge>
                              {a.status[0].toUpperCase() + a.status.slice(1)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Panel>
            <div className="op-map-card">{map}</div>
          </div>
        )}
        {view === "Reports" && (
          <div className="op-report-grid">
            {[
              [
                "Network performance",
                "Infrastructure status and asset inventory",
                Activity,
              ],
              [
                "Water quality",
                "Parameter readings and sample compliance targets",
                FlaskConical,
              ],
              [
                "Maintenance",
                "Work orders, assignments, and completion status",
                Wrench,
              ],
            ].map(([name, description, Icon]) => {
              const ReportIcon = Icon as LucideIcon;
              return (
                <Panel key={String(name)} title={String(name)}>
                  <div className="op-report-icon">
                    <ReportIcon size={34} />
                  </div>
                  <p>{String(description)}</p>
                  <div className="op-report-meta">
                    <CalendarDays size={15} />
                    Snapshot · October 18, 2026
                  </div>
                  <Chart green={name === "Water quality"} />
                  <button
                    className="op-primary full"
                    onClick={() => exportReport(String(name))}
                  >
                    <ArrowDownToLine size={16} />
                    Download CSV
                  </button>
                </Panel>
              );
            })}
          </div>
        )}
        {view === "Users" && (
          <Panel title="Municipal Utility Teams">
            <div className="op-team-grid">
              {[
                ["Team A", "Distribution & pipelines", "4 technicians"],
                ["Team B", "Pumps & water quality", "3 technicians"],
                ["Team C", "Treatment & reservoirs", "5 technicians"],
              ].map(([name, role, count]) => (
                <div className="op-team" key={name}>
                  <div className="op-avatar">{name.slice(-1)}</div>
                  <h3>{name}</h3>
                  <p>{role}</p>
                  <small>{count}</small>
                  <Badge>Available</Badge>
                  <div>
                    <strong>
                      {
                        orders.filter(
                          (o) => o.team === name && o.status !== "Completed",
                        ).length
                      }
                    </strong>{" "}
                    active work orders
                  </div>
                  <button
                    className="op-secondary"
                    onClick={() => {
                      navigate("Work Orders");
                      const assigned = orders.find(
                        (o) => o.team === name && o.status !== "Completed",
                      );
                      if (assigned) pickOrder(assigned);
                    }}
                  >
                    View assigned work
                    <ArrowRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          </Panel>
        )}
        <footer className="op-footer">
          <span>
            <ShieldCheck size={13} /> Municipal Utility Operations Center
          </span>
          <span>
            Illustrative Naga City network · All readings are demo data
          </span>
        </footer>
      </main>
      {toast && (
        <div className="op-toast" role="status">
          <Check size={18} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {modal && (
        <div className="op-modal-backdrop" onClick={() => setModal(null)}>
          <section
            className="op-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="op-panel-head">
              <h2 id="create-title">
                Create {modal === "incident" ? "Incident" : "Work Order"}
              </h2>
              <button
                className="op-icon-button"
                aria-label="Close dialog"
                onClick={() => setModal(null)}
              >
                <X size={20} />
              </button>
            </div>
            <p>Record a new item in your demo workspace.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                const title = String(data.get("title")).trim();
                if (!title) return;
                const asset = String(data.get("asset"));
                if (modal === "incident") {
                  const item = {
                    id: `AL-${crypto.randomUUID().slice(0, 8)}`,
                    title,
                    asset,
                    severity: String(data.get("priority")),
                    time: "Just now",
                    status: "Open",
                    team: "Unassigned",
                  };
                  setIncidents((items) => [item, ...items]);
                  pickIncident(item);
                  navigate("Alerts");
                } else {
                  const item = {
                    id: `WO-${crypto.randomUUID().slice(0, 8)}`,
                    title,
                    asset,
                    priority: String(data.get("priority")),
                    status: "Open",
                    team: String(data.get("team")),
                    due: String(data.get("due")),
                  };
                  setOrders((items) => [item, ...items]);
                  pickOrder(item);
                  navigate("Work Orders");
                }
                setModal(null);
                setToast("Created successfully in the shared demo.");
              }}
            >
              <label className="op-field">
                Title
                <input
                  name="title"
                  required
                  autoFocus
                  maxLength={100}
                  placeholder="Describe the issue or maintenance task"
                  defaultValue={
                    modal === "order" && view === "Alerts" ? incident.title : ""
                  }
                />
              </label>
              <label className="op-field">
                Related asset
                <select
                  name="asset"
                  defaultValue={
                    view === "Alerts"
                      ? incident.asset
                      : (selectedAsset ?? demoAssets[0].id)
                  }
                >
                  {demoAssets.map((a) => (
                    <option value={a.id} key={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="op-field">
                {modal === "incident" ? "Severity" : "Priority"}
                <select name="priority">
                  {(modal === "incident"
                    ? ["Warning", "Critical", "Info"]
                    : ["Medium", "High", "Low"]
                  ).map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              {modal === "order" && (
                <>
                  <label className="op-field">
                    Assigned team
                    <select name="team">
                      {["Team A", "Team B", "Team C"].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label className="op-field">
                    Due date
                    <input
                      type="date"
                      name="due"
                      defaultValue="2026-10-20"
                      required
                    />
                  </label>
                </>
              )}
              <div className="op-detail-actions">
                <button
                  type="button"
                  className="op-secondary"
                  onClick={() => setModal(null)}
                >
                  Cancel
                </button>
                <button className="op-primary" type="submit">
                  <Plus size={16} />
                  Create {modal === "incident" ? "incident" : "work order"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
