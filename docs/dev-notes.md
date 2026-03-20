# Dev Notes

## App name shows as "Electron" in macOS menu bar

**This is a dev-mode limitation**, not a bug to fix in code.

In dev mode (`bun run dev`), the app runs via the `Electron` binary directly. macOS reads the app name from `CFBundleName` in `Info.plist` inside the Electron binary — which says "Electron". `app.setName()` fixes the name in native dialogs and `app.getName()` calls, but NOT the macOS menu bar in dev mode.

**In production** (built with `electron-builder`), the binary is renamed to `Supermuschel`, the `productName` is set in `electron-builder.yml`, and the macOS menu bar shows "Supermuschel" correctly.

To test the correct name: `bun run build` then open `release/mac-arm64/Supermuschel.app`.
