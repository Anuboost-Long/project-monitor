import { create, isAxiosError, type AxiosRequestConfig } from "axios";

const API_TIMEOUT = 15_000;

export interface ApiRequestErrorDetails {
	code?: string;
	data?: unknown;
	isNetworkError: boolean;
	statusCode?: number;
}

export class ApiRequestError extends Error {
	readonly code?: string;
	readonly data?: unknown;
	readonly isNetworkError: boolean;
	readonly statusCode?: number;

	constructor(message: string, details: ApiRequestErrorDetails) {
		super(message);
		this.name = "ApiRequestError";
		this.code = details.code;
		this.data = details.data;
		this.isNetworkError = details.isNetworkError;
		this.statusCode = details.statusCode;
	}
}

export const apiClient = create({
	timeout: API_TIMEOUT,
	headers: {
		Accept: "application/json",
	},
});

function errorMessage(data: unknown, fallback: string) {
	if (typeof data === "string" && data.trim()) return data;
	if (typeof data !== "object" || data === null) return fallback;

	const message = Reflect.get(data, "message");
	return typeof message === "string" && message.trim() ? message : fallback;
}

export function toApiRequestError(error: unknown) {
	if (error instanceof ApiRequestError) return error;
	if (!isAxiosError(error)) {
		return new ApiRequestError(error instanceof Error ? error.message : "API request failed", {
			isNetworkError: false,
		});
	}

	return new ApiRequestError(errorMessage(error.response?.data, error.message), {
		code: error.code,
		data: error.response?.data,
		isNetworkError: !error.response,
		statusCode: error.response?.status,
	});
}

export async function apiRequest<TResponse = unknown, TData = unknown>(
	config: AxiosRequestConfig<TData>,
) {
	try {
		const response = await apiClient.request<TResponse>(config);
		return response.data;
	} catch (error) {
		throw toApiRequestError(error);
	}
}
