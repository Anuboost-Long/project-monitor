import { GridFourIcon as GridFour, PlusIcon as Plus } from "@phosphor-icons/react";
import { clsx } from "clsx";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";

import { appRoute } from "../../../app/app-routes";
import {
	BodyText,
	CaptionText,
	MonoText,
	OverlineText,
	PageTitle,
	SectionTitle,
} from "../../../shared/typography";
import { useProjectMonitor } from "../../projects/project-context";
import { EmptyMonitorPanel } from "../components/EmptyMonitorPanel";
import { MonitorLayoutModal, type MonitorColumns } from "../components/MonitorLayoutModal";
import { MonitorRenameModal } from "../components/MonitorRenameModal";
import { MonitorSetupDialog } from "../components/MonitorSetupDialog";
import { MonitorSizeModal } from "../components/MonitorSizeModal";
import { ProjectMonitorPanel } from "../components/ProjectMonitorPanel";

const MIN_MONITOR_SLOTS = 6;

const columnClassName: Record<MonitorColumns, string> = {
	auto: "grid-cols-1 md:grid-cols-2 2xl:grid-cols-3",
	1: "grid-cols-1",
	2: "grid-cols-2 max-[720px]:grid-cols-1",
	3: "grid-cols-3 max-[1120px]:grid-cols-2 max-[720px]:grid-cols-1",
};

