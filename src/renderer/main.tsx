import "@fontsource-variable/kode-mono/wght.css";
import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./app/App";
import { applyAppTheme, getAppTheme } from "./app/app-theme";
import "../index.css";

applyAppTheme(getAppTheme());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);

// Dismisses the launch card. The second frame is where the first render has
// actually been painted, so the window never takes over from it empty.
requestAnimationFrame(() => {
	requestAnimationFrame(() => window.projectMonitor.signalRendererReady?.());
});
