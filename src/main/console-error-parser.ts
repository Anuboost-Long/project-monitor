import type { ProjectConsoleError } from "../shared/project-monitor";

const ESCAPE = String.fromCodePoint(27);
const BELL = String.fromCodePoint(7);
const ANSI_CONTROL_SEQUENCE = /^[@-_][0-?]*[ -/]*[@-~]/;
const ERROR_PREFIX = /^(?:\[(?:browser|client|server)\]\s*)?(?:[✖×⨯]\s*)?\[?/i;
const ERROR_START = [
	/^(?:error(?:\s|:|-)|npm err!|module not found\b)/i,
	/^(?:uncaught\s+)?(?:aggregate|eval|internal|module|range|reference|syntax|type|uri)error\b/i,
	/^(?:failed to compile|build error|unhandled(?:promise)?rejection|uncaught exception)\b/i,
	/^\w*err_[a-z_]+\b/i,
];
const MAX_ERROR_LINES = 40;

function cleanTerminalOutput(output: string) {
	let cleaned = "";
	let index = 0;
	while (index < output.length) {
		if (output[index] !== ESCAPE) {
			cleaned += output[index];
			index += 1;
			continue;
		}

		const remainder = output.slice(index + 1);
		const controlSequence = ANSI_CONTROL_SEQUENCE.exec(remainder)?.[0];
		if (controlSequence) {
			index += controlSequence.length + 1;
			continue;
		}

		if (remainder.startsWith("]")) {
			const bellEnd = remainder.indexOf(BELL, 1);
			const escapeEnd = remainder.lastIndexOf(`${ESCAPE}\\`);
			const end = bellEnd >= 0 ? bellEnd : escapeEnd;
			if (end >= 0) {
				index += end + (end === bellEnd ? 2 : 3);
				continue;
			}
		}

		cleaned += output[index];
		index += 1;
	}
	return cleaned.replaceAll("\r", "");
}

function startsError(line: string) {
	const value = line.replace(ERROR_PREFIX, "");
	return ERROR_START.some((pattern) => pattern.test(value));
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
	const httpStatus = /\bhttp(?:\/\d(?:\.\d)?)?\s+([1-5]\d{2})\b/i.exec(value);
	if (httpStatus) return statusValue(httpStatus[1]);
	return statusValue(/\bstatus(?:\s+code)?\s*[:=]?\s*([1-5]\d{2})\b/i.exec(value)?.[1]);
}

function errorSource(firstLine: string, digest: string | undefined) {
	const channel = /^\[(browser|client|server)\]/i.exec(firstLine)?.[1].toLowerCase();
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

function errorBlock(lines: string[], index: number) {
	const block = [lines[index]];
	let emptyLines = 0;
	for (let next = index + 1; next < lines.length && block.length < MAX_ERROR_LINES; next += 1) {
		const line = lines[next];
		if (startsError(line.trim()) || structuredError(line.trim())) break;

		emptyLines = line.trim() ? 0 : emptyLines + 1;
		if (emptyLines >= 2) break;
		block.push(line);
	}
	return block.join("\n").trim();
}

function unstructuredError(lines: string[], index: number): ProjectConsoleError | null {
	const firstLine = lines[index].trim();
	if (!startsError(firstLine)) return null;

	const raw = errorBlock(lines, index);
	if (!raw) return null;
	const digest = /\bdigest:\s*["']?([^"'\s,}]+)/i.exec(raw)?.[1];
	const statusCode = statusFromText(raw);
	if (!shouldCaptureApiError(statusCode ? "api" : undefined, statusCode)) return null;
	return {
		message: firstLine,
		raw,
		source: statusCode ? "api" : errorSource(firstLine, digest),
		routeType: /server action/i.test(raw) ? "action" : undefined,
		digest,
		statusCode,
	};
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
		const error = unstructuredError(lines, index);
		if (error && !errors.some((candidate) => candidate.raw === error.raw)) errors.push(error);
	}

	return errors;
}
