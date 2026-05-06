import React from "react";
import { createRoot } from "react-dom/client";
import AppEnhanced from "./AppEnhanced.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppEnhanced />
  </React.StrictMode>
);
