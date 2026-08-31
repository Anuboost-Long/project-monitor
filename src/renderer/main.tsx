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
