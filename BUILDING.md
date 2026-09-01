# Building Project Monitor

Project Monitor uses Electron Forge and must be built on the operating system being targeted. The GitHub Actions workflow builds both platforms on native runners.

## Requirements

- Node.js 22 LTS
- npm
- macOS with Xcode Command Line Tools for macOS builds
- Windows 10 or 11 for Squirrel.Windows builds

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
```

Each writes the finished installer to `out/make`:

```text
out/make/Project Monitor-<version>-arm64.dmg
out/make/zip/darwin/arm64/Project Monitor-darwin-arm64-<version>.zip
out/make/squirrel.windows/x64/ProjectMonitorSetup.exe
```

`package:mac` builds for `arm64` only, because the app ships a rebuilt
`node-pty` binary and a thin build keeps the disk image honest about what it
runs on. `make:mac` and `make:win` are the same builds under Forge's own
command names, and the CI workflow calls those.

`package:win` only runs on Windows. `node-pty` is a native module compiled by
node-gyp against the host toolchain, so a Windows build started on macOS fails
in the rebuild step before it ever reaches the installer — the same reason the
workflow gives each platform its own runner.

To build only the unpacked application for the current machine, without an
installer:

```bash
npm run package
```

Forge writes the unpacked application to `out/`.

## Application icons

The build uses the branded icons stored in `assets/icons`:

- `icon.icns` for macOS
- `icon.ico` for Windows and the Squirrel installer
- `icon.png` as the 1024 px master

These are the dark container artwork. The sidebar mark inside the application uses `mark-dark.png` for the default theme and `mark-light.png` for the company and lazify themes.

## macOS signing and notarization

Local macOS builds are ad-hoc signed without environment variables so their bundle integrity remains valid. Signing uses `assets/entitlements.mac.plist`, which turns off the hardened runtime's library validation — an ad-hoc bundle carries no Team ID, and without that entitlement macOS refuses to load Electron Framework into the app and it dies in dyld before its first window. For public distribution, install a Developer ID Application certificate in the build machine's keychain and provide:

```text
MAC_SIGN_IDENTITY=Developer ID Application: Name (TEAMID)
APPLE_ID=developer@example.com
APPLE_APP_SPECIFIC_PASSWORD=app-specific-password
APPLE_TEAM_ID=TEAMID
```

Forge signs and notarizes during the Package step when these values are available. Keep them in the local environment or encrypted CI secrets, never in the repository.

## Windows signing

Unsigned Squirrel.Windows builds work without environment variables. To sign with a PFX certificate, provide:

```text
WINDOWS_CERTIFICATE_FILE=C:\\secure\\project-monitor.pfx
WINDOWS_CERTIFICATE_PASSWORD=certificate-password
```

Forge signs the Windows installer during the Make step. Keep the certificate outside the repository and store its password as a protected secret.

## Automated builds

The `Build desktop apps` workflow runs for version tags such as `v1.0.0` and can also be started manually from GitHub Actions. It builds macOS and Windows artifacts separately and uploads each platform's `out/make` output as a workflow artifact.

To publish a GitHub release instead of workflow artifacts, run `npm run publish:mac` or `npm run publish:win` with `GITHUB_TOKEN` set; Forge uploads the same artifacts to a release on this repository.
