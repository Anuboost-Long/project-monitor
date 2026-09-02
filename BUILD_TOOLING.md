# Build tooling

This project used to be built with **Electron Forge**. It now builds with
**plain Vite + electron-builder** — no wrapper framework around Electron.

The switch happened in commit `e448685` (2026-09-01).

## Why we left Forge

Forge bundles the dev server, the build step, and the installer makers behind
one CLI. That's convenient until one of the three needs to behave differently,
and then you're configuring Forge instead of configuring the tool.

Two things forced the move:

1. **`MakerWix` needed an external toolchain.** Building the Windows MSI
   required the WiX Toolset (`candle.exe` / `light.exe`) installed separately
   and on `PATH`. It wasn't, so `npm run make:win` simply failed on a clean
   machine.
2. **Native module rebuilds fought us.** `node-pty` was being rebuilt from
   source, which trips an unrelated bug in winpty's `GetCommitHash.bat`. Forge
   needed a `rebuildConfig` workaround to get around its own default.

electron-builder ships its own NSIS compiler, so Windows installers need no
external toolchain at all.

## What replaced what

| Concern              | Before (Forge)                        | Now                                                                   |
| -------------------- | ------------------------------------- | --------------------------------------------------------------------- |
| Dev orchestration    | `electron-forge start`                | `concurrently` + `wait-on` + `electronmon`                            |
| Renderer build       | Forge Vite plugin                     | `vite.renderer.config.mts`                                            |
| Main / preload build | Forge Vite plugin                     | `vite.main.config.ts`, `vite.preload.config.ts` (CJS library bundles) |
| Dev server URL       | Injected `MAIN_WINDOW_VITE_*` globals | `VITE_DEV_SERVER_URL` env var                                         |
| Packaging            | `@electron-forge/maker-*`             | `electron-builder`                                                    |
| Windows installer    | MakerWix → MSI                        | NSIS                                                                  |
| Windows shortcuts    | `electron-squirrel-startup`           | Handled by NSIS                                                       |
| Config               | `forge.config.ts`                     | `electron-builder.{mac,win,linux}.yml`                                |
| Build output         | `.vite/`, `out/`                      | `dist/`, `dist-electron/`, `release/`                                 |

## How the pieces fit now

**Development** — `npm run dev` runs four processes in parallel:

| Process        | Job                                                 |
| -------------- | --------------------------------------------------- |
| `dev:renderer` | Vite dev server on `http://localhost:5273`          |
| `dev:main`     | Vite watch build → `dist-electron/main.js`          |
| `dev:preload`  | Vite watch build → `dist-electron/preload.js`       |
| `dev:electron` | Waits for both bundles, then launches `electronmon` |

`dev:electron` blocks on `wait-on` because Electron can't start until the main
and preload bundles exist on disk. It passes `VITE_DEV_SERVER_URL` through
`cross-env`, and `src/main.ts` branches on it:

```ts
const devServerUrl = process.env.VITE_DEV_SERVER_URL;
if (devServerUrl) {
	mainWindow.loadURL(devServerUrl);
} else {
	mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
}
```

Under Forge this was a build-time injected global. It's now an ordinary env
var, which is why the app can also be launched with a bare `npm start`.

**Build** — `npm run build` runs the three Vite builds in sequence. Main and
preload are built as CJS library bundles with everything non-relative marked
external, so `electron`, Node builtins, and `node-pty` stay real `require()`
calls resolved at runtime rather than getting bundled into the output.

**Package** — `npm run package:{mac,win,linux}` builds, then runs
electron-builder against the matching YAML. Output lands in `release/<platform>/`.

## Things worth knowing

**Native modules are not rebuilt.** All three configs set `npmRebuild: false`
and unpack `node-pty` from asar. `node-pty` ships prebuilt N-API binaries that
are ABI-stable across Node and Electron versions, so rebuilding from source
gains nothing and reintroduces the winpty bug.

**macOS is ad-hoc signed.** There's no Developer ID certificate, so `identity`
is `null` and `src/scripts/mac-adhoc-sign.mjs` signs in `afterPack`. See the
comment in `electron-builder.mac.yml` for why auto-discovery is worse than
nothing here.

**Renderer uses a relative base.** `vite.renderer.config.mts` sets
`base: "./"` because the packaged `index.html` loads over `file://`, where
Vite's default root-absolute asset paths resolve against the filesystem root.

**Re-run `npm install` when the toolchain changes.** The Forge → electron-builder
swap replaced most of the dependency tree. A stale `node_modules` from before
the migration fails with `sh: concurrently: command not found`, because the
`dev` script now needs tools the old tree never installed.

## CI

`.github/workflows/build-desktop.yml` builds all three platforms on tag push or
manual dispatch, running `npm ci`, `npm run verify`, `npm run build`, then
`electron-builder --publish always` on Node 22.
