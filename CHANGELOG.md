# Change Log

All notable changes to the "c64-vscode" extension will be documented in this file.

## [0.1.0] - 2026-01-10

### Added
- Initial release
- LSP-based syntax highlighting via kickass_ls (no static syntax files!)
- Kick Assembler integration with error/warning detection
- VICE emulator support with autostart
- C64 Ultimate integration via c64u CLI:
  - Interactive file browser (QuickPick-based)
  - Upload/download files
  - Mount disk images (d64/d71/d81/g64/g71)
  - Machine control (reset, reboot, pause, resume)
  - Directory operations (create, delete, list)
  - File operations (move, copy, delete, info)
- Keyboard shortcuts for quick access
- Comprehensive configuration options
- Problems panel integration for assembly errors

### Features
- **No static syntax files** - All highlighting from LSP
- **Semantic tokens** - Context-aware syntax highlighting
- **Real-time diagnostics** - Instant feedback on code issues
- **C64 Ultimate workflow** - Assemble, upload and run on real hardware
- **File browser** - Navigate C64 Ultimate filesystem
- **Disk image support** - Mount and manage disk images
