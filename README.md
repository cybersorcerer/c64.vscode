# C64 Assembler for Visual Studio Code

A comprehensive Visual Studio Code extension for Commodore 64 Assembler development using Kick Assembler, featuring LSP support, VICE emulator integration, and helpful development tools.

Made with Love for the Retro Computing Community.

## Features

- **Syntax Highlighting**: Full TextMate grammar support for Kick Assembler syntax
- **LSP Support**: Integration with kickass_ls language server for:
  - Code completion
  - Go to definition
  - Find references
  - Hover documentation
  - Diagnostics and error checking
  - Symbol navigation
- **VICE Emulator Integration**: Build and run your programs directly in VICE
- **Remote Monitor Support**: Debug your programs using VICE's remote monitor
- **Quick Build**: Assemble your code with a single command

## Prerequisites

Before using this extension, you need to install:

1. **Kick Assembler** - Download from [http://www.theweb.dk/KickAssembler/](http://www.theweb.dk/KickAssembler/)
2. **VICE Emulator** - Download from [https://vice-emu.sourceforge.io/](https://vice-emu.sourceforge.io/)
3. **kickass_ls Language Server** - Build and install from [https://github.com/cybersorcerer/kickass_ls](https://github.com/cybersorcerer/kickass_ls)

### Installing kickass_ls

```bash
git clone https://github.com/cybersorcerer/kickass_ls
cd kickass_ls
cargo build --release
cp target/release/kickass_ls ~/.local/bin/
```

Make sure `~/.local/bin` is in your `$PATH`.

## Installation

1. Install the extension from the VSCode Marketplace (or from .vsix file)
2. Configure the extension settings (see Configuration below)

## Configuration

Open VSCode settings (File > Preferences > Settings) and configure:

### Required Settings

- **c64.kickassJarPath**: Path to your kickass.jar file
  ```json
  "c64.kickassJarPath": "/path/to/KickAss.jar"
  ```

### Optional Settings

- **c64.viceBinary**: VICE emulator binary name (default: "x64")
  ```json
  "c64.viceBinary": "x64"
  ```

- **c64.kickassLsBinary**: kickass_ls language server binary (default: "kickass_ls")
  ```json
  "c64.kickassLsBinary": "kickass_ls"
  ```

## Usage

### Commands

Access commands via Command Palette (Cmd/Ctrl+Shift+P):

- **C64: Assemble with Kick Assembler** - Compile current .asm file
- **C64: Run in VICE Emulator** - Assemble and run in VICE
- **C64: Debug in VICE with Monitor** - Start VICE with remote monitor enabled

### LSP Features

The extension automatically provides LSP features when editing `.asm` or `.s` files:

- **Code Completion**: Press Ctrl+Space to trigger completion suggestions
- **Go to Definition**: F12 or right-click > Go to Definition
- **Find References**: Shift+F12 or right-click > Find All References
- **Hover Information**: Hover over symbols to see documentation
- **Diagnostics**: Errors and warnings appear inline and in the Problems panel

### Building and Running

1. Open a Kick Assembler file (`.asm`)
2. Press Cmd/Ctrl+Shift+P and run "C64: Assemble with Kick Assembler"
3. Check the terminal for build output
4. If successful, run "C64: Run in VICE Emulator" to test your program

## Language Server Features

The kickass_ls language server provides:

- **Zero Page Optimization**: Hints for using zero page addressing
- **Branch Distance Validation**: Warnings for out-of-range branches
- **Illegal Opcode Detection**: Warnings for illegal/undocumented opcodes
- **Hardware Bug Detection**: Warnings for known C64 hardware bugs (JMP indirect bug)
- **Memory Layout Analysis**: Stack warnings, ROM write warnings, I/O access detection
- **Magic Number Detection**: Hints for hardcoded C64 addresses
- **Dead Code Detection**: Warnings for unreachable code
- **Style Guide Enforcement**: Hints for better code style

## File Structure

```
your-project/
├── main.asm          # Your main assembly file
├── utils.asm         # Additional source files
└── build/            # Output directory (created by Kick Assembler)
    └── main.prg      # Compiled program
```

## Troubleshooting

### LSP Not Starting

1. Verify kickass_ls is installed: `which kickass_ls`
2. Check VSCode Output panel (View > Output) and select "Kick Assembler Language Server"
3. Ensure file extension is `.asm` or `.s`

### VICE Not Running

1. Verify VICE is installed: `which x64`
2. Check the configured `c64.viceBinary` setting
3. Ensure the .prg file was created by the assembler

### Assembler Errors

1. Verify kickass.jar path in settings
2. Check that Java is installed: `java -version`
3. Review terminal output for detailed error messages

## Contributing

Contributions are welcome! Please visit the [GitHub repository](https://github.com/cybersorcerer/c64.vscode) to report issues or submit pull requests.

## License

ISC

## Acknowledgments

- Kick Assembler by Mads Nielsen
- VICE Emulator team
- kickass_ls language server
- The retro computing community

---

**Enjoy coding for the Commodore 64!**
