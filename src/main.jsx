import React from "react";
import ReactDOM from "react-dom/client";
import SessionGate from "./modules/auth/SessionGate";
import "./index.css";  // 👈 ESTA ES LA LÍNEA IMPORTANTE

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SessionGate />
  </React.StrictMode>
);
