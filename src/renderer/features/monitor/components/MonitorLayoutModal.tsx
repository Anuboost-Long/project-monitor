import { GridFour, X } from "@phosphor-icons/react";
import { clsx } from "clsx";

import { BodyText, CaptionText, OverlineText, SectionTitle } from "../../../shared/typography";
import { BaseModal } from "../../../shared/ui/modal/BaseModal";

export type MonitorColumns = "auto" | 1 | 2 | 3;

interface MonitorLayoutModalProps {
	columns: MonitorColumns;
	open: boolean;
	onSelect: (columns: MonitorColumns) => void;
	onClose: () => void;
}

const layouts: Array<{ columns: MonitorColumns; label: string; description: string }> = [
	{ columns: "auto", label: "Auto", description: "Fit the window automatically" },
	{ columns: 1, label: "One column", description: "Maximum monitor width" },
	{ columns: 2, label: "Two columns", description: "Balanced monitor wall" },
	{ columns: 3, label: "Three columns", description: "See more monitors at once" },
];

export function MonitorLayoutModal({
	columns,
	open,
	onSelect,
	onClose,
}: Readonly<MonitorLayoutModalProps>) {
	return (
		<BaseModal
			open={open}
			label="Monitor wall layout"
			onClose={onClose}
			className="w-[min(416px,calc(100vw-32px))] overflow-hidden rounded-md shadow-2xl"
		>
			<header className="flex items-center justify-between gap-4 border-b border-app-line px-6 py-5">
				<div>
					<OverlineText className="block text-app-muted">Live panels</OverlineText>
					<SectionTitle className="mt-1 text-lg">Monitor wall layout</SectionTitle>
				</div>
				<button
					type="button"
					onClick={onClose}
					aria-label="Close monitor wall layout"
					className="grid size-9 shrink-0 place-items-center rounded-sm border border-app-line text-app-muted transition-colors hover:border-app-accent hover:text-app-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus"
				>
					<X size={16} weight="regular" aria-hidden="true" />
				</button>
			</header>

			<div className="space-y-2 px-6 py-5">
				<CaptionText className="mb-4">Choose how many monitors appear across the wall.</CaptionText>
				{layouts.map((layout) => {
					const selected = layout.columns === columns;
					return (
						<button
							key={layout.columns}
							type="button"
							aria-pressed={selected}
							onClick={() => {
								onSelect(layout.columns);
								onClose();
							}}
							className={clsx(
								"flex w-full items-center gap-3 rounded-sm border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus",
								selected
									? "border-app-accent bg-app-soft"
									: "border-app-line bg-app-panel hover:border-app-accent",
							)}
						>
							<span className="grid size-9 shrink-0 place-items-center rounded-sm border border-app-line bg-app-paper text-app-muted">
								<GridFour size={16} weight={selected ? "fill" : "regular"} aria-hidden="true" />
							</span>
							<span className="min-w-0 flex-1">
								<BodyText as="span" className="block text-xs font-bold text-app-ink">
									{layout.label}
								</BodyText>
								<CaptionText as="span" className="mt-0.5 block text-[10px]">
									{layout.description}
								</CaptionText>
							</span>
						</button>
					);
				})}
			</div>
		</BaseModal>
	);
}
