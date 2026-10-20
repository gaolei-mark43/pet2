import React from "react";
import { createRoot } from "react-dom/client";
import PetApp from "./PetApp.jsx";
import "./pipeline-experience.css";
import "./pet-app.css";
import "./domain.css";
import "./run.css";
import "./plugin-workbench.css";
import "./pipeline-plugin.css";
import "./global-utility.css";
import "./parity.css";
import "./pipeline-manage.css";
import "./supplemental.css";
import "./completion.css";
import "./role-management.css";
import "./plugin-management.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PetApp />
  </React.StrictMode>,
);
