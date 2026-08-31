import { BodyText, OverlineText, PageTitle } from "../../../shared/typography";
import { ActivitySection } from "../components/ActivitySection";
import { AppearanceSection } from "../components/AppearanceSection";
import { ErrorLogSection } from "../components/ErrorLogSection";
import { ErrorWebhookSection } from "../components/ErrorWebhookSection";
import { MonitoringSection } from "../components/MonitoringSection";

export function SettingsPage() {
	return (
		<div className="mx-auto w-full max-w-280 px-12 py-14 max-[720px]:px-5.5 max-[720px]:py-9.5">
			<header className="mb-8.5 max-w-170 max-[720px]:mb-8">
				<OverlineText className="mb-3.5 inline-block">Application setup</OverlineText>
				<PageTitle>Settings</PageTitle>
				<BodyText className="mt-5.5">
					Personalize the workspace and configure project monitoring.
				</BodyText>
			</header>

			<AppearanceSection />
			<MonitoringSection />
			<ActivitySection />
			<ErrorLogSection />
			<ErrorWebhookSection />
		</div>
	);
}
