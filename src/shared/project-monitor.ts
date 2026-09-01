export type ProjectPackageManager = "npm" | "yarn" | "pnpm" | "bun";

export interface SyncedProject {
	id: string;
	name: string;
	path: string;
	packageManager: ProjectPackageManager;
	scripts: Record<string, string>;
	lastSyncedAt: string;
}

export type ProjectRunKind = "script" | "shell";

export type MonitorColumns = "auto" | 1 | 2 | 3;
export type CommandExitNotifications = "failures" | "all" | "off";

export interface MonitorSettings {
	defaultColumns: MonitorColumns;
	restoreMonitorWall: boolean;
	restartPreviousCommands: boolean;
	autoScrollTerminal: boolean;
	terminalScrollback: number;
	commandExitNotifications: CommandExitNotifications;
	restartFailedCommands: boolean;
	commandStopTimeout: number;
}

export const DEFAULT_MONITOR_SETTINGS: MonitorSettings = {
	defaultColumns: "auto",
	restoreMonitorWall: true,
	restartPreviousCommands: false,
	autoScrollTerminal: true,
	terminalScrollback: 10_000,
	commandExitNotifications: "failures",
	restartFailedCommands: false,
	commandStopTimeout: 5,
};

export interface ProjectRunRequest {
	runId: string;
	projectPath: string;
	kind: ProjectRunKind;
	value: string;
}

export interface ProjectConsoleError {
	message: string;
	raw: string;
	source?: string;
	routeType?: string;
	digest?: string;
	statusCode?: number;
}

export interface ProjectConsoleErrorRecord extends ProjectConsoleError {
	id: string;
	runId: string;
	projectId: string;
	projectName: string;
	projectPath: string;
	command: string;
	timestamp: string;
}

export interface ErrorWebhookHeader {
	name: string;
	value: string;
}

export interface ErrorWebhookSettings {
	url: string;
	headers: ErrorWebhookHeader[];
}

export interface ErrorWebhookDeliveryFailure {
	sent: false;
	reason: "not-configured" | "certificate" | "timeout" | "network" | "http" | "unknown";
	code?: string;
	statusCode?: number;
	detail?: string;
}

export type ErrorWebhookDeliveryResult = { sent: true } | ErrorWebhookDeliveryFailure;

export interface ProjectRunSnapshot {
	runId: string;
	output: string;
	outputOffset: number;
	errors: ProjectConsoleError[];
}

export type ProjectRunEvent =
	| {
			runId: string;
			type: "output";
			stream: "stdout" | "stderr";
			data: string;
	  }
	| {
			runId: string;
			type: "errors";
			errors: ProjectConsoleError[];
	  }
	| {
			runId: string;
			type: "exit";
			exitCode: number | null;
	  };

export interface ProjectMonitorApi {
	supportsActiveCommandCheck?: boolean;
	supportsRunSnapshots?: boolean;
	sessionId?: string;
	signalRendererReady?: () => void;
	selectProjectDirectories: () => Promise<string[]>;
	inspectProject: (projectPath: string) => Promise<SyncedProject>;
	runProjectCommand: (request: ProjectRunRequest) => Promise<void>;
	getActiveProjectCommands: (runIds: string[]) => Promise<string[]>;
	getProjectCommandSnapshots?: (runIds: string[]) => Promise<ProjectRunSnapshot[]>;
	stopProjectCommand: (runId: string, timeoutSeconds: number) => Promise<void>;
	writeProjectTerminal: (runId: string, data: string) => void;
	resizeProjectTerminal: (runId: string, cols: number, rows: number) => void;
	getMonitorSettings: () => Promise<MonitorSettings>;
	saveMonitorSettings: (settings: MonitorSettings) => Promise<MonitorSettings>;
	readProjectConsoleErrors?: (date: string) => Promise<ProjectConsoleErrorRecord[]>;
	getProjectConsoleErrorLogDirectory?: () => Promise<string>;
	chooseProjectConsoleErrorLogDirectory?: () => Promise<string | null>;
	openProjectConsoleErrorLogDirectory?: () => Promise<void>;
	getErrorWebhookSettings?: () => Promise<ErrorWebhookSettings>;
	saveErrorWebhookSettings?: (settings: ErrorWebhookSettings) => Promise<ErrorWebhookSettings>;
	sendErrorWebhook?: (record: ProjectConsoleErrorRecord) => Promise<ErrorWebhookDeliveryResult>;
	onProjectConsoleErrors?: (callback: (records: ProjectConsoleErrorRecord[]) => void) => () => void;
	onProjectRunEvent: (callback: (event: ProjectRunEvent) => void) => () => void;
}

export { createErrorWebhookBody, ERROR_WEBHOOK_CONTENT_TYPE } from "./error-webhook";
export type { ErrorWebhookBody } from "./error-webhook";
