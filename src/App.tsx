import { useEffect, useState } from "react";
import OperatorApp from "./OperatorApp";
import AdminApp from "./AdminApp";
import { useDialogFocus } from "./components/useDialogFocus";
import "./admin.css";
export default function App() {
  useDialogFocus();
  const [role, setRole] = useState(() =>
    window.location.hash === "#operator" ? "operator" : "admin",
  );
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    const change = () =>
      setRole(window.location.hash === "#operator" ? "operator" : "admin");
    const error = () => setStorageError(true);
    window.addEventListener("hashchange", change);
    window.addEventListener("hydromesh:storage-error", error);
    return () => {
      window.removeEventListener("hashchange", change);
      window.removeEventListener("hydromesh:storage-error", error);
    };
  }, []);
  return (
    <>
      {role === "admin" ? <AdminApp /> : <OperatorApp />}
      {storageError && (
        <div className="op-toast" role="alert">
          Browser storage is unavailable. This change could not be saved or
          shared.<button onClick={() => setStorageError(false)}>Dismiss</button>
        </div>
      )}
    </>
  );
}
