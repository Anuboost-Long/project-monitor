import {
	FolderOpenIcon as FolderOpen,
	PulseIcon as Pulse,
	TerminalWindowIcon as TerminalWindow,
	type Icon,
} from "@phosphor-icons/react";

import { appRoute } from "./app-routes";

export type AppPageId = "overview" | "projects" | "activity";

export interface AppPageLink {
	id: AppPageId;
	label: string;
	description: string;
	icon: Icon;
	path: string;
}

export const appPages: AppPageLink[] = [
	{
		id: "overview",
		label: "Monitor",
		description: "Live project commands",
		icon: TerminalWindow,
		path: appRoute.overview,
	},
	{
		id: "projects",
		label: "Projects",
		description: "Projects under observation",
		icon: FolderOpen,
		path: appRoute.projects,
	},
	{
		id: "activity",
		label: "Activity",
		description: "Recent project changes",
		icon: Pulse,
		path: appRoute.activity,
	},
];

export const settingsPage = {
	id: "settings",
	label: "Settings",
	description: "Monitoring preferences",
	path: appRoute.settings,
} as const;
