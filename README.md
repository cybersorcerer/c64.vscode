# C64 Assembler Development for VS Code

Complete development environment for Commodore 64 assembly programming with Kick Assembler, LSP-powered code intelligence, VICE emulator integration, and C64 Ultimate hardware support.

## Features

### LSP-Based Code Intelligence

All syntax highlighting and code analysis comes from the **kickass_ls** language server — no static syntax files.

- Semantic tokens for context-aware syntax highlighting
- Real-time diagnostics and code analysis
- Intelligent code completion
- Go-to-definition and hover documentation
- Document formatting

### Kick Assembler Integration

- Assemble `.asm` and `.kasm` files with Kick Assembler
- Errors and warnings appear in the Problems panel
- Detailed output in the "Kick Assembler" output channel
- 60-second timeout protection for long-running builds

### VICE Emulator Support

- Run programs directly in VICE emulator
- Autostart mode for instant testing
- Assemble-and-run in a single step

### C64 Ultimate Integration

Full integration with C64 Ultimate hardware via the `c64u` CLI tool:

- **Tree View File Explorer** in the Activity Bar with drag-and-drop support
- Open text files (`.asm`, `.bas`, `.seq`, `.txt`, `.cfg`, `.inc`, `.sym`, `.dbg`) directly in the editor — changes are automatically uploaded back to the C64 Ultimate on save
- Open binary files (`.prg`, `.crt`, `.bin`, `.tap`, `.t64`, `.rel`, `.ko`) in the Hex Editor
- Browse and navigate the C64 Ultimate filesystem
- Upload, download, rename, copy, and delete files
- Create directories and disk images (d64, d71, d81, g64, dnp)
- Mount/unmount disk images on IEC drives
- Run `.prg` files directly on hardware
- Machine control (reset, reboot, pause, resume)
- Interactive QuickPick-based file browser

## Prerequisites

