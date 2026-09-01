import { clsx } from "clsx";
import { useState } from "react";

import { BodyText, OverlineText, PageTitle } from "../../../shared/typography";
import { ActivitySection } from "../components/ActivitySection";
import { AppearanceSection } from "../components/AppearanceSection";
import { ErrorLogSection } from "../components/ErrorLogSection";
import { ErrorWebhookSection } from "../components/ErrorWebhookSection";
import { MonitoringSection } from "../components/MonitoringSection";

const settingsSections = [
	{
		id: "appearance",
		label: "Appearance",
		description: "Choose the workspace theme.",
		component: AppearanceSection,
	},
	{
		id: "monitoring",
		label: "Monitor wall",
		description: "Control panels and commands.",
		component: MonitoringSection,
	},
	{
		id: "activity",
		label: "Activity",
		description: "Manage captured errors.",
		component: ActivitySection,
	},
	{
		id: "error-logs",
		label: "Error logs",
		description: "Choose where logs are stored.",
		component: ErrorLogSection,
	},
	{
		id: "webhook",
		label: "Webhook",
		description: "Send errors to an endpoint.",
		component: ErrorWebhookSection,
	},
] as const;

type SettingsSectionId = (typeof settingsSections)[number]["id"];

export function SettingsPage() {
	const [activeSection, setActiveSection] = useState<SettingsSectionId>("appearance");

	return (
		<div className="mx-auto w-full max-w-280 px-12 py-14 max-[720px]:px-5.5 max-[720px]:py-9.5">
			<header className="mb-8.5 max-w-170 max-[720px]:mb-8">
				<OverlineText className="mb-3.5 inline-block">Application setup</OverlineText>
				<PageTitle>Settings</PageTitle>
				<BodyText className="mt-5.5">
					Personalize the workspace and configure project monitoring.
				</BodyText>
			</header>

			<div className="grid grid-cols-[190px_minmax(0,1fr)] items-start gap-7 max-[1100px]:grid-cols-1 max-[1100px]:gap-5">
				<nav
					aria-label="Settings sections"
					className="sticky top-6 border-y border-app-line max-[1100px]:static max-[1100px]:overflow-x-auto"
				>
					<div className="max-[1100px]:flex max-[1100px]:min-w-max">
						{settingsSections.map(({ description, id, label }) => (
							<button
								key={id}
								type="button"
								onClick={() => setActiveSection(id)}
								aria-controls={`settings-${id}`}
								aria-current={activeSection === id ? "page" : undefined}
								className={clsx(
									"block w-full border-b border-app-line px-3.5 py-3.5 text-left last:border-b-0",
									"transition-colors hover:bg-app-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-focus",
									"max-[1100px]:w-42 max-[1100px]:shrink-0 max-[1100px]:border-r max-[1100px]:border-b-0 max-[1100px]:last:border-r-0",
									activeSection === id && "bg-app-soft shadow-[inset_3px_0_0_var(--accent)]",
								)}
							>
								<span className="block text-[11px] font-bold text-app-ink">{label}</span>
								<span className="mt-1 block text-[9px] leading-4 text-app-muted">{description}</span>
							</button>
						))}
					</div>
				</nav>

				<div className="min-w-0">
					{settingsSections.map(({ component: Section, id }) => (
						<div key={id} id={`settings-${id}`} hidden={activeSection !== id}>
							<Section />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
