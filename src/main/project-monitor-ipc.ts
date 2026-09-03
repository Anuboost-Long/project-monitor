import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import {
	app,
	BrowserWindow,
	dialog,
	ipcMain,
	Notification,
	shell as electronShell,
} from "electron";
import { spawn, type IPty } from "node-pty";

import {
	createErrorWebhookBody,
	DEFAULT_MONITOR_SETTINGS,
	ERROR_WEBHOOK_CONTENT_TYPE,
} from "../shared/project-monitor";
import type {
	CommandExitNotifications,
	ErrorWebhookDeliveryResult,
	ErrorWebhookSettings,
	MonitorColumns,
	MonitorSettings,
	ProjectConsoleError,
	ProjectConsoleErrorRecord,
	ProjectPackageManager,
	ProjectRunEvent,
	ProjectRunRequest,
	SyncedProject,
} from "../shared/project-monitor";
import { ApiRequestError, apiRequest } from "./api/api-helper";
import { extractConsoleErrors } from "./console-error-parser";

const runs = new Map<string, IPty>();
const runOutput = new Map<string, string>();
const runOutputOffsets = new Map<string, number>();
const runErrors = new Map<string, ProjectConsoleError[]>();
const runErrorSaveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const savedRunErrors = new Map<string, Map<string, string>>();
const errorTrackedRuns = new Set<string>();
const requestedStops = new Set<string>();
const MAX_CAPTURE_LENGTH = 100_000;
const ERROR_SAVE_DELAY = 400;
const monitorSessionId = randomUUID();
let errorLogWrite = Promise.resolve();
let customErrorLogDirectory: string | null | undefined;

function settingsPath() {
	return path.join(app.getPath("userData"), "settings.json");
}

async function readSettings(): Promise<Record<string, unknown>> {
	try {
		return JSON.parse(await readFile(settingsPath(), "utf8")) as Record<string, unknown>;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
		throw error;
	}
}

function monitorSetting<T>(value: unknown, allowed: readonly T[], fallback: T): T {
	return allowed.includes(value as T) ? (value as T) : fallback;
}

function monitorBoolean(value: unknown, fallback: boolean) {
	return typeof value === "boolean" ? value : fallback;
}

function validateMonitorSettings(value: unknown): MonitorSettings {
	const setting = typeof value === "object" && value !== null ? value : {};
	return {
		defaultColumns: monitorSetting<MonitorColumns>(
			Reflect.get(setting, "defaultColumns"),
			["auto", 1, 2, 3],
			DEFAULT_MONITOR_SETTINGS.defaultColumns,
		),
		restoreMonitorWall: monitorBoolean(
			Reflect.get(setting, "restoreMonitorWall"),
			DEFAULT_MONITOR_SETTINGS.restoreMonitorWall,
		),
		restartPreviousCommands: monitorBoolean(
			Reflect.get(setting, "restartPreviousCommands"),
			DEFAULT_MONITOR_SETTINGS.restartPreviousCommands,
		),
		autoScrollTerminal: monitorBoolean(
			Reflect.get(setting, "autoScrollTerminal"),
			DEFAULT_MONITOR_SETTINGS.autoScrollTerminal,
		),
		terminalScrollback: monitorSetting(
			Reflect.get(setting, "terminalScrollback"),
			[5_000, 10_000, 25_000, 50_000],
			DEFAULT_MONITOR_SETTINGS.terminalScrollback,
		),
		commandExitNotifications: monitorSetting<CommandExitNotifications>(
			Reflect.get(setting, "commandExitNotifications"),
			["failures", "all", "off"],
			DEFAULT_MONITOR_SETTINGS.commandExitNotifications,
		),
		restartFailedCommands: monitorBoolean(
			Reflect.get(setting, "restartFailedCommands"),
			DEFAULT_MONITOR_SETTINGS.restartFailedCommands,
		),
		commandStopTimeout: monitorSetting(
			Reflect.get(setting, "commandStopTimeout"),
			[3, 5, 10, 30],
			DEFAULT_MONITOR_SETTINGS.commandStopTimeout,
		),
	};
}

