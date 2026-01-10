# C64 Assembler Development for VS Code

Complete development environment for Commodore 64 Assembler programming with Kick Assembler, LSP support, VICE emulator integration, and C64 Ultimate hardware support.

## Features

### 🎯 **LSP-Based Syntax Highlighting**
- **No static syntax files!** All syntax highlighting comes from the kickass_ls language server
- Semantic tokens for accurate, context-aware highlighting
- Real-time code analysis and diagnostics
- Intelligent code completion

### 🛠️ **Kick Assembler Integration**
- Assemble `.asm` and `.s` files with Kick Assembler
- Automatic error and warning detection in Problems panel
- Quick compile with `Ctrl+Shift+A` (Cmd+Shift+A on Mac)
- Output channel shows detailed assembly results

### 🎮 **VICE Emulator Support**
- Run programs directly in VICE emulator
- Autostart mode for instant testing
- `Ctrl+Shift+R` to run (Cmd+Shift+R on Mac)
- `Ctrl+Shift+X` to assemble and run (Cmd+Shift+X on Mac)

### 🌐 **C64 Ultimate Integration**
Complete integration with C64 Ultimate hardware via the `c64u` CLI:

#### File Browser
- Interactive QuickPick-based file browser (similar to Telescope in Neovim)
- Navigate C64 Ultimate filesystem
- Download, upload, mount, and manage files
- Support for .d64, .d71, .d81, .g64, .g71 disk images

#### Commands
- `Ctrl+Shift+U`: Assemble, upload and run on C64 Ultimate
- `Ctrl+Shift+B`: Open file browser
- Upload/download files
- Create/delete directories
- Mount disk images
- Machine control (reset, reboot, pause, resume)

## Prerequisites

