import { clsx } from "clsx";
import { useEffect, useRef, useState, type ReactNode } from "react";

interface BaseModalProps {
	open: boolean;
	children: ReactNode;
	label: string;
	cancellable?: boolean;
	className?: string;
	onClose?: () => void;
}

const FADE_DURATION = 200;

export function BaseModal({
	open,
	children,
	label,
	cancellable = true,
	className,
	onClose,
}: Readonly<BaseModalProps>) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		let frame: number | undefined;
		let closeTimer: ReturnType<typeof setTimeout> | undefined;

		if (open) {
			if (!dialog.open) dialog.showModal();
			frame = requestAnimationFrame(() => setVisible(true));
		} else {
			setVisible(false);
			if (dialog.open) {
				const duration = globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches
					? 0
					: FADE_DURATION;
				closeTimer = setTimeout(() => dialog.close(), duration);
			}
		}

		return () => {
			if (frame !== undefined) cancelAnimationFrame(frame);
			if (closeTimer !== undefined) clearTimeout(closeTimer);
		};
	}, [open]);

	return (
		<dialog
			ref={dialogRef}
			aria-label={label}
			data-visible={visible}
			onCancel={(event) => {
				event.preventDefault();
				if (cancellable) onClose?.();
			}}
			className="base-modal fixed inset-0 m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-4 text-app-ink opacity-0 transition-opacity duration-200 ease-out open:flex open:items-center open:justify-center data-[visible=true]:opacity-100"
		>
			{cancellable ? (
				<button
					type="button"
					onClick={onClose}
					aria-label={`Close ${label}`}
					className="absolute inset-0 cursor-default border-0 bg-transparent p-0"
				/>
			) : null}
			<div className={clsx("relative border border-app-line bg-app-paper", className)}>{children}</div>
		</dialog>
	);
}
