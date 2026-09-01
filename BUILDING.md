# Building Project Monitor

Project Monitor packages with [electron-builder](https://www.electron.build/)
and must be built on the operating system being targeted. The GitHub Actions
workflow builds all three platforms on native runners.

## Requirements

- Node.js 22 LTS
- npm
- macOS with Xcode Command Line Tools for macOS builds
- Windows 10 or 11 for the NSIS installer build
- Linux (glibc-based) for the AppImage/deb build

No separate installer toolchain is required — electron-builder bundles its
own NSIS compiler on Windows, unlike the previous Electron Forge + WiX
Toolset setup, which needed `candle.exe`/`light.exe` installed separately.

Install the locked dependencies and verify the project:

```bash
npm ci
npm run verify
```

## Local artifacts

Build the installer for a platform:

```bash
npm run package:mac
npm run package:win
npm run package:linux
```

Each writes the finished installer to `release/<platform>`:

```text
release/mac/Project Monitor-arm64.dmg
release/win/Project Monitor-Setup-x64.exe
release/linux/Project Monitor-x64.AppImage
```

`package:mac` builds both `arm64` and `x64` targets — the app ships a
prebuilt `node-pty` binary, and node-pty's native module is
platform/architecture-specific, so a Windows or Linux build cannot be
produced on macOS (and vice versa) — the same reason the CI workflow gives
each platform its own runner.

## Development

```bash
npm run dev
```

Runs the Vite dev server for the renderer, watch-builds the main and
preload processes, and launches Electron against them (auto-restarting the
main process on change via `electronmon`).

## Application icons

The build uses the branded icons stored in `assets/icons`:

- `icon.icns` for macOS
- `icon.ico` for Windows and the NSIS installer
- `icon.png` for Linux and as the 1024 px master

These are the dark container artwork. The sidebar mark inside the application
uses `mark-dark.png` for the default theme and `mark-light.png` for the
company and lazify themes.

## macOS signing

Local and CI macOS builds are ad-hoc signed (see
`src/scripts/mac-adhoc-sign.mjs`), which is enough for the app to launch
under Gatekeeper's "unidentified developer" prompt. There is currently no
Developer ID Application certificate wired up for real signing or
notarization. To add one later, set electron-builder's standard signing
env vars (`CSC_LINK` pointing at a `.p12`, plus `CSC_KEY_PASSWORD`) and
`APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID` for
notarization, and drop the `identity: null` line from
`electron-builder.mac.yml`.

## Windows signing

Unsigned NSIS builds work without environment variables. To sign with a PFX
certificate, provide electron-builder's standard variables:

```text
CSC_LINK=C:\\secure\\project-monitor.pfx
CSC_KEY_PASSWORD=certificate-password
```

electron-builder signs the installer automatically when these are present —
no config changes needed.

## Automated builds

The `Build desktop apps` workflow runs for version tags such as `v1.0.0` and
can also be started manually from GitHub Actions. It builds macOS, Windows,
and Linux artifacts on their native runners and publishes them straight to
a GitHub release on this repository.
