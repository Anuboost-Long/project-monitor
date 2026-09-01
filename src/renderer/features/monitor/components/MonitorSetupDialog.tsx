import {
	ArrowLeftIcon as ArrowLeft,
	FolderIcon as Folder,
	MagnifyingGlassIcon as MagnifyingGlass,
	PlayIcon as Play,
	TerminalWindowIcon as TerminalWindow,
	XIcon as X,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { ProjectRunKind, SyncedProject } from "../../../../shared/project-monitor";
import { CaptionText, OverlineText, SectionTitle } from "../../../shared/typography";
import { MonitorSetupChoice } from "./MonitorSetupChoice";
import { MonitorSetupSteps } from "./MonitorSetupSteps";

type SetupStage = "project" | "script" | "source";

interface MonitorSetupDialogProps {
	open: boolean;
	projects: SyncedProject[];
	onClose: () => void;
	onRun: (project: SyncedProject, kind: ProjectRunKind, value: string) => void;
}

const stageIndex: Record<SetupStage, number> = {
	project: 0,
	source: 1,
	script: 2,
};

const stageTitle: Record<SetupStage, string> = {
	project: "Choose a project",
	source: "Choose a command source",
	script: "Choose a project script",
};

function matches(query: string, ...fields: string[]) {
	const needle = query.trim().toLowerCase();
	return needle.length === 0 || fields.some((field) => field.toLowerCase().includes(needle));
}

function canRun(project: SyncedProject | null, kind: ProjectRunKind, value: string) {
	return project !== null && (kind !== "script" || Boolean(value.trim()));
}

export function MonitorSetupDialog({
	open,
	projects,
	onClose,
	onRun,
}: Readonly<MonitorSetupDialogProps>) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const [stage, setStage] = useState<SetupStage>("project");
	const [project, setProject] = useState<SyncedProject | null>(null);
	const [query, setQuery] = useState("");

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	}, [open]);

	useEffect(() => setQuery(""), [stage]);

	const visibleProjects = useMemo(
		() => projects.filter((candidate) => matches(query, candidate.name, candidate.path)),
		[projects, query],
	);
	const visibleScripts = useMemo(
		() =>
			Object.entries(project?.scripts ?? {}).filter(([name, script]) => matches(query, name, script)),
		[project, query],
	);
	const searchable =
		(stage === "project" && projects.length >= 5) ||
		(stage === "script" && Object.keys(project?.scripts ?? {}).length >= 5);

	const reset = () => {
		setStage("project");
		setProject(null);
		setQuery("");
	};

	const close = () => {
		reset();
		onClose();
	};

	const run = (kind: ProjectRunKind, value: string) => {
		if (!canRun(project, kind, value)) return;
		onRun(project, kind, value.trim());
		close();
	};

	return (
		<dialog
			ref={dialogRef}
			onClose={close}
			onCancel={(event) => {
				event.preventDefault();
				close();
			}}
			className="m-auto max-h-[min(44rem,88vh)] w-[min(680px,calc(100vw-32px))] overflow-hidden rounded-md border border-app-line bg-app-paper p-0 text-app-ink shadow-2xl backdrop:bg-black/45"
		>
			<header className="shrink-0 border-b border-app-line px-6 py-5">
				<div className="flex items-start justify-between gap-4">
					<div className="flex min-w-0 items-start gap-3">
						{stage === "project" ? null : (
							<button
								type="button"
								onClick={() => setStage(stage === "source" ? "project" : "source")}
								className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-sm border border-app-line text-app-muted transition-colors hover:border-app-accent hover:text-app-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus"
								aria-label="Go back"
							>
								<ArrowLeft size={16} weight="regular" aria-hidden="true" />
							</button>
						)}
						<div className="min-w-0">
							<OverlineText className="block">New monitor panel</OverlineText>
							<SectionTitle className="mt-1 truncate text-lg">{stageTitle[stage]}</SectionTitle>
						</div>
					</div>
					<button
						type="button"
						onClick={close}
						className="grid size-9 shrink-0 place-items-center rounded-sm border border-app-line text-app-muted transition-colors hover:border-app-accent hover:text-app-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus"
						aria-label="Close monitor setup"
					>
						<X size={16} weight="regular" aria-hidden="true" />
					</button>
				</div>

				<div className="mt-4">
					<MonitorSetupSteps current={stageIndex[stage]} steps={["Project", "Source", "Run"]} />
				</div>

				{searchable ? (
					<label className="mt-4 flex h-10 items-center gap-2 rounded-sm border border-app-line bg-app-panel px-3 focus-within:border-app-accent focus-within:outline-2 focus-within:outline-app-focus">
						<MagnifyingGlass
							size={15}
							weight="regular"
							className="shrink-0 text-app-muted"
							aria-hidden="true"
						/>
						<input
							autoFocus
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder={stage === "project" ? "Find a project" : "Find a script"}
							spellCheck={false}
							className="min-w-0 flex-1 border-0 bg-transparent text-xs text-app-ink outline-none placeholder:text-app-muted"
						/>
					</label>
				) : null}
			</header>

			<div className="max-h-[min(30rem,62vh)] overflow-y-auto px-6 py-5">
				{stage === "project" ? (
					<>
						<CaptionText className="mb-3">
							Choose which synced project this panel will run inside.
						</CaptionText>
						<div className="space-y-2">
							{visibleProjects.map((candidate) => (
								<MonitorSetupChoice
									key={candidate.id}
									icon={<Folder size={17} weight="regular" />}
									title={candidate.name}
									subtitle={candidate.path}
									mono
									onClick={() => {
										setProject(candidate);
										setStage("source");
									}}
								/>
							))}
						</div>
					</>
				) : null}

				{stage === "source" && project ? (
					<>
						<CaptionText className="mb-3">
							Choose what {project.name} should run in this panel.
						</CaptionText>
						<div className="space-y-2">
							<MonitorSetupChoice
								icon={<TerminalWindow size={17} weight="regular" />}
								title="Custom command"
								subtitle="Open an interactive terminal in the project folder."
								onClick={() => run("shell", "")}
							/>
							<MonitorSetupChoice
								icon={<Play size={17} weight="regular" />}
								title="Project script"
								subtitle={
									Object.keys(project.scripts).length > 0
										? "Run a script discovered in package.json."
										: "No package.json scripts were found."
								}
								disabled={Object.keys(project.scripts).length === 0}
								onClick={() => setStage("script")}
							/>
						</div>
					</>
				) : null}

				{stage === "script" && project ? (
					<>
						<CaptionText className="mb-3">
							Choose a script. It will start as soon as you select it.
						</CaptionText>
						<div className="space-y-2">
							{visibleScripts.map(([name, script]) => (
								<MonitorSetupChoice
									key={name}
									icon={<Play size={17} weight="regular" />}
									title={name}
									subtitle={script}
									mono
									onClick={() => run("script", name)}
								/>
							))}
						</div>
					</>
				) : null}

				{query.trim() &&
				((stage === "project" && visibleProjects.length === 0) ||
					(stage === "script" && visibleScripts.length === 0)) ? (
					<div className="py-8 text-center">
						<MagnifyingGlass
							size={20}
							weight="regular"
							className="mx-auto text-app-muted"
							aria-hidden="true"
						/>
						<CaptionText className="mt-2">No matches for “{query.trim()}”.</CaptionText>
					</div>
				) : null}
			</div>
		</dialog>
	);
}
