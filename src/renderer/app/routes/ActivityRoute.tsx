import {
	ClipboardTextIcon as ClipboardText,
	PaperPlaneTiltIcon as PaperPlaneTilt,
	WarningDiamondIcon as WarningDiamond,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { createErrorWebhookBody } from "../../../shared/project-monitor";
import type {
	ErrorWebhookDeliveryFailure,
	ProjectConsoleErrorRecord,
} from "../../../shared/project-monitor";
import {
	BodyText,
	CaptionText,
	MonoText,
	OverlineText,
	PageTitle,
	SectionTitle,
} from "../../shared/typography";
import { parseIsoDate, toIsoDate } from "../../shared/ui/date/calendar-grid";
import { DatePicker } from "../../shared/ui/date/DatePicker";
import { BaseModal } from "../../shared/ui/modal/BaseModal";
import { SyncAnimation } from "../../shared/ui/SyncAnimation";
import { Tooltip } from "../../shared/ui/Tooltip";

const MIN_WEBHOOK_SEND_DURATION = 700;
const today = toIsoDate(new Date());

function mergeRecords(current: ProjectConsoleErrorRecord[], incoming: ProjectConsoleErrorRecord[]) {
	const records = new Map(current.map((record) => [record.id, record]));
	for (const record of incoming) records.set(record.id, record);
	return [...records.values()].sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

function recordsForDate(records: ProjectConsoleErrorRecord[], date: string) {
	return records.filter((record) => toIsoDate(new Date(record.timestamp)) === date);
}

function errorMetadata(record: ProjectConsoleErrorRecord) {
	return [
		record.statusCode ? `API ${record.statusCode}` : undefined,
		record.routeType === "action" ? "Server Action" : record.routeType,
		record.digest ? `Digest ${record.digest}` : undefined,
	]
		.filter(Boolean)
		.join(" · ");
}

function errorWebhookFailureMessage(result: ErrorWebhookDeliveryFailure) {
	const technicalDetail = [result.code, result.detail].filter(Boolean).join(": ");
	const detail = technicalDetail ? ` Technical detail: ${technicalDetail}` : "";

	if (result.reason === "not-configured") {
		return "Webhook isn’t configured. Add an endpoint URL and required headers in Settings.";
	}
	if (result.reason === "certificate") {
		return `The webhook certificate couldn’t be verified. Trust or replace its development certificate, or use an HTTP localhost endpoint during development.${detail}`;
	}
	if (result.reason === "timeout") {
		return `The webhook timed out after 15 seconds. Check that the API is running and can respond.${detail}`;
	}
	if (result.reason === "network") {
		return `The webhook couldn’t be reached. Check the endpoint URL, port, and whether the API is running.${detail}`;
	}
	if (result.reason !== "http") {
		return `The error couldn’t be sent. Check the webhook configuration and try again.${detail}`;
	}

	const responseDetail = result.detail ? ` Server response: ${result.detail}` : "";
	switch (result.statusCode) {
		case 400:
		case 422:
			return `The webhook rejected the error body (${result.statusCode}). Check its required input fields.${responseDetail}`;
		case 401:
		case 403:
			return `The webhook rejected authentication (${result.statusCode}). Check the configured header names and values.${responseDetail}`;
		case 404:
			return `The webhook route wasn’t found (404). Check the endpoint URL and route.${responseDetail}`;
		case 405:
			return `The webhook doesn’t accept POST requests (405). Check the endpoint method and route.${responseDetail}`;
		case 415:
			return `The webhook rejected the CloudEvents content type (415). Configure the API to accept application/cloudevents+json.${responseDetail}`;
		case 429:
			return `The webhook is rate-limiting requests (429). Wait before sending again.${responseDetail}`;
		default:
			return result.statusCode && result.statusCode >= 500
				? `The webhook API failed (${result.statusCode}). Check its server logs and configuration.${responseDetail}`
				: `The webhook rejected the request (${result.statusCode ?? "unknown status"}).${responseDetail}`;
	}
}

function ActivityErrorItem({
	record,
	timeZone,
}: Readonly<{ record: ProjectConsoleErrorRecord; timeZone: string }>) {
	const [sending, setSending] = useState(false);
	const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(
				JSON.stringify(createErrorWebhookBody(record, timeZone), null, 2),
			);
			setNotice({ error: false, text: "Error body copied." });
		} catch {
			setNotice({ error: true, text: "The error body could not be copied." });
		}
	};

	const send = async () => {
		if (!window.projectMonitor.sendErrorWebhook) return;

		setSending(true);
		setNotice(null);
		const minimumDuration = new Promise((resolve) => setTimeout(resolve, MIN_WEBHOOK_SEND_DURATION));
		try {
			const [result] = await Promise.all([
				window.projectMonitor.sendErrorWebhook(record),
				minimumDuration,
			]);
			if (result.sent === false) {
				console.error("Error webhook delivery failed", result);
				setNotice({ error: true, text: errorWebhookFailureMessage(result) });
			} else {
				setNotice({ error: false, text: "Sent to webhook." });
			}
		} catch (error) {
			await minimumDuration;
			console.error("Error webhook delivery IPC failed", error);
			setNotice({
				error: true,
				text: `The error couldn’t be sent. Restart Project Monitor and try again.${
					error instanceof Error ? ` Technical detail: ${error.message}` : ""
				}`,
			});
		} finally {
			setSending(false);
		}
	};

	return (
		<>
			<article className="border border-app-line bg-app-panel p-5">
				<header className="flex items-start gap-3">
					<WarningDiamond
						size={18}
						weight="regular"
						className="mt-0.5 shrink-0 text-app-signal"
						aria-hidden="true"
					/>
					<div className="min-w-0 flex-1">
						<SectionTitle className="wrap-break-word text-sm">{record.message}</SectionTitle>
						<CaptionText className="mt-1">
							{record.projectName} · {record.command} · {new Date(record.timestamp).toLocaleString()}
						</CaptionText>
						{errorMetadata(record) ? (
							<MonoText className="mt-1.5 block text-[9px] text-app-accent-dark uppercase">
								{errorMetadata(record)}
							</MonoText>
						) : null}
						{notice ? (
							<CaptionText
								className={notice.error ? "mt-2 text-app-signal" : "mt-2 text-app-accent-dark"}
								role="status"
							>
								{notice.text}
							</CaptionText>
						) : null}
					</div>
					<div className="flex shrink-0 gap-2">
						<Tooltip label="Copy error body" position="bottom-end">
							<button
								type="button"
								onClick={() => void copy()}
								className="grid size-9 place-items-center rounded-sm border border-app-line text-app-muted transition-colors hover:border-app-accent hover:text-app-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus"
								aria-label={`Copy ${record.projectName} error body`}
							>
								<ClipboardText size={15} weight="regular" aria-hidden="true" />
							</button>
						</Tooltip>
						<Tooltip label="Send to webhook" position="bottom-end">
							<button
								type="button"
								disabled={sending || !window.projectMonitor.sendErrorWebhook}
								onClick={() => void send()}
								className="grid size-9 place-items-center rounded-sm border border-app-line text-app-muted transition-colors hover:border-app-accent hover:text-app-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus disabled:cursor-not-allowed disabled:opacity-50"
								aria-label={`Send ${record.projectName} error to webhook`}
							>
								<PaperPlaneTilt size={15} weight="regular" aria-hidden="true" />
							</button>
						</Tooltip>
					</div>
				</header>
				<pre className="mt-4 max-h-72 overflow-auto border-t border-app-line pt-4 text-[10px] leading-relaxed whitespace-pre-wrap text-app-muted">
					{record.raw}
				</pre>
			</article>
			{sending ? (
				<BaseModal
					open
					label="Webhook delivery status"
					cancellable={false}
					className="w-[min(320px,calc(100vw-32px))] rounded-md px-8 py-9 shadow-2xl"
				>
					<SyncAnimation status="syncing" label="Sending error" />
				</BaseModal>
			) : null}
		</>
	);
}

