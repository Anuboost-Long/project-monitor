export interface CalendarDay {
	iso: string;
	day: number;
	inMonth: boolean;
}

export function toIsoDate(date: Date) {
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

export function parseIsoDate(value: string) {
	const [year, month, day] = value.split("-").map(Number);
	if (!year || !month || !day) return null;
	const date = new Date(year, month - 1, day);
	return Number.isNaN(date.getTime()) ? null : date;
}

export function addMonths(year: number, month: number, delta: number) {
	const date = new Date(year, month + delta, 1);
	return { year: date.getFullYear(), month: date.getMonth() };
}

export function monthGrid(year: number, month: number): CalendarDay[] {
	const first = new Date(year, month, 1);
	const lead = (first.getDay() + 6) % 7;
	const start = new Date(year, month, 1 - lead);

	return Array.from({ length: 42 }, (_item, index) => {
		const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
		return {
			iso: toIsoDate(date),
			day: date.getDate(),
			inMonth: date.getMonth() === month && date.getFullYear() === year,
		};
	});
}
