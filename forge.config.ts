import { existsSync } from "node:fs";
import path from "node:path";

import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { AutoUnpackNativesPlugin } from "@electron-forge/plugin-auto-unpack-natives";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { PublisherGithub } from "@electron-forge/publisher-github";
import type { ForgeConfig } from "@electron-forge/shared-types";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

const macIcon = path.resolve("assets/icons/icon.icns");
const windowsIcon = path.resolve("assets/icons/icon.ico");
const macEntitlements = path.resolve("assets/entitlements.mac.plist");
let packageIcon: string | undefined;
if (process.platform === "darwin" && existsSync(macIcon)) packageIcon = macIcon;
if (process.platform === "win32" && existsSync(windowsIcon)) packageIcon = windowsIcon;
const notarizeMac =
	process.env.MAC_SIGN_IDENTITY &&
	process.env.APPLE_ID &&
	process.env.APPLE_APP_SPECIFIC_PASSWORD &&
	process.env.APPLE_TEAM_ID
		? {
				appleId: process.env.APPLE_ID,
				appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
				teamId: process.env.APPLE_TEAM_ID,
			}
		: undefined;
const signMac = process.env.MAC_SIGN_IDENTITY
	? {
			identity: process.env.MAC_SIGN_IDENTITY,
			optionsForFile: () => ({ entitlements: macEntitlements }),
			continueOnError: false,
		}
	: {
			identity: "-",
			identityValidation: false,
			preAutoEntitlements: false,
			optionsForFile: () => ({ entitlements: macEntitlements }),
			continueOnError: false,
		};
const windowsCertificate = process.env.WINDOWS_CERTIFICATE_FILE
	? {
			certificateFile: process.env.WINDOWS_CERTIFICATE_FILE,
			certificatePassword: process.env.WINDOWS_CERTIFICATE_PASSWORD,
		}
	: {};

const config: ForgeConfig = {
	packagerConfig: {
		appBundleId: "com.anuboost.project-monitor",
		appCategoryType: "public.app-category.developer-tools",
		appCopyright: `Copyright © ${new Date().getFullYear()} Ly kimlong`,
		asar: {
			// node-pty execs this helper binary rather than loading it, and a file
			// inside the asar archive cannot be executed. AutoUnpackNatives only
			// unpacks *.node, so the helper has to be named explicitly or every
			// terminal spawn fails with "posix_spawnp failed".
			unpack: "**/node_modules/node-pty/build/Release/spawn-helper",
		},
		darwinDarkModeSupport: true,
		executableName: "Project Monitor",
		icon: packageIcon,
		ignore: (file) =>
			Boolean(file) &&
			!file.startsWith("/.vite") &&
			file !== "/node_modules" &&
			!file.startsWith("/node_modules/node-pty"),
		osxSign: signMac,
		...(notarizeMac ? { osxNotarize: notarizeMac } : {}),
		win32metadata: {
			CompanyName: "Anuboost",
			FileDescription: "Local project command and error monitoring",
			InternalName: "Project Monitor",
			OriginalFilename: "Project Monitor.exe",
			ProductName: "Project Monitor",
			"requested-execution-level": "asInvoker",
		},
	},
	rebuildConfig: {},
	makers: [
		new MakerSquirrel(
			{
				name: "project_monitor",
				setupExe: "ProjectMonitorSetup.exe",
				...(existsSync(windowsIcon) ? { setupIcon: windowsIcon } : {}),
				...windowsCertificate,
			},
			["win32"],
		),
		new MakerDMG(
			{
				...(existsSync(macIcon) ? { icon: macIcon } : {}),
				additionalDMGOptions: { window: { size: { width: 540, height: 380 } } },
			},
			["darwin"],
		),
		new MakerZIP({}, ["darwin"]),
		new MakerRpm({}),
		new MakerDeb({}),
	],
	publishers: [
		new PublisherGithub({
			repository: { owner: "Anuboost-Long", name: "project-monitor" },
			draft: false,
		}),
	],
	plugins: [
		new AutoUnpackNativesPlugin({}),
		new VitePlugin({
			// `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
			// If you are familiar with Vite configuration, it will look really familiar.
			build: [
				{
					// `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
					entry: "src/main.ts",
					config: "vite.main.config.ts",
					target: "main",
				},
				{
					entry: "src/preload.ts",
					config: "vite.preload.config.ts",
					target: "preload",
				},
			],
			renderer: [
				{
					name: "main_window",
					config: "vite.renderer.config.mts",
				},
			],
		}),
		// Fuses are used to enable/disable various Electron functionality
		// at package time, before code signing the application
		new FusesPlugin({
			version: FuseVersion.V1,
			[FuseV1Options.RunAsNode]: false,
			[FuseV1Options.EnableCookieEncryption]: true,
			[FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
			[FuseV1Options.EnableNodeCliInspectArguments]: false,
			[FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
			[FuseV1Options.OnlyLoadAppFromAsar]: true,
		}),
	],
};

export default config;
