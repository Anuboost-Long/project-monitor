import {
	ClipboardTextIcon as ClipboardText,
	PlusIcon as Plus,
	TrashIcon as Trash,
} from "@phosphor-icons/react";
import { clsx } from "clsx";
import { useEffect, useState } from "react";

import {
	createErrorWebhookBody,
	ERROR_WEBHOOK_CONTENT_TYPE,
	type ErrorWebhookHeader,
} from "../../../../shared/project-monitor";
import { CaptionText, MonoText, OverlineText, SectionTitle } from "../../../shared/typography";

interface HeaderRow extends ErrorWebhookHeader {
	id: string;
}

const inputClassName =
	"min-h-10 w-full rounded-sm border border-app-line bg-app-paper px-3 text-xs text-app-ink outline-none transition-colors placeholder:text-app-muted/60 focus:border-app-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-app-focus";

const sampleBody = JSON.stringify(
	createErrorWebhookBody({
		id: "run_abc123:error_a1b2c3d4",
		runId: "run_abc123",
		projectId: "project_123",
		projectName: "infinity_admin",
		projectPath: "/Users/administrator/Work/infinity_admin",
		command: "yarn dev",
		timestamp: "2026-08-28T09:30:15.420Z",
		message: "InputContainer is not defined",
		raw: "[browser] Uncaught ReferenceError: InputContainer is not defined\n    at /Users/administrator/Work/infinity_admin/src/app/inf/auth/sign-in/sign-in-content.tsx:7:8",
		source: "browser",
		routeType: "client",
		statusCode: 500,
	}),
	null,
	2,
);

function headerRow(header?: ErrorWebhookHeader): HeaderRow {
	return { ...(header ?? { name: "", value: "" }), id: globalThis.crypto.randomUUID() };
}

function validateHeaders(rows: HeaderRow[]) {
	const headers = rows
		.filter(({ name, value }) => name.trim() || value)
		.map(({ name, value }) => ({ name: name.trim(), value }));
	if (headers.some(({ name }) => !name)) return "Add a name for every header value.";
	if (headers.some(({ name }) => !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name))) {
		return "Header names can only contain standard HTTP header characters.";
	}
	if (headers.some(({ value }) => /[\r\n]/.test(value))) {
		return "Header values must stay on one line.";
	}
	if (new Set(headers.map(({ name }) => name.toLowerCase())).size !== headers.length) {
		return "Each header name must be unique.";
	}
	return headers;
}

