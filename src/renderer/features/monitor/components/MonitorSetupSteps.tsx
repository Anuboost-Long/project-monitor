import { CaretRight } from "@phosphor-icons/react";
import { clsx } from "clsx";
import { Fragment } from "react";

import { CaptionText } from "../../../shared/typography";

interface MonitorSetupStepsProps {
	current: number;
	steps: string[];
}

export function MonitorSetupSteps({ current, steps }: Readonly<MonitorSetupStepsProps>) {
	return (
		<div className="flex items-center gap-1.5">
			{steps.map((step, index) => (
				<Fragment key={step}>
					{index > 0 ? (
						<CaretRight
							size={11}
							weight="regular"
							className="shrink-0 text-app-muted/45"
							aria-hidden="true"
						/>
					) : null}
					<CaptionText
						as="span"
						className={clsx(
							"text-[9px] font-bold tracking-[0.13em] uppercase transition-colors",
							index === current
								? "text-app-accent-dark"
								: index < current
									? "text-app-ink/60"
									: "text-app-muted/45",
						)}
					>
						{step}
					</CaptionText>
				</Fragment>
			))}
		</div>
	);
}
