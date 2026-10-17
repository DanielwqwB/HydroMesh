import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  Boxes,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Database,
  Droplets,
  FileText,
  Gauge,
  LayoutDashboard,
  Map,
  MapPin,
  Radio,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  Wifi,
  X,
  type LucideIcon,
} from "lucide-react";
import { demoAssets, assetTypeLabels } from "./data/assets";
import { seedIncidents, seedOrders } from "./data/operatorSeeds";
import { seedNodes, seedUsers } from "./data/adminSeeds";
import {
  displayTime,
  useSharedState,
  type AuditEvent,
} from "./services/workspaceStore";
import { Badge, Chart, Metric, Panel } from "./components/OperatorUI";
import { OperatorMap } from "./components/OperatorMap";
import { RoleSwitcher } from "./components/RoleSwitcher";
import { AdminUsers } from "./components/AdminUsers";
import { AdminNodes } from "./components/AdminNodes";
import { AdminRules } from "./components/AdminRules";
import { AdminAudit } from "./components/AdminAudit";
import { AdminReports } from "./components/AdminReports";
import "./operator.css";
type AdminView =
  | "Dashboard"
  | "Map"
  | "Assets"
  | "Alerts"
  | "Analytics"
  | "Reports"
  | "Users"
  | "IoT Nodes"
  | "System Settings"
  | "Audit Logs"
  | "Work Orders";
