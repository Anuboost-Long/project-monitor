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
): ErrorWebhookBody {
	const message = redactProjectPath(record.message, record.projectPath, record.projectName);
	const details = redactProjectPath(record.raw, record.projectPath, record.projectName);

	return {
		spec_version: "1.0",
		id: `${record.id}:${record.timestamp}`,
		source: "urn:project-monitor",
		type: "dev.project-monitor.error.detected",
		subject: `projects/${encodeURIComponent(record.projectName)}/runs/${encodeURIComponent(record.runId)}`,
		time: record.timestamp,
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
