import { useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { Badge, Metric, Panel } from "./OperatorUI";
import {
  modules,
  seedPermissions,
  seedUsers,
  type DemoUser,
  type UserRole,
} from "../data/adminSeeds";
import { displayTime, useSharedState } from "../services/workspaceStore";
const roles: UserRole[] = ["Administrator", "Operator", "Technician", "Viewer"];
export function AdminUsers() {
  const [users, setUsers] = useSharedState(
    "users",
    seedUsers,
    "Administrator",
    "Users",
  );
  const [permissions, setPermissions] = useSharedState(
    "permissions",
    seedPermissions,
    "Administrator",
    "Permissions",
  );
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<DemoUser | "new" | null>(null);
  const [error, setError] = useState("");
  const [role, setRole] = useState<UserRole>("Operator");
  const [tab, setTab] = useState("Permissions");
  const [draft, setDraft] = useState<string[] | null>(null);
  const [notice, setNotice] = useState("");
  const list = users.filter(
    (u) =>
      (filter === "All" || u.role === filter || u.status === filter) &&
      `${u.name} ${u.email} ${u.location}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(list.length / 6));
  const current = Math.min(page, pages);
  const changeStatus = (user: DemoUser) => {
    setUsers((items) =>
      items.map((u) =>
        u.id === user.id
          ? { ...u, status: u.status === "Active" ? "Suspended" : "Active" }
          : u,
      ),
    );
  };
  return (
    <>
      <div className="op-metrics">
        <Metric
          icon={Users}
          label="Total Users"
          value={String(users.length)}
          detail="Registered demo accounts"
        />
        <Metric
          icon={UserCheck}
          label="Active Users"
          value={String(users.filter((u) => u.status === "Active").length)}
          detail="Access enabled"
          tone="green"
          bars
        />
        <Metric
          icon={ShieldCheck}
          label="Roles"
          value="4"
          detail="Configurable access profiles"
        />
        <Metric
          icon={Clock}
          label="Pending Requests"
          value={String(users.filter((u) => u.status === "Pending").length)}
          detail="Awaiting approval"
          tone="amber"
        />
      </div>
      <div className="ad-users-layout">
        <Panel
          title="User Directory"
          action={
            <button
              className="op-primary"
              onClick={() => {
                setEdit("new");
                setError("");
              }}
            >
              <Plus size={15} />
              Add User
            </button>
          }
        >
          <div className="ad-filter-row">
            <div className="op-tabs">
              {["All", ...roles, "Pending"].map((r) => (
                <button
                  className={filter === r ? "active" : ""}
                  onClick={() => {
                    setFilter(r);
                    setPage(1);
                  }}
                  key={r}
                >
                  {r === "All" ? "All Users" : r}
                </button>
              ))}
            </div>
            <div className="op-list-search">
              <Search size={15} />
              <input
                aria-label="Search users"
                placeholder="Search name, email, or location…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <div className="op-table-scroll">
            <table className="op-table ad-user-table">
              <thead>
                <tr>
                  {[
                    "Name",
                    "Email",
                    "Role",
                    "Status",
                    "Last login",
                    "Location",
                    "Actions",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.slice((current - 1) * 6, current * 6).map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="ad-person">
                        <span className="ad-initials">
                          {u.name
                            .split(" ")
                            .slice(0, 2)
                            .map((n) => n[0])
                            .join("")}
                        </span>
                        {u.name}
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`ad-role ${u.role.toLowerCase()}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <Badge>{u.status}</Badge>
                    </td>
                    <td>{displayTime(u.lastLogin)}</td>
                    <td>{u.location}</td>
                    <td>
                      <div className="ad-row-actions">
                        <button
                          aria-label={`Edit ${u.name}`}
                          title="Edit user"
                          className="ad-icon"
                          onClick={() => {
                            setEdit(u);
                            setError("");
                          }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="op-text-button"
                          disabled={u.id === "admin-1"}
                          title={
                            u.id === "admin-1"
                              ? "Current administrator account is protected"
                              : undefined
                          }
                          onClick={() => changeStatus(u)}
                        >
                          {u.status === "Active"
                            ? "Suspend"
                            : u.status === "Pending"
                              ? "Approve"
                              : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!list.length && (
              <p className="op-empty">No users match your search.</p>
            )}
          </div>
          <div className="ad-pagination">
            <span>
              {list.length ? (current - 1) * 6 + 1 : 0}–
              {Math.min(current * 6, list.length)} of {list.length} users
            </span>
            <button
              aria-label="Previous users page"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft size={15} />
            </button>
            <b>{current}</b>
            <button
              aria-label="Next users page"
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              <ChevronRight size={15} />
            </button>
          </div>
          <p className="op-hint">
            Demo identities only. The operator workspace uses Juan Dela Cruz;
            suspending his account blocks that demo workspace.
          </p>
        </Panel>
        <Panel title="Role & Permissions">
          <label className="op-field">
            Select role
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value as UserRole);
                setDraft(null);
                setNotice("");
              }}
            >
              {roles.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <div className="op-tabs">
            {["Permissions", "Users", "Details"].map((t) => (
              <button
                key={t}
                className={tab === t ? "active" : ""}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === "Permissions" ? (
            <>
              <div className="ad-permissions">
                {modules.map((m) => (
                  <label key={m}>
                    <span>{m}</span>
                    <input
                      className="ad-toggle"
                      type="checkbox"
                      aria-label={`${role} ${m} access`}
                      disabled={
                        draft === null ||
                        role === "Administrator" ||
                        m === "Dashboard"
                      }
                      checked={(draft ?? permissions[role]).includes(m)}
                      onChange={(e) =>
                        setDraft((items) =>
                          e.target.checked
                            ? [...items!, m]
                            : items!.filter((i) => i !== m),
                        )
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="ad-panel-actions">
                {draft ? (
                  <>
                    <button
                      className="op-secondary"
                      onClick={() => setDraft(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="op-primary"
                      onClick={() => {
                        setPermissions((p) => ({ ...p, [role]: draft }));
                        setDraft(null);
                        setNotice(
                          "Permissions saved. Operator access updates immediately.",
                        );
                      }}
                    >
                      <Check size={14} />
                      Save
                    </button>
                  </>
                ) : (
                  <button
                    className="op-secondary full"
                    disabled={role === "Administrator"}
                    onClick={() => setDraft([...permissions[role]])}
                  >
                    <ShieldCheck size={16} />
                    Edit Permissions
                  </button>
                )}
              </div>
              <p className="op-hint">
                Administrator and dashboard access are protected. Permissions
                are demo UI controls, not server authentication.
              </p>
            </>
          ) : tab === "Users" ? (
            <div className="ad-role-users">
              {users
                .filter((u) => u.role === role)
                .map((u) => (
                  <div key={u.id}>
                    <span>{u.name}</span>
                    <Badge>{u.status}</Badge>
                  </div>
                ))}
            </div>
          ) : (
            <div className="op-hint">
              <strong>{role}</strong>
              <p>
                {permissions[role].length} modules enabled for{" "}
                {users.filter((u) => u.role === role).length} users. Role
                changes are recorded in the audit log.
              </p>
            </div>
          )}
          {notice && (
            <p className="ad-notice" role="status">
              {notice}
            </p>
          )}
        </Panel>
      </div>
      {edit && (
        <div className="op-modal-backdrop">
          <section
            className="op-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-title"
          >
            <div className="op-panel-head">
              <h2 id="user-title">
                {edit === "new" ? "Add User" : "Edit User"}
              </h2>
              <button
                className="ad-icon"
                aria-label="Close user dialog"
                onClick={() => setEdit(null)}
              >
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const name = String(f.get("name")).trim();
                const email = String(f.get("email")).trim().toLowerCase();
                if (!name) {
                  setError("Enter a user name.");
                  return;
                }
                if (
                  users.some(
                    (u) =>
                      u.email.toLowerCase() === email &&
                      (edit === "new" || u.id !== edit.id),
                  )
                ) {
                  setError("That email is already registered.");
                  return;
                }
                const user: DemoUser = {
                  id: edit === "new" ? crypto.randomUUID() : edit.id,
                  name,
                  email,
                  role:
                    edit !== "new" && edit.id === "admin-1"
                      ? "Administrator"
                      : (f.get("role") as UserRole),
                  status: edit === "new" ? "Active" : edit.status,
                  location: String(f.get("location")).trim(),
                  lastLogin:
                    edit === "new" ? new Date().toISOString() : edit.lastLogin,
                };
                setUsers((items) =>
                  edit === "new"
                    ? [...items, user]
                    : items.map((u) => (u.id === user.id ? user : u)),
                );
                setEdit(null);
              }}
            >
              <label className="op-field">
                Full name
                <input
                  name="name"
                  required
                  maxLength={70}
                  autoFocus
                  defaultValue={edit === "new" ? "" : edit.name}
                />
              </label>
              <label className="op-field">
                Email
                <input
                  name="email"
                  required
                  type="email"
                  defaultValue={edit === "new" ? "" : edit.email}
                />
              </label>
              <label className="op-field">
                Role
                <select
                  name="role"
                  defaultValue={edit === "new" ? "Operator" : edit.role}
                  disabled={edit !== "new" && edit.id === "admin-1"}
                >
                  {roles.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="op-field">
                Location
                <input
                  name="location"
                  required
                  maxLength={70}
                  defaultValue={
                    edit === "new" ? "Control Center" : edit.location
                  }
                />
              </label>
              {error && (
                <p className="ad-error" role="alert">
                  {error}
                </p>
              )}
              <div className="op-detail-actions">
                <button
                  type="button"
                  className="op-secondary"
                  onClick={() => setEdit(null)}
                >
                  Cancel
                </button>
                <button className="op-primary" type="submit">
                  Save User
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
