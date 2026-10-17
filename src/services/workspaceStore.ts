import { useCallback, useEffect, useState, type SetStateAction } from "react";
export type WorkspaceRole = "Operator" | "Administrator";
export type AuditEvent = {
  id: string;
  at: string;
  actor: WorkspaceRole;
  module: string;
  action: string;
  description: string;
  read: boolean;
  operatorRead?: boolean;
};
export const STORAGE_PREFIX = "hydromesh.v2.";
const UPDATE_EVENT = "hydromesh:update";
export function readShared<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (!value) return fallback;
    const parsed = JSON.parse(value);
    if (
      parsed === null ||
      Array.isArray(parsed) !== Array.isArray(fallback) ||
      typeof parsed !== typeof fallback
    )
      return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}
export function writeShared<T>(key: string, value: T) {
  window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: key }));
}
export function describeChange(
  previous: unknown,
  next: unknown,
): { action: string; description: string } {
  if (Array.isArray(previous) && Array.isArray(next)) {
    const added = next.find(
      (item) => !previous.some((old) => old.id === item.id),
    );
    if (added)
      return {
        action: "Create",
        description: `${added.title ?? added.name ?? added.id} created`,
      };
    const changed = next.find(
      (item) =>
        JSON.stringify(item) !==
        JSON.stringify(previous.find((old) => old.id === item.id)),
    );
    if (changed) {
      const old = previous.find((item) => item.id === changed.id) ?? {};
      const fields = Object.entries(changed)
        .filter(
          ([key, value]) => JSON.stringify(value) !== JSON.stringify(old[key]),
        )
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(" · ");
      return {
        action: "Update",
        description: `${changed.title ?? changed.name ?? changed.id} — ${fields}`,
      };
    }
  }
  if (
    previous &&
    next &&
    typeof previous === "object" &&
    typeof next === "object"
  ) {
    const fields = Object.entries(next)
      .filter(
        ([key, value]) =>
          JSON.stringify(value) !==
          JSON.stringify((previous as Record<string, unknown>)[key]),
      )
      .map(
        ([key, value]) =>
          `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`,
      )
      .join(" · ");
    return { action: "Update", description: fields || "Configuration updated" };
  }
  return { action: "Update", description: "Record updated" };
}
export function recordEvent(
  actor: WorkspaceRole,
  module: string,
  action: string,
  description: string,
) {
  const event: AuditEvent = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    actor,
    module,
    action,
    description,
    read: actor === "Administrator",
    operatorRead: actor === "Operator",
  };
  writeShared("events", [event, ...readShared<AuditEvent[]>("events", [])]);
}
export function useSharedState<T>(
  key: string,
  fallback: T,
  actor?: WorkspaceRole,
  module?: string,
): [T, (update: SetStateAction<T>) => void] {
  const [value, setValue] = useState<T>(() => readShared(key, fallback));
  useEffect(() => {
    const refresh = (event: Event) => {
      if (
        event instanceof StorageEvent &&
        event.key !== STORAGE_PREFIX + key &&
        event.key !== null
      )
        return;
      if (event instanceof CustomEvent && event.detail !== key) return;
      setValue(readShared(key, fallback));
    };
    window.addEventListener("storage", refresh);
    window.addEventListener(UPDATE_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(UPDATE_EVENT, refresh);
    };
  }, [key, fallback]);
  const update = useCallback(
    (change: SetStateAction<T>) => {
      const previous = readShared(key, fallback);
      const next =
        typeof change === "function"
          ? (change as (value: T) => T)(previous)
          : change;
      if (JSON.stringify(previous) === JSON.stringify(next)) return;
      try {
        writeShared(key, next);
        setValue(next);
        if (actor && module) {
          const detail = describeChange(previous, next);
          recordEvent(actor, module, detail.action, detail.description);
        }
      } catch {
        window.dispatchEvent(new CustomEvent("hydromesh:storage-error"));
      }
    },
    [key, fallback, actor, module],
  );
  return [value, update];
}
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          let cell = String(value);
          if (/^[=+@\-\t\r]/.test(cell)) cell = "'" + cell;
          return `"${cell.replaceAll('"', '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const displayTime = (at: string) =>
  new Date(at).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
