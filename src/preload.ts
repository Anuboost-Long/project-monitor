import { contextBridge, ipcRenderer } from "electron";

import type {
	ProjectConsoleErrorRecord,
	ProjectMonitorApi,
	ProjectRunEvent,
	ProjectRunRequest,
	ProjectRunSnapshot,
} from "./shared/project-monitor";

const projectMonitor: ProjectMonitorApi = {
	supportsActiveCommandCheck: true,
	supportsRunSnapshots: true,
	sessionId: ipcRenderer.sendSync("project-monitor:session-id") as string,
	signalRendererReady: () => ipcRenderer.send("project-monitor:renderer-ready"),
	selectProjectDirectories: () => ipcRenderer.invoke("project-monitor:select-project-directories"),
	inspectProject: (projectPath) =>
		ipcRenderer.invoke("project-monitor:inspect-project", projectPath),
	runProjectCommand: (request: ProjectRunRequest) =>
		ipcRenderer.invoke("project-monitor:run-command", request),
	getActiveProjectCommands: (runIds) =>
		new Promise((resolve) => {
			const requestId = globalThis.crypto.randomUUID();
			const channel = `project-monitor:active-commands:${requestId}`;
			const timer = setTimeout(() => {
				ipcRenderer.removeAllListeners(channel);
				resolve([]);
			}, 250);
			ipcRenderer.once(channel, (_event, activeRunIds: string[]) => {
				clearTimeout(timer);
				resolve(activeRunIds);
			});
			ipcRenderer.send("project-monitor:active-commands", requestId, runIds);
		}),
	getProjectCommandSnapshots: (runIds) =>
		new Promise((resolve) => {
			const requestId = globalThis.crypto.randomUUID();
			const channel = `project-monitor:run-snapshots:${requestId}`;
			const timer = setTimeout(() => {
				ipcRenderer.removeAllListeners(channel);
				resolve([]);
			}, 250);
			ipcRenderer.once(channel, (_event, snapshots: ProjectRunSnapshot[]) => {
				clearTimeout(timer);
				resolve(snapshots);
			});
			ipcRenderer.send("project-monitor:run-snapshots", requestId, runIds);
		}),
	stopProjectCommand: (runId, timeoutSeconds) =>
		ipcRenderer.invoke("project-monitor:stop-command", runId, timeoutSeconds),
	setProjectErrorTracking: (runId, trackErrors) =>
		ipcRenderer.send("project-monitor:set-error-tracking", runId, trackErrors),
	writeProjectTerminal: (runId, data) =>
		ipcRenderer.send("project-monitor:terminal-write", runId, data),
	resizeProjectTerminal: (runId, cols, rows) =>
		ipcRenderer.send("project-monitor:terminal-resize", runId, cols, rows),
	getMonitorSettings: () => ipcRenderer.invoke("project-monitor:monitor-settings"),
	saveMonitorSettings: (settings) =>
		ipcRenderer.invoke("project-monitor:save-monitor-settings", settings),
	readProjectConsoleErrors: (date) =>
		ipcRenderer.invoke("project-monitor:read-console-errors", date),
	getProjectConsoleErrorLogDirectory: () =>
		ipcRenderer.invoke("project-monitor:console-error-log-directory"),
	chooseProjectConsoleErrorLogDirectory: () =>
		ipcRenderer.invoke("project-monitor:choose-console-error-log-directory"),
	openProjectConsoleErrorLogDirectory: () =>
		ipcRenderer.invoke("project-monitor:open-console-error-log-directory"),
	getErrorWebhookSettings: () => ipcRenderer.invoke("project-monitor:error-webhook-settings"),
	saveErrorWebhookSettings: (settings) =>
		ipcRenderer.invoke("project-monitor:save-error-webhook-settings", settings),
	sendErrorWebhook: (record) => ipcRenderer.invoke("project-monitor:send-error-webhook", record),
	onProjectConsoleErrors: (callback) => {
		const listener = (_event: Electron.IpcRendererEvent, records: ProjectConsoleErrorRecord[]) => {
			callback(records);
		};
		ipcRenderer.on("project-monitor:console-errors-appended", listener);
		return () => ipcRenderer.removeListener("project-monitor:console-errors-appended", listener);
	},
	onProjectRunEvent: (callback) => {
		const listener = (_event: Electron.IpcRendererEvent, runEvent: ProjectRunEvent) => {
			callback(runEvent);
		};
		ipcRenderer.on("project-monitor:run-event", listener);
		return () => ipcRenderer.removeListener("project-monitor:run-event", listener);
	},
};

contextBridge.exposeInMainWorld("projectMonitor", projectMonitor);
