import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, Executable } from 'vscode-languageclient/node';
import { KickassemblerService } from './kickassembler';
import { ViceService } from './vice';
import { C64UService } from './c64u/service';

let client: LanguageClient | undefined;
let kickassService: KickassemblerService;
let viceService: ViceService;
let c64uService: C64UService | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('C64 Assembler extension is now active');

    // Initialize services
    kickassService = new KickassemblerService();
    viceService = new ViceService();

    // Initialize C64 Ultimate service if enabled
    const config = vscode.workspace.getConfiguration('c64u');
    if (config.get<boolean>('enabled')) {
        c64uService = new C64UService();
    }

    // Start Language Server first
    startLanguageServer(context);

    // Auto-detect and set language for .asm and .s files
    // Use setTimeout to ensure this runs after all initialization
    setTimeout(() => {
        console.log('Starting auto-detection for Kick Assembler files...');
        autoDetectKickassFiles(context);
    }, 500);

    // Register Kickassembler commands
    context.subscriptions.push(
        vscode.commands.registerCommand('c64.assemble', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor');
                return;
            }
            await kickassService.assemble(editor.document.uri.fsPath);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('c64.run', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor');
                return;
            }
            const prgPath = editor.document.uri.fsPath.replace(/\.(asm|s)$/, '.prg');
            await viceService.run(prgPath);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('c64.assembleAndRun', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor');
                return;
            }
            const success = await kickassService.assemble(editor.document.uri.fsPath);
            if (success) {
                const prgPath = editor.document.uri.fsPath.replace(/\.(asm|s)$/, '.prg');
                await viceService.run(prgPath);
            }
        })
    );

    // Register C64 Ultimate commands if enabled
    if (c64uService) {
        context.subscriptions.push(
            vscode.commands.registerCommand('c64u.uploadAndRun', async () => {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showErrorMessage('No active editor');
                    return;
                }
                const success = await kickassService.assemble(editor.document.uri.fsPath);
                if (success && c64uService) {
                    const prgPath = editor.document.uri.fsPath.replace(/\.(asm|s)$/, '.prg');
                    await c64uService.uploadAndRun(prgPath);
                }
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('c64u.fileBrowser', async () => {
                if (c64uService) {
                    await c64uService.showFileBrowser();
                }
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('c64u.machineControl', async () => {
                if (c64uService) {
                    await c64uService.showMachineControl();
                }
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('c64u.upload', async () => {
                if (c64uService) {
                    await c64uService.uploadFile();
                }
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('c64u.download', async () => {
                if (c64uService) {
                    await c64uService.downloadFile();
                }
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('c64u.mkdir', async () => {
                if (c64uService) {
                    await c64uService.createDirectory();
                }
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('c64u.remove', async () => {
                if (c64uService) {
                    await c64uService.removeFile();
                }
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('c64u.move', async () => {
                if (c64uService) {
                    await c64uService.moveFile();
                }
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('c64u.copy', async () => {
                if (c64uService) {
                    await c64uService.copyFile();
                }
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('c64u.list', async () => {
                if (c64uService) {
                    await c64uService.listDirectory();
                }
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('c64u.fileInfo', async () => {
                if (c64uService) {
                    await c64uService.showFileInfo();
                }
            })
        );
    }

    // Watch for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('c64u.enabled')) {
                const enabled = vscode.workspace.getConfiguration('c64u').get<boolean>('enabled');
                if (enabled && !c64uService) {
                    c64uService = new C64UService();
                    vscode.window.showInformationMessage('C64 Ultimate integration enabled. Reload window to activate commands.');
                } else if (!enabled && c64uService) {
                    c64uService = undefined;
                    vscode.window.showInformationMessage('C64 Ultimate integration disabled. Reload window to deactivate commands.');
                }
            }
        })
    );
}

function startLanguageServer(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('c64');
    const lsBinary = config.get<string>('kickassLsBinary') || 'kickass_ls';

    // Check if language server is available
    const serverOptions: ServerOptions = {
        command: lsBinary,
        args: []
    } as Executable;

    // LSP client options with semantic tokens support
    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: 'kickass' }],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{asm,s}')
        },
        initializationOptions: {
            settings: {
                kickass_ls: {
                    warnUnusedLabels: false,
                    zeroPageOptimization: {
                        enabled: true,
                        showHints: true
                    },
                    branchDistanceValidation: {
                        enabled: true,
                        showWarnings: true
                    },
                    illegalOpcodeDetection: {
                        enabled: true,
                        showWarnings: true
                    },
                    hardwareBugDetection: {
                        enabled: true,
                        showWarnings: true,
                        jmpIndirectBug: true
                    },
                    memoryLayoutAnalysis: {
                        enabled: true,
                        showIOAccess: true,
                        showStackWarnings: true,
                        showROMWriteWarnings: true
                    },
                    magicNumberDetection: {
                        enabled: true,
                        showHints: true,
                        c64Addresses: true
                    },
                    deadCodeDetection: {
                        enabled: true,
                        showWarnings: true
                    },
                    styleGuideEnforcement: {
                        enabled: true,
                        showHints: true,
                        upperCaseConstants: true,
                        descriptiveLabels: true
                    }
                }
            }
        }
    };

    // Create and start the language client
    client = new LanguageClient(
        'kickass-ls',
        'Kick Assembler Language Server',
        serverOptions,
        clientOptions
    );

    // Start the client (and server)
    client.start().then(() => {
        console.log('Kick Assembler Language Server started');

        // Configure semantic token highlighting
        configureSemanticTokens();
    }).catch(err => {
        console.error('Failed to start language server:', err);
        vscode.window.showWarningMessage(
            `Failed to start kickass_ls language server. Make sure it's installed and in your PATH. ` +
            `You can configure the path in settings: c64.kickassLsBinary`
        );
    });

    context.subscriptions.push(client);
}

function autoDetectKickassFiles(context: vscode.ExtensionContext) {
    // Check if file contains Kick Assembler specific syntax
    const isKickassFile = (document: vscode.TextDocument): boolean => {
        const text = document.getText();
        // Look for Kick Assembler specific directives or syntax
        const kickassPatterns = [
            // Kick Assembler specific features
            /\.namespace/i,
            /\.pseudocommand/i,
            /\.macro/i,
            /\.function/i,
            /\.struct/i,
            /\.enum/i,
            /BasicUpstart/i,
            // Common Kick Assembler directives
            /\.encoding\s+/i,
            /\.import\s+/i,
            /\.importonce/i,
            /\.file\s+/i,
            /\.disk\s+/i,
            /\.pc\s*=/,
            /\.byte\s+/i,
            /\.word\s+/i,
            /\.text\s+/i,
            /\.const\s+/i,
            /\.var\s+/i,
            /\.eval\s+/i,
            // Kick Assembler specific operators
            /BasicUpstart2/i,
            /kickass/i
        ];
        return kickassPatterns.some(pattern => pattern.test(text));
    };

    // Helper function to set language if needed
    const checkAndSetLanguage = (document: vscode.TextDocument) => {
        if ((document.fileName.endsWith('.asm') || document.fileName.endsWith('.s')) &&
            document.languageId !== 'kickass') {

            // For .asm files, be more aggressive - check patterns
            if (isKickassFile(document)) {
                console.log(`Setting language to kickass for: ${document.fileName}`);
                vscode.languages.setTextDocumentLanguage(document, 'kickass');
            } else if (document.languageId === 'plaintext') {
                // If it's plaintext but has .asm extension, assume kickass
                console.log(`Defaulting plaintext .asm file to kickass: ${document.fileName}`);
                vscode.languages.setTextDocumentLanguage(document, 'kickass');
            }
        }
    };

    // Set language for currently open documents
    vscode.workspace.textDocuments.forEach(checkAndSetLanguage);

    // Watch for newly opened documents
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(document => {
            if (document.fileName.endsWith('.asm') || document.fileName.endsWith('.s')) {
                console.log(`Opened file: ${document.fileName}, current language: ${document.languageId}`);

                // Use setTimeout to ensure we run after VSCode's language detection
                setTimeout(() => {
                    checkAndSetLanguage(document);
                }, 100);
            }
        })
    );

    // Also watch for when language changes (e.g., VSCode overrides our setting)
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(document => {
            // Immediate check
            if (document.fileName.endsWith('.asm') || document.fileName.endsWith('.s')) {
                checkAndSetLanguage(document);
            }
        })
    );
}

function configureSemanticTokens() {
    // Semantic token types configuration for kickass_ls
    // These will use the theme's colors automatically based on token type
    // No need for static syntax files - everything comes from the LSP!

    // The language server provides semantic tokens for:
    // - mnemonics (Function)
    // - directives (Keyword)
    // - preprocessor (PreProc)
    // - macros (Macro)
    // - pseudocommands (Special)
    // - functions (Function)
    // - labels (Label)
    // - numbers (Number)
    // - variables (Identifier)
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