export function ActivityRoute() {
	const [records, setRecords] = useState<ProjectConsoleErrorRecord[]>([]);
	const [recordsDate, setRecordsDate] = useState(today);
	const [logDirectory, setLogDirectory] = useState("");
	const [timeZone, setTimeZone] = useState("");
	const [selectedDate, setSelectedDate] = useState(today);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState(false);

	useEffect(() => {
		const api = window.projectMonitor;
		let active = true;

		const loadDirectory = async () => {
			try {
				const directory = await api.getProjectConsoleErrorLogDirectory?.();
				if (active && directory) setLogDirectory(directory);
			} catch {
				if (active) setLoadError(true);
			}
		};

		const loadTimeZone = async () => {
			try {
				const settings = await api.getErrorWebhookSettings?.();
				if (active && settings) setTimeZone(settings.timeZone);
			} catch {
				return;
			}
		};

		void loadDirectory();
		void loadTimeZone();
		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		const api = window.projectMonitor;
		let active = true;
		setLoading(true);
		setLoadError(false);
		setRecords([]);
		setRecordsDate(selectedDate);
		const unsubscribe = api.onProjectConsoleErrors?.((incoming) => {
			const dated = recordsForDate(incoming, selectedDate);
			if (active && dated.length > 0) {
				setRecordsDate(selectedDate);
				setRecords((current) => mergeRecords(current, dated));
			}
		});

		const load = async () => {
			if (!api.readProjectConsoleErrors) {
				if (active) {
					setLoadError(true);
					setLoading(false);
				}
				return;
			}

			try {
				const saved = await api.readProjectConsoleErrors(selectedDate);
				if (active) {
					setRecordsDate(selectedDate);
					setRecords(mergeRecords([], recordsForDate(saved, selectedDate)));
				}
			} catch {
				if (active) setLoadError(true);
			} finally {
				if (active) setLoading(false);
			}
		};

		void load();
		return () => {
			active = false;
			unsubscribe?.();
		};
	}, [selectedDate]);

	const selectedDateLabel = new Intl.DateTimeFormat(undefined, {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(parseIsoDate(selectedDate) ?? new Date());
	const visibleRecords = recordsDate === selectedDate ? records : [];
	const readingSelectedDate = loading || recordsDate !== selectedDate;
	let content = (
		<div className="space-y-3">
			{visibleRecords.slice(0, 200).map((record) => (
				<ActivityErrorItem key={record.id} record={record} timeZone={timeZone} />
			))}
		</div>
	);
	if (readingSelectedDate) {
		content = <CaptionText>Reading saved errors…</CaptionText>;
	} else if (loadError) {
		content = (
			<section className="border border-app-line bg-app-panel p-5.5">
				<SectionTitle className="mb-1.5">Error log unavailable</SectionTitle>
				<CaptionText>Restart Project Monitor to enable the NDJSON error stream.</CaptionText>
			</section>
		);
	} else if (visibleRecords.length === 0) {
		content = (
			<section className="grid min-h-29 grid-cols-[52px_minmax(0,1fr)] items-center gap-5 border border-app-line bg-app-panel p-5.5 max-[720px]:grid-cols-[34px_1fr]">
				<MonoText>--</MonoText>
				<div>
					<SectionTitle className="mb-1.5">No errors for {selectedDateLabel}</SectionTitle>
					<CaptionText>No error log file exists for this date.</CaptionText>
				</div>
			</section>
		);
	}

	return (
		<div className="mx-auto w-full max-w-280 px-12 py-14 max-[720px]:px-5.5 max-[720px]:py-9.5">
			<header className="mb-8.5 flex items-end justify-between gap-6 max-[720px]:mb-8 max-[720px]:items-start max-[720px]:flex-col">
				<div className="max-w-170">
					<OverlineText className="mb-3.5 inline-block">Error log</OverlineText>
					<PageTitle>Activity</PageTitle>
					<BodyText className="mt-5.5">Review console errors captured from monitored projects.</BodyText>
					{logDirectory ? (
						<MonoText className="mt-3 block break-all text-[9px]">{logDirectory}</MonoText>
					) : null}
				</div>
				<DatePicker value={selectedDate} max={today} onChange={setSelectedDate} />
			</header>

			{content}
		</div>
	);
}