- **VS Code** 1.85.0 or later
- **Kick Assembler** JAR file ([kickass.jar](http://www.theweb.dk/KickAssembler/))
- **kickass_ls** language server ([kickass_ls](https://github.com/cybersorcerer/kickass_ls))
- **VICE** emulator (x64 or x64sc) ([VICE](https://vice-emu.sourceforge.io/))
- **c64u CLI** (optional, for C64 Ultimate support) ([c64u](https://github.com/cybersorcerer/c64.nvim/tree/main/tools/c64u))

## Installation

### 1. Install the Extension

```bash
# From source (development)
cd ~/path/to/c64.vscode
npm install
npm run compile
```

Then press F5 to launch the extension in a new VS Code window.

### 2. Install Dependencies

#### kickass_ls Language Server

```bash
# Install from releases
# See: https://github.com/cybersorcerer/kickass_ls/releases

# Or build from source
cd ~/path/to/kickass_ls
go build -o kickass_ls ./cmd/kickass_ls
sudo mv kickass_ls /usr/local/bin/
```

#### c64u CLI (Optional)

```bash
# macOS
curl -L -o c64u https://github.com/cybersorcerer/c64.nvim/releases/latest/download/c64u-darwin-amd64
chmod +x c64u
sudo mv c64u /usr/local/bin/

# Linux
curl -L -o c64u https://github.com/cybersorcerer/c64.nvim/releases/latest/download/c64u-linux-amd64
chmod +x c64u
sudo mv c64u /usr/local/bin/

# Windows
# Download: https://github.com/cybersorcerer/c64.nvim/releases/latest/download/c64u-windows-amd64.exe
# Add to PATH
```

## Configuration

Open VS Code settings (Cmd+, or Ctrl+,) and configure:

### Required Settings

```json
{
  // Path to kickass.jar
  "c64.kickassJarPath": "/path/to/kickass.jar",

  // VICE emulator binary
  "c64.viceBinary": "x64",

  // kickass_ls language server (if not in PATH)
  "c64.kickassLsBinary": "kickass_ls"
}
```

### C64 Ultimate Settings (Optional)

```json
{
  // Enable C64 Ultimate integration
  "c64u.enabled": true,

  // C64 Ultimate hostname or IP
  "c64u.host": "192.168.1.100",

  // HTTP port (default: 80)
  "c64u.port": 80,

  // c64u CLI binary (if not in PATH)
  "c64u.cliBinary": "c64u"
}
```

## Usage

### Basic Workflow

1. **Write code** in `.asm` or `.s` files
   - Syntax highlighting works automatically via LSP
   - Get real-time diagnostics and code analysis

2. **Assemble** with `Ctrl+Shift+A` (Cmd+Shift+A)
   - View output in "Kick Assembler" output channel
   - Errors appear in Problems panel

3. **Run** with `Ctrl+Shift+R` (Cmd+Shift+R)
   - Launches VICE with your program

4. **Or combine**: `Ctrl+Shift+X` (Cmd+Shift+X)
   - Assembles and runs in one step

### C64 Ultimate Workflow

1. **Enable** C64 Ultimate in settings
2. **Configure** host and port
3. **Assemble and upload** with `Ctrl+Shift+U`
   - Assembles locally
   - Uploads to C64 Ultimate
   - Runs on real hardware

4. **Browse files** with `Ctrl+Shift+B`
   - Navigate C64 Ultimate filesystem
   - Mount disk images
   - Download/upload files

## Commands

Access commands via Command Palette (Cmd+Shift+P or Ctrl+Shift+P):

### General Commands
- `C64: Assemble with Kick Assembler` - Compile current file
- `C64: Run in VICE Emulator` - Run assembled program
- `C64: Assemble and Run` - Compile and run

### C64 Ultimate Commands
- `C64U: Assemble, Upload and Run on C64 Ultimate` - Full workflow
- `C64U: File Browser` - Interactive file browser
- `C64U: Machine Control` - Reset, reboot, pause, resume
- `C64U: Upload File` - Upload to C64 Ultimate
- `C64U: Download File` - Download from C64 Ultimate
- `C64U: Create Directory` - Make directory
- `C64U: Remove File/Directory` - Delete with confirmation
- `C64U: Move/Rename` - Move or rename files
- `C64U: Copy File` - Copy file
- `C64U: List Directory` - Show directory contents
- `C64U: Show File Info` - Display file information

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+Shift+A` (Mac: Cmd+Shift+A) | Assemble with Kick Assembler |
| `Ctrl+Shift+R` (Mac: Cmd+Shift+R) | Run in VICE |
| `Ctrl+Shift+X` (Mac: Cmd+Shift+X) | Assemble and Run |
| `Ctrl+Shift+U` (Mac: Cmd+Shift+U) | Upload and Run on C64U |
| `Ctrl+Shift+B` (Mac: Cmd+Shift+B) | C64U File Browser |

## Language Server Features

The kickass_ls language server provides:

- **Semantic Tokens**: Context-aware syntax highlighting
- **Diagnostics**: Real-time error and warning detection
- **Code Analysis**:
  - Zero-page optimization hints
  - Branch distance validation
  - Illegal opcode detection
  - Hardware bug detection (JMP indirect bug)
  - Memory layout analysis
  - Magic number detection
  - Dead code detection
  - Style guide enforcement

## File Browser

The C64 Ultimate file browser provides a QuickPick-based interface:

1. **Navigate**: Select folders to browse
2. **Select files**: Choose files to see actions
3. **Actions**:
   - Download file
   - Run PRG file
   - Mount disk image (d64/d71/d81/g64/g71)
   - Show file info
   - Delete file

## Troubleshooting

### Language Server Not Starting

1. Check that `kickass_ls` is installed and in PATH
2. Or configure absolute path in settings:
   ```json
   {
     "c64.kickassLsBinary": "/usr/local/bin/kickass_ls"
   }
   ```

### Assembly Fails

1. Verify `kickass.jar` path in settings
2. Check that Java is installed: `java -version`
3. View detailed output in "Kick Assembler" output channel

### VICE Won't Start

1. Install VICE emulator
2. Ensure `x64` or `x64sc` is in PATH
3. Or configure in settings:
   ```json
   {
     "c64.viceBinary": "/Applications/Vice/x64.app/Contents/MacOS/x64"
   }
   ```

### C64 Ultimate Connection Issues

1. Ping C64 Ultimate: `ping <host>`
2. Test c64u CLI: `c64u --host <host> about`
3. Check firewall settings
4. Verify host and port in settings

## Related Projects

- [c64.nvim](https://github.com/cybersorcerer/c64.nvim) - Neovim plugin
- [kickass_ls](https://github.com/cybersorcerer/kickass_ls) - Language server
- [c64u CLI](https://github.com/cybersorcerer/c64.nvim/tree/main/tools/c64u) - C64 Ultimate CLI

## License

Apache 2.0

## Credits

- Built for the [Commodore C64 Ultimate](https://commodore.net)
- Uses [Kick Assembler](http://www.theweb.dk/KickAssembler/)
- Integrates with [VICE Emulator](https://vice-emu.sourceforge.io/)
- LSP support via kickass_ls

## Contributing

Contributions welcome! Please submit issues and pull requests at:
https://github.com/cybersorcerer/c64.vscode
