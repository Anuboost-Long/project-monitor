import type { ReactNode } from "react";

import { CaptionText, SectionTitle } from "../../../shared/typography";

interface SettingRowProps {
	children: ReactNode;
	description: string;
	id: string;
	title: string;
}

interface SettingOption {
	label: string;
	value: string;
}

interface SettingSelectProps {
	defaultValue: string;
	id: string;
	options: readonly SettingOption[];
}

interface SettingToggleProps {
	defaultChecked?: boolean;
	id: string;
}

export function SettingRow({ children, description, id, title }: Readonly<SettingRowProps>) {
	return (
		<article className="grid min-h-22 grid-cols-[minmax(0,1fr)_minmax(180px,224px)] items-center gap-8 border-t border-app-line px-5.5 py-4.5 max-[720px]:grid-cols-1 max-[720px]:gap-3">
			<div className="max-w-150">
				<SectionTitle id={`${id}-label`} as="h3" className="mb-1 text-xs">
					{title}
				</SectionTitle>
				<CaptionText id={`${id}-description`}>{description}</CaptionText>
			</div>
			<div className="w-full justify-self-end max-[720px]:justify-self-start">{children}</div>
		</article>
	);
}

export function SettingSelect({ defaultValue, id, options }: Readonly<SettingSelectProps>) {
	return (
		<select
			id={id}
			defaultValue={defaultValue}
			aria-labelledby={`${id}-label`}
			aria-describedby={`${id}-description`}
			className="min-h-10 w-full rounded-sm border border-app-line bg-app-paper px-3 text-xs text-app-ink outline-none transition-colors hover:border-app-accent focus:border-app-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-app-focus"
		>
			{options.map((option) => (
				<option key={option.value} value={option.value}>
					{option.label}
				</option>
			))}
		</select>
	);
}

export function SettingToggle({ defaultChecked = false, id }: Readonly<SettingToggleProps>) {
	return (
		<label className="inline-flex min-h-10 cursor-pointer items-center" htmlFor={id}>
			<input
				id={id}
				type="checkbox"
				defaultChecked={defaultChecked}
				aria-labelledby={`${id}-label`}
				aria-describedby={`${id}-description`}
				className="peer sr-only"
			/>
			<span className="relative h-6 w-10 rounded-full border border-app-line bg-app-soft transition-colors after:absolute after:top-1 after:left-1 after:size-4 after:rounded-full after:bg-app-muted after:transition-transform peer-checked:border-app-accent peer-checked:bg-app-accent peer-checked:after:translate-x-4 peer-checked:after:bg-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-app-focus" />
		</label>
	);
}
