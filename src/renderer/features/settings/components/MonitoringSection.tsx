import { useState } from "react";

import type { MonitorSettings } from "../../../../shared/project-monitor";
import { CaptionText, OverlineText, SectionTitle } from "../../../shared/typography";
import { useProjectMonitor } from "../../projects/project-context";
import { SettingRow, SettingSelect, SettingToggle } from "./SettingsControl";

const columnOptions = [
	{ value: "auto", label: "Auto" },
	{ value: "1", label: "1 column" },
	{ value: "2", label: "2 columns" },
	{ value: "3", label: "3 columns" },
] as const;

const scrollbackOptions = [
	{ value: "5000", label: "5,000 lines" },
	{ value: "10000", label: "10,000 lines" },
	{ value: "25000", label: "25,000 lines" },
	{ value: "50000", label: "50,000 lines" },
] as const;

const commandNotificationOptions = [
	{ value: "failures", label: "Failures only" },
	{ value: "all", label: "Every exit" },
	{ value: "off", label: "Off" },
] as const;

const stopTimeoutOptions = [
	{ value: "3", label: "3 seconds" },
	{ value: "5", label: "5 seconds" },
	{ value: "10", label: "10 seconds" },
	{ value: "30", label: "30 seconds" },
] as const;

export function MonitoringSection() {
	const { monitorSettings, updateMonitorSettings } = useProjectMonitor();
	const [error, setError] = useState("");
	const update = (changes: Partial<MonitorSettings>) => {
		setError("");
		void updateMonitorSettings(changes).catch(() => {
			setError("Monitor settings could not be saved. Try again.");
		});
	};

	return (
		<section
			className="mb-5.5 border border-app-line bg-app-panel"
			aria-labelledby="monitoring-title"
		>
			<header className="max-w-170 p-5.5 pb-4.5">
				<OverlineText className="mb-1.5 block text-[9px] tracking-[0.16em]">Monitoring</OverlineText>
				<SectionTitle id="monitoring-title" className="mb-1 text-base">
					Monitor wall
				</SectionTitle>
				<CaptionText>Choose how command panels behave while projects are running.</CaptionText>
			</header>

			<SettingRow
				id="default-monitor-columns"
				title="Default wall layout"
				description="Choose how many panel columns appear when the monitor opens."
			>
				<SettingSelect
					id="default-monitor-columns"
					defaultValue="auto"
					value={String(monitorSettings.defaultColumns)}
					onChange={(value) =>
						update({ defaultColumns: value === "auto" ? "auto" : (Number(value) as 1 | 2 | 3) })
					}
					options={columnOptions}
				/>
			</SettingRow>
			<SettingRow
				id="restore-monitor-wall"
				title="Restore monitor wall"
				description="Keep panel order, names, and sizes between sessions."
			>
				<SettingToggle
					id="restore-monitor-wall"
					checked={monitorSettings.restoreMonitorWall}
					onChange={(restoreMonitorWall) => update({ restoreMonitorWall })}
				/>
			</SettingRow>
			<SettingRow
				id="restart-previous-commands"
				title="Restart previous commands"
				description="Run commands from the restored monitor wall when the app opens."
			>
				<SettingToggle
					id="restart-previous-commands"
					checked={monitorSettings.restartPreviousCommands}
					onChange={(restartPreviousCommands) => update({ restartPreviousCommands })}
				/>
			</SettingRow>
			<SettingRow
				id="auto-scroll-terminal"
				title="Follow terminal output"
				description="Keep the latest command output in view until you scroll away."
			>
				<SettingToggle
					id="auto-scroll-terminal"
					checked={monitorSettings.autoScrollTerminal}
					onChange={(autoScrollTerminal) => update({ autoScrollTerminal })}
				/>
			</SettingRow>
			<SettingRow
				id="terminal-scrollback"
				title="Terminal history"
				description="Limit the output retained in each monitor panel."
			>
				<SettingSelect
					id="terminal-scrollback"
					defaultValue="10000"
					value={String(monitorSettings.terminalScrollback)}
					onChange={(value) => update({ terminalScrollback: Number(value) })}
					options={scrollbackOptions}
				/>
			</SettingRow>
			<SettingRow
				id="command-exit-notifications"
				title="Command exit notifications"
				description="Choose when a finished command should trigger a desktop notification."
			>
				<SettingSelect
					id="command-exit-notifications"
					defaultValue="failures"
					value={monitorSettings.commandExitNotifications}
					onChange={(commandExitNotifications) =>
						update({
							commandExitNotifications: commandExitNotifications as "failures" | "all" | "off",
						})
					}
					options={commandNotificationOptions}
				/>
			</SettingRow>
			<SettingRow
				id="restart-failed-commands"
				title="Restart failed commands"
				description="Start a command again when it exits with an error."
			>
				<SettingToggle
					id="restart-failed-commands"
					checked={monitorSettings.restartFailedCommands}
					onChange={(restartFailedCommands) => update({ restartFailedCommands })}
				/>
			</SettingRow>
			<SettingRow
				id="command-stop-timeout"
				title="Stop timeout"
				description="Wait this long before forcing an unresponsive command to stop."
			>
				<SettingSelect
					id="command-stop-timeout"
					defaultValue="5"
					value={String(monitorSettings.commandStopTimeout)}
					onChange={(value) => update({ commandStopTimeout: Number(value) })}
					options={stopTimeoutOptions}
				/>
			</SettingRow>
			{error ? (
				<CaptionText className="border-t border-app-line px-5.5 py-3 text-app-signal" role="status">
					{error}
				</CaptionText>
			) : null}
		</section>
	);
}
