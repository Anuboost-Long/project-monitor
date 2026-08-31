import { ArrowsClockwise, FolderOpen } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import {
	BodyText,
	CaptionText,
	MonoText,
	OverlineText,
	PageTitle,
	SectionTitle,
} from "../../../shared/typography";
import { BaseModal } from "../../../shared/ui/modal/BaseModal";
import { SyncAnimation } from "../../../shared/ui/SyncAnimation";
import { ProjectRow } from "../components/ProjectRow";
import { useProjectMonitor } from "../project-context";

const MIN_SYNCING_DURATION = 1_400;

export function ProjectsPage() {
	const { projects, syncProjects, resyncProject, removeProject } = useProjectMonitor();
	const [syncingPath, setSyncingPath] = useState<string | null>(null);
	const [syncModalOpen, setSyncModalOpen] = useState(false);
	const [syncStatus, setSyncStatus] = useState<"syncing" | "done">("syncing");
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		if (syncStatus !== "done") return;

		const timer = setTimeout(() => setSyncModalOpen(false), 900);
		return () => clearTimeout(timer);
	}, [syncStatus]);

	const sync = async (projectPath?: string) => {
		try {
			setMessage(null);
			setSyncingPath(projectPath ?? "new");
			if (projectPath) {
				setSyncStatus("syncing");
				setSyncModalOpen(true);
				await Promise.all([
					resyncProject(projectPath),
					new Promise((resolve) => setTimeout(resolve, MIN_SYNCING_DURATION)),
				]);
				setSyncStatus("done");
				setMessage("Project scripts refreshed.");
			} else {
				const synced = await syncProjects();
				if (synced.length > 0) {
					setMessage(
						synced.length === 1 ? `Synced ${synced[0].name}.` : `Synced ${synced.length} projects.`,
					);
				}
			}
		} catch (error) {
			setSyncModalOpen(false);
			setMessage(error instanceof Error ? error.message : "The selected project could not be synced.");
		} finally {
			setSyncingPath(null);
		}
	};

	const remove = (projectPath: string) => {
		const project = projects.find((candidate) => candidate.path === projectPath);
		if (!project || !window.confirm(`Remove ${project.name} from Project Monitor?`)) return;
		removeProject(projectPath);
		setMessage(`${project.name} was removed.`);
	};

	return (
		<div className="mx-auto w-full max-w-280 px-12 py-14 max-[720px]:px-5.5 max-[720px]:py-9.5">
			<header className="mb-8.5 flex items-end justify-between gap-8 max-[720px]:items-start max-[720px]:flex-col">
				<div className="max-w-170">
					<OverlineText className="mb-3.5 inline-block">Project registry</OverlineText>
					<PageTitle>Projects</PageTitle>
					<BodyText className="mt-5.5">
						Sync local project folders once, then use their commands from any monitor panel.
					</BodyText>
				</div>
				<button
					type="button"
					disabled={syncingPath !== null}
					onClick={() => void sync()}
					className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-sm bg-app-accent px-4 text-[11px] font-bold text-white transition-colors hover:bg-app-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus disabled:cursor-not-allowed disabled:opacity-60"
				>
					<ArrowsClockwise
						size={16}
						weight="regular"
						className={syncingPath === "new" ? "animate-spin" : undefined}
						aria-hidden="true"
					/>
					Sync projects
				</button>
			</header>

			{message ? (
				<CaptionText className="mb-4 border-l-2 border-app-accent bg-app-soft px-3 py-2 text-app-ink">
					{message}
				</CaptionText>
			) : null}

			<section className="border border-app-line bg-app-panel" aria-label="Synced projects">
				<header className="flex items-center justify-between gap-4 border-b border-app-line px-5 py-4">
					<div>
						<SectionTitle>Synced projects</SectionTitle>
						<CaptionText className="mt-1">
							Project names, package managers, and scripts are read from disk.
						</CaptionText>
					</div>
					<MonoText className="text-app-accent-dark">
						{String(projects.length).padStart(2, "0")}
					</MonoText>
				</header>

				{projects.length > 0 ? (
					projects.map((project, index) => (
						<ProjectRow
							key={project.id}
							index={index}
							project={project}
							syncing={syncingPath === project.path}
							onResync={(projectPath) => void sync(projectPath)}
							onRemove={remove}
						/>
					))
				) : (
					<div className="flex min-h-52 flex-col items-center justify-center px-6 py-10 text-center">
						<FolderOpen size={28} weight="regular" className="text-app-accent" aria-hidden="true" />
						<SectionTitle className="mt-4">No synced projects</SectionTitle>
						<CaptionText className="mt-2 max-w-130">
							Choose one or more project folders to make their scripts available to the monitor.
						</CaptionText>
					</div>
				)}
			</section>

			<BaseModal
				open={syncModalOpen}
				label="Project sync status"
				cancellable={false}
				className="w-[min(320px,calc(100vw-32px))] rounded-md px-8 py-9 shadow-2xl"
			>
				<SyncAnimation status={syncStatus} />
			</BaseModal>
		</div>
	);
}
