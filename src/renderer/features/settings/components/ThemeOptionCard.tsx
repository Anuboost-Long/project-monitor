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

export function ThemeOptionCard({
	id,
	label,
	description,
	selected,
	onSelect,
}: Readonly<ThemeOptionCardProps>) {
	const isDefault = id === "default";
	const isCompany = id === "company";

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
					isDefault
						? "border-[#cbc9c1] bg-[#f4f2eb]"
						: isCompany
							? "border-[#ddcee2] bg-[#faf7fb]"
							: "border-[#263244] bg-[#0b1220]",
				)}
				aria-hidden="true"
			>
				<span
					className={clsx(
						"border-r",
						isDefault
							? "border-[#313b37] bg-[#18211e]"
							: isCompany
								? "border-[#402a48] bg-[#24172a]"
								: "border-[#263244] bg-[#070d18]",
					)}
				/>
				<span className="flex flex-col gap-1.5 px-2 py-2.5">
					<span
						className={clsx(
							"block h-1.5 rounded-sm",
							isDefault
								? "bg-[#e4582b]"
								: isCompany
									? "bg-[linear-gradient(90deg,#76368e_0_68%,#f07a32_68%_100%)]"
									: "bg-[#10b981]",
						)}
					/>
					<span
						className={clsx(
							"block h-1.5 w-3/4 rounded-sm",
							isDefault ? "bg-[#d5d1c7]" : isCompany ? "bg-[#dfd0e4]" : "bg-[#374151]",
						)}
					/>
					<span
						className={clsx(
							"block h-1.5 w-1/2 rounded-sm",
							isDefault ? "bg-[#d5d1c7]" : isCompany ? "bg-[#dfd0e4]" : "bg-[#374151]",
						)}
					/>
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
