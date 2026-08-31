import { clsx } from "clsx";
import {
	createElement,
	type ComponentPropsWithoutRef,
	type ElementType,
	type ReactNode,
} from "react";
import { twMerge } from "tailwind-merge";

type TypographyVariant = "pageTitle" | "sectionTitle" | "body" | "caption" | "overline" | "mono";

type TypographyOwnProps<TElement extends ElementType> = {
	as?: TElement;
	children: ReactNode;
	className?: string;
	variant: TypographyVariant;
};

type TypographyProps<TElement extends ElementType> = TypographyOwnProps<TElement> &
	Omit<ComponentPropsWithoutRef<TElement>, keyof TypographyOwnProps<TElement>>;

type TypographyShortcutProps = Omit<TypographyProps<ElementType>, "variant">;

const variantClassName: Record<TypographyVariant, string> = {
	pageTitle:
		"font-display text-[clamp(42px,6vw,72px)] leading-[1.02] font-medium tracking-[-0.025em] text-app-ink",
	sectionTitle: "text-sm font-bold text-app-ink",
	body: "text-sm leading-7 text-app-muted",
	caption: "text-xs leading-relaxed text-app-muted",
	overline: "text-[10px] font-extrabold tracking-[0.18em] text-app-accent-dark uppercase",
	mono: "font-mono text-xs font-bold text-app-signal",
};

function Typography<TElement extends ElementType = "p">({
	as,
	children,
	className,
	variant,
	...props
}: Readonly<TypographyProps<TElement>>) {
	return createElement(
		as ?? "p",
		{ className: twMerge(clsx(variantClassName[variant], className)), ...props },
		children,
	);
}

export function PageTitle({ as = "h1", children, ...props }: Readonly<TypographyShortcutProps>) {
	return (
		<Typography as={as} variant="pageTitle" {...props}>
			{children}
		</Typography>
	);
}

export function SectionTitle({ as = "h2", children, ...props }: Readonly<TypographyShortcutProps>) {
	return (
		<Typography as={as} variant="sectionTitle" {...props}>
			{children}
		</Typography>
	);
}

export function BodyText({ as = "p", children, ...props }: Readonly<TypographyShortcutProps>) {
	return (
		<Typography as={as} variant="body" {...props}>
			{children}
		</Typography>
	);
}

export function CaptionText({ as = "p", children, ...props }: Readonly<TypographyShortcutProps>) {
	return (
		<Typography as={as} variant="caption" {...props}>
			{children}
		</Typography>
	);
}

export function OverlineText({
	as = "span",
	children,
	...props
}: Readonly<TypographyShortcutProps>) {
	return (
		<Typography as={as} variant="overline" {...props}>
			{children}
		</Typography>
	);
}

export function MonoText({ as = "span", children, ...props }: Readonly<TypographyShortcutProps>) {
	return (
		<Typography as={as} variant="mono" {...props}>
			{children}
		</Typography>
	);
}
