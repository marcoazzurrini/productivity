import "@productivity/ui/base.css";
import "./app.css";
import { createRemoteStore } from "@productivity/gtd";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app.tsx";
import { Root, createQueryClient } from "./root.tsx";

if (import.meta.env.DEV) {
  // Live StyleX CSS while developing. Production builds bundle the CSS.
  await import("virtual:stylex:runtime");
}

const container = document.querySelector("#root");

if (container === null) {
  throw new Error("index.html is missing the #root element.");
}

createRoot(container).render(
  <StrictMode>
    <Root
      appearance={window.appearance}
      calendar={window.calendar}
      client={createQueryClient()}
      journal={window.journal}
      store={createRemoteStore(window.gtd.call)}
    >
      <App />
    </Root>
  </StrictMode>
);
