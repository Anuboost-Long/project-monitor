import { CaptionText, OverlineText, SectionTitle } from "../../../shared/typography";
import { SettingRow, SettingSelect, SettingToggle } from "./SettingsControl";

const retentionOptions = [
	{ value: "7", label: "7 days" },
	{ value: "30", label: "30 days" },
	{ value: "90", label: "90 days" },
	{ value: "forever", label: "Keep forever" },
] as const;

const recordLimitOptions = [
	{ value: "100", label: "100 records" },
	{ value: "200", label: "200 records" },
	{ value: "500", label: "500 records" },
] as const;

const projectCaptureOptions = [
	{ value: "all", label: "All projects" },
	{ value: "selected", label: "Selected projects" },
] as const;

const errorTypeOptions = [
	{ value: "all", label: "All error types" },
	{ value: "server", label: "Server errors" },
	{ value: "client", label: "Client errors" },
	{ value: "api", label: "API errors" },
] as const;

const webhookDeliveryOptions = [
	{ value: "immediate", label: "Immediately" },
	{ value: "5-minutes", label: "Every 5 minutes" },
	{ value: "15-minutes", label: "Every 15 minutes" },
] as const;

export function ActivitySection() {
	return (
		<section className="mb-5.5 border border-app-line bg-app-panel" aria-labelledby="activity-title">
			<header className="max-w-170 p-5.5 pb-4.5">
				<OverlineText className="mb-1.5 block text-[9px] tracking-[0.16em]">Activity</OverlineText>
				<SectionTitle id="activity-title" className="mb-1 text-base">
					Error activity
				</SectionTitle>
				<CaptionText>Control which errors are kept, displayed, and reported.</CaptionText>
			</header>

			<SettingRow
				id="activity-retention"
				title="Log retention"
				description="Remove saved error logs after the selected period."
			>
				<SettingSelect id="activity-retention" defaultValue="30" options={retentionOptions} />
			</SettingRow>
			<SettingRow
				id="activity-record-limit"
				title="Records per day"
				description="Limit how many saved errors appear for a selected date."
			>
				<SettingSelect id="activity-record-limit" defaultValue="200" options={recordLimitOptions} />
			</SettingRow>
			<SettingRow
				id="group-duplicate-errors"
				title="Group repeated errors"
				description="Combine matching errors and show how often each one occurred."
			>
				<SettingToggle id="group-duplicate-errors" defaultChecked />
			</SettingRow>
			<SettingRow
				id="captured-projects"
				title="Captured projects"
				description="Choose whether Activity records errors from every monitored project."
			>
				<SettingSelect id="captured-projects" defaultValue="all" options={projectCaptureOptions} />
			</SettingRow>
			<SettingRow
				id="captured-error-types"
				title="Captured error types"
				description="Limit Activity to client, server, or API errors."
			>
				<SettingSelect id="captured-error-types" defaultValue="all" options={errorTypeOptions} />
			</SettingRow>
			<SettingRow
				id="redact-sensitive-values"
				title="Hide sensitive values"
				description="Remove tokens, authorization values, and likely secrets before saving errors."
			>
				<SettingToggle id="redact-sensitive-values" defaultChecked />
			</SettingRow>
			<SettingRow
				id="new-error-notifications"
				title="New error notifications"
				description="Show a desktop notification when Activity captures a new error."
			>
				<SettingToggle id="new-error-notifications" defaultChecked />
			</SettingRow>
			<SettingRow
				id="webhook-delivery"
				title="Webhook delivery"
				description="Send captured errors immediately or collect them into a short digest."
			>
				<SettingSelect
					id="webhook-delivery"
					defaultValue="immediate"
					options={webhookDeliveryOptions}
				/>
			</SettingRow>
		</section>
	);
}
