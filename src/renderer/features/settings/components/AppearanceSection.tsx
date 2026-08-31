import { useAppTheme, type AppTheme } from "../../../app/app-theme";
import { CaptionText, OverlineText, SectionTitle } from "../../../shared/typography";
import { ThemeOptionCard } from "./ThemeOptionCard";

const themeOptions: {
	id: AppTheme;
	label: string;
	description: string;
}[] = [
	{
		id: "default",
		label: "Default",
		description: "Warm industrial neutrals with a focused orange signal.",
	},
	{
		id: "company",
		label: "Company",
		description: "Infinity plum with a precise warm-orange contrast.",
	},
	{
		id: "lazify",
		label: "Lazify",
		description: "Deep navy surfaces with a crisp emerald signal.",
	},
];

export function AppearanceSection() {
	const { theme, setTheme } = useAppTheme();

	return (
		<section className="mb-5.5 border border-app-line bg-app-panel p-5.5">
			<header className="max-w-140">
				<OverlineText className="mb-1.5 block text-[9px] tracking-[0.16em]">Appearance</OverlineText>
				<SectionTitle className="mb-1 text-base">Theme</SectionTitle>
				<CaptionText>Choose how Project Monitor looks on this device.</CaptionText>
			</header>

			<div className="mt-4.5 grid grid-cols-3 gap-3 max-[960px]:grid-cols-2 max-[720px]:grid-cols-1">
				{themeOptions.map((option) => (
					<ThemeOptionCard
						key={option.id}
						{...option}
						selected={theme === option.id}
						onSelect={setTheme}
					/>
				))}
			</div>
		</section>
	);
}
