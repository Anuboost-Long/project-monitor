import { BrowserWindow } from "electron";

import markDark from "../../assets/icons/mark-dark.png?inline";

const WIDTH = 360;
const HEIGHT = 140;
const MINIMUM_VISIBLE = 900;
const FADE_STEP = 0.12;
const FADE_INTERVAL = 16;

// X11 without a compositor paints a transparent window's rounded corners solid
// black, so Linux gets the card's own background and square corners instead.
const TRANSPARENT = process.platform !== "linux";

let splashWindow: BrowserWindow | null = null;
let splashShownAt = 0;

function splashHtml() {
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
	* { margin: 0; padding: 0; box-sizing: border-box; }
	html, body {
		width: 100%;
		height: 100%;
		overflow: hidden;
		background: transparent;
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		user-select: none;
	}
	.card {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		width: 100%;
		height: 100%;
		padding: 20px 22px;
		border: 1px solid #29332f;
		border-radius: 10px;
		background-color: #101714;
		background-image:
			linear-gradient(rgba(242, 239, 229, 0.035) 1px, transparent 1px),
			linear-gradient(90deg, rgba(242, 239, 229, 0.035) 1px, transparent 1px);
		background-size: 22px 22px;
		animation: card-in 260ms ease-out both;
	}
	.brand { display: flex; align-items: center; gap: 13px; }
	.brand img { width: 46px; height: 46px; display: block; }
	.title {
		font-size: 13px;
		font-weight: 700;
		letter-spacing: 0.015em;
		color: #f2efe5;
	}
	.caption {
		margin-top: 3px;
		font-size: 9px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #798680;
	}
	.status {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 13px;
		border-top: 1px solid #29332f;
	}
	.step {
		font-size: 9px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #8f9a95;
	}
	.caret {
		display: inline-block;
		width: 6px;
		height: 9px;
		margin-left: 5px;
		vertical-align: -1px;
		background: #e4582b;
		animation: caret 1s steps(1) infinite;
	}
	.panes { display: flex; gap: 5px; }
	.panes i {
		width: 15px;
		height: 4px;
		background: #29332f;
		animation: pane 1.6s ease-in-out infinite;
	}
	.panes i:nth-child(2) { animation-delay: 200ms; }
	.panes i:nth-child(3) { animation-delay: 400ms; }
	.panes i:nth-child(4) { animation-delay: 600ms; }
	@keyframes card-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
	@keyframes caret { 0%, 50% { opacity: 1; } 50.01%, 100% { opacity: 0; } }
	@keyframes pane { 0%, 45%, 100% { background: #29332f; } 15%, 30% { background: #e4582b; } }
	@media (prefers-reduced-motion: reduce) {
		.card, .caret, .panes i { animation: none; }
		.panes i:nth-child(1), .panes i:nth-child(2) { background: #e4582b; }
	}
</style>
</head>
<body>
	<div class="card">
		<div class="brand">
			<img src="${markDark}" alt="" />
			<div>
				<div class="title">Project Monitor</div>
				<div class="caption">Operations desk</div>
			</div>
		</div>
		<div class="status">
			<span class="step">Starting monitor wall<i class="caret"></i></span>
			<span class="panes"><i></i><i></i><i></i><i></i></span>
		</div>
	</div>
</body>
</html>`;
}

export function showSplash() {
	if (splashWindow && !splashWindow.isDestroyed()) return splashWindow;

	const window = new BrowserWindow({
		width: WIDTH,
		height: HEIGHT,
		frame: false,
		transparent: TRANSPARENT,
		backgroundColor: TRANSPARENT ? "#00000000" : "#101714",
		resizable: false,
		movable: false,
		minimizable: false,
		maximizable: false,
		fullscreenable: false,
		skipTaskbar: true,
		center: true,
		alwaysOnTop: true,
		show: false,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			sandbox: true,
		},
	});

	window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml())}`);

	// Showing on first paint keeps the splash from flashing its own empty frame.
	window.once("ready-to-show", () => {
		if (window.isDestroyed()) return;
		splashShownAt = Date.now();
		window.show();
	});

	window.on("closed", () => {
		if (splashWindow === window) splashWindow = null;
	});

	splashWindow = window;
	return window;
}

function fadeOutSplash(window: BrowserWindow) {
	let opacity = 1;
	const fade = setInterval(() => {
		if (window.isDestroyed()) {
			clearInterval(fade);
			return;
		}

		opacity -= FADE_STEP;
		if (opacity > 0) {
			window.setOpacity(opacity);
			return;
		}

		clearInterval(fade);
		window.destroy();
	}, FADE_INTERVAL);
}

/** Resolves once the card starts fading, so the main window lands as it leaves. */
export function closeSplash() {
	const window = splashWindow;
	if (!window || window.isDestroyed()) {
		splashWindow = null;
		return Promise.resolve();
	}

	// Cleared up front so a second call cannot start a competing fade.
	splashWindow = null;

	// A card that appears and vanishes within a few frames reads as a glitch, so
	// a fast launch still leaves it on screen long enough to be seen.
	const shownFor = splashShownAt ? Date.now() - splashShownAt : MINIMUM_VISIBLE;

	return new Promise<void>((resolve) => {
		setTimeout(
			() => {
				fadeOutSplash(window);
				resolve();
			},
			Math.max(0, MINIMUM_VISIBLE - shownFor),
		);
	});
}
