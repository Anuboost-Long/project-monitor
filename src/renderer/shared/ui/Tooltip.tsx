import { clsx } from "clsx";
import type { ReactNode } from "react";

export type TooltipPosition = "bottom-end" | "right";

interface TooltipProps {
	label?: string;
	position?: TooltipPosition;
	className?: string;
	children: ReactNode;
}

const positionClassName: Record<TooltipPosition, string> = {
	"bottom-end": "top-[calc(100%+6px)] right-0",
	right: "left-[calc(100%+8px)] top-1/2 -translate-y-1/2",
};

export function Tooltip({
	label,
	position = "bottom-end",
	className,
	children,
}: Readonly<TooltipProps>) {
	if (!label) return <>{children}</>;

	return (
		<span className={clsx("group/tooltip relative inline-flex shrink-0", className)}>
			{children}
			<span
				aria-hidden="true"
				className={clsx(
					"pointer-events-none absolute z-20 rounded-sm border border-app-line bg-app-ink px-2 py-1",
					"text-[10px] leading-none whitespace-nowrap text-app-paper",
					"opacity-0 transition-opacity duration-150 group-hover/tooltip:opacity-100",
					"group-has-focus-visible/tooltip:opacity-100 motion-reduce:transition-none",
					positionClassName[position],
				)}
			>
				{label}
			</span>
		</span>
	);
}
