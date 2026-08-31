import { ProjectMonitorProvider } from "../features/projects/project-context";
import { AppThemeProvider } from "./app-theme";
import { AppRouter } from "./router";

export function App() {
	return (
		<AppThemeProvider>
			<ProjectMonitorProvider>
				<AppRouter />
			</ProjectMonitorProvider>
		</AppThemeProvider>
	);
}
