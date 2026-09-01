import { clsx } from "clsx";

import type { AppTheme } from "../../../app/app-theme";
import { CaptionText, MonoText, SectionTitle } from "../../../shared/typography";

interface ThemeOptionCardProps {
	id: AppTheme;
	label: string;
	description: string;
	selected: boolean;
	onSelect: (theme: AppTheme) => void;
}

const themePreview: Record<
	AppTheme,
	{ frame: string; sidebar: string; accent: string; line: string }
> = {
	default: {
		frame: "border-[#cbc9c1] bg-[#f4f2eb]",
		sidebar: "border-[#313b37] bg-[#18211e]",
		accent: "bg-[#e4582b]",
		line: "bg-[#d5d1c7]",
	},
	company: {
		frame: "border-[#ddcee2] bg-[#faf7fb]",
		sidebar: "border-[#402a48] bg-[#24172a]",
		accent: "bg-[linear-gradient(90deg,#76368e_0_68%,#f07a32_68%_100%)]",
		line: "bg-[#dfd0e4]",
	},
	lazify: {
		frame: "border-[#263244] bg-[#0b1220]",
		sidebar: "border-[#263244] bg-[#070d18]",
		accent: "bg-[#10b981]",
		line: "bg-[#374151]",
	},
};

export function ThemeOptionCard({
	id,
	label,
	description,
	selected,
	onSelect,
}: Readonly<ThemeOptionCardProps>) {
	const preview = themePreview[id];

	return (
		<button
			type="button"
			className={clsx(
				"grid min-w-0 grid-cols-[104px_minmax(0,1fr)] items-center gap-3.5 rounded-md border bg-app-paper p-2.5 text-left text-app-ink",
				"cursor-pointer transition-colors duration-150 hover:border-app-accent",
				"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus",
				selected ? "border-app-accent" : "border-app-line",
				"max-[520px]:grid-cols-1",
			)}
			aria-pressed={selected}
			onClick={() => onSelect(id)}
		>
			<span
				className={clsx(
					"grid h-16.5 w-full grid-cols-[28px_1fr] overflow-hidden rounded-sm border",
					preview.frame,
				)}
				aria-hidden="true"
			>
				<span className={clsx("border-r", preview.sidebar)} />
				<span className="flex flex-col gap-1.5 px-2 py-2.5">
					<span className={clsx("block h-1.5 rounded-sm", preview.accent)} />
					<span className={clsx("block h-1.5 w-3/4 rounded-sm", preview.line)} />
					<span className={clsx("block h-1.5 w-1/2 rounded-sm", preview.line)} />
				</span>
			</span>
			<span className="flex min-w-0 flex-col gap-2">
				<span className="flex items-center justify-between gap-2">
					<SectionTitle as="strong" className="text-xs">
						{label}
					</SectionTitle>
					<MonoText as="small" className="text-[8px] tracking-[0.06em] text-app-accent-dark uppercase">
						{selected ? "Active" : "Use theme"}
					</MonoText>
				</span>
				<CaptionText as="span" className="text-[10px]">
					{description}
				</CaptionText>
			</span>
		</button>
	);
}
