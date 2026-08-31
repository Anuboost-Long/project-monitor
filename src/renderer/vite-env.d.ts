/// <reference types="vite/client" />

import type { ProjectMonitorApi } from "../shared/project-monitor";

declare global {
	interface Window {
		projectMonitor: ProjectMonitorApi;
	}
}

export {};
