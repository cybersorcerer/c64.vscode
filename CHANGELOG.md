# Change Log

All notable changes to the "c64-vscode" extension will be documented in this file.

## [0.5.3] - 2026-02-18

### Added

- **Machine Control in Tree View** — Machine section as a root node in the C64 Ultimate Tree View with directly clickable actions: Reset, Reboot, Pause, Resume, Power Off — no QuickPick menu required.
- **Compile & Run button in Tree View title bar** — `$(cloud-upload)` button for Assemble, Upload and Run directly from the C64 Ultimate panel.
- **Unmount Disk Image** — Renamed from "Unmount Drive" for clarity.
- **Updated kickass_ls** — Bundles the latest version of the kickass_ls language server.

### Changed

- C64 Ultimate Tree View now has two root sections: **Machine** (with control actions) and **File System** (existing file browser).

## [0.5.2] - 2026-02-18

### Added

- **Language Server Settings UI** — All kickass_ls diagnostics and formatting options are now configurable via VS Code settings (search for "kickass_ls"). Changes take effect immediately without reload.
- **GitHub Actions Release Workflow** — Automatically builds platform-specific VSIX files when a version tag is pushed.
- **C64U toggle** — All C64 Ultimate commands, keybindings, Tree View and Activity Bar icon are now toggleable via the `c64u.enabled` setting (default: false).
- **`.kasm` file extension** — Kick Assembler-specific extension to avoid conflicts with other assembler extensions (e.g. HLASM).

### Fixed

- **Extension activation** — Fixed VSIX packaging issue where `vscode-languageclient` dependency was excluded, causing the extension to silently fail to activate.
- **Language Server activation** — Added pattern-based document selectors (`**/*.asm`, `**/*.kasm`) to ensure the language server activates even when another extension claims the `.asm` file association.

## [0.3.0] - 2026-02-07

### Added

- **Bundled Binaries** — kickass_ls and c64u are now bundled in the VSIX for all supported platforms (macOS, Linux, Windows). Binary resolution: Settings > PATH > Bundled.
- **C64 Ultimate Tree View File Explorer** — Full tree view in the Activity Bar with drag-and-drop support for file management on the C64 Ultimate.
- **Open files from Tree Explorer** — Text files (.asm, .bas, .seq, .txt, .cfg, .inc, .sym, .dbg) open in the editor with auto-upload on save. Binary files (.prg, .crt, .bin, .tap, .t64, .rel, .ko) open in the Hex Editor.
- **Disk image creation** — Create d64, d71, d81, g64, and dnp disk images directly from the Tree View.
- **Mount/unmount disk images** — Mount disk images on IEC drives with read-write, read-only, or unlinked modes.
- **Context menu actions** — Right-click items in the Tree View for rename, copy, delete, download, upload, run, and mount operations.
- **Build scripts** — `scripts/build-binaries.sh` for local cross-compilation with auto-update support (git pull + incremental builds via commit hash tracking).

### Changed

- Binary paths for kickass_ls and c64u are now independently configurable via `c64.kickassLsBinary` and `c64u.cliBinary` settings.

## [0.2.0] - 2026-01-20

### Added

- **C64 Ultimate integration** — Upload, download, and run programs on real C64 Ultimate hardware via the c64u CLI.
- **Interactive file browser** — QuickPick-based file browser for navigating the C64 Ultimate filesystem.
- **Machine control** — Reset, reboot, pause, and resume the C64 Ultimate.
- **File operations** — Create directories, move, copy, delete, and show file info on the C64 Ultimate.

### Fixed

- **Process timeout** — Added 60-second timeout for Kick Assembler to prevent hanging builds.
- **VICE error handling** — Improved error messages when VICE binary is not found (ENOENT detection).
- **Auto-detection race condition** — Fixed duplicate event handlers and timing issues in Kick Assembler file detection.

## [0.1.0] - 2026-01-10

### Added

- Initial release.
- LSP-based syntax highlighting via kickass_ls — no static syntax files.
- Kick Assembler integration with error/warning detection in Problems panel.
- VICE emulator support with autostart mode.
- Keyboard shortcuts for assemble, run, and assemble-and-run.
- Semantic token support for context-aware highlighting.