async function getMonitorSettings() {
	return validateMonitorSettings((await readSettings()).monitor);
}

async function saveMonitorSettings(value: unknown) {
	const monitor = validateMonitorSettings(value);
	const settings = await readSettings();
	await mkdir(path.dirname(settingsPath()), { recursive: true });
	await writeFile(settingsPath(), JSON.stringify({ ...settings, monitor }, null, 2), "utf8");
	return monitor;
}

/** Falls back to UTC rather than rejecting, so an unknown zone never costs the rest of the config. */
function validateWebhookTimeZone(value: unknown) {
	if (typeof value !== "string" || !value.trim()) return "";

	const timeZone = value.trim();
	try {
		new Intl.DateTimeFormat("en-US", { timeZone });
	} catch {
		return "";
	}
	return timeZone;
}

function validateErrorWebhookSettings(value: unknown): ErrorWebhookSettings {
	if (typeof value !== "object" || value === null) throw new Error("Invalid webhook settings");

	const url = Reflect.get(value, "url");
	const headers = Reflect.get(value, "headers");
	const timeZone = validateWebhookTimeZone(Reflect.get(value, "timeZone"));
	if (typeof url !== "string" || !Array.isArray(headers)) {
		throw new TypeError("Invalid webhook settings");
	}

	const trimmedUrl = url.trim();
	if (trimmedUrl) {
		const protocol = new URL(trimmedUrl).protocol;
		if (protocol !== "http:" && protocol !== "https:") {
			throw new Error("Webhook URL must use HTTP or HTTPS");
		}
	}
	if (headers.length > 24) throw new Error("Too many webhook headers");

	const names = new Set<string>();
	const normalizedHeaders = headers.map((header) => {
		if (typeof header !== "object" || header === null) {
			throw new Error("Invalid webhook header");
		}
		const name = Reflect.get(header, "name");
		const headerValue = Reflect.get(header, "value");
		if (typeof name !== "string" || typeof headerValue !== "string") {
			throw new TypeError("Invalid webhook header");
		}

		const trimmedName = name.trim();
		if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(trimmedName)) {
			throw new Error("Invalid webhook header name");
		}
		if (/[\r\n]/.test(headerValue)) throw new Error("Invalid webhook header value");

		const normalizedName = trimmedName.toLowerCase();
		if (names.has(normalizedName)) throw new Error("Duplicate webhook header name");
		names.add(normalizedName);
		return { name: trimmedName, value: headerValue };
	});

	return { url: trimmedUrl, headers: normalizedHeaders, timeZone };
}

async function getErrorWebhookSettings(): Promise<ErrorWebhookSettings> {
	const settings = await readSettings();
	if (!settings.errorWebhook) return { url: "", headers: [], timeZone: "" };

	try {
		return validateErrorWebhookSettings(settings.errorWebhook);
	} catch {
		return { url: "", headers: [], timeZone: "" };
	}
}

async function saveErrorWebhookSettings(value: unknown) {
	const errorWebhook = validateErrorWebhookSettings(value);
	const settings = await readSettings();
	await mkdir(path.dirname(settingsPath()), { recursive: true });
	await writeFile(settingsPath(), JSON.stringify({ ...settings, errorWebhook }, null, 2), "utf8");
	return errorWebhook;
}

const CERTIFICATE_ERROR_CODES = new Set([
	"CERT_HAS_EXPIRED",
	"DEPTH_ZERO_SELF_SIGNED_CERT",
	"ERR_TLS_CERT_ALTNAME_INVALID",
	"SELF_SIGNED_CERT_IN_CHAIN",
	"UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
	"UNABLE_TO_VERIFY_LEAF_SIGNATURE",
]);

