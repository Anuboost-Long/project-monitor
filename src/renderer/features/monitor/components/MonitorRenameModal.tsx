import { X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { BodyText, CaptionText, OverlineText, SectionTitle } from "../../../shared/typography";
import { BaseModal } from "../../../shared/ui/modal/BaseModal";

interface RenamePanel {
	id: string;
	label: string;
	title?: string;
}

interface MonitorRenameModalProps {
	panel: RenamePanel | null;
	onRename: (runId: string, title: string) => void;
	onClose: () => void;
}

export function MonitorRenameModal({
	panel,
	onRename,
	onClose,
}: Readonly<MonitorRenameModalProps>) {
	const [currentPanel, setCurrentPanel] = useState<RenamePanel | null>(null);
	const [value, setValue] = useState("");
	const panelId = panel?.id;
	const panelLabel = panel?.label;
	const panelTitle = panel?.title;

	useEffect(() => {
		if (!panelId || !panelLabel) return;
		setCurrentPanel({ id: panelId, label: panelLabel, title: panelTitle });
		setValue(panelTitle ?? "");
	}, [panelId, panelLabel, panelTitle]);

	const submit = () => {
		if (currentPanel) onRename(currentPanel.id, value);
		onClose();
	};

	return (
		<BaseModal
			open={panel !== null}
			label="Rename monitor"
			onClose={onClose}
			className="w-[min(416px,calc(100vw-32px))] overflow-hidden rounded-md shadow-2xl"
		>
			<header className="flex items-center justify-between gap-4 border-b border-app-line px-6 py-5">
				<div className="min-w-0">
					<OverlineText className="block truncate text-app-muted">
						{currentPanel?.label ?? "Monitor"}
					</OverlineText>
					<SectionTitle className="mt-1 text-lg">Rename monitor</SectionTitle>
				</div>
				<button
					type="button"
					onClick={onClose}
					aria-label="Close rename monitor"
					className="grid size-9 shrink-0 place-items-center rounded-sm border border-app-line text-app-muted transition-colors hover:border-app-accent hover:text-app-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus"
				>
					<X size={16} weight="regular" aria-hidden="true" />
				</button>
			</header>

			<form
				onSubmit={(event) => {
					event.preventDefault();
					submit();
				}}
				className="px-6 py-5"
			>
				<CaptionText>Name this monitor after what it is doing.</CaptionText>
				<input
					autoFocus
					value={value}
					onChange={(event) => setValue(event.target.value)}
					placeholder="e.g. auth refactor"
					className="mt-4 h-11 w-full rounded-sm border border-app-line bg-app-panel px-3 text-xs text-app-ink outline-none transition-colors placeholder:text-app-muted focus:border-app-accent focus:outline-2 focus:outline-app-focus"
				/>

				<div className="mt-5 flex items-center justify-between gap-3 max-[480px]:items-stretch max-[480px]:flex-col">
					<button
						type="button"
						disabled={!currentPanel?.title}
						onClick={() => {
							if (currentPanel) onRename(currentPanel.id, "");
							onClose();
						}}
						className="min-h-9.5 rounded-sm border border-app-line px-3 text-app-muted transition-colors enabled:hover:border-app-accent enabled:hover:text-app-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus disabled:cursor-not-allowed disabled:opacity-45"
					>
						<BodyText as="span" className="text-xs">
							Use default name
						</BodyText>
					</button>
					<span className="flex items-center justify-end gap-2 max-[480px]:grid max-[480px]:grid-cols-2">
						<button
							type="button"
							onClick={onClose}
							className="min-h-9.5 rounded-sm border border-app-line px-4 text-xs font-bold text-app-muted transition-colors hover:border-app-accent hover:text-app-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus"
						>
							Cancel
						</button>
						<button
							type="submit"
							className="min-h-9.5 rounded-sm bg-app-accent px-4 text-xs font-bold text-white transition-colors hover:bg-app-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus"
						>
							Save
						</button>
					</span>
				</div>
			</form>
		</BaseModal>
	);
}
