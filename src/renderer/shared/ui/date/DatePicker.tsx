import { CalendarBlank, CaretLeft, CaretRight, X } from "@phosphor-icons/react";
import { clsx } from "clsx";
import { useEffect, useMemo, useState } from "react";

import { CaptionText, MonoText, SectionTitle } from "../../typography";
import { BaseModal } from "../modal/BaseModal";
import { addMonths, monthGrid, parseIsoDate, toIsoDate } from "./calendar-grid";

interface DatePickerProps {
	value: string;
	max?: string;
	onChange: (value: string) => void;
}

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function DatePicker({ value, max, onChange }: Readonly<DatePickerProps>) {
	const [open, setOpen] = useState(false);
	const [picked, setPicked] = useState(value);
	const selected = parseIsoDate(picked) ?? new Date();
	const [view, setView] = useState(() => ({
		year: selected.getFullYear(),
		month: selected.getMonth(),
	}));

	useEffect(() => {
		if (!open) return;
		const date = parseIsoDate(value) ?? new Date();
		setPicked(value);
		setView({ year: date.getFullYear(), month: date.getMonth() });
	}, [open, value]);

	const days = useMemo(() => monthGrid(view.year, view.month), [view]);
	const title = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(
		new Date(view.year, view.month, 1),
	);
	const formatted = new Intl.DateTimeFormat(undefined, {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(parseIsoDate(value) ?? new Date());
	const today = toIsoDate(new Date());

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="inline-flex min-h-10 items-center gap-2.5 rounded-sm border border-app-line bg-app-paper px-3.5 text-left transition-colors hover:border-app-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus"
			>
				<CalendarBlank size={16} className="shrink-0 text-app-accent-dark" aria-hidden="true" />
				<span>
					<CaptionText as="span" className="block text-[8px] font-bold tracking-[0.08em] uppercase">
						Log date
					</CaptionText>
					<MonoText as="span" className="mt-0.5 block text-[10px] text-app-ink">
						{formatted}
					</MonoText>
				</span>
			</button>

			<BaseModal
				open={open}
				label="Choose activity date"
				onClose={() => setOpen(false)}
				className="w-[min(380px,calc(100vw-32px))] overflow-hidden rounded-md shadow-2xl"
			>
				<header className="flex items-center justify-between gap-4 border-b border-app-line px-5 py-4">
					<div>
						<CaptionText className="text-[9px] tracking-[0.1em] uppercase">Error logs</CaptionText>
						<SectionTitle className="mt-1 text-base">Choose a date</SectionTitle>
					</div>
					<button
						type="button"
						onClick={() => setOpen(false)}
						aria-label="Close date picker"
						className="grid size-8 place-items-center rounded-sm border border-app-line text-app-muted transition-colors hover:border-app-accent hover:text-app-ink"
					>
						<X size={15} aria-hidden="true" />
					</button>
				</header>

				<div className="px-5 py-4">
					<div className="mb-3 flex items-center gap-2">
						<button
							type="button"
							onClick={() => setView(addMonths(view.year, view.month, -1))}
							aria-label="Previous month"
							className="grid size-8 place-items-center rounded-sm border border-app-line text-app-muted hover:border-app-accent hover:text-app-ink"
						>
							<CaretLeft size={14} aria-hidden="true" />
						</button>
						<MonoText className="min-w-0 flex-1 text-center text-[11px] text-app-ink">{title}</MonoText>
						<button
							type="button"
							onClick={() => setView(addMonths(view.year, view.month, 1))}
							aria-label="Next month"
							className="grid size-8 place-items-center rounded-sm border border-app-line text-app-muted hover:border-app-accent hover:text-app-ink"
						>
							<CaretRight size={14} aria-hidden="true" />
						</button>
					</div>

					<div className="grid grid-cols-7 gap-1">
						{weekdays.map((weekday) => (
							<CaptionText key={weekday} className="py-1 text-center text-[9px]">
								{weekday}
							</CaptionText>
						))}
						{days.map((day) => {
							const disabled = Boolean(max && day.iso > max);
							return (
								<button
									key={day.iso}
									type="button"
									disabled={disabled}
									onClick={() => setPicked(day.iso)}
									className={clsx(
										"grid h-9 place-items-center rounded-sm border text-[10px] transition-colors",
										day.iso === picked
											? "border-app-accent bg-app-accent font-bold text-white"
											: "border-transparent text-app-ink hover:border-app-accent hover:bg-app-soft",
										!day.inMonth && day.iso !== picked && "text-app-muted opacity-45",
										disabled && "cursor-not-allowed opacity-25",
									)}
								>
									{day.day}
								</button>
							);
						})}
					</div>
				</div>

				<footer className="flex items-center justify-between gap-3 border-t border-app-line px-5 py-4">
					<button
						type="button"
						onClick={() => {
							setPicked(today);
							const date = new Date();
							setView({ year: date.getFullYear(), month: date.getMonth() });
						}}
						className="min-h-9 rounded-sm border border-app-line px-3 text-[10px] font-bold text-app-muted hover:border-app-accent hover:text-app-ink"
					>
						Today
					</button>
					<button
						type="button"
						onClick={() => {
							onChange(picked);
							setOpen(false);
						}}
						className="min-h-9 rounded-sm bg-app-accent px-4 text-[10px] font-bold text-white transition-colors hover:bg-app-accent-dark"
					>
						View errors
					</button>
				</footer>
			</BaseModal>
		</>
	);
}