const nav: [AdminView, LucideIcon][] = [
  ["Dashboard", LayoutDashboard],
  ["Map", Map],
  ["Assets", Boxes],
  ["Alerts", Bell],
  ["Analytics", Activity],
  ["Reports", FileText],
  ["Users", Users],
  ["IoT Nodes", Radio],
  ["System Settings", Settings2],
  ["Audit Logs", ClipboardList],
  ["Work Orders", ClipboardList],
];
const headings: Record<AdminView, [string, string]> = {
  Dashboard: [
    "System Overview Dashboard",
    "A connected view of your water network, people, and municipal operations.",
  ],
  Map: [
    "3D Network Map",
    "Explore the existing Naga City infrastructure, connected facilities, and monitoring assets.",
  ],
  Assets: [
    "Network Asset Registry",
    "Inspect the infrastructure and sample readings in your HydroMesh project.",
  ],
  Alerts: [
    "Alerts & Operator Activity",
    "Follow network incidents and updates from your utility operators.",
  ],
  Analytics: [
    "Network Analytics",
    "Explore performance trends, operational activity, and spatial insights.",
  ],
  Reports: [
    "Admin Reports",
    "Download administrator reports on network performance, water quality, and maintenance.",
  ],
  Users: [
    "User Management",
    "Manage user accounts, roles, and module access across the system.",
  ],
  "IoT Nodes": [
    "IoT Node Provisioning & Registry",
    "Register, configure, and monitor demo devices across the water network.",
  ],
  "System Settings": [
    "System Threshold & Rule Configuration",
    "Set alert thresholds, notification channels, and simulated system responses.",
  ],
  "Audit Logs": [
    "Audit Logs & Infrastructure Health",
    "Review operator activity, administrative changes, and platform topology.",
  ],
  "Work Orders": [
    "Shared Work Orders",
    "Track maintenance requests, assignments, and progress from the utility workspace.",
  ],
};
const emptyEvents: AuditEvent[] = [];
const initialPositions: Record<string, number> = {
  "demo-valve-1": 100,
  "demo-valve-2": 0,
  "demo-pump-b": 100,
};
export default function AdminApp() {
  const [view, setView] = useState<AdminView>("Dashboard");
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [globalQuery, setGlobalQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [notifications, setNotifications] = useState(false);
  const [toast, setToast] = useState("");
  const [events, setEvents] = useSharedState("events", emptyEvents);
  const [incidents, setIncidents] = useSharedState(
    "incidents",
    seedIncidents,
    "Administrator",
    "Alerts",
  );
  const [orders, setOrders] = useSharedState(
    "orders",
    seedOrders,
    "Administrator",
    "Work Orders",
  );
  const [nodes] = useSharedState("nodes", seedNodes);
  const [users] = useSharedState("users", seedUsers);
  const [positions] = useSharedState("positions", initialPositions);
  const searchRef = useRef<HTMLInputElement>(null);
  const previousEvent = useRef(events[0]?.id);
  const active = incidents.filter((i) => i.status !== "Resolved");
  const unread = events.filter((e) => e.actor === "Operator" && !e.read);
  const navigate = (next: AdminView) => {
    setView(next);
    setQuery("");
    setFilter("All");
    setGlobalQuery("");
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setNotifications(false);
        setGlobalQuery("");
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (events[0]?.id !== previousEvent.current) {
      if (events[0]?.actor === "Operator")
        setToast(`Operator update: ${events[0].description}`);
      previousEvent.current = events[0]?.id;
    }
  }, [events]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 6500);
    return () => clearTimeout(timer);
  }, [toast]);
  const viewEvent = (event: AuditEvent) => {
    setEvents((items) =>
      items.map((e) => (e.id === event.id ? { ...e, read: true } : e)),
    );
    setNotifications(false);
    navigate(
      event.module === "Work Orders"
        ? "Work Orders"
        : event.module === "Alerts"
          ? "Alerts"
          : event.module === "Reports"
            ? "Reports"
            : "Audit Logs",
    );
  };
  const map = (
    <OperatorMap selectedAssetId={selected} onSelectAsset={setSelected} />
  );
  const metrics = (
    <div className="op-metrics">
      <Metric
        label="Total Water Supply"
        value="4.35 ML"
        detail="Stored volume · sample"
        icon={Droplets}
      />
      <Metric
        label="Online IoT Nodes"
        value={`${nodes.filter((n) => n.status === "Online").length} / ${nodes.length}`}
        detail="Shared device registry"
        icon={Radio}
        tone="green"
        bars
      />
      <Metric
        label="System Pressure"
        value="3.4 bar"
        detail="Illustrative network average"
        icon={Gauge}
        tone="green"
      />
      <Metric
        label="Water Quality"
        value="98%"
        detail="Sample compliance"
        icon={ShieldCheck}
      />
    </div>
  );
  const alerts = (
    <div className="op-alert-list">
      {active.slice(0, 5).map((i) => (
        <button
          key={i.id}
          className={`op-alert ${i.severity.toLowerCase()}`}
          onClick={() => {
            navigate("Alerts");
            setSelected(i.asset);
          }}
        >
          <span className="op-alert-icon">
            <Bell size={17} />
          </span>
          <span>
            <strong>{i.title}</strong>
            <small>{demoAssets.find((a) => a.id === i.asset)?.name}</small>
          </span>
          <time>{i.time}</time>
        </button>
      ))}
      {!active.length && (
        <p className="op-empty">All incidents have been resolved.</p>
      )}
    </div>
  );
  return (
    <div className="operator-app admin-app">
      <header className="op-header">
        <a
          href="#admin"
          className="op-brand"
          onClick={() => navigate("Dashboard")}
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
          <Search size={17} />
          <input
            ref={searchRef}
            aria-label="Search administrator workspace"
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
            placeholder="Search users, assets, locations, or modules…"
          />
          <kbd>Ctrl + K</kbd>
          {globalQuery && (
            <div className="op-search-results">
              {nav
                .filter(([name]) =>
                  name.toLowerCase().includes(globalQuery.toLowerCase()),
                )
                .map(([name, Icon]) => (
                  <button key={name} onClick={() => navigate(name)}>
                    <Icon size={15} />
                    <span>
                      {name}
                      <small>Workspace module</small>
                    </span>
                    <ChevronRight size={14} />
                  </button>
                ))}
              {demoAssets
                .filter((a) =>
                  `${a.name} ${a.zone}`
                    .toLowerCase()
                    .includes(globalQuery.toLowerCase()),
                )
                .slice(0, 5)
                .map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setSelected(a.id);
                      navigate("Map");
                    }}
                  >
                    <MapPin size={15} />
                    <span>
                      {a.name}
                      <small>{a.zone}</small>
                    </span>
                  </button>
                ))}
              {users
                .filter((u) =>
                  `${u.name} ${u.email}`
                    .toLowerCase()
                    .includes(globalQuery.toLowerCase()),
                )
                .slice(0, 3)
                .map((u) => (
                  <button key={u.id} onClick={() => navigate("Users")}>
                    <Users size={15} />
                    <span>
                      {u.name}
                      <small>{u.role}</small>
                    </span>
                  </button>
                ))}
              {!nav.some(([name]) =>
                name.toLowerCase().includes(globalQuery.toLowerCase()),
              ) &&
                !demoAssets.some((a) =>
                  `${a.name} ${a.zone}`
                    .toLowerCase()
                    .includes(globalQuery.toLowerCase()),
                ) &&
                !users.some((u) =>
                  `${u.name} ${u.email}`
                    .toLowerCase()
                    .includes(globalQuery.toLowerCase()),
                ) && <p>No matching users, assets, or modules.</p>}
            </div>
          )}
        </div>
        <div className="ad-notification-wrap">
          <button
            className="op-notifications"
            aria-label={`Admin notifications, ${unread.length} unread`}
            aria-expanded={notifications}
            onClick={() => setNotifications(!notifications)}
          >
            <Bell size={21} />
            {unread.length > 0 && <span>{unread.length}</span>}
          </button>
          {notifications && (
            <div className="ad-notification-panel">
              <div className="op-panel-head">
                <h2>
                  Operator Notifications <b>{unread.length}</b>
                </h2>
                <button
                  className="ad-icon"
                  aria-label="Close notifications"
                  onClick={() => setNotifications(false)}
                >
                  <X size={17} />
                </button>
              </div>
              <div className="ad-notification-toolbar">
                <span>Shared across browser tabs</span>
                <button
                  className="op-text-button"
                  disabled={!unread.length}
                  onClick={() =>
                    setEvents((items) =>
                      items.map((e) =>
                        e.actor === "Operator" ? { ...e, read: true } : e,
                      ),
                    )
                  }
                >
                  Mark all read
                </button>
              </div>
              <div className="ad-notification-list">
                {events
                  .filter((e) => e.actor === "Operator")
                  .slice(0, 30)
                  .map((e) => (
                    <button
                      key={e.id}
                      className={!e.read ? "unread" : ""}
                      onClick={() => viewEvent(e)}
                    >
                      <span className="ad-notification-dot" />
                      <span>
                        <strong>
                          {e.module} · {e.action}
                        </strong>
                        <p>{e.description}</p>
                        <small>{displayTime(e.at)}</small>
                      </span>
                      <ChevronRight size={14} />
                    </button>
                  ))}
                {!events.some((e) => e.actor === "Operator") && (
                  <div className="ad-empty">
                    <Bell size={28} />
                    <h3>You're up to date</h3>
                    <p>
                      Switch to Utility Operator and update an alert, work
                      order, or actuator to notify the administrator.
                    </p>
                  </div>
                )}
              </div>
              <button
                className="ad-notification-footer"
                onClick={() => {
                  setNotifications(false);
                  navigate("Audit Logs");
                }}
              >
                Open full audit log
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
        <button
          className="ad-icon ad-header-settings"
          aria-label="Open system settings"
          onClick={() => navigate("System Settings")}
        >
          <Settings2 size={20} />
        </button>
        <RoleSwitcher role="Administrator" />
      </header>
      <aside className="op-sidebar">
        <div className="op-nav-label">ADMINISTRATION</div>
        <nav aria-label="Administrator navigation">
          {nav.map(([name, Icon]) => (
            <button
              key={name}
              className={view === name ? "active" : ""}
              aria-current={view === name ? "page" : undefined}
              onClick={() => navigate(name)}
            >
              <Icon size={18} />
              <span>{name}</span>
              {name === "Alerts" && <b>{active.length}</b>}
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
            <span className="op-dot" /> CONNECTED DEMO
            <small>Shared browser data · No backend</small>
          </div>
          <span className="op-version">
            HYDROMESH GIS <span>v2.0</span>
          </span>
        </div>
      </aside>
      <main className="op-main">
        <div className="op-breadcrumb">
          System administrator
          <ChevronRight size={13} />
          <span>{view}</span>
        </div>
        <div className="op-page-heading">
          <div>
            <h1>{headings[view][0]}</h1>
            <p>{headings[view][1]}</p>
          </div>
          <div className="op-date">
            <CalendarDays size={15} />
            Oct 18, 2026
            <span />
            <i className="op-dot" />
            Demo data
          </div>
        </div>
        {view === "Users" ? (
          <AdminUsers />
        ) : view === "IoT Nodes" ? (
          <AdminNodes />
        ) : view === "System Settings" ? (
          <AdminRules />
        ) : view === "Audit Logs" ? (
          <AdminAudit />
        ) : view === "Reports" || view === "Analytics" ? (
          <AdminReports analytics={view === "Analytics"} />
        ) : (
          <>
            {metrics}
            {(view === "Dashboard" || view === "Map") && (
              <>
                <div
                  className={`op-dashboard-grid ${view === "Map" ? "map-expanded" : ""}`}
                >
                  <div className="op-map-card">{map}</div>
                  <div className="op-right-stack">
                    <Panel
                      title="Active Alerts"
                      action={
                        <button
                          className="op-text-button"
                          onClick={() => navigate("Alerts")}
                        >
                          View all
                          <ArrowRight size={14} />
                        </button>
                      }
                    >
                      {alerts}
                    </Panel>
                    <Panel title="System Health">
                      <div className="op-network">
                        <div className="op-ring">
                          <div>
                            <strong>
                              {Math.round(
                                (nodes.filter((n) => n.status === "Online")
                                  .length /
                                  nodes.length) *
                                  100,
                              )}
                              %
                            </strong>
                            <small>Demo nodes online</small>
                          </div>
                        </div>
                        <div className="op-network-list">
                          <span>
                            <Database size={13} />
                            Data store<b>Local</b>
                          </span>
                          <span>
                            <Wifi size={13} />
                            IoT devices<b>Simulated</b>
                          </span>
                          <span>
                            <ShieldCheck size={13} />
                            API services<b>Not connected</b>
                          </span>
                          <span>
                            <Users size={13} />
                            Active users
                            <b>
                              {
                                users.filter((u) => u.status === "Active")
                                  .length
                              }
                            </b>
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
                  <Panel title="Flow Rate (L/s)">
                    <Chart bars />
                  </Panel>
                  <Panel
                    title="Recent Operator Activity"
                    action={
                      <button
                        className="op-text-button"
                        onClick={() => navigate("Audit Logs")}
                      >
                        Audit log
                        <ArrowRight size={14} />
                      </button>
                    }
                  >
                    <div className="ad-activity-list">
                      {events
                        .filter((e) => e.actor === "Operator")
                        .slice(0, 3)
                        .map((e) => (
                          <button key={e.id} onClick={() => viewEvent(e)}>
                            <Activity size={15} />
                            <span>
                              <strong>{e.description}</strong>
                              <small>{displayTime(e.at)}</small>
                            </span>
                          </button>
                        ))}
                      {!events.some((e) => e.actor === "Operator") && (
                        <p className="op-hint">
                          Operator updates will appear here. Use the role menu
                          above to open the utility workspace.
                        </p>
                      )}
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
                      aria-label="Search assets"
                      placeholder="Search asset name or zone…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                  <div className="op-table-scroll">
                    <table className="op-table">
                      <thead>
                        <tr>
                          <th>Asset</th>
                          <th>Type</th>
                          <th>Zone</th>
                          <th>Status / output</th>
                        </tr>
                      </thead>
                      <tbody>
                        {demoAssets
                          .filter((a) =>
                            `${a.name} ${a.zone}`
                              .toLowerCase()
                              .includes(query.toLowerCase()),
                          )
                          .map((a) => (
                            <tr
                              key={a.id}
                              className={selected === a.id ? "selected" : ""}
                            >
                              <td>
                                <button
                                  className="op-cell-button"
                                  onClick={() => setSelected(a.id)}
                                >
                                  <strong>{a.name}</strong>
                                  <small>{a.id}</small>
                                </button>
                              </td>
                              <td>{assetTypeLabels[a.type]}</td>
                              <td>{a.zone}</td>
                              <td>
                                {positions[a.id] !== undefined ? (
                                  `${positions[a.id]}% (demo command)`
                                ) : (
                                  <Badge>{a.status}</Badge>
                                )}
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
            {view === "Alerts" && (
              <div className="ad-shared-grid">
                <Panel title={`Shared Incidents (${incidents.length})`}>
                  <div className="op-tabs">
                    {["All", "Critical", "Warning", "Info", "Resolved"].map(
                      (f) => (
                        <button
                          key={f}
                          className={filter === f ? "active" : ""}
                          onClick={() => setFilter(f)}
                        >
                          {f}
                        </button>
                      ),
                    )}
                  </div>
                  <div className="op-list-search">
                    <Search size={14} />
                    <input
                      aria-label="Search shared incidents"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search incident or asset…"
                    />
                  </div>
                  <div className="op-table-scroll">
                    <table className="op-table">
                      <thead>
                        <tr>
                          <th>Incident</th>
                          <th>Severity</th>
                          <th>Status</th>
                          <th>Assigned team</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {incidents
                          .filter(
                            (i) =>
                              (filter === "All" ||
                                (filter === "Resolved"
                                  ? i.status === "Resolved"
                                  : i.severity === filter &&
                                    i.status !== "Resolved")) &&
                              `${i.title} ${i.asset}`
                                .toLowerCase()
                                .includes(query.toLowerCase()),
                          )
                          .map((i) => (
                            <tr key={i.id}>
                              <td>
                                <button
                                  className="op-cell-button"
                                  onClick={() => setSelected(i.asset)}
                                >
                                  <strong>{i.title}</strong>
                                  <small>
                                    {
                                      demoAssets.find((a) => a.id === i.asset)
                                        ?.name
                                    }
                                  </small>
                                </button>
                              </td>
                              <td>
                                <Badge>{i.severity}</Badge>
                              </td>
                              <td>
                                <Badge>{i.status}</Badge>
                              </td>
                              <td>
                                <select
                                  aria-label={`Assign ${i.id}`}
                                  value={i.team}
                                  onChange={(e) =>
                                    setIncidents((items) =>
                                      items.map((item) =>
                                        item.id === i.id
                                          ? { ...item, team: e.target.value }
                                          : item,
                                      ),
                                    )
                                  }
                                >
                                  {[
                                    "Unassigned",
                                    "Team A",
                                    "Team B",
                                    "Team C",
                                  ].map((t) => (
                                    <option key={t}>{t}</option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <button
                                  className="op-text-button"
                                  onClick={() =>
                                    setIncidents((items) =>
                                      items.map((item) =>
                                        item.id === i.id
                                          ? {
                                              ...item,
                                              status:
                                                item.status === "Resolved"
                                                  ? "Open"
                                                  : "Resolved",
                                            }
                                          : item,
                                      ),
                                    )
                                  }
                                >
                                  {i.status === "Resolved"
                                    ? "Reopen"
                                    : "Resolve"}
                                </button>
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
            {view === "Work Orders" && (
              <div className="ad-shared-grid">
                <Panel title="Maintenance Register">
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
                  <div className="op-table-scroll">
                    <table className="op-table">
                      <thead>
                        <tr>
                          <th>Work order</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Team</th>
                          <th>Due date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders
                          .filter(
                            (o) => filter === "All" || o.status === filter,
                          )
                          .map((o) => (
                            <tr key={o.id}>
                              <td>
                                <button
                                  className="op-cell-button"
                                  onClick={() => setSelected(o.asset)}
                                >
                                  <strong>{o.title}</strong>
                                  <small>{o.id}</small>
                                </button>
                              </td>
                              <td>
                                <Badge>{o.priority}</Badge>
                              </td>
                              <td>
                                <select
                                  aria-label={`Status ${o.id}`}
                                  value={o.status}
                                  onChange={(e) =>
                                    setOrders((items) =>
                                      items.map((item) =>
                                        item.id === o.id
                                          ? { ...item, status: e.target.value }
                                          : item,
                                      ),
                                    )
                                  }
                                >
                                  {["Open", "In Progress", "Completed"].map(
                                    (s) => (
                                      <option key={s}>{s}</option>
                                    ),
                                  )}
                                </select>
                              </td>
                              <td>
                                <select
                                  aria-label={`Team ${o.id}`}
                                  value={o.team}
                                  onChange={(e) =>
                                    setOrders((items) =>
                                      items.map((item) =>
                                        item.id === o.id
                                          ? { ...item, team: e.target.value }
                                          : item,
                                      ),
                                    )
                                  }
                                >
                                  {["Team A", "Team B", "Team C"].map((t) => (
                                    <option key={t}>{t}</option>
                                  ))}
                                </select>
                              </td>
                              <td>{o.due}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
                <div className="op-map-card">{map}</div>
              </div>
            )}
          </>
        )}
        <footer className="op-footer">
          <span>
            <ShieldCheck size={13} />
            HydroMesh Administration Center
          </span>
          <span>
            Shared local demo · No live equipment or server authentication
          </span>
        </footer>
      </main>
      {toast && (
        <div className="op-toast" role="status">
          <Check size={17} />
          {toast}
          <button
            aria-label="Dismiss operator update"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