function errorWebhookResponseDetail(data: unknown, fallback: string) {
	if (typeof data !== "object" || data === null) return fallback.slice(0, 240);

	const errors = Reflect.get(data, "errors");
	if (typeof errors === "object" && errors !== null) {
		const fieldErrors = Object.entries(errors).flatMap(([field, messages]) =>
			Array.isArray(messages)
				? messages
						.filter((message): message is string => typeof message === "string")
						.map((message) => `${field}: ${message}`)
				: [],
		);
		if (fieldErrors.length > 0) return fieldErrors.join(" ").slice(0, 240);
	}

	const title = Reflect.get(data, "title");
	return (typeof title === "string" && title.trim() ? title : fallback).slice(0, 240);
}

function errorWebhookFailure(error: unknown): ErrorWebhookDeliveryResult {
	if (!(error instanceof ApiRequestError)) {
		let detail: string;
		if (error instanceof Error) detail = error.message;
		else if (typeof error === "object") {
			try {
				detail = JSON.stringify(error) ?? "Unknown error";
			} catch {
				detail = "Unknown error";
			}
		} else detail = String(error);
		return {
			sent: false,
			reason: "unknown",
			detail,
		};
	}
	if (error.code && CERTIFICATE_ERROR_CODES.has(error.code)) {
		return { sent: false, reason: "certificate", code: error.code, detail: error.message };
	}
	if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
		return { sent: false, reason: "timeout", code: error.code, detail: error.message };
	}
	if (error.statusCode) {
		return {
			sent: false,
			reason: "http",
			code: error.code,
			statusCode: error.statusCode,
			detail: errorWebhookResponseDetail(error.data, error.message),
		};
	}
	if (error.isNetworkError) {
		return { sent: false, reason: "network", code: error.code, detail: error.message };
	}
	return { sent: false, reason: "unknown", code: error.code, detail: error.message };
}

async function sendErrorWebhook(
	record: ProjectConsoleErrorRecord,
): Promise<ErrorWebhookDeliveryResult> {
	const settings = await getErrorWebhookSettings();
	if (!settings.url) return { sent: false, reason: "not-configured" };

	try {
		await apiRequest({
			method: "POST",
			url: settings.url,
			headers: {
				...Object.fromEntries(settings.headers.map((header) => [header.name, header.value])),
				"Content-Type": ERROR_WEBHOOK_CONTENT_TYPE,
			},
			data: createErrorWebhookBody(record, settings.timeZone),
		});
		return { sent: true };
	} catch (error) {
		const failure = errorWebhookFailure(error);
		console.error("Error webhook delivery failed", {
			url: settings.url,
			failure,
			error,
		});
		return failure;
	}
}

async function getErrorLogDirectory() {
	if (customErrorLogDirectory === undefined) {
		const settings = await readSettings();
		customErrorLogDirectory =
			typeof settings.errorLogDirectory === "string" ? settings.errorLogDirectory : null;
	}
	return customErrorLogDirectory ?? path.join(app.getPath("userData"), "logs");
}

