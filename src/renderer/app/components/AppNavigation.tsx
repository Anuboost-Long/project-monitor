import { clsx } from "clsx";
import { NavLink } from "react-router-dom";

import { BodyText, OverlineText } from "../../shared/typography";
import { Tooltip } from "../../shared/ui/Tooltip";
import type { AppPageLink } from "../app-navigation";

interface AppNavigationProps {
	collapsed: boolean;
	pages: AppPageLink[];
}

export function AppNavigation({ collapsed, pages }: Readonly<AppNavigationProps>) {
	return (
		<nav
			className={clsx(
				"flex flex-1 flex-col gap-1 p-3 pt-6",
				"max-[720px]:flex-row max-[720px]:gap-0 max-[720px]:overflow-x-auto max-[720px]:p-2.5 max-[720px]:pt-0",
				collapsed && "items-center",
			)}
			aria-label="Main navigation"
		>
			{!collapsed ? (
				<OverlineText className="mx-2.5 mb-2.5 text-[9px] text-app-sidebar-label max-[720px]:hidden">
					Monitor
				</OverlineText>
			) : null}
			{pages.map((page) => (
				<Tooltip key={page.id} label={collapsed ? page.label : undefined} position="right">
					<NavLink
						to={page.path}
						aria-label={collapsed ? page.label : undefined}
						className={({ isActive }) =>
							clsx(
								"group grid min-h-10.5 items-center border-l-2 border-transparent",
								"text-app-sidebar-muted no-underline transition-colors duration-150",
								"hover:bg-app-sidebar-hover hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus",
								"max-[720px]:min-h-9.5 max-[720px]:min-w-max max-[720px]:grid-cols-1 max-[720px]:border-b-2 max-[720px]:border-l-0 max-[720px]:px-3.5",
								collapsed ? "size-10.5 place-items-center px-0" : "w-full grid-cols-[28px_1fr] px-2.5",
								isActive &&
									"border-app-accent bg-app-sidebar-active text-white max-[720px]:border-b-app-accent",
							)
						}
					>
						{({ isActive }) => (
							<>
								<page.icon
									size={17}
									weight={isActive ? "fill" : "regular"}
									className="text-app-sidebar-index group-aria-[current=page]:text-app-signal"
									aria-hidden="true"
								/>
								{!collapsed ? (
									<BodyText as="span" className="text-inherit">
										{page.label}
									</BodyText>
								) : null}
							</>
						)}
					</NavLink>
				</Tooltip>
			))}
		</nav>
	);
}
