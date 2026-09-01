import { CaretRightIcon as CaretRight } from "@phosphor-icons/react";
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
			{steps.map((step, index) => {
				let textColor = "text-app-muted/45";
				if (index === current) textColor = "text-app-accent-dark";
				else if (index < current) textColor = "text-app-ink/60";
				return (
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
								textColor,
							)}
						>
							{step}
						</CaptionText>
					</Fragment>
				);
			})}
		</div>
	);
}