function dailyLogName(timestamp: string) {
	const date = new Date(timestamp);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}.ndjson`;
}

function writeConsoleErrors(records: ProjectConsoleErrorRecord[]) {
	if (records.length === 0) return;

	errorLogWrite = errorLogWrite
		.then(async () => {
			const directory = await getErrorLogDirectory();
			await mkdir(directory, { recursive: true });
			const byDay = new Map<string, ProjectConsoleErrorRecord[]>();
			for (const record of records) {
				const fileName = dailyLogName(record.timestamp);
				byDay.set(fileName, [...(byDay.get(fileName) ?? []), record]);
			}
			for (const [fileName, dailyRecords] of byDay) {
				await appendFile(
					path.join(directory, fileName),
					`${dailyRecords.map((record) => JSON.stringify(record)).join("\n")}\n`,
					"utf8",
				);
			}
			for (const window of BrowserWindow.getAllWindows()) {
				if (!window.webContents.isDestroyed()) {
					window.webContents.send("project-monitor:console-errors-appended", records);
				}
			}
		})
		.catch((): void => undefined);
}

function saveDetectedErrors(
	runId: string,
	project: SyncedProject,
	command: string,
	errors: ProjectConsoleError[],
) {
	const saved = savedRunErrors.get(runId) ?? new Map<string, string>();
	const timestamp = new Date().toISOString();
	const records = errors
		.filter((error) => saved.get(consoleErrorKey(error)) !== error.raw)
		.map((error): ProjectConsoleErrorRecord => ({
			...error,
			id: `${runId}:${createHash("sha256").update(consoleErrorKey(error)).digest("hex").slice(0, 12)}`,
			runId,
			projectId: project.id,
			projectName: project.name,
			projectPath: project.path,
			command,
			timestamp,
		}));
	for (const error of errors) saved.set(consoleErrorKey(error), error.raw);
	savedRunErrors.set(runId, saved);
	writeConsoleErrors(records);
}

function setErrorTracking(runId: string, trackErrors: boolean) {
	if (trackErrors) {
		errorTrackedRuns.add(runId);
		return;
	}

	errorTrackedRuns.delete(runId);
	const saveTimer = runErrorSaveTimers.get(runId);
	if (saveTimer) clearTimeout(saveTimer);
	runErrorSaveTimers.delete(runId);
	runErrors.set(runId, []);
	savedRunErrors.delete(runId);
}

function consoleErrorKey(error: ProjectConsoleError) {
	return [error.source, error.routeType, error.statusCode, error.digest, error.message]
		.filter(Boolean)
		.join(":");
}

async function readConsoleErrors(date: string): Promise<ProjectConsoleErrorRecord[]> {
	const read = errorLogWrite.then(async () => {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
		const directory = await getErrorLogDirectory();
		let content: string;
		try {
			content = await readFile(path.join(directory, `${date}.ndjson`), "utf8");
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
			throw error;
		}

		const records: ProjectConsoleErrorRecord[] = [];
		for (const line of content.split("\n").filter(Boolean)) {
			try {
				records.push(JSON.parse(line) as ProjectConsoleErrorRecord);
			} catch {
				continue;
			}
		}
		return [...new Map(records.map((record) => [record.id, record])).values()];
	});
	errorLogWrite = read.then(
		(): void => undefined,
		(): void => undefined,
	);
	return read;
}

async function chooseErrorLogDirectory(event: Electron.IpcMainInvokeEvent) {
	await errorLogWrite;
	const window = BrowserWindow.fromWebContents(event.sender);
	const options = {
		title: "Choose error log folder",
		defaultPath: await getErrorLogDirectory(),
		properties: ["openDirectory", "createDirectory"] as ("openDirectory" | "createDirectory")[],
	};
	const result = window
		? await dialog.showOpenDialog(window, options)
		: await dialog.showOpenDialog(options);
	if (result.canceled || !result.filePaths[0]) return null;

	await errorLogWrite;
	const directory = result.filePaths[0];
	const settings = await readSettings();
	await mkdir(path.dirname(settingsPath()), { recursive: true });
	await writeFile(
		settingsPath(),
		JSON.stringify({ ...settings, errorLogDirectory: directory }, null, 2),
		"utf8",
	);
	customErrorLogDirectory = directory;
	return directory;
}

async function openErrorLogDirectory() {
	const directory = await getErrorLogDirectory();
	await mkdir(directory, { recursive: true });
	const error = await electronShell.openPath(directory);
	if (error) throw new Error(error);
}

function mergeConsoleErrors(current: ProjectConsoleError[], detected: ProjectConsoleError[]) {
	const merged = [...current];
	for (const error of detected) {
		const existing = merged.findIndex(
			(candidate) => consoleErrorKey(candidate) === consoleErrorKey(error),
		);
		if (existing === -1) merged.push(error);
		else if (error.raw.length > merged[existing].raw.length) merged[existing] = error;
	}
	return merged;
}

function readProcessChildren(): Map<number, number[]> | null {
	const children = new Map<number, number[]>();
	let processes: string;

	try {
		processes = execFileSync("/bin/ps", ["-axo", "pid=,ppid="], { encoding: "utf8" });
	} catch {
		return null;
	}

	for (const line of processes.split("\n")) {
		const match = /^\s*(\d+)\s+(\d+)\s*$/.exec(line);
		if (!match) continue;

		const pid = Number(match[1]);
		const parentPid = Number(match[2]);
		children.set(parentPid, [...(children.get(parentPid) ?? []), pid]);
	}

	return children;
}

function processTree(rootPid: number): number[] {
	const children = readProcessChildren();
	if (!children) return [rootPid];

	const pids: number[] = [];
	const addChildren = (parentPid: number) => {
		for (const pid of children.get(parentPid) ?? []) {
			addChildren(pid);
			pids.push(pid);
		}
	};

	addChildren(rootPid);
	return [...pids, rootPid];
}

function shellQuote(value: string): string {
	return "'" + value.replaceAll("'", String.raw`'\''`) + "'";
}

function nvmBootstrap(projectPath: string): string {
	if (process.platform === "win32" || !existsSync(path.join(projectPath, ".nvmrc"))) {
		return "";
	}

	const nvmScript = [
		process.env.NVM_DIR ? path.join(process.env.NVM_DIR, "nvm.sh") : "",
		path.join(homedir(), ".nvm", "nvm.sh"),
		"/opt/homebrew/opt/nvm/nvm.sh",
		"/usr/local/opt/nvm/nvm.sh",
	].find((candidate) => candidate && existsSync(candidate));

	if (!nvmScript) return "";

	return `export NVM_DIR=${shellQuote(path.dirname(nvmScript))}; source ${shellQuote(nvmScript)}; nvm use --silent`;
}

function terminalEnv(): Record<string, string> {
	return Object.fromEntries(
		Object.entries(process.env).filter(
			(entry): entry is [string, string] => entry[0] !== "NODE_ENV" && entry[1] !== undefined,
		),
	);
}

function detectPackageManager(projectPath: string): ProjectPackageManager {
	if (
		existsSync(path.join(projectPath, "bun.lock")) ||
		existsSync(path.join(projectPath, "bun.lockb"))
	) {
		return "bun";
	}

	if (existsSync(path.join(projectPath, "pnpm-lock.yaml"))) {
		return "pnpm";
	}

	if (existsSync(path.join(projectPath, "yarn.lock"))) {
		return "yarn";
	}

	return "npm";
}

async function inspectProject(projectPath: string): Promise<SyncedProject> {
	const resolvedPath = await realpath(projectPath);
	const projectStat = await stat(resolvedPath);

	if (!projectStat.isDirectory()) {
		throw new Error("Choose a project folder.");
	}

	const packagePath = path.join(resolvedPath, "package.json");
	let packageName = "";
	let scripts: Record<string, string> = {};

	if (existsSync(packagePath)) {
		const packageJson = JSON.parse(await readFile(packagePath, "utf8")) as {
			name?: unknown;
			scripts?: unknown;
		};

		packageName = typeof packageJson.name === "string" ? packageJson.name : "";
		if (packageJson.scripts && typeof packageJson.scripts === "object") {
			scripts = Object.fromEntries(
				Object.entries(packageJson.scripts).filter(
					(entry): entry is [string, string] => typeof entry[1] === "string",
				),
			);
		}
	}

	return {
		id: resolvedPath,
		name: packageName || path.basename(resolvedPath),
		path: resolvedPath,
		packageManager: detectPackageManager(resolvedPath),
		scripts,
		lastSyncedAt: new Date().toISOString(),
	};
}

function forceStopRun(runId: string) {
	const terminal = runs.get(runId);
	if (!terminal) return;

	if (process.platform !== "win32") {
		for (const pid of processTree(terminal.pid)) {
			try {
				process.kill(pid, "SIGKILL");
			} catch {
				continue;
			}
		}
	} else {
		terminal.kill();
	}
	runs.delete(runId);
}

function processIsRunning(pid: number) {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		return (error as NodeJS.ErrnoException).code !== "ESRCH";
	}
}

function waitForProcessTree(pids: number[], timeoutSeconds: number) {
	return new Promise<boolean>((resolve) => {
		const check = () => {
			if (pids.some(processIsRunning)) return;
			clearInterval(interval);
			clearTimeout(timeout);
			resolve(true);
		};
		const interval = setInterval(check, 50);
		const timeout = setTimeout(() => {
			clearInterval(interval);
			resolve(false);
		}, timeoutSeconds * 1_000);
		check();
	});
}

function waitForTerminalExit(terminal: IPty, timeoutSeconds: number) {
	return new Promise<boolean>((resolve) => {
		const cleanup: {
			listener?: { dispose: () => void };
			timeout?: ReturnType<typeof setTimeout>;
		} = {};
		const finish = (exited: boolean) => {
			cleanup.listener?.dispose();
			if (cleanup.timeout) clearTimeout(cleanup.timeout);
			resolve(exited);
		};
		cleanup.listener = terminal.onExit(() => finish(true));
		cleanup.timeout = setTimeout(() => finish(false), timeoutSeconds * 1_000);
	});
}

async function stopRun(runId: string, timeoutSeconds: number) {
	const terminal = runs.get(runId);
	if (!terminal) return;
	requestedStops.add(runId);

	if (process.platform === "win32") {
		const exit = waitForTerminalExit(terminal, timeoutSeconds);
		terminal.write("\x03");
		if (!(await exit)) terminal.kill();
		return;
	}

	const pids = processTree(terminal.pid);
	for (const pid of pids) {
		try {
			process.kill(pid, "SIGTERM");
		} catch {
			continue;
		}
	}
	if (await waitForProcessTree(pids, timeoutSeconds)) return;

	for (const pid of pids.filter(processIsRunning)) {
		try {
			process.kill(pid, "SIGKILL");
		} catch {
			continue;
		}
	}
	runs.delete(runId);
}

async function showCommandExitNotification(projectName: string, command: string, exitCode: number) {
	let commandExitNotifications: CommandExitNotifications;
	try {
		({ commandExitNotifications } = await getMonitorSettings());
	} catch {
		return;
	}
	if (
		!Notification.isSupported() ||
		commandExitNotifications === "off" ||
		(commandExitNotifications === "failures" && exitCode === 0)
	) {
		return;
	}

	new Notification({
		title: exitCode === 0 ? `${projectName} finished` : `${projectName} failed`,
		body: `${command} exited with code ${exitCode}.`,
	}).show();
}

export function registerProjectMonitorIpc() {
	app.once("before-quit", () => {
		for (const runId of runs.keys()) {
			requestedStops.add(runId);
			forceStopRun(runId);
		}
		for (const timer of runErrorSaveTimers.values()) clearTimeout(timer);
		runOutput.clear();
		runOutputOffsets.clear();
		runErrors.clear();
		runErrorSaveTimers.clear();
		savedRunErrors.clear();
		errorTrackedRuns.clear();
	});

	ipcMain.handle("project-monitor:select-project-directories", async (event) => {
		const window = BrowserWindow.fromWebContents(event.sender);
		const options = {
			title: "Choose project folders",
			properties: ["openDirectory", "multiSelections"] as ("openDirectory" | "multiSelections")[],
		};
		const result = window
			? await dialog.showOpenDialog(window, options)
			: await dialog.showOpenDialog(options);

		return result.canceled ? [] : result.filePaths;
	});

	ipcMain.handle("project-monitor:inspect-project", (_event, projectPath: string) =>
		inspectProject(projectPath),
	);

	ipcMain.handle(
		"project-monitor:run-command",
		async (event, request: ProjectRunRequest): Promise<void> => {
			if (runs.has(request.runId)) {
				throw new Error("This monitor panel is already running.");
			}

			const project = await inspectProject(request.projectPath);
			const value = request.value.trim();
			const displayCommand =
				request.kind === "script" ? `${project.packageManager} run ${value}` : "Interactive shell";

			let command: string;
			let args: string[];
			const shell = process.env.SHELL ?? (process.platform === "darwin" ? "/bin/zsh" : "/bin/bash");
			const bootstrap = nvmBootstrap(project.path);

			if (request.kind === "script") {
				if (!value) throw new Error("Choose a project script.");
				if (!(value in project.scripts)) {
					throw new Error(`The "${value}" script is no longer available.`);
				}

				if (process.platform === "win32") {
					command = project.packageManager;
					args = ["run", value];
				} else {
					command = shell;
					args = [
						"-lic",
						[bootstrap, `${project.packageManager} run ${shellQuote(value)}`]
							.filter(Boolean)
							.join(" && "),
					];
				}
			} else if (process.platform === "win32") {
				command = process.env.ComSpec ?? "cmd.exe";
				args = [];
			} else {
				command = shell;
				args = bootstrap ? ["-lc", `${bootstrap}; exec ${shellQuote(shell)} -l`] : ["-l"];
			}

			const terminal = spawn(command, args, {
				name: "xterm-256color",
				cols: 100,
				rows: 28,
				cwd: project.path,
				env: terminalEnv(),
			});
			runs.set(request.runId, terminal);
			runOutput.set(request.runId, "");
			runOutputOffsets.set(request.runId, 0);
			runErrors.set(request.runId, []);
			setErrorTracking(request.runId, request.trackErrors !== false);

			const send = (runEvent: ProjectRunEvent) => {
				if (!event.sender.isDestroyed()) {
					event.sender.send("project-monitor:run-event", runEvent);
				}
			};

			terminal.onData((data) => {
				send({ runId: request.runId, type: "output", stream: "stdout", data });
				const combinedOutput = `${runOutput.get(request.runId) ?? ""}${data}`;
				const output = combinedOutput.slice(-MAX_CAPTURE_LENGTH);
				runOutput.set(request.runId, output);
				runOutputOffsets.set(
					request.runId,
					(runOutputOffsets.get(request.runId) ?? 0) + combinedOutput.length - output.length,
				);
				if (!errorTrackedRuns.has(request.runId)) return;

				const currentErrors = runErrors.get(request.runId) ?? [];
				const errors = mergeConsoleErrors(currentErrors, extractConsoleErrors(output));
				if (JSON.stringify(errors) !== JSON.stringify(currentErrors)) {
					runErrors.set(request.runId, errors);
					send({ runId: request.runId, type: "errors", errors });
					const saveTimer = runErrorSaveTimers.get(request.runId);
					if (saveTimer) clearTimeout(saveTimer);
					runErrorSaveTimers.set(
						request.runId,
						setTimeout(() => {
							saveDetectedErrors(request.runId, project, displayCommand, errors);
							runErrorSaveTimers.delete(request.runId);
						}, ERROR_SAVE_DELAY),
					);
				}
			});
			terminal.onExit(({ exitCode }) => {
				const stopped = requestedStops.delete(request.runId);
				const saveTimer = runErrorSaveTimers.get(request.runId);
				if (saveTimer) clearTimeout(saveTimer);
				if (errorTrackedRuns.has(request.runId)) {
					saveDetectedErrors(request.runId, project, displayCommand, runErrors.get(request.runId) ?? []);
				}
				runs.delete(request.runId);
				runOutput.delete(request.runId);
				runOutputOffsets.delete(request.runId);
				runErrors.delete(request.runId);
				runErrorSaveTimers.delete(request.runId);
				savedRunErrors.delete(request.runId);
				errorTrackedRuns.delete(request.runId);
				send({ runId: request.runId, type: "exit", exitCode });
				if (!stopped) void showCommandExitNotification(project.name, displayCommand, exitCode);
			});
		},
	);

	ipcMain.handle("project-monitor:stop-command", (_event, runId: string, timeoutSeconds: number) =>
		stopRun(
			runId,
			monitorSetting(timeoutSeconds, [3, 5, 10, 30], DEFAULT_MONITOR_SETTINGS.commandStopTimeout),
		),
	);

	ipcMain.handle("project-monitor:read-console-errors", (_event, date: string) =>
		readConsoleErrors(date),
	);
	ipcMain.handle("project-monitor:console-error-log-directory", () => getErrorLogDirectory());
	ipcMain.handle("project-monitor:choose-console-error-log-directory", (event) =>
		chooseErrorLogDirectory(event),
	);
	ipcMain.handle("project-monitor:open-console-error-log-directory", () => openErrorLogDirectory());
	ipcMain.handle("project-monitor:monitor-settings", () => getMonitorSettings());
	ipcMain.handle("project-monitor:save-monitor-settings", (_event, settings: unknown) =>
		saveMonitorSettings(settings),
	);
	ipcMain.handle("project-monitor:error-webhook-settings", () => getErrorWebhookSettings());
	ipcMain.handle("project-monitor:save-error-webhook-settings", (_event, settings: unknown) =>
		saveErrorWebhookSettings(settings),
	);
	ipcMain.handle("project-monitor:send-error-webhook", (_event, record: ProjectConsoleErrorRecord) =>
		sendErrorWebhook(record),
	);

	ipcMain.on("project-monitor:session-id", (event) => {
		event.returnValue = monitorSessionId;
	});
	ipcMain.on("project-monitor:run-snapshots", (event, requestId: string, runIds: string[]) => {
		const snapshots = runIds.flatMap((runId) => {
			if (!runs.has(runId)) return [];
			return [
				{
					runId,
					output: runOutput.get(runId) ?? "",
					outputOffset: runOutputOffsets.get(runId) ?? 0,
					errors: runErrors.get(runId) ?? [],
				},
			];
		});
		if (!event.sender.isDestroyed()) {
			event.sender.send(`project-monitor:run-snapshots:${requestId}`, snapshots);
		}
	});

	ipcMain.on("project-monitor:active-commands", (event, requestId: string, runIds: string[]) => {
		const activeRunIds = runIds.filter((runId) => runs.has(runId));
		const reply = (result: string[]) => {
			if (!event.sender.isDestroyed()) {
				event.sender.send(`project-monitor:active-commands:${requestId}`, result);
			}
		};
		if (process.platform === "win32") {
			reply(activeRunIds);
			return;
		}

		const terminalPids = activeRunIds.map((runId) => runs.get(runId)?.pid).filter(Boolean);
		if (terminalPids.length === 0) {
			reply([]);
			return;
		}
		let processes: string;
		try {
			processes = execFileSync("/bin/ps", ["-o", "pid=,tpgid=", "-p", terminalPids.join(",")], {
				encoding: "utf8",
			});
		} catch {
			reply([]);
			return;
		}

		const foregroundGroups = new Map<number, number>();
		for (const line of processes.split("\n")) {
			const match = /^\s*(\d+)\s+(-?\d+)\s*$/.exec(line);
			if (match) foregroundGroups.set(Number(match[1]), Number(match[2]));
		}

		reply(
			activeRunIds.filter((runId) => {
				const terminal = runs.get(runId);
				const foregroundPid = terminal ? foregroundGroups.get(terminal.pid) : undefined;
				return terminal && foregroundPid !== undefined
					? foregroundPid > 0 && foregroundPid !== terminal.pid
					: false;
			}),
		);
	});

	ipcMain.on("project-monitor:set-error-tracking", (_event, runId: string, trackErrors: boolean) => {
		if (runs.has(runId)) setErrorTracking(runId, trackErrors);
	});

	ipcMain.on("project-monitor:terminal-write", (_event, runId: string, data: string) => {
		runs.get(runId)?.write(data);
	});

	ipcMain.on(
		"project-monitor:terminal-resize",
		(_event, runId: string, cols: number, rows: number) => {
			try {
				runs.get(runId)?.resize(cols, rows);
			} catch {
				return;
			}
		},
	);
}
