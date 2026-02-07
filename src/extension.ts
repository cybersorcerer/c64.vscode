import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, Executable } from 'vscode-languageclient/node';
import { KickassemblerService } from './kickassembler';
import { ViceService } from './vice';
import { C64UService } from './c64u/service';
import { C64UFileSystemProvider } from './c64u/treeview';
import { C64UTreeViewActions } from './c64u/treeview-actions';
import { C64UClient } from './c64u/client';
import { getKickassLsPath, logBinaryResolution } from './binaries';
import { initC64UCli } from './c64u/cli';

let client: LanguageClient | undefined;
let kickassService: KickassemblerService;
let viceService: ViceService;
let c64uService: C64UService;

export function activate(context: vscode.ExtensionContext) {
    console.log('C64 Assembler extension is now active');

    // Set initial c64u.enabled context for when-clauses
    const c64uEnabled = vscode.workspace.getConfiguration('c64u').get<boolean>('enabled', false);
    vscode.commands.executeCommand('setContext', 'c64u.enabled', c64uEnabled);

    // Initialize binary resolution for c64u CLI
    initC64UCli(context.extensionPath);

    // Initialize services - these create DiagnosticCollections
    kickassService = new KickassemblerService();
    viceService = new ViceService();

    // Register kickassService for disposal (has DiagnosticCollection)
    context.subscriptions.push(kickassService);

    // Always initialize C64 Ultimate service
    // It will check enabled status and configuration at runtime
    c64uService = new C64UService();

    // Initialize C64U Tree View
    const c64uConfig = vscode.workspace.getConfiguration('c64u');
    const treeDataProvider = new C64UFileSystemProvider(c64uConfig);
    const treeView = vscode.window.createTreeView('c64u.fileExplorer', {
        treeDataProvider: treeDataProvider,
        showCollapseAll: true,
        canSelectMany: true,
        dragAndDropController: treeDataProvider
    });
    context.subscriptions.push(treeView);

    // Initialize Tree View Actions
    const c64uClient = new C64UClient();
    const treeActions = new C64UTreeViewActions(
        c64uClient,
        () => treeDataProvider.refresh(),
        context.globalStorageUri.fsPath
    );
    context.subscriptions.push(treeActions);

    // Register Tree View commands
    context.subscriptions.push(
        vscode.commands.registerCommand('c64u.treeview.refresh', () => {
            treeDataProvider.refresh();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('c64u.treeview.navigate', async (item) => {
            if (item) {
                treeDataProvider.navigateTo(item.resourcePath);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('c64u.treeview.openFile', async (item) => {
            await treeActions.openFile(item);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('c64u.treeview.delete', async (item) => {
            await treeActions.deleteFile(item);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('c64u.treeview.rename', async (item) => {
            await treeActions.renameFile(item);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('c64u.treeview.copy', async (item) => {
            await treeActions.copyFile(item);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('c64u.treeview.createDir', async (item) => {
            await treeActions.createDirectory(item);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('c64u.treeview.createDisk', async (item) => {
            await treeActions.createDiskImage(item);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('c64u.treeview.mount', async (item) => {
            await treeActions.mountDiskImage(item);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('c64u.treeview.unmount', async () => {
            await treeActions.unmountDrive();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('c64u.treeview.download', async (item) => {
            await treeActions.downloadFile(item);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('c64u.treeview.upload', async (item) => {
            await treeActions.uploadFile(item);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('c64u.treeview.runPrg', async (item) => {
            await treeActions.runProgram(item);
        })
    );

    // Start Language Server first
    startLanguageServer(context);

    // Auto-detect and set language for .asm and .s files
    console.log('Starting auto-detection for Kick Assembler files...');
    autoDetectKickassFiles(context);

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
            const prgPath = editor.document.uri.fsPath.replace(/\.(asm|kasm)$/, '.prg');
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
                const prgPath = editor.document.uri.fsPath.replace(/\.(asm|kasm)$/, '.prg');
                await viceService.run(prgPath);
            }
        })
    );

    // Register C64 Ultimate commands (always register, check enabled state at runtime)
    context.subscriptions.push(
        vscode.commands.registerCommand('c64u.uploadAndRun', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor');
                return;
            }
            const success = await kickassService.assemble(editor.document.uri.fsPath);
            if (success) {
                const prgPath = editor.document.uri.fsPath.replace(/\.(asm|kasm)$/, '.prg');
                await c64uService!.uploadAndRun(prgPath);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('c64u.fileBrowser', async () => {
            await c64uService!.showFileBrowser();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('c64u.machineControl', async () => {
            await c64uService!.showMachineControl();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('c64u.upload', async () => {
            await c64uService!.uploadFile();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('c64u.download', async () => {
            await c64uService!.downloadFile();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('c64u.mkdir', async () => {
            await c64uService!.createDirectory();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('c64u.remove', async () => {
            await c64uService!.removeFile();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('c64u.move', async () => {
            await c64uService!.moveFile();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('c64u.copy', async () => {
            await c64uService!.copyFile();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('c64u.list', async () => {
            await c64uService!.listDirectory();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('c64u.fileInfo', async () => {
            await c64uService!.showFileInfo();
        })
    );

    // Watch for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('c64u')) {
                const enabled = vscode.workspace.getConfiguration('c64u').get<boolean>('enabled', false);
                vscode.commands.executeCommand('setContext', 'c64u.enabled', enabled);
                treeDataProvider.refresh();
            }
            // Push kickass_ls settings to language server on change
            if (e.affectsConfiguration('kickass_ls') && client) {
                client.sendNotification('workspace/didChangeConfiguration', {
                    settings: { kickass_ls: getKickassLsSettings() }
                });
            }
        })
    );

    // Clear diagnostics when a document is closed
    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument(document => {
            if (document.fileName.endsWith('.asm') || document.fileName.endsWith('.kasm')) {
                kickassService.clearDiagnostics(document.uri);
            }
        })
    );
}

function startLanguageServer(context: vscode.ExtensionContext) {
    // Resolve kickass_ls binary path (settings > PATH > bundled)
    const lsResolution = getKickassLsPath(context.extensionPath);
    logBinaryResolution('kickass_ls', lsResolution);

    if (lsResolution.source === 'not_found') {
        vscode.window.showWarningMessage(
            'kickass_ls not found. Install it, add to PATH, or configure c64.kickassLsBinary in settings.'
        );
    }

    const serverOptions: ServerOptions = {
        command: lsResolution.path,
        args: []
    } as Executable;

    // LSP client options with semantic tokens support
    const clientOptions: LanguageClientOptions = {
        documentSelector: [
            { scheme: 'file', language: 'kickass' },
            { scheme: 'file', pattern: '**/*.asm' },
            { scheme: 'file', pattern: '**/*.kasm' }
        ],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{asm,kasm}')
        },
        initializationOptions: {
            settings: { kickass_ls: getKickassLsSettings() }
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
        if ((document.fileName.endsWith('.asm') || document.fileName.endsWith('.kasm')) &&
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
            if (document.fileName.endsWith('.asm') || document.fileName.endsWith('.kasm')) {
                console.log(`Opened file: ${document.fileName}, current language: ${document.languageId}`);

                // Check immediately first
                checkAndSetLanguage(document);

                // Also check after a short delay in case VSCode overrides the language
                setTimeout(() => {
                    checkAndSetLanguage(document);
                }, 100);
            }
        })
    );
}

/**
 * Read kickass_ls settings from VS Code configuration and return
 * the nested object structure expected by the language server.
 */
function getKickassLsSettings(): Record<string, unknown> {
    const config = vscode.workspace.getConfiguration('kickass_ls');

    return {
        warnUnusedLabels: config.get<boolean>('warnUnusedLabels'),
        zeroPageOptimization: {
            enabled: config.get<boolean>('zeroPageOptimization.enabled'),
            showHints: config.get<boolean>('zeroPageOptimization.showHints')
        },
        branchDistanceValidation: {
            enabled: config.get<boolean>('branchDistanceValidation.enabled'),
            showWarnings: config.get<boolean>('branchDistanceValidation.showWarnings')
        },
        illegalOpcodeDetection: {
            enabled: config.get<boolean>('illegalOpcodeDetection.enabled'),
            showWarnings: config.get<boolean>('illegalOpcodeDetection.showWarnings')
        },
        hardwareBugDetection: {
            enabled: config.get<boolean>('hardwareBugDetection.enabled'),
            showWarnings: config.get<boolean>('hardwareBugDetection.showWarnings'),
            jmpIndirectBug: config.get<boolean>('hardwareBugDetection.jmpIndirectBug')
        },
        memoryLayoutAnalysis: {
            enabled: config.get<boolean>('memoryLayoutAnalysis.enabled'),
            showIOAccess: config.get<boolean>('memoryLayoutAnalysis.showIOAccess'),
            showStackWarnings: config.get<boolean>('memoryLayoutAnalysis.showStackWarnings'),
            showROMWriteWarnings: config.get<boolean>('memoryLayoutAnalysis.showROMWriteWarnings')
        },
        magicNumberDetection: {
            enabled: config.get<boolean>('magicNumberDetection.enabled'),
            showHints: config.get<boolean>('magicNumberDetection.showHints'),
            c64Addresses: config.get<boolean>('magicNumberDetection.c64Addresses')
        },
        deadCodeDetection: {
            enabled: config.get<boolean>('deadCodeDetection.enabled'),
            showWarnings: config.get<boolean>('deadCodeDetection.showWarnings')
        },
        styleGuideEnforcement: {
            enabled: config.get<boolean>('styleGuideEnforcement.enabled'),
            showHints: config.get<boolean>('styleGuideEnforcement.showHints'),
            upperCaseConstants: config.get<boolean>('styleGuideEnforcement.upperCaseConstants'),
            descriptiveLabels: config.get<boolean>('styleGuideEnforcement.descriptiveLabels')
        },
        formatting: {
            enabled: config.get<boolean>('formatting.enabled'),
            indentSize: config.get<number>('formatting.indentSize'),
            useSpaces: config.get<boolean>('formatting.useSpaces'),
            alignComments: config.get<boolean>('formatting.alignComments'),
            commentColumn: config.get<number>('formatting.commentColumn')
        }
    };
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
