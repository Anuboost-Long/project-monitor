import { ArrowsInSimple, ArrowsOutSimple, Stop, X } from "@phosphor-icons/react";
import { clsx } from "clsx";

import { CaptionText, MonoText, SectionTitle } from "../../../shared/typography";
import type { MonitorPanel } from "../../projects/project-context";
import { ProjectTerminal } from "./ProjectTerminal";

interface ProjectMonitorPanelProps {
	panel: MonitorPanel;
	allowSpan: boolean;
	busy: boolean;
	dragging: boolean;
	dropTarget: boolean;
	onClear: (runId: string) => void;
	onDragEnd: () => void;
	onDragLeave: (runId: string) => void;
	onDragOver: (runId: string) => void;
	onDragStart: (runId: string) => void;
	onDrop: (runId: string) => void;
	onPickSize: (runId: string) => void;
	onRename: (runId: string) => void;
	onStop: (runId: string) => void;
}

const statusLabel = {
	done: "Done",
	error: "Failed",
	ready: "Ready",
	running: "Running",
	stopped: "Stopped",
	stopping: "Stopping",
} as const;

const sizeClassName = {
	default: "",
	wide: "col-span-2 max-[720px]:col-span-1",
	large: "col-span-2 row-span-2 max-[720px]:col-span-1 max-[720px]:row-span-1",
} as const;

export function ProjectMonitorPanel({
	panel,
	allowSpan,
	busy,
	dragging,
	dropTarget,
	onClear,
	onDragEnd,
	onDragLeave,
	onDragOver,
	onDragStart,
	onDrop,
	onPickSize,
	onRename,
	onStop,
}: Readonly<ProjectMonitorPanelProps>) {
	const name = panel.title ?? panel.label;
	const status =
		panel.kind === "shell" && panel.status === "running" && !busy ? "ready" : panel.status;

	return (
		<article
			onDragOver={(event) => {
				event.preventDefault();
				event.dataTransfer.dropEffect = "move";
				onDragOver(panel.id);
			}}
			onDragLeave={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onDragLeave(panel.id);
			}}
			onDrop={(event) => {
				event.preventDefault();
				onDrop(panel.id);
			}}
			className={clsx(
				"flex h-full min-h-88 min-w-0 flex-col overflow-hidden rounded-md border bg-app-panel transition-colors",
				allowSpan && sizeClassName[panel.size],
				dragging && "opacity-45",
				dropTarget ? "border-app-accent" : "border-app-line",
			)}
		>
			<header
				draggable
				onDragStart={(event) => {
					event.dataTransfer.effectAllowed = "move";
					event.dataTransfer.setData("text/plain", panel.id);
					onDragStart(panel.id);
				}}
				onDragEnd={onDragEnd}
				title="Drag to reorder"
				className="flex min-h-15 cursor-grab items-center gap-3 border-b border-app-line px-3.5 py-2.5 active:cursor-grabbing"
			>
				<span className="grid size-8 shrink-0 place-items-center rounded-sm border border-app-line bg-app-soft">
					<span
						className={clsx(
							"size-2 rounded-full",
							status === "running" && "animate-pulse bg-app-ready",
							panel.status === "stopping" && "animate-pulse bg-app-signal",
							panel.status === "done" && "bg-app-ready",
							status === "ready" && "bg-app-ready",
							(panel.status === "error" || panel.status === "stopped") && "bg-app-muted",
						)}
						aria-hidden="true"
					/>
				</span>
				<button
					type="button"
					draggable={false}
					onClick={() => onRename(panel.id)}
					aria-label={`Rename ${name}`}
					title="Rename monitor"
					className="min-w-0 flex-1 rounded-sm px-1 py-0.5 text-left transition-colors hover:bg-app-soft focus-visible:outline-2 focus-visible:outline-app-focus"
				>
					<SectionTitle as="span" className="block truncate text-xs">
						{name}
					</SectionTitle>
					<CaptionText as="span" className="mt-0.5 block truncate text-[10px]">
						{panel.projectName}
					</CaptionText>
				</button>
				<MonoText
					className={clsx(
						"text-[9px] tracking-[0.08em] uppercase",
						status === "running" || status === "ready" ? "text-app-ready" : "text-app-muted",
					)}
				>
					{statusLabel[status]}
				</MonoText>
				<button
					type="button"
					draggable={false}
					onClick={() => onPickSize(panel.id)}
					className="grid size-8 shrink-0 place-items-center rounded-sm border border-app-line text-app-muted transition-colors hover:border-app-accent hover:text-app-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus"
					aria-label={`Resize ${name}`}
					title="Resize monitor"
				>
					{panel.size === "large" ? (
						<ArrowsInSimple size={14} weight="regular" aria-hidden="true" />
					) : (
						<ArrowsOutSimple size={14} weight="regular" aria-hidden="true" />
					)}
				</button>
				<button
					type="button"
					draggable={false}
					disabled={panel.status === "stopping"}
					onClick={() => (busy ? onStop(panel.id) : onClear(panel.id))}
					className="grid size-8 shrink-0 place-items-center rounded-sm border border-app-line text-app-muted transition-colors hover:border-app-accent hover:text-app-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus disabled:cursor-wait disabled:opacity-50"
					aria-label={busy ? `Stop ${name}` : `Close ${name}`}
					title={busy ? "Stop command" : "Close monitor"}
				>
					{busy ? (
						<Stop size={14} weight="regular" aria-hidden="true" />
					) : (
						<X size={14} weight="regular" aria-hidden="true" />
					)}
				</button>
			</header>

			<div className="flex min-h-0 flex-1 flex-col bg-app-terminal">
				<MonoText className="truncate border-b border-app-terminal-line px-4 py-2 text-[10px] font-normal text-app-terminal-muted">
					{panel.command}
				</MonoText>
				<div className="min-h-0 flex-1">
					<ProjectTerminal panel={panel} />
				</div>
			</div>
		</article>
	);
}
