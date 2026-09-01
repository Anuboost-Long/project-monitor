import { CaretRightIcon as CaretRight } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { BodyText, CaptionText, MonoText } from "../../../shared/typography";

interface MonitorSetupChoiceProps {
	icon: ReactNode;
	title: string;
	subtitle: string;
	mono?: boolean;
	disabled?: boolean;
	onClick: () => void;
}

export function MonitorSetupChoice({
	icon,
	title,
	subtitle,
	mono = false,
	disabled = false,
	onClick,
}: Readonly<MonitorSetupChoiceProps>) {
	return (
		<button
			type="button"
			disabled={disabled}
			onClick={onClick}
			className="group flex w-full items-center gap-3 rounded-sm border border-app-line bg-app-paper px-3.5 py-3 text-left transition-colors hover:border-app-accent hover:bg-app-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus disabled:cursor-not-allowed disabled:opacity-45"
		>
			<span className="grid size-9 shrink-0 place-items-center rounded-sm border border-app-line bg-app-soft text-app-muted transition-colors group-hover:text-app-accent">
				{icon}
			</span>
			<span className="min-w-0 flex-1">
				<BodyText as="span" className="block truncate leading-5 text-app-ink">
					{title}
				</BodyText>
				{mono ? (
					<MonoText className="mt-0.5 block truncate text-[10px] font-normal text-app-muted">
						{subtitle}
					</MonoText>
				) : (
					<CaptionText as="span" className="mt-0.5 block truncate text-[10px]">
						{subtitle}
					</CaptionText>
				)}
			</span>
			<CaretRight
				size={14}
				weight="regular"
				className="shrink-0 text-app-muted transition-colors group-hover:text-app-accent"
				aria-hidden="true"
			/>
		</button>
	);
}
