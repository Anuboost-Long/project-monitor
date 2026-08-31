import type { ProjectConsoleError } from "../shared/project-monitor";

const ANSI_ESCAPE = new RegExp(
	String.raw`\x1B(?:[@-_][0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1B\\))`,
	"g",
);
const ERROR_START =
	/^(?:\[(?:browser|client|server)\]\s*)?(?:[✖×⨯]\s*)?\[?(?:error(?:\s|:|-)|npm err!|module not found\b|(?:uncaught\s+)?(?:aggregate|eval|internal|module|range|reference|syntax|type|uri)error\b|failed to compile\b|build error\b|unhandled(?:promise)?rejection\b|uncaught exception\b|\w*err_[a-z_]+\b)/i;
const MAX_ERROR_LINES = 40;

function cleanTerminalOutput(output: string) {
	return output.replace(ANSI_ESCAPE, "").replaceAll("\r", "");
}

function stringValue(value: unknown) {
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function statusValue(value: unknown) {
	const status = typeof value === "number" ? value : Number(value);
	return Number.isInteger(status) && status >= 100 && status <= 599 ? status : undefined;
}

function shouldCaptureApiError(source: string | undefined, statusCode: number | undefined) {
	return source?.toLowerCase() !== "api" || statusCode === undefined || statusCode >= 500;
}

function statusFromText(value: string) {
	const match = value.match(
		/\b(?:http(?:\/\d(?:\.\d)?)?\s+|status(?:\s+code)?\s*[:=]?\s*)([1-5]\d{2})\b/i,
	);
	return statusValue(match?.[1]);
}

function errorSource(firstLine: string, digest: string | undefined) {
	const channel = firstLine.match(/^\[(browser|client|server)\]/i)?.[1].toLowerCase();
	if (channel === "client") return "browser";
	if (channel) return channel;
	return digest || /^[✖×⨯]/.test(firstLine) ? "next" : undefined;
}

function structuredError(line: string): ProjectConsoleError | null {
	if (!line.startsWith("{")) return null;

	try {
		const value = JSON.parse(line) as Record<string, unknown>;
		const error =
			typeof value.error === "object" && value.error !== null
				? (value.error as Record<string, unknown>)
				: undefined;
		const context =
			typeof value.context === "object" && value.context !== null
				? (value.context as Record<string, unknown>)
				: undefined;
		const response =
			typeof value.response === "object" && value.response !== null
				? (value.response as Record<string, unknown>)
				: undefined;
		const level = stringValue(value.level ?? value.severity)?.toLowerCase();
		const routeType = stringValue(value.routeType ?? context?.routeType);
		const source = stringValue(value.source);
		const statusCode = statusValue(value.statusCode ?? value.status ?? response?.status);
		if (!shouldCaptureApiError(source, statusCode)) return null;
		if (
			level !== "error" &&
			routeType !== "action" &&
			!(source?.toLowerCase() === "api" && statusCode)
		) {
			return null;
		}

		const message = stringValue(value.message ?? error?.message);
		if (!message) return null;
		const stack = stringValue(value.stack ?? error?.stack);
		const digest = stringValue(value.digest ?? error?.digest);
		return {
			message,
			raw: stack ?? message,
			source: source ?? (routeType ? "next" : undefined),
			routeType,
			digest,
			statusCode,
		};
	} catch {
		return null;
	}
}

export function extractConsoleErrors(output: string): ProjectConsoleError[] {
	const lines = cleanTerminalOutput(output).split("\n");
	const errors: ProjectConsoleError[] = [];

	for (let index = 0; index < lines.length; index += 1) {
		const firstLine = lines[index].trim();
		const parsed = structuredError(firstLine);
		if (parsed) {
			if (!errors.some((error) => error.raw === parsed.raw && error.digest === parsed.digest)) {
				errors.push(parsed);
			}
			continue;
		}
		if (!ERROR_START.test(firstLine)) continue;

		const block = [lines[index]];
		let emptyLines = 0;
		for (let next = index + 1; next < lines.length && block.length < MAX_ERROR_LINES; next += 1) {
			const line = lines[next];
			if (ERROR_START.test(line.trim()) || structuredError(line.trim())) break;

			emptyLines = line.trim() ? 0 : emptyLines + 1;
			if (emptyLines >= 2) break;
			block.push(line);
		}

		const raw = block.join("\n").trim();
		if (raw && !errors.some((error) => error.raw === raw)) {
			const digest = raw.match(/\bdigest:\s*["']?([^"'\s,}]+)/i)?.[1];
			const statusCode = statusFromText(raw);
			if (!shouldCaptureApiError(statusCode ? "api" : undefined, statusCode)) continue;
			errors.push({
				message: firstLine,
				raw,
				source: statusCode ? "api" : errorSource(firstLine, digest),
				routeType: /server action/i.test(raw) ? "action" : undefined,
				digest,
				statusCode,
			});
		}
	}

	return errors;
}
