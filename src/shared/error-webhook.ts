import type { ProjectConsoleErrorRecord } from "./project-monitor";

export const ERROR_WEBHOOK_CONTENT_TYPE = "application/cloudevents+json";

export interface ErrorWebhookBody {
	spec_version: "1.0";
	id: string;
	source: "urn:project-monitor";
	type: "dev.project-monitor.error.detected";
	subject: string;
	time: string;
	data_content_type: "application/json";
	data: {
		schema_version: 1;
		project: {
			name: string;
			path: string;
		};
		run: {
			id: string;
			command: string;
		};
		error: {
			message: string;
			details: string;
			source: string;
			route_type: string;
			digest: string;
			status_code: number;
		};
	};
}

function zoneOffset(date: Date, timeZone: string) {
	const offset = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
		.formatToParts(date)
		.find((part) => part.type === "timeZoneName")
		?.value.replace("GMT", "");
	return offset || "Z";
}

/**
 * Renders an instant as an RFC 3339 timestamp in the chosen zone, keeping the
 * instant identical and moving only its representation.
 */
export function zonedTimestamp(timestamp: string, timeZone: string) {
	const date = new Date(timestamp);
	if (!timeZone || Number.isNaN(date.getTime())) return timestamp;

	try {
		const parts = new Intl.DateTimeFormat("en-US", {
			timeZone,
			hourCycle: "h23",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		}).formatToParts(date);
		const part = (type: Intl.DateTimeFormatPartTypes) =>
			parts.find((candidate) => candidate.type === type)?.value ?? "";
		const milliseconds = String(date.getUTCMilliseconds()).padStart(3, "0");
		return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}.${milliseconds}${zoneOffset(date, timeZone)}`;
	} catch {
		return timestamp;
	}
}

function redactProjectPath(value: string, projectPath: string, projectName: string) {
	let end = projectPath.length;
	while (end > 0 && (projectPath[end - 1] === "/" || projectPath[end - 1] === "\\")) end -= 1;
	const localPath = projectPath.slice(0, end);
	if (!localPath) return value;

	const normalizedPath = localPath.replaceAll("\\", "/");
	const privatePaths = [
		`file://${localPath}`,
		`file://${normalizedPath}`,
		`file:///${normalizedPath}`,
		localPath,
		normalizedPath,
	];
	return [...new Set(privatePaths)].reduce(
		(redacted, privatePath) => redacted.replaceAll(privatePath, projectName),
		value,
	);
}

export function createErrorWebhookBody(
	record: Readonly<ProjectConsoleErrorRecord>,
	timeZone = "",
): ErrorWebhookBody {
	const message = redactProjectPath(record.message, record.projectPath, record.projectName);
	const details = redactProjectPath(record.raw, record.projectPath, record.projectName);

	return {
		spec_version: "1.0",
		id: `${record.id}:${record.timestamp}`,
		source: "urn:project-monitor",
		type: "dev.project-monitor.error.detected",
		subject: `projects/${encodeURIComponent(record.projectName)}/runs/${encodeURIComponent(record.runId)}`,
		time: zonedTimestamp(record.timestamp, timeZone),
		data_content_type: "application/json",
		data: {
			schema_version: 1,
			project: {
				name: record.projectName,
				path: record.projectName,
			},
			run: {
				id: record.runId,
				command: record.command,
			},
			error: {
				message,
				details,
				source: record.source ?? "",
				route_type: record.routeType ?? "",
				digest: record.digest ?? "",
				status_code: record.statusCode ?? 0,
			},
		},
	};
}
