import { CaretLeftIcon as CaretLeft, GearSixIcon as GearSix } from "@phosphor-icons/react";
import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import markDark from "../../../assets/icons/mark-dark.png";
import markLight from "../../../assets/icons/mark-light.png";
import { CaptionText, OverlineText, SectionTitle } from "../shared/typography";
import { Tooltip } from "../shared/ui/Tooltip";
import { appPages, settingsPage } from "./app-navigation";
import { useAppTheme } from "./app-theme";
import { AppNavigation } from "./components/AppNavigation";

export function AppShell() {
	const location = useLocation();
	const { theme } = useAppTheme();
	const [sidebarOpen, setSidebarOpen] = useState(
		() => globalThis.localStorage.getItem("project-monitor-sidebar-open") !== "false",
	);
	const activePage =
		[...appPages, settingsPage].find(
			(page) =>
				location.pathname === page.path ||
				(page.path !== "/" && location.pathname.startsWith(`${page.path}/`)),
		) ?? appPages[0];

	useEffect(() => {
		globalThis.localStorage.setItem("project-monitor-sidebar-open", String(sidebarOpen));
	}, [sidebarOpen]);

	return (
		<main
			className={clsx(
				"grid h-screen overflow-hidden bg-app-paper bg-app-grid bg-size-[32px_32px] text-app-ink",
				"transition-[grid-template-columns] duration-200 ease-out",
				"max-[720px]:grid-cols-1 max-[720px]:grid-rows-[auto_minmax(0,1fr)]",
				sidebarOpen ? "grid-cols-[280px_minmax(0,1fr)]" : "grid-cols-[72px_minmax(0,1fr)]",
			)}
		>
			<aside className="relative flex h-full min-h-0 flex-col border-r border-app-sidebar-border bg-app-sidebar text-app-sidebar-text">
				<header
					className={clsx(
						"flex min-h-22 items-center border-b border-app-sidebar-line max-[720px]:min-h-16",
						sidebarOpen ? "gap-3 p-4.5" : "justify-center p-3",
					)}
				>
					<Tooltip label={sidebarOpen ? undefined : "Expand sidebar"} position="right">
						<button
							type="button"
							onClick={() => {
								if (!sidebarOpen) setSidebarOpen(true);
							}}
							className="grid size-9.5 shrink-0 place-items-center overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus"
							aria-label={sidebarOpen ? undefined : "Expand sidebar"}
						>
							<img
								src={theme === "default" ? markDark : markLight}
								alt="Project Monitor"
								className="size-full"
							/>
						</button>
					</Tooltip>
					{sidebarOpen ? (
						<span className="min-w-0 flex-1">
							<SectionTitle as="strong" className="block text-[13px] tracking-[0.015em] text-inherit">
								Project Monitor
							</SectionTitle>
							<CaptionText
								as="small"
								className="mt-0.5 block text-[10px] tracking-[0.08em] text-app-sidebar-brand-muted uppercase max-[720px]:hidden"
							>
								Operations desk
							</CaptionText>
						</span>
					) : null}
				</header>
				{sidebarOpen ? (
					<Tooltip
						label="Collapse sidebar"
						position="right"
						className="absolute top-7.5 right-0 z-10 translate-x-1/2"
					>
						<button
							type="button"
							onClick={() => setSidebarOpen(false)}
							className="grid size-7 place-items-center rounded-full border border-app-sidebar-line bg-app-sidebar text-app-sidebar-muted transition-colors hover:border-app-accent hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus"
							aria-label="Collapse sidebar"
						>
							<CaretLeft size={13} weight="bold" aria-hidden="true" />
						</button>
					</Tooltip>
				) : null}

				<AppNavigation collapsed={!sidebarOpen} pages={appPages} />

				<footer
					className={clsx(
						"flex min-h-13 items-center gap-2 border-t border-app-sidebar-line px-3 max-[720px]:min-h-11 max-[720px]:border-t-0",
						sidebarOpen ? "justify-between max-[720px]:justify-end" : "justify-center",
					)}
				>
					{sidebarOpen ? (
						<span className="flex items-center gap-2 pl-2 max-[720px]:hidden">
							<span
								className="size-1.5 rounded-full bg-app-ready shadow-[0_0_0_3px_var(--ready-ring)]"
								aria-hidden="true"
							/>
							<OverlineText as="span" className="text-[10px] tracking-wider text-app-sidebar-status">
								Ready to monitor
							</OverlineText>
						</span>
					) : null}
					<Tooltip label="Settings" position="right">
						<NavLink
							to={settingsPage.path}
							className={({ isActive }) =>
								clsx(
									"grid size-9 shrink-0 place-items-center rounded-md border border-app-sidebar-line",
									"text-app-sidebar-muted transition-colors duration-150",
									"hover:border-app-accent hover:bg-app-sidebar-hover hover:text-white",
									"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus",
									isActive && "border-app-accent bg-app-sidebar-active text-white",
								)
							}
							aria-label="Settings"
						>
							{({ isActive }) => (
								<GearSix size={16} weight={isActive ? "fill" : "regular"} aria-hidden="true" />
							)}
						</NavLink>
					</Tooltip>
				</footer>
			</aside>

			<section className="flex h-full min-h-0 min-w-0 flex-col">
				<header className="flex min-h-12 items-center gap-3.5 border-b border-app-line bg-app-header px-7">
					<div className="flex min-w-0 items-center gap-3.5">
						<SectionTitle as="span" className="text-xs">
							{activePage.label}
						</SectionTitle>
						<CaptionText as="small" className="truncate text-[11px] max-[720px]:hidden">
							{activePage.description}
						</CaptionText>
					</div>
				</header>

				<div className="min-h-0 flex-1 overflow-y-auto">
					<Outlet />
				</div>
			</section>
		</main>
	);
}