export function MonitorPage() {
	const {
		projects,
		panels,
		busyRunIds,
		monitorSettings,
		updateMonitorSettings,
		startMonitor,
		moveMonitor,
		renameMonitor,
		resizeMonitor,
		stopMonitor,
		clearMonitor,
	} = useProjectMonitor();
	const [setupSlot, setSetupSlot] = useState<number | null>(null);
	const [renameRunId, setRenameRunId] = useState<string | null>(null);
	const [sizingRunId, setSizingRunId] = useState<string | null>(null);
	const columns: MonitorColumns = monitorSettings.defaultColumns;
	const [layoutOpen, setLayoutOpen] = useState(false);
	const [draggingRunId, setDraggingRunId] = useState<string | null>(null);
	const [dropSlot, setDropSlot] = useState<number | null>(null);
	const draggingRunIdRef = useRef<string | null>(null);
	const runningCount = panels.filter(
		(panel) =>
			panel.status === "stopping" ||
			(panel.status === "running" && (panel.kind === "script" || busyRunIds.includes(panel.id))),
	).length;
	const minimumSlotCount = Math.max(
		MIN_MONITOR_SLOTS,
		panels.reduce((highest, panel) => Math.max(highest, panel.slot + 1), 0),
	);
	const hasEmptySlot = Array.from({ length: minimumSlotCount }, (_, slot) =>
		panels.some((panel) => panel.slot === slot),
	).some((occupied) => !occupied);
	const slotCount = minimumSlotCount + (hasEmptySlot ? 0 : 1);
	const slots = Array.from({ length: slotCount }, (_, slot) => ({
		id: `monitor-slot-${slot}`,
		panel: panels.find((panel) => panel.slot === slot),
		slot,
	}));
	const availableSlot = slots.findIndex(({ panel }) => !panel);
	const renamePanel = panels.find((panel) => panel.id === renameRunId) ?? null;
	const sizingPanel = panels.find((panel) => panel.id === sizingRunId) ?? null;
	const scriptCount = projects.reduce(
		(total, project) => total + Object.keys(project.scripts).length,
		0,
	);

	const endDrag = () => {
		draggingRunIdRef.current = null;
		setDraggingRunId(null);
		setDropSlot(null);
	};

	const drop = (slot: number) => {
		if (draggingRunIdRef.current) moveMonitor(draggingRunIdRef.current, slot);
		endDrag();
	};

	return (
		<div className="mx-auto w-full max-w-300 px-10 py-10 max-[720px]:px-5.5 max-[720px]:py-8">
			<header className="mb-8 flex items-end justify-between gap-8 max-[720px]:items-start max-[720px]:flex-col">
				<div className="max-w-180">
					<OverlineText className="mb-3 inline-block">Live project monitor</OverlineText>
					<PageTitle className="max-w-180">Run every project from one wall.</PageTitle>
					<BodyText className="mt-5 max-w-160">
						Launch saved project scripts or your own commands and follow their output without leaving the
						workspace.
					</BodyText>
				</div>
				{projects.length > 0 && availableSlot !== -1 ? (
					<button
						type="button"
						onClick={() => setSetupSlot(availableSlot)}
						className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-sm bg-app-accent px-4 text-[11px] font-bold text-white transition-colors hover:bg-app-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus"
					>
						<Plus size={16} weight="regular" aria-hidden="true" />
						Add panel
					</button>
				) : null}
			</header>

			{projects.length === 0 ? (
				<section
					className="mb-6 flex items-center justify-between gap-5 border-l-2 border-app-accent bg-app-soft px-4.5 py-3.5 max-[720px]:items-start max-[720px]:flex-col"
					aria-labelledby="monitor-project-required-title"
				>
					<div>
						<SectionTitle id="monitor-project-required-title" className="mb-1 text-xs">
							Sync a project to open terminals
						</SectionTitle>
						<CaptionText>Monitor panels run commands inside a synced project folder.</CaptionText>
					</div>
					<Link
						to={appRoute.projects}
						className="shrink-0 text-[10px] font-bold text-app-accent-dark underline decoration-app-accent underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus"
					>
						Open Projects
					</Link>
				</section>
			) : null}

			<section
				className="mb-6 grid grid-cols-3 border border-app-line bg-app-soft max-[720px]:grid-cols-1"
				aria-label="Monitor summary"
			>
				{[
					["Synced projects", projects.length],
					["Running panels", runningCount],
					["Available scripts", scriptCount],
				].map(([label, value]) => (
					<article
						key={label}
						className="border-l border-app-line px-5 py-4 first:border-l-0 max-[720px]:border-t max-[720px]:border-l-0 max-[720px]:first:border-t-0"
					>
						<CaptionText as="span" className="block text-[9px] font-bold tracking-[0.08em] uppercase">
							{label}
						</CaptionText>
						<MonoText as="strong" className="mt-2 block text-2xl text-app-ink">
							{String(value).padStart(2, "0")}
						</MonoText>
					</article>
				))}
			</section>

			<section aria-labelledby="live-panels-title">
				<header className="mb-3 flex items-end justify-between gap-4">
					<div>
						<SectionTitle id="live-panels-title">Live panels</SectionTitle>
						<CaptionText className="mt-1">
							Each panel runs inside its selected project folder.
						</CaptionText>
					</div>
					<span className="flex items-center gap-2">
						<MonoText className="text-app-accent-dark">{String(panels.length).padStart(2, "0")}</MonoText>
						<button
							type="button"
							onClick={() => setLayoutOpen(true)}
							className="grid size-9 place-items-center rounded-sm border border-app-line bg-app-panel text-app-muted transition-colors hover:border-app-accent hover:text-app-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus"
							aria-label="Change monitor wall layout"
							title="Monitor wall layout"
						>
							<GridFour size={16} weight="regular" aria-hidden="true" />
						</button>
					</span>
				</header>

				<div className={clsx("grid auto-rows-88 gap-4", columnClassName[columns])}>
					{slots.map(({ id, panel, slot }) =>
						panel ? (
							<ProjectMonitorPanel
								key={panel.id}
								panel={panel}
								autoScroll={monitorSettings.autoScrollTerminal}
								scrollback={monitorSettings.terminalScrollback}
								allowSpan={columns !== 1}
								busy={
									panel.status === "stopping" ||
									(panel.status === "running" && (panel.kind === "script" || busyRunIds.includes(panel.id)))
								}
								dragging={draggingRunId === panel.id}
								dropTarget={dropSlot === slot && draggingRunId !== panel.id}
								onStop={(runId) => void stopMonitor(runId)}
								onClear={(runId) => void clearMonitor(runId)}
								onDragStart={(runId) => {
									draggingRunIdRef.current = runId;
									setDraggingRunId(runId);
								}}
								onDragOver={(runId) => {
									const target = panels.find((candidate) => candidate.id === runId);
									if (target) setDropSlot(target.slot);
								}}
								onDragLeave={(runId) => {
									const target = panels.find((candidate) => candidate.id === runId);
									if (target) setDropSlot((current) => (current === target.slot ? null : current));
								}}
								onDrop={(runId) => {
									const target = panels.find((candidate) => candidate.id === runId);
									if (target) drop(target.slot);
								}}
								onDragEnd={endDrag}
								onPickSize={setSizingRunId}
								onRename={setRenameRunId}
							/>
						) : (
							<EmptyMonitorPanel
								key={id}
								disabled={projects.length === 0}
								dropTarget={dropSlot === slot}
								slot={slot}
								onDragOver={setDropSlot}
								onDragLeave={(leavingSlot) =>
									setDropSlot((current) => (current === leavingSlot ? null : current))
								}
								onDrop={drop}
								onOpen={setSetupSlot}
							/>
						),
					)}
				</div>
			</section>

			<MonitorSetupDialog
				open={setupSlot !== null}
				projects={projects}
				onClose={() => setSetupSlot(null)}
				onRun={(project, kind, value) => {
					if (setupSlot !== null) void startMonitor({ slot: setupSlot, project, kind, value });
				}}
			/>
			<MonitorRenameModal
				panel={renamePanel}
				onRename={renameMonitor}
				onClose={() => setRenameRunId(null)}
			/>
			<MonitorSizeModal
				current={sizingPanel?.size ?? "default"}
				panelName={sizingPanel ? (sizingPanel.title ?? sizingPanel.label) : null}
				onSelect={(size) => {
					if (sizingPanel) resizeMonitor(sizingPanel.id, size);
				}}
				onClose={() => setSizingRunId(null)}
			/>
			<MonitorLayoutModal
				columns={columns}
				open={layoutOpen}
				onSelect={(defaultColumns) => {
					void updateMonitorSettings({ defaultColumns }).catch((): void => undefined);
				}}
				onClose={() => setLayoutOpen(false)}
			/>
		</div>
	);
}
