import { useEffect, useRef, useState } from "react";
import { Bell, Check, ChevronRight, X } from "lucide-react";
import {
  displayTime,
  useSharedState,
  type AuditEvent,
} from "../services/workspaceStore";

const emptyEvents: AuditEvent[] = [];
export function OperatorNotifications({
  onOpenModule,
}: {
  onOpenModule?: (module: string) => void;
}) {
  const [events, setEvents] = useSharedState("events", emptyEvents);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const incoming = events.filter((event) => event.actor === "Administrator");
  const unread = incoming.filter((event) => !event.operatorRead);
  const seen = useRef(new Set(events.map((event) => event.id)));
  useEffect(() => {
    const fresh = events.find(
      (event) => event.actor === "Administrator" && !seen.current.has(event.id),
    );
    seen.current = new Set(events.map((event) => event.id));
    if (fresh) setNotice(`Administrator update: ${fresh.description}`);
  }, [events]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 6500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const openEvent = (event: AuditEvent) => {
    setEvents((items) =>
      items.map((item) =>
        item.id === event.id ? { ...item, operatorRead: true } : item,
      ),
    );
    if (
      onOpenModule &&
      ["Alerts", "Work Orders", "Reports", "Operations"].includes(event.module)
    ) {
      onOpenModule(event.module);
      setOpen(false);
    }
  };
  return (
    <div className="ad-notification-wrap op-admin-notifications">
      <button
        className="op-notifications"
        aria-label={`Operator notifications, ${unread.length} unread`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Bell size={21} />
        {unread.length > 0 && <span>{unread.length}</span>}
      </button>
      {open && (
        <section
          className="ad-notification-panel"
          aria-label="Administrator notifications"
        >
          <div className="op-panel-head">
            <h2>
              Administrator Notifications <b>{unread.length}</b>
            </h2>
            <button
              className="ad-icon"
              aria-label="Close notifications"
              onClick={() => setOpen(false)}
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
                  items.map((event) =>
                    event.actor === "Administrator"
                      ? { ...event, operatorRead: true }
                      : event,
                  ),
                )
              }
            >
              Mark all read
            </button>
          </div>
          <div className="ad-notification-list">
            {incoming.map((event) => (
              <button
                key={event.id}
                className={!event.operatorRead ? "unread" : ""}
                onClick={() => openEvent(event)}
              >
                <span className="ad-notification-dot" />
                <span>
                  <strong>
                    {event.module} · {event.action}
                  </strong>
                  <p>{event.description}</p>
                  <small>{displayTime(event.at)}</small>
                </span>
                {onOpenModule &&
                ["Alerts", "Work Orders", "Reports", "Operations"].includes(
                  event.module,
                ) ? (
                  <ChevronRight size={14} />
                ) : event.operatorRead ? (
                  <Check size={14} />
                ) : null}
              </button>
            ))}
            {!incoming.length && (
              <div className="ad-empty">
                <Bell size={28} />
                <h3>You're up to date</h3>
                <p>
                  Administrator changes to work orders, alerts, users, nodes,
                  and rules will appear here.
                </p>
              </div>
            )}
          </div>
        </section>
      )}
      {notice && (
        <div className="op-toast" role="status">
          <Bell size={17} />
          {notice}
          <button
            aria-label="Dismiss administrator update"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
