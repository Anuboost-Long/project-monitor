import path from "node:path";

import { app, BrowserWindow, ipcMain } from "electron";
import started from "electron-squirrel-startup";

import { registerProjectMonitorIpc } from "./main/project-monitor-ipc";
import { closeSplash, showSplash } from "./main/splash";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
	app.quit();
}

registerProjectMonitorIpc();

// How long the window may keep painting after its content loads before it is
// shown anyway, in case the renderer never reports that it is ready.
const RENDERER_PAINT_GRACE = 2500;

const revealWindow = (window: BrowserWindow) => {
	if (window.isDestroyed() || window.isVisible()) return;

	void closeSplash().then(() => {
		if (window.isDestroyed()) return;
		window.show();
		window.focus();
	});
};

ipcMain.on("project-monitor:renderer-ready", (event) => {
	const window = BrowserWindow.fromWebContents(event.sender);
	if (window) revealWindow(window);
});

const createWindow = () => {
	// Create the browser window.
	const mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		minWidth: 720,
		minHeight: 520,
		show: false,
		backgroundColor: "#101714",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
		},
	});

	mainWindow.webContents.on("did-finish-load", () => {
		setTimeout(() => revealWindow(mainWindow), RENDERER_PAINT_GRACE);
	});
	mainWindow.webContents.on("did-fail-load", () => revealWindow(mainWindow));

	// and load the index.html of the app.
	if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
		mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
	} else {
		mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
	}

	if (!app.isPackaged) mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
	showSplash();
	createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (BrowserWindow.getAllWindows().length === 0) {
		showSplash();
		createWindow();
	}
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
