import { ArrowsOutSimpleIcon as ArrowsOutSimple, XIcon as X } from "@phosphor-icons/react";
import { clsx } from "clsx";
import { useEffect, useState } from "react";

import { BodyText, CaptionText, OverlineText, SectionTitle } from "../../../shared/typography";
import { BaseModal } from "../../../shared/ui/modal/BaseModal";
import type { MonitorPanelSize } from "../../projects/project-context";

interface MonitorSizeModalProps {
	current: MonitorPanelSize;
	panelName: string | null;
	onSelect: (size: MonitorPanelSize) => void;
	onClose: () => void;
}

const sizes: Array<{ size: MonitorPanelSize; label: string; description: string }> = [
	{ size: "default", label: "Default", description: "One grid cell" },
	{ size: "wide", label: "Wide", description: "Two columns" },
	{ size: "large", label: "Large", description: "Two columns and two rows" },
];

const sizeCells: Record<MonitorPanelSize, Array<[string, boolean]>> = {
	default: [
		["top-left", true],
		["top-right", false],
		["bottom-left", false],
		["bottom-right", false],
	],
	wide: [
		["top-left", true],
		["top-right", true],
		["bottom-left", false],
		["bottom-right", false],
	],
	large: [
		["top-left", true],
		["top-right", true],
		["bottom-left", true],
		["bottom-right", true],
	],
};

export function MonitorSizeModal({
	current,
	panelName,
	onSelect,
	onClose,
}: Readonly<MonitorSizeModalProps>) {
	const [visibleName, setVisibleName] = useState("Monitor");
	const [visibleSize, setVisibleSize] = useState<MonitorPanelSize>("default");

	useEffect(() => {
		if (!panelName) return;
		setVisibleName(panelName);
		setVisibleSize(current);
	}, [current, panelName]);

	return (
		<BaseModal
			open={panelName !== null}
			label="Resize monitor"
			onClose={onClose}
			className="w-[min(416px,calc(100vw-32px))] overflow-hidden rounded-md shadow-2xl"
		>
			<header className="flex items-center justify-between gap-4 border-b border-app-line px-6 py-5">
				<div className="min-w-0">
					<OverlineText className="block truncate text-app-muted">{visibleName}</OverlineText>
					<SectionTitle className="mt-1 text-lg">Monitor size</SectionTitle>
				</div>
				<button
					type="button"
					onClick={onClose}
					aria-label="Close monitor size"
					className="grid size-9 shrink-0 place-items-center rounded-sm border border-app-line text-app-muted transition-colors hover:border-app-accent hover:text-app-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus"
				>
					<X size={16} weight="regular" aria-hidden="true" />
				</button>
			</header>

			<div className="space-y-2 px-6 py-5">
				<CaptionText className="mb-4">Choose how much of the monitor wall this panel uses.</CaptionText>
				{sizes.map(({ size, label, description }) => {
					const selected = size === visibleSize;
					return (
						<button
							key={size}
							type="button"
							aria-pressed={selected}
							onClick={() => {
								onSelect(size);
								onClose();
							}}
							className={clsx(
								"flex w-full items-center gap-3 rounded-sm border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus",
								selected
									? "border-app-accent bg-app-soft"
									: "border-app-line bg-app-panel hover:border-app-accent",
							)}
						>
							<span
								className="grid size-9 shrink-0 grid-cols-2 grid-rows-2 gap-0.5 rounded-sm border border-app-line bg-app-paper p-1"
								aria-hidden="true"
							>
								{sizeCells[size].map(([cell, filled]) => (
									<span key={cell} className={filled ? "bg-app-accent" : "bg-app-line"} />
								))}
							</span>
							<span className="min-w-0 flex-1">
								<BodyText as="span" className="block text-xs font-bold text-app-ink">
									{label}
								</BodyText>
								<CaptionText as="span" className="mt-0.5 block text-[10px]">
									{description}
								</CaptionText>
							</span>
							<ArrowsOutSimple
								size={15}
								weight="regular"
								className={selected ? "text-app-accent" : "text-app-muted"}
								aria-hidden="true"
							/>
						</button>
					);
				})}
			</div>
		</BaseModal>
	);
}
