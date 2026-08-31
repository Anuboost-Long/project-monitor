export const appRoute = {
	root: "/",
	overview: "/overview",
	projects: "/projects",
	activity: "/activity",
	settings: "/settings",
} as const;

export const defaultAppRoute = appRoute.overview;
