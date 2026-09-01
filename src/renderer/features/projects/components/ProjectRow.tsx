import { ArrowsClockwiseIcon as ArrowsClockwise, TrashIcon as Trash } from "@phosphor-icons/react";

import type { SyncedProject } from "../../../../shared/project-monitor";
import { CaptionText, MonoText, SectionTitle } from "../../../shared/typography";

interface ProjectRowProps {
	index: number;
	project: SyncedProject;
	syncing: boolean;
	onRemove: (projectPath: string) => void;
	onResync: (projectPath: string) => void;
}

export function ProjectRow({
	index,
	project,
	syncing,
	onRemove,
	onResync,
}: Readonly<ProjectRowProps>) {
	const scriptCount = Object.keys(project.scripts).length;

	return (
		<article className="grid min-h-28 grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-4 border-t border-app-line px-5 py-4 first:border-t-0 max-[720px]:grid-cols-[32px_minmax(0,1fr)]">
			<MonoText className="text-app-accent-dark">{String(index + 1).padStart(2, "0")}</MonoText>
			<div className="min-w-0">
				<SectionTitle className="truncate">{project.name}</SectionTitle>
				<CaptionText className="mt-1 truncate text-[10px]">{project.path}</CaptionText>
				<span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
					<MonoText className="text-[9px] tracking-[0.08em] text-app-muted uppercase">
						{project.packageManager}
					</MonoText>
					<CaptionText as="span" className="text-[10px]">
						{scriptCount} {scriptCount === 1 ? "script" : "scripts"}
					</CaptionText>
					<CaptionText as="span" className="text-[10px]">
						Synced {new Date(project.lastSyncedAt).toLocaleString()}
					</CaptionText>
				</span>
			</div>
			<div className="flex items-center gap-2 max-[720px]:col-start-2">
				<button
					type="button"
					disabled={syncing}
					onClick={() => onResync(project.path)}
					className="inline-flex size-9 items-center justify-center rounded-sm border border-app-line bg-app-paper text-app-muted transition-colors hover:border-app-accent hover:text-app-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus disabled:cursor-not-allowed disabled:opacity-50"
					aria-label={`Resync ${project.name}`}
					title="Resync project"
				>
					<ArrowsClockwise size={15} weight="regular" aria-hidden="true" />
				</button>
				<button
					type="button"
					onClick={() => onRemove(project.path)}
					className="inline-flex size-9 items-center justify-center rounded-sm border border-app-line bg-app-paper text-app-muted transition-colors hover:border-app-accent hover:text-app-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus"
					aria-label={`Remove ${project.name}`}
					title="Remove project"
				>
					<Trash size={15} weight="regular" aria-hidden="true" />
				</button>
			</div>
		</article>
	);
}
