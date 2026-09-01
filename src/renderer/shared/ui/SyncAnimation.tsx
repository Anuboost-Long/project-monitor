import { CheckIcon as Check } from "@phosphor-icons/react";

interface SyncAnimationProps {
	label?: string;
	status: "syncing" | "done";
}

export function SyncAnimation({ label, status }: Readonly<SyncAnimationProps>) {
	return (
		<div className="flex flex-col items-center" aria-live="polite" aria-busy={status === "syncing"}>
			<div className="sync-visual" data-status={status} aria-hidden="true">
				<span className="sync-visual__scan" />
				<span className="sync-visual__track sync-visual__track--one">
					<i />
					<i />
					<i />
				</span>
				<span className="sync-visual__track sync-visual__track--two">
					<i />
					<i />
					<i />
				</span>
				<span className="sync-visual__track sync-visual__track--three">
					<i />
					<i />
					<i />
				</span>
				<Check className="sync-visual__check" size={38} weight="bold" />
			</div>
			<p className="mt-5 text-xs font-bold tracking-[0.14em] text-app-ink uppercase">
				{label ?? (status === "syncing" ? "Syncing" : "Done")}
			</p>
		</div>
	);
}
