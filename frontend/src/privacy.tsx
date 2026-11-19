import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { PrivacyPage } from "./components/PrivacyPage.tsx";

/** Entry point of privacy.html, the privacy notice. */
const root = document.getElementById("root");
if (root === null) throw new Error("privacy.html has no #root element.");

createRoot(root).render(
  <StrictMode>
    <PrivacyPage />
  </StrictMode>,
);
