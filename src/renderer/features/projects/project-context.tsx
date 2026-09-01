import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import type {
	ProjectConsoleError,
	ProjectRunKind,
	SyncedProject,
} from "../../../shared/project-monitor";

const PROJECTS_STORAGE_KEY = "project-monitor-projects";
const PANELS_STORAGE_KEY = "project-monitor-panel-session";
const MAX_OUTPUT_LENGTH = 100_000;
const PANEL_SAVE_INTERVAL = 200;

export type MonitorStatus = "done" | "error" | "running" | "stopped" | "stopping";
export type MonitorPanelSize = "default" | "wide" | "large";

export interface MonitorPanel {
	id: string;
	slot: number;
	projectId: string;
	projectName: string;
	kind: ProjectRunKind;
	label: string;
	title?: string;
	size: MonitorPanelSize;
	command: string;
	output: string;
	outputOffset: number;
	status: MonitorStatus;
	exitCode: number | null;
	errors: ProjectConsoleError[];
}

interface StartMonitorInput {
	slot: number;
	project: SyncedProject;
	kind: ProjectRunKind;
	value: string;
}

interface ProjectMonitorContextValue {
	projects: SyncedProject[];
	panels: MonitorPanel[];
	busyRunIds: string[];
	syncProjects: () => Promise<SyncedProject[]>;
	resyncProject: (projectPath: string) => Promise<void>;
	removeProject: (projectPath: string) => void;
	startMonitor: (input: StartMonitorInput) => Promise<void>;
	moveMonitor: (runId: string, slot: number) => void;
	renameMonitor: (runId: string, title: string) => void;
	resizeMonitor: (runId: string, size: MonitorPanelSize) => void;
	stopMonitor: (runId: string) => Promise<void>;
	clearMonitor: (runId: string) => Promise<void>;
}

const ProjectMonitorContext = createContext<ProjectMonitorContextValue | null>(null);

interface StoredPanelSession {
	sessionId: string;
	panels: MonitorPanel[];
}

function readStoredPanels(): MonitorPanel[] {
	const sessionId = window.projectMonitor.sessionId;
	if (!sessionId) return [];

	try {
		const stored = JSON.parse(
			globalThis.localStorage.getItem(PANELS_STORAGE_KEY) ?? "null",
		) as StoredPanelSession | null;
		if (stored?.sessionId !== sessionId || !Array.isArray(stored.panels)) {
			globalThis.localStorage.removeItem(PANELS_STORAGE_KEY);
			return [];
		}
		return stored.panels.filter(
			(panel) =>
				typeof panel?.id === "string" &&
				typeof panel.slot === "number" &&
				typeof panel.output === "string",
		);
	} catch {
		globalThis.localStorage.removeItem(PANELS_STORAGE_KEY);
		return [];
	}
}

function persistPanels(panels: MonitorPanel[]) {
	const sessionId = window.projectMonitor.sessionId;
	if (!sessionId) return;
	globalThis.localStorage.setItem(PANELS_STORAGE_KEY, JSON.stringify({ sessionId, panels }));
}

function readStoredProjects(): SyncedProject[] {
	const stored = globalThis.localStorage.getItem(PROJECTS_STORAGE_KEY);
	if (!stored) return [];

	try {
		const projects = JSON.parse(stored) as unknown;
		return Array.isArray(projects)
			? projects.filter(
					(project): project is SyncedProject =>
						typeof project === "object" &&
						project !== null &&
						typeof (project as SyncedProject).path === "string",
				)
			: [];
	} catch {
		return [];
	}
}

function persistProjects(projects: SyncedProject[]) {
	globalThis.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
}

function appendOutput(panel: MonitorPanel, data: string): MonitorPanel {
	const combined = `${panel.output}${data}`;
	const output = combined.slice(-MAX_OUTPUT_LENGTH);
	return {
		...panel,
		output,
		outputOffset: panel.outputOffset + combined.length - output.length,
	};
}