export function ErrorWebhookSection() {
	const [url, setUrl] = useState("");
	const [headers, setHeaders] = useState<HeaderRow[]>(() => [headerRow()]);
	const [busy, setBusy] = useState(false);
	const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		let active = true;
		const load = async () => {
			try {
				const settings = await window.projectMonitor.getErrorWebhookSettings?.();
				if (!active || !settings) return;
				setUrl(settings.url);
				setHeaders(settings.headers.length ? settings.headers.map(headerRow) : [headerRow()]);
			} catch {
				if (active) setNotice({ error: true, text: "Webhook settings could not be loaded." });
			}
		};
		void load();
		return () => {
			active = false;
		};
	}, []);

	const updateHeader = (id: string, key: keyof ErrorWebhookHeader, value: string) => {
		setHeaders((current) =>
			current.map((header) => (header.id === id ? { ...header, [key]: value } : header)),
		);
	};

	const removeHeader = (id: string) => {
		setHeaders((current) => {
			const remaining = current.filter((header) => header.id !== id);
			return remaining.length ? remaining : [headerRow()];
		});
	};

	const save = async () => {
		if (!window.projectMonitor.saveErrorWebhookSettings) return;
		const trimmedUrl = url.trim();
		if (trimmedUrl) {
			try {
				const protocol = new URL(trimmedUrl).protocol;
				if (protocol !== "http:" && protocol !== "https:") {
					throw new Error("Webhook URL must use HTTP or HTTPS");
				}
			} catch {
				setNotice({ error: true, text: "Enter a complete HTTP or HTTPS endpoint URL." });
				return;
			}
		}

		const validatedHeaders = validateHeaders(headers);
		if (typeof validatedHeaders === "string") {
			setNotice({ error: true, text: validatedHeaders });
			return;
		}

		setBusy(true);
		setNotice(null);
		try {
			const settings = await window.projectMonitor.saveErrorWebhookSettings({
				url: trimmedUrl,
				headers: validatedHeaders,
			});
			setUrl(settings.url);
			setHeaders(settings.headers.length ? settings.headers.map(headerRow) : [headerRow()]);
			setNotice({ error: false, text: "Webhook settings saved." });
		} catch {
			setNotice({ error: true, text: "Webhook settings could not be saved." });
		} finally {
			setBusy(false);
		}
	};

	const copySample = async () => {
		try {
			await navigator.clipboard.writeText(sampleBody);
			setCopied(true);
		} catch {
			setNotice({ error: true, text: "The sample payload could not be copied." });
		}
	};

	return (
		<section className="mb-5.5 border border-app-line bg-app-panel" aria-labelledby="webhook-title">
			<header className="max-w-170 p-5.5 pb-4.5">
				<OverlineText className="mb-1.5 block text-[9px] tracking-[0.16em]">Webhook</OverlineText>
				<SectionTitle id="webhook-title" className="mb-1 text-base">
					Error notifications
				</SectionTitle>
				<CaptionText>
					Configure the endpoint and headers that will receive captured application errors.
				</CaptionText>
			</header>

			<div className="grid grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] border-t border-app-line max-[900px]:grid-cols-1">
				<div className="p-5.5 max-[900px]:border-b max-[900px]:border-app-line">
					<label htmlFor="webhook-url" className="mb-2 block text-xs font-bold text-app-ink">
						Endpoint URL
					</label>
					<input
						id="webhook-url"
						type="url"
						value={url}
						onChange={(event) => setUrl(event.target.value)}
						placeholder="https://example.com/hooks/project-errors"
						className={inputClassName}
						spellCheck={false}
					/>
					<CaptionText className="mt-2">
						Clear the URL to remove the endpoint. Only HTTP and HTTPS URLs are accepted.
					</CaptionText>

					<div className="mt-6 flex items-start justify-between gap-4 border-t border-app-line pt-5">
						<div>
							<SectionTitle as="h3" className="mb-1 text-xs">
								Request headers
							</SectionTitle>
							<CaptionText>
								Add values required by your endpoint. They are stored with app settings on this device.
							</CaptionText>
						</div>
						<button
							type="button"
							onClick={() => setHeaders((current) => [...current, headerRow()])}
							disabled={headers.length >= 24}
							className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-sm border border-app-line px-3 text-[10px] font-bold text-app-ink transition-colors hover:border-app-accent hover:text-app-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus disabled:opacity-50"
						>
							<Plus size={14} aria-hidden="true" />
							Add header
						</button>
					</div>

					<div className="mt-3.5 space-y-2.5">
						{headers.map((header, index) => (
							<div
								key={header.id}
								className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_40px] gap-2 max-[520px]:grid-cols-[1fr_40px]"
							>
								<label className="sr-only" htmlFor={`header-name-${header.id}`}>
									Header {index + 1} name
								</label>
								<input
									id={`header-name-${header.id}`}
									value={header.name}
									onChange={(event) => updateHeader(header.id, "name", event.target.value)}
									placeholder="Authorization"
									className={inputClassName}
									maxLength={100}
									spellCheck={false}
								/>
								<label className="sr-only" htmlFor={`header-value-${header.id}`}>
									Header {index + 1} value
								</label>
								<input
									id={`header-value-${header.id}`}
									value={header.value}
									onChange={(event) => updateHeader(header.id, "value", event.target.value)}
									placeholder="Bearer token"
									className={clsx(inputClassName, "max-[520px]:col-start-1")}
									maxLength={4000}
									spellCheck={false}
								/>
								<button
									type="button"
									onClick={() => removeHeader(header.id)}
									className="inline-flex min-h-10 items-center justify-center rounded-sm border border-app-line text-app-muted transition-colors hover:border-app-signal hover:text-app-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus max-[520px]:row-start-1"
									aria-label={`Remove header ${index + 1}`}
								>
									<Trash size={15} aria-hidden="true" />
								</button>
							</div>
						))}
					</div>

					<div className="mt-5 flex flex-wrap items-center gap-3 border-t border-app-line pt-5">
						<button
							type="button"
							disabled={busy || !window.projectMonitor.saveErrorWebhookSettings}
							onClick={() => void save()}
							className="inline-flex min-h-10 items-center rounded-sm bg-app-accent px-4 text-[10px] font-bold text-white transition-colors hover:bg-app-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus disabled:opacity-50"
						>
							{busy ? "Saving…" : "Save changes"}
						</button>
						{notice ? (
							<CaptionText
								className={notice.error ? "text-app-signal" : "text-app-accent-dark"}
								role="status"
							>
								{notice.text}
							</CaptionText>
						) : null}
					</div>
				</div>

				<div className="min-w-0 border-l border-app-line bg-app-paper max-[900px]:border-l-0">
					<div className="flex items-center justify-between gap-4 border-b border-app-line px-4 py-3">
						<div>
							<MonoText className="block text-[9px] tracking-[0.08em] text-app-accent-dark uppercase">
								Sample payload
							</MonoText>
							<CaptionText className="mt-0.5 text-[10px]">
								Content-Type: {ERROR_WEBHOOK_CONTENT_TYPE}
							</CaptionText>
						</div>
						<button
							type="button"
							onClick={() => void copySample()}
							className="inline-flex min-h-8 items-center gap-1.5 rounded-sm border border-app-line px-2.5 text-[9px] font-bold text-app-ink transition-colors hover:border-app-accent hover:text-app-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus"
						>
							<ClipboardText size={13} aria-hidden="true" />
							{copied ? "Copied" : "Copy JSON"}
						</button>
					</div>
					<pre className="max-h-150 overflow-auto p-4 font-mono text-[10px] leading-5 text-app-ink">
						<code>{sampleBody}</code>
					</pre>
				</div>
			</div>
		</section>
	);
}
