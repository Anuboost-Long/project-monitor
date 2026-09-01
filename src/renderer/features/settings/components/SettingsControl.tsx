import { CaretDownIcon as CaretDown } from "@phosphor-icons/react";
import { clsx } from "clsx";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

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
	const [value, setValue] = useState(defaultValue);
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
	const selectedIndex = options.findIndex((option) => option.value === value);

	useEffect(() => {
		if (!open) return;

		const closeOutside = (event: PointerEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
		};

		document.addEventListener("pointerdown", closeOutside);
		return () => document.removeEventListener("pointerdown", closeOutside);
	}, [open]);

	const openOptions = () => {
		setOpen(true);
		requestAnimationFrame(() => optionRefs.current[Math.max(selectedIndex, 0)]?.focus());
	};

	const selectOption = (nextValue: string) => {
		setValue(nextValue);
		setOpen(false);
		requestAnimationFrame(() => triggerRef.current?.focus());
	};

	const focusOption = (index: number) => {
		optionRefs.current[(index + options.length) % options.length]?.focus();
	};

	return (
		<div ref={rootRef} className="relative w-full">
			<button
				ref={triggerRef}
				id={id}
				type="button"
				onClick={() => (open ? setOpen(false) : openOptions())}
				onKeyDown={(event) => {
					if (event.key === "Escape" && open) {
						event.preventDefault();
						setOpen(false);
						return;
					}
					if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
					event.preventDefault();
					openOptions();
				}}
				aria-labelledby={`${id}-label ${id}-value`}
				aria-describedby={`${id}-description`}
				aria-controls={`${id}-options`}
				aria-expanded={open}
				aria-haspopup="listbox"
				className={clsx(
					"flex min-h-10 w-full items-center justify-between gap-3 rounded-sm bg-app-paper",
					"border border-app-line px-3 text-left text-xs text-app-ink outline-none transition-colors",
					"hover:border-app-accent focus:border-app-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-app-focus",
				)}
			>
				<span id={`${id}-value`} className="truncate">
					{options[selectedIndex]?.label}
				</span>
				<CaretDown
					size={14}
					weight="bold"
					className={clsx("shrink-0 transition-transform", open && "rotate-180")}
					aria-hidden="true"
				/>
			</button>

			<ul
				id={`${id}-options`}
				role="listbox"
				aria-labelledby={`${id}-label`}
				hidden={!open}
				className="absolute top-full right-0 left-0 z-20 mt-1 max-h-56 overflow-y-auto rounded-sm border border-app-line bg-app-paper p-1 shadow-lg"
			>
				{options.map((option, index) => (
					<li key={option.value}>
						<button
							ref={(element) => {
								optionRefs.current[index] = element;
							}}
							type="button"
							role="option"
							aria-selected={option.value === value}
							tabIndex={option.value === value ? 0 : -1}
							onClick={() => selectOption(option.value)}
							onKeyDown={(event) => {
								switch (event.key) {
									case "ArrowDown":
										event.preventDefault();
										focusOption(index + 1);
										break;
									case "ArrowUp":
										event.preventDefault();
										focusOption(index - 1);
										break;
									case "Home":
										event.preventDefault();
										focusOption(0);
										break;
									case "End":
										event.preventDefault();
										focusOption(options.length - 1);
										break;
									case "Escape":
										event.preventDefault();
										setOpen(false);
										triggerRef.current?.focus();
										break;
								}
							}}
							className={clsx(
								"block min-h-9 w-full rounded-sm px-2.5 text-left text-[11px] text-app-ink",
								"transition-colors hover:bg-app-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-focus",
								option.value === value && "bg-app-soft",
							)}
						>
							{option.label}
						</button>
					</li>
				))}
			</ul>
		</div>
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
