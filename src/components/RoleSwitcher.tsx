import type { WorkspaceRole } from "../services/workspaceStore";
export function RoleSwitcher({ role }: { role: WorkspaceRole }) {
  return (
    <div className="op-profile">
      <div className="op-avatar">{role === "Administrator" ? "MS" : "JD"}</div>
      <label>
        <small>Demo workspace</small>
        <select
          aria-label="Switch workspace role"
          value={role}
          onChange={(event) => {
            window.location.hash =
              event.target.value === "Administrator" ? "admin" : "operator";
          }}
        >
          <option value="Operator">Utility Operator</option>
          <option value="Administrator">System Administrator</option>
        </select>
      </label>
    </div>
  );
}
