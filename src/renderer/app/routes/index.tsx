import { Navigate, Route, Routes } from "react-router-dom";

import { appRoute, defaultAppRoute } from "../app-routes";
import { AppShell } from "../AppShell";
import { ActivityRoute } from "./ActivityRoute";
import { OverviewRoute } from "./OverviewRoute";
import { ProjectsRoute } from "./ProjectsRoute";
import { SettingsRoute } from "./SettingsRoute";

export function AppRoutes() {
	return (
		<Routes>
			<Route path={appRoute.root} element={<AppShell />}>
				<Route index element={<Navigate to={defaultAppRoute} replace />} />
				<Route path={appRoute.overview.slice(1)} element={<OverviewRoute />} />
				<Route path={appRoute.projects.slice(1)} element={<ProjectsRoute />} />
				<Route path={appRoute.activity.slice(1)} element={<ActivityRoute />} />
				<Route path={appRoute.settings.slice(1)} element={<SettingsRoute />} />
				<Route path="*" element={<Navigate to={defaultAppRoute} replace />} />
			</Route>
		</Routes>
	);
}