export function ProjectMonitorProvider({ children }: Readonly<{ children: ReactNode }>) {
	const [projects, setProjects] = useState(readStoredProjects);
	const [panels, setPanels] = useState(readStoredPanels);
	const [busyRunIds, setBusyRunIds] = useState<string[]>([]);
	const panelsRef = useRef(panels);
	const panelRevisionRef = useRef(0);
	const savedPanelRevisionRef = useRef(-1);
	const shellRunKey = panels
		.filter((panel) => panel.kind === "shell" && panel.status === "running")
		.map((panel) => panel.id)
		.join("|");

	useEffect(() => {
		panelsRef.current = panels;
		panelRevisionRef.current += 1;
	}, [panels]);

	useEffect(() => {
		const save = () => {
			if (savedPanelRevisionRef.current === panelRevisionRef.current) return;
			persistPanels(panelsRef.current);
			savedPanelRevisionRef.current = panelRevisionRef.current;
		};
		save();
		const timer = setInterval(save, PANEL_SAVE_INTERVAL);
		globalThis.addEventListener("beforeunload", save);
		return () => {
			clearInterval(timer);
			globalThis.removeEventListener("beforeunload", save);
			save();
		};
	}, []);

	useEffect(() => {
		const restorable = panelsRef.current.filter(
			(panel) => panel.status === "running" || panel.status === "stopping",
		);
		if (
			!window.projectMonitor.supportsRunSnapshots ||
			!window.projectMonitor.getProjectCommandSnapshots ||
			restorable.length === 0
		) {
			return;
		}

		let active = true;
		const restore = async () => {
			let snapshots;
			try {
				snapshots = await window.projectMonitor.getProjectCommandSnapshots?.(
					restorable.map((panel) => panel.id),
				);
			} catch {
				return;
			}
			if (!active || !snapshots) return;
			const byRunId = new Map(snapshots.map((snapshot) => [snapshot.runId, snapshot]));
			setPanels((current) =>
				current.map((panel) => {
					if (panel.status !== "running" && panel.status !== "stopping") return panel;
					const snapshot = byRunId.get(panel.id);
					if (!snapshot) return { ...panel, status: "stopped" };

					const header =
						panel.kind === "script" && snapshot.outputOffset === 0 ? `$ ${panel.command}\r\n\r\n` : "";
					const combined = `${header}${snapshot.output}`;
					const output = combined.slice(-MAX_OUTPUT_LENGTH);
					return {
						...panel,
						output,
						outputOffset: snapshot.outputOffset + combined.length - output.length,
						errors: snapshot.errors,
					};
				}),
			);
		};

		void restore();
		return () => {
			active = false;
		};
	}, []);

	useEffect(
		() =>
			window.projectMonitor.onProjectRunEvent((event) => {
				setPanels((current) =>
					current.map((panel) => {
						if (panel.id !== event.runId) return panel;

						if (event.type === "output") {
							return appendOutput(panel, event.data);
						}
						if (event.type === "errors") {
							return { ...panel, errors: event.errors };
						}

						let status: MonitorStatus;
						if (panel.status === "stopping" || panel.status === "stopped") status = "stopped";
						else status = event.exitCode === 0 ? "done" : "error";
						return {
							...panel,
							exitCode: event.exitCode,
							status,
						};
					}),
				);
			}),
		[],
	);

	useEffect(() => {
		const runIds = shellRunKey ? shellRunKey.split("|") : [];
		if (!window.projectMonitor.supportsActiveCommandCheck || runIds.length === 0) {
			setBusyRunIds([]);
			return;
		}

		let active = true;
		const refresh = async () => {
			try {
				const next = await window.projectMonitor.getActiveProjectCommands(runIds);
				if (active) {
					setBusyRunIds((current) =>
						current.length === next.length && current.every((runId, index) => runId === next[index])
							? current
							: next,
					);
				}
			} catch {
				if (active) setBusyRunIds([]);
			}
		};

		void refresh();
		const timer = setInterval(() => void refresh(), 500);
		return () => {
			active = false;
			clearInterval(timer);
		};
	}, [shellRunKey]);

	const syncProjects = async () => {
		const paths = await window.projectMonitor.selectProjectDirectories();
		const newPaths = paths.filter(
			(projectPath) => !projects.some((project) => project.path === projectPath),
		);

		if (paths.length > 0 && newPaths.length === 0) {
			throw new Error(
				paths.length === 1 ? "This project is already synced." : "These projects are already synced.",
			);
		}

		const synced = await Promise.all(
			newPaths.map((projectPath) => window.projectMonitor.inspectProject(projectPath)),
		);
		if (synced.length > 0) {
			setProjects((current) => {
				const next = [
					...synced,
					...current.filter(
						(project) => !synced.some((syncedProject) => syncedProject.path === project.path),
					),
				];
				persistProjects(next);
				return next;
			});
		}

		return synced;
	};

	const resyncProject = async (projectPath: string) => {
		const synced = await window.projectMonitor.inspectProject(projectPath);
		setProjects((current) => {
			const next = [synced, ...current.filter((project) => project.path !== synced.path)];
			persistProjects(next);
			return next;
		});
	};

	const removeProject = (projectPath: string) => {
		setProjects((current) => {
			const next = current.filter((project) => project.path !== projectPath);
			persistProjects(next);
			return next;
		});
	};

	const startMonitor = async ({ slot, project, kind, value }: StartMonitorInput) => {
		const runId = globalThis.crypto.randomUUID();
		const command =
			kind === "script" ? `${project.packageManager} run ${value}` : "Interactive shell";
		setPanels((current) => [
			{
				id: runId,
				slot,
				projectId: project.id,
				projectName: project.name,
				kind,
				label: kind === "script" ? value : "Terminal",
				size: "default",
				command,
				output: kind === "script" ? `$ ${command}\r\n\r\n` : "",
				outputOffset: 0,
				status: "running",
				exitCode: null,
				errors: [],
			},
			...current,
		]);

		try {
			await window.projectMonitor.runProjectCommand({
				runId,
				projectPath: project.path,
				kind,
				value,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : "The terminal could not start.";
			setPanels((current) =>
				current.map((panel) =>
					panel.id === runId ? { ...appendOutput(panel, `${message}\r\n`), status: "error" } : panel,
				),
			);
		}
	};

	const stopMonitor = async (runId: string) => {
		setPanels((current) =>
			current.map((panel) => (panel.id === runId ? { ...panel, status: "stopping" } : panel)),
		);
		await window.projectMonitor.stopProjectCommand(runId);
		setPanels((current) =>
			current.map((panel) =>
				panel.id === runId && panel.status === "stopping" ? { ...panel, status: "stopped" } : panel,
			),
		);
	};

	const moveMonitor = (runId: string, slot: number) => {
		setPanels((current) => {
			const moving = current.find((panel) => panel.id === runId);
			if (!moving || moving.slot === slot) return current;

			const occupying = current.find((panel) => panel.slot === slot);
			return current.map((panel) => {
				if (panel.id === runId) return { ...panel, slot };
				if (panel.id === occupying?.id) return { ...panel, slot: moving.slot };
				return panel;
			});
		});
	};

	const renameMonitor = (runId: string, title: string) => {
		const trimmed = title.trim();
		setPanels((current) =>
			current.map((panel) => (panel.id === runId ? { ...panel, title: trimmed || undefined } : panel)),
		);
	};

	const resizeMonitor = (runId: string, size: MonitorPanelSize) => {
		setPanels((current) => current.map((panel) => (panel.id === runId ? { ...panel, size } : panel)));
	};

	const clearMonitor = async (runId: string) => {
		const panel = panels.find((candidate) => candidate.id === runId);
		if (panel?.status === "running" || panel?.status === "stopping") {
			await window.projectMonitor.stopProjectCommand(runId);
		}
		setPanels((current) => current.filter((candidate) => candidate.id !== runId));
	};
	const value = useMemo(
		() => ({
			projects,
			panels,
			busyRunIds,
			syncProjects,
			resyncProject,
			removeProject,
			startMonitor,
			moveMonitor,
			renameMonitor,
			resizeMonitor,
			stopMonitor,
			clearMonitor,
		}),
		[
			projects,
			panels,
			busyRunIds,
			syncProjects,
			resyncProject,
			removeProject,
			startMonitor,
			moveMonitor,
			renameMonitor,
			resizeMonitor,
			stopMonitor,
			clearMonitor,
		],
	);

	return <ProjectMonitorContext.Provider value={value}>{children}</ProjectMonitorContext.Provider>;
}

export function useProjectMonitor() {
	const context = useContext(ProjectMonitorContext);
	if (!context) {
		throw new Error("useProjectMonitor must be used inside ProjectMonitorProvider.");
	}
	return context;
}
