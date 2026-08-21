import React from "react";
import { createRoot } from "react-dom/client";
import AmbassadorsApp from "../app/AmbassadorsApp";
import "../app/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element was not found.");

createRoot(root).render(
  <React.StrictMode>
    <AmbassadorsApp />
  </React.StrictMode>,
);
