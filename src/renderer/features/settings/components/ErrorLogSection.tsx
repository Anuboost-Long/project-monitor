import { FolderOpen, FolderSimplePlus } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { CaptionText, MonoText, OverlineText, SectionTitle } from "../../../shared/typography";

export function ErrorLogSection() {
	const [directory, setDirectory] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		let active = true;
		const load = async () => {
			try {
				const value = await window.projectMonitor.getProjectConsoleErrorLogDirectory?.();
				if (active && value) setDirectory(value);
			} catch {
				if (active) setError("The error log folder could not be loaded.");
			}
		};
		void load();
		return () => {
			active = false;
		};
	}, []);

	const chooseDirectory = async () => {
		if (!window.projectMonitor.chooseProjectConsoleErrorLogDirectory) return;
		setBusy(true);
		setError("");
		try {
			const value = await window.projectMonitor.chooseProjectConsoleErrorLogDirectory();
			if (value) setDirectory(value);
		} catch {
			setError("The selected folder could not be saved.");
		} finally {
			setBusy(false);
		}
	};

	const openDirectory = async () => {
		if (!window.projectMonitor.openProjectConsoleErrorLogDirectory) return;
		setBusy(true);
		setError("");
		try {
			await window.projectMonitor.openProjectConsoleErrorLogDirectory();
		} catch {
			setError("The error log folder could not be opened.");
		} finally {
			setBusy(false);
		}
	};

	return (
		<section className="mb-5.5 border border-app-line bg-app-panel p-5.5">
			<header className="max-w-160">
				<OverlineText className="mb-1.5 block text-[9px] tracking-[0.16em]">Storage</OverlineText>
				<SectionTitle className="mb-1 text-base">Error logs</SectionTitle>
				<CaptionText>
					Console errors are stored as one NDJSON file per day. Activity reads from this folder.
				</CaptionText>
			</header>

			<div className="mt-4.5 border border-app-line bg-app-paper p-4">
				<CaptionText className="mb-1.5">Current folder</CaptionText>
				<MonoText className="block break-all text-[10px] text-app-ink">
					{directory || "Loading folder…"}
				</MonoText>
				<div className="mt-4 flex flex-wrap gap-2.5">
					<button
						type="button"
						disabled={busy || !window.projectMonitor.chooseProjectConsoleErrorLogDirectory}
						onClick={() => void chooseDirectory()}
						className="inline-flex min-h-9.5 items-center gap-2 rounded-sm bg-app-accent px-3.5 text-[10px] font-bold text-white transition-colors hover:bg-app-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus disabled:cursor-not-allowed disabled:opacity-50"
					>
						<FolderSimplePlus size={15} aria-hidden="true" />
						Choose folder
					</button>
					<button
						type="button"
						disabled={busy || !window.projectMonitor.openProjectConsoleErrorLogDirectory}
						onClick={() => void openDirectory()}
						className="inline-flex min-h-9.5 items-center gap-2 rounded-sm border border-app-line px-3.5 text-[10px] font-bold text-app-ink transition-colors hover:border-app-accent hover:text-app-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus disabled:cursor-not-allowed disabled:opacity-50"
					>
						<FolderOpen size={15} aria-hidden="true" />
						Open folder
					</button>
				</div>
				{error ? (
					<CaptionText className="mt-3 text-app-signal" role="status">
						{error}
					</CaptionText>
				) : null}
			</div>
		</section>
	);
}
