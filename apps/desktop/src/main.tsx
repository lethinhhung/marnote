import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./ui/styles.css";
import "./ui/theme-dark.css";

const root = document.getElementById("root");

if (!root) throw new Error("Missing application root");

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
