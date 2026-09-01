import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AppTheme = "default" | "company" | "lazify";

interface AppThemeValue {
	theme: AppTheme;
	setTheme: (theme: AppTheme) => void;
}

const themeStorageKey = "project-monitor-theme";
const AppThemeContext = createContext<AppThemeValue | null>(null);

export function getAppTheme(): AppTheme {
	const storedTheme = globalThis.localStorage.getItem(themeStorageKey);

	return storedTheme === "company" || storedTheme === "lazify" ? storedTheme : "default";
}

export function applyAppTheme(theme: AppTheme) {
	document.documentElement.dataset.theme = theme;
	globalThis.localStorage.setItem(themeStorageKey, theme);
}

export function AppThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
	const [theme, setTheme] = useState(getAppTheme);

	useEffect(() => {
		applyAppTheme(theme);
	}, [theme]);
	const value = useMemo(() => ({ theme, setTheme }), [theme]);

	return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
	const theme = useContext(AppThemeContext);

	if (!theme) {
		throw new Error("useAppTheme must be used within AppThemeProvider");
	}

	return theme;
}
