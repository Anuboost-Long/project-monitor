import { CaretLeft, GearSix } from "@phosphor-icons/react";
import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { CaptionText, OverlineText, SectionTitle } from "../shared/typography";
import { appPages, settingsPage } from "./app-navigation";
import { AppNavigation } from "./components/AppNavigation";

export function AppShell() {
	const location = useLocation();
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
				"grid h-screen overflow-hidden bg-app-paper bg-app-grid text-app-ink [background-size:32px_32px]",
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
					<button
						type="button"
						onClick={() => {
							if (!sidebarOpen) setSidebarOpen(true);
						}}
						className="grid size-9.5 shrink-0 place-items-center rounded-lg bg-app-brand font-display text-[13px] font-extrabold tracking-[-0.04em] text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus"
						aria-label={sidebarOpen ? undefined : "Expand sidebar"}
						title={sidebarOpen ? undefined : "Expand sidebar"}
					>
						PM
					</button>
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
					<button
						type="button"
						onClick={() => setSidebarOpen(false)}
						className="absolute top-7.5 right-0 z-10 grid size-7 translate-x-1/2 place-items-center rounded-full border border-app-sidebar-line bg-app-sidebar text-app-sidebar-muted transition-colors hover:border-app-accent hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus"
						aria-label="Collapse sidebar"
						title="Collapse sidebar"
					>
						<CaretLeft size={13} weight="bold" aria-hidden="true" />
					</button>
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
							<OverlineText as="span" className="text-[10px] tracking-[0.05em] text-app-sidebar-status">
								Ready to monitor
							</OverlineText>
						</span>
					) : null}
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
						title="Settings"
					>
						{({ isActive }) => (
							<GearSix size={16} weight={isActive ? "fill" : "regular"} aria-hidden="true" />
						)}
					</NavLink>
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
