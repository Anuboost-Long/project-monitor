import { Plus } from "@phosphor-icons/react";
import { clsx } from "clsx";

import { CaptionText, MonoText } from "../../../shared/typography";

interface EmptyMonitorPanelProps {
	disabled: boolean;
	dropTarget: boolean;
	slot: number;
	onDragLeave: (slot: number) => void;
	onDragOver: (slot: number) => void;
	onDrop: (slot: number) => void;
	onOpen: (slot: number) => void;
}

export function EmptyMonitorPanel({
	disabled,
	dropTarget,
	slot,
	onDragLeave,
	onDragOver,
	onDrop,
	onOpen,
}: Readonly<EmptyMonitorPanelProps>) {
	return (
		<button
			type="button"
			disabled={disabled}
			onClick={() => onOpen(slot)}
			onDragOver={(event) => {
				event.preventDefault();
				event.dataTransfer.dropEffect = "move";
				onDragOver(slot);
			}}
			onDragLeave={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onDragLeave(slot);
			}}
			onDrop={(event) => {
				event.preventDefault();
				onDrop(slot);
			}}
			className={clsx(
				"group flex h-full min-h-88 min-w-0 flex-col overflow-hidden rounded-md border bg-app-panel text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus disabled:cursor-not-allowed disabled:opacity-55",
				dropTarget ? "border-app-accent" : "border-app-line hover:border-app-accent",
			)}
		>
			<header className="flex min-h-15 items-center justify-between gap-3 border-b border-app-terminal-line bg-app-terminal px-4 py-2.5">
				<MonoText className="text-[9px] tracking-[0.08em] text-app-terminal-muted uppercase">
					Monitor {String(slot + 1).padStart(2, "0")}
				</MonoText>
				<CaptionText as="span" className="text-[9px] text-app-terminal-muted uppercase">
					{disabled ? "Unavailable" : "Available"}
				</CaptionText>
			</header>
			<span className="flex flex-1 flex-col items-center justify-center bg-app-terminal px-6 text-center">
				<span className="grid size-10 place-items-center rounded-sm border border-app-terminal-line text-app-terminal-muted transition-colors group-hover:border-app-accent group-hover:text-app-accent">
					<Plus size={17} weight="regular" aria-hidden="true" />
				</span>
				<MonoText className="mt-4 text-[10px] tracking-[0.08em] text-app-terminal-ink uppercase">
					{disabled ? "Sync a project first" : "Open monitor"}
				</MonoText>
			</span>
		</button>
	);
}
