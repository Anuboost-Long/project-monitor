import "@xterm/xterm/css/xterm.css";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal, type ITheme } from "@xterm/xterm";
import { useEffect, useRef } from "react";

import type { MonitorPanel } from "../../projects/project-context";

interface ProjectTerminalProps {
	panel: MonitorPanel;
}

function readTheme(): ITheme {
	const style = getComputedStyle(document.documentElement);
	return {
		background: style.getPropertyValue("--terminal").trim(),
		foreground: style.getPropertyValue("--terminal-ink").trim(),
		cursor: style.getPropertyValue("--accent").trim(),
		selectionBackground: `${style.getPropertyValue("--accent").trim()}55`,
	};
}

export function ProjectTerminal({ panel }: Readonly<ProjectTerminalProps>) {
	const containerRef = useRef<HTMLDivElement>(null);
	const terminalRef = useRef<Terminal | null>(null);
	const writtenRef = useRef(panel.outputOffset);
	const active = panel.status === "running" || panel.status === "stopping";

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const terminal = new Terminal({
			allowProposedApi: false,
			convertEol: false,
			cursorBlink: true,
			disableStdin: !active,
			fontFamily: '"Kode Mono Variable", monospace',
			fontSize: 11,
			lineHeight: 1.25,
			scrollback: 5_000,
			theme: readTheme(),
		});
		const fit = new FitAddon();
		terminal.loadAddon(fit);
		terminal.open(container);
		terminalRef.current = terminal;
		terminal.write(panel.output);
		writtenRef.current = panel.outputOffset + panel.output.length;

		const fitTerminal = () => {
			try {
				fit.fit();
				window.projectMonitor.resizeProjectTerminal(panel.id, terminal.cols, terminal.rows);
			} catch {
				return;
			}
		};
		const frame = requestAnimationFrame(() => {
			fitTerminal();
			if (active) terminal.focus();
		});
		const resizeObserver = new ResizeObserver(fitTerminal);
		resizeObserver.observe(container);
		const themeObserver = new MutationObserver(() => {
			terminal.options.theme = readTheme();
		});
		themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-theme"],
		});
		const input = terminal.onData((data) => {
			if (active) window.projectMonitor.writeProjectTerminal(panel.id, data);
		});

		return () => {
			cancelAnimationFrame(frame);
			resizeObserver.disconnect();
			themeObserver.disconnect();
			input.dispose();
			terminal.dispose();
			terminalRef.current = null;
		};
	}, [panel.id]);

	useEffect(() => {
		const terminal = terminalRef.current;
		if (!terminal) return;

		const availableStart = panel.outputOffset;
		if (writtenRef.current < availableStart) {
			terminal.reset();
			terminal.write(panel.output);
		} else {
			terminal.write(panel.output.slice(writtenRef.current - availableStart));
		}
		writtenRef.current = availableStart + panel.output.length;
	}, [panel.output, panel.outputOffset]);

	useEffect(() => {
		const terminal = terminalRef.current;
		if (!terminal) return;
		terminal.options.disableStdin = !active;
		terminal.options.cursorBlink = active;
		if (active) terminal.focus();
	}, [active]);

	return <div ref={containerRef} className="h-full w-full p-2" />;
}