- **VS Code** 1.85.0 or later
- **Kick Assembler** JAR file ([kickass.jar](http://www.theweb.dk/KickAssembler/))
- **Java Runtime** (for Kick Assembler)
- **VICE** emulator (x64 or x64sc) — optional ([VICE](https://vice-emu.sourceforge.io/))
- **Hex Editor** extension — optional, for viewing binary files from C64 Ultimate ([ms-vscode.hexeditor](https://marketplace.visualstudio.com/items?itemName=ms-vscode.hexeditor))

### Bundled Binaries

The extension includes pre-built binaries for:

- **kickass_ls** — Language server for syntax highlighting and code analysis
- **c64u** — CLI tool for C64 Ultimate hardware integration

These are automatically used if not found in your system PATH or configured in settings.

**Supported platforms:**

- macOS (Intel & Apple Silicon)
- Linux (amd64 & arm64)
- Windows (amd64)

## Installation

### From VS Code Marketplace

Search for "C64 Assembler Development" in the Extensions view.

### From GitHub Releases

Download the platform-specific `.vsix` file from [Releases](https://github.com/cybersorcerer/c64.vscode/releases) and install via:

```bash
code --install-extension c64-vscode-<platform>-<version>.vsix
```

### From Source (Development)

```bash
git clone https://github.com/cybersorcerer/c64.vscode.git
cd c64.vscode
npm install
npm run compile
```

Press F5 to launch the extension in a new VS Code window.

## Binary Resolution

The extension resolves `kickass_ls` and `c64u` binaries independently in this order:

1. **Settings** — Explicit path configured in VS Code settings
2. **System PATH** — Binary found in your system PATH
3. **Bundled** — Pre-built binary included with the extension

This means you can override bundled binaries by installing your own version or configuring a custom path.

## Configuration

Open VS Code settings (`Cmd+,` or `Ctrl+,`) and search for "C64" or "kickass_ls".

Settings are organized in four sections:

### General

| Setting | Default | Description |
| ------- | ------- | ----------- |
| `c64.kickassJarPath` | `/Applications/KickAssembler/KickAss.jar` | Path to kickass.jar |
| `c64.viceBinary` | `x64` | VICE emulator binary (x64 or x64sc) |
| `c64.kickassLsBinary` | `kickass_ls` | Path to kickass_ls language server binary |

### Language Server - Diagnostics

All diagnostics are enabled by default. Each feature has an `enabled` toggle and individual sub-settings. Changes take effect immediately without reloading VS Code.

| Setting | Default | Description |
| ------- | ------- | ----------- |
| `kickass_ls.warnUnusedLabels` | `true` | Warn about unused labels |
| `kickass_ls.zeroPageOptimization.enabled` | `true` | Zero page optimization hints |
| `kickass_ls.zeroPageOptimization.showHints` | `true` | Show hints for $00-$FF addresses |
| `kickass_ls.branchDistanceValidation.enabled` | `true` | Branch distance validation |
| `kickass_ls.branchDistanceValidation.showWarnings` | `true` | Warn when branches exceed +/-128 bytes |
| `kickass_ls.illegalOpcodeDetection.enabled` | `true` | Detect illegal/undocumented 6502 opcodes |
| `kickass_ls.illegalOpcodeDetection.showWarnings` | `true` | Warn about SLO, RLA, etc. |
| `kickass_ls.hardwareBugDetection.enabled` | `true` | Hardware bug detection |
| `kickass_ls.hardwareBugDetection.showWarnings` | `true` | Show hardware bug warnings |
| `kickass_ls.hardwareBugDetection.jmpIndirectBug` | `true` | Detect JMP ($xxFF) page boundary bug |
| `kickass_ls.memoryLayoutAnalysis.enabled` | `true` | Memory layout analysis |
| `kickass_ls.memoryLayoutAnalysis.showIOAccess` | `true` | Highlight I/O register access ($D000-$DFFF) |
| `kickass_ls.memoryLayoutAnalysis.showStackWarnings` | `true` | Warn about stack page issues ($0100-$01FF) |
| `kickass_ls.memoryLayoutAnalysis.showROMWriteWarnings` | `true` | Warn about writes to ROM areas |
| `kickass_ls.magicNumberDetection.enabled` | `true` | Magic number detection |
| `kickass_ls.magicNumberDetection.showHints` | `true` | Suggest named constants for hardcoded numbers |
| `kickass_ls.magicNumberDetection.c64Addresses` | `true` | Recognize C64 addresses (e.g. $D020 = BORDER_COLOR) |
| `kickass_ls.deadCodeDetection.enabled` | `true` | Dead code detection |
| `kickass_ls.deadCodeDetection.showWarnings` | `true` | Warn about unreachable code after JMP/RTS |
| `kickass_ls.styleGuideEnforcement.enabled` | `true` | Style guide enforcement |
| `kickass_ls.styleGuideEnforcement.showHints` | `true` | Show style hints |
| `kickass_ls.styleGuideEnforcement.upperCaseConstants` | `true` | Suggest UPPER_CASE for constants |
| `kickass_ls.styleGuideEnforcement.descriptiveLabels` | `true` | Warn about short label names (< 3 chars) |

### Language Server - Formatting

| Setting | Default | Description |
| ------- | ------- | ----------- |
| `kickass_ls.formatting.enabled` | `true` | Enable document formatting |
| `kickass_ls.formatting.indentSize` | `4` | Spaces per indent level (1-16) |
| `kickass_ls.formatting.useSpaces` | `true` | Use spaces (false = tabs) |
| `kickass_ls.formatting.alignComments` | `true` | Align end-of-line comments |
| `kickass_ls.formatting.commentColumn` | `40` | Column for comment alignment (0 = auto) |

### C64 Ultimate

| Setting | Default | Description |
| ------- | ------- | ----------- |
| `c64u.enabled` | `false` | Enable C64 Ultimate integration |
| `c64u.host` | `localhost` | C64 Ultimate hostname or IP address |
| `c64u.port` | `80` | C64 Ultimate HTTP port |
| `c64u.cliBinary` | `c64u` | Path to c64u CLI binary |

## Keyboard Shortcuts

All shortcuts are active when editing Kick Assembler files.

| Key | Mac | Action |
| --- | --- | ------ |
| `Ctrl+Shift+A` | `Cmd+Shift+A` | Assemble with Kick Assembler |
| `Ctrl+Shift+R` | `Cmd+Shift+R` | Run in VICE |
| `Ctrl+Shift+X` | `Cmd+Shift+X` | Assemble and Run |
| `Ctrl+Shift+U` | `Cmd+Shift+U` | Assemble, Upload and Run on C64 Ultimate |
| `Ctrl+Shift+B` | `Cmd+Shift+B` | C64U File Browser |

## Supported File Extensions

| Extension | Description |
| --------- | ----------- |
| `.asm` | Standard assembler file — the language server activates for all `.asm` files regardless of the detected language |
| `.kasm` | Kick Assembler file — always recognized as Kick Assembler, use this to avoid conflicts with other assembler extensions (e.g. HLASM) |

If another extension claims the `.asm` file association, the language server still activates via file pattern matching. For guaranteed Kick Assembler detection, rename your files to `.kasm`.

## Usage

### Basic Workflow

1. Open a `.asm` or `.kasm` file — syntax highlighting and diagnostics activate automatically
2. Assemble with `Ctrl+Shift+A` — errors appear in the Problems panel
3. Run with `Ctrl+Shift+R` — launches VICE with your program
4. Or combine with `Ctrl+Shift+X` — assembles and runs in one step

### C64 Ultimate Workflow

1. Enable C64 Ultimate in settings and configure host/port
2. Use `Ctrl+Shift+U` to assemble, upload, and run on real hardware
3. Use the Tree View in the Activity Bar to browse files on the C64 Ultimate
4. Click text files to edit them — changes are automatically uploaded on save
5. Click binary files to view them in the Hex Editor
6. Right-click for context actions (rename, copy, delete, mount, run)
7. Drag and drop files to move them between directories

## Commands

Access via Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

### Assembly & Emulation

- **C64: Assemble with Kick Assembler** — Compile current file
- **C64: Run in VICE Emulator** — Run assembled program
- **C64: Assemble and Run** — Compile and run in one step

### C64 Ultimate Commands

- **C64U: Assemble, Upload and Run** — Full workflow to real hardware
- **C64U: File Browser** — Interactive QuickPick file browser
- **C64U: Machine Control** — Reset, reboot, pause, resume
- **C64U: Upload/Download File** — Transfer files
- **C64U: Create Directory** — Make directory on C64 Ultimate
- **C64U: Remove File/Directory** — Delete with confirmation
- **C64U: Move/Rename** — Move or rename files
- **C64U: Copy File** — Copy file on C64 Ultimate
- **C64U: List Directory** — Show directory contents
- **C64U: Show File Info** — Display file information

### Tree View Context Menu

- **Open in Editor** — Open text/binary files in appropriate editor
- **Run Program** — Run `.prg` files on C64 Ultimate
- **Mount/Unmount** — Mount disk images on IEC drives
- **Download/Upload** — Transfer files to/from local machine
- **Rename/Copy/Delete** — File management
- **New Directory / Create Disk Image** — Create new items

## Building with Bundled Binaries

To build the extension with bundled Go binaries:

```bash
# Build for current platform (development)
npm run package:current

# Build for all platforms
npm run package
```

Requires Go and access to the [kickass_ls](https://github.com/cybersorcerer/kickass_ls) and [c64u](https://github.com/cybersorcerer/c64u) source repositories.

Releases are built automatically via GitHub Actions when a version tag is pushed.

## Troubleshooting

### Language Server Not Starting

1. Make sure your file has a `.asm` or `.kasm` extension
2. If another extension claims `.asm` files, rename to `.kasm` or change the language mode to "Kick Assembler" in the VS Code status bar
3. Check that `kickass_ls` is installed and in PATH, or use the bundled binary
4. Or configure an explicit path:

   ```json
   { "c64.kickassLsBinary": "/usr/local/bin/kickass_ls" }
   ```

### Assembly Fails

1. Verify `kickass.jar` path in settings
2. Check that Java is installed: `java -version`
3. View detailed output in the "Kick Assembler" output channel

### VICE Won't Start

1. Install VICE emulator
2. Ensure `x64` or `x64sc` is in PATH
3. Or configure in settings:

   ```json
   { "c64.viceBinary": "/Applications/Vice/x64.app/Contents/MacOS/x64" }
   ```

### C64 Ultimate Connection Issues

1. Ping C64 Ultimate: `ping <host>`
2. Test c64u CLI: `c64u --host <host> about`
3. Check firewall settings
4. Verify host and port in settings

## Related Projects

- [c64.nvim](https://github.com/cybersorcerer/c64.nvim) — Neovim plugin for C64 development
- [kickass_ls](https://github.com/cybersorcerer/kickass_ls) — Language server for Kick Assembler
- [c64u](https://github.com/cybersorcerer/c64u) — C64 Ultimate CLI tool

## License

Apache 2.0 — see [LICENSE.md](LICENSE.md)

## Credits

- Built for the [C64 Ultimate](https://ultimate64.com/)
- Uses [Kick Assembler](http://www.theweb.dk/KickAssembler/)
- Integrates with [VICE Emulator](https://vice-emu.sourceforge.io/)
- LSP support via [kickass_ls](https://github.com/cybersorcerer/kickass_ls)

## Contributing

Contributions welcome! Please submit issues and pull requests at
<https://github.com/cybersorcerer/c64.vscode>.
