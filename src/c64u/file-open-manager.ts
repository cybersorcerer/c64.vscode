import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { executeC64U } from './cli';

const TEXT_EXTENSIONS = ['.asm', '.bas', '.seq', '.txt', '.cfg', '.inc', '.sym', '.dbg'];
const BINARY_EXTENSIONS = ['.prg', '.crt', '.bin', '.tap', '.t64', '.rel', '.ko'];

interface CachedFile {
    localPath: string;
    remotePath: string;
    isText: boolean;
}

export class C64UFileOpenManager implements vscode.Disposable {
    private cacheDir: string;
    private fileMap: Map<string, CachedFile> = new Map();
    private disposables: vscode.Disposable[] = [];
    private uploading: Set<string> = new Set();

    constructor(extensionStoragePath: string) {
        this.cacheDir = path.join(extensionStoragePath, 'c64u-cache');
        fs.mkdirSync(this.cacheDir, { recursive: true });
        this.setupSaveWatcher();
    }

    static isOpenableFile(filename: string): boolean {
        const ext = path.extname(filename).toLowerCase();
        return TEXT_EXTENSIONS.includes(ext) || BINARY_EXTENSIONS.includes(ext);
    }

    async openFile(remotePath: string, label: string): Promise<void> {
        const ext = path.extname(label).toLowerCase();
        const isText = TEXT_EXTENSIONS.includes(ext);
        const isBinary = BINARY_EXTENSIONS.includes(ext);

        console.log(`[C64U FileOpen] Opening ${label} (ext=${ext}, isText=${isText}, isBinary=${isBinary})`);

        if (!isText && !isBinary) {
            console.log(`[C64U FileOpen] Skipping ${label} - not an openable file type`);
            return;
        }

        const relativePath = remotePath.startsWith('/') ? remotePath.substring(1) : remotePath;
        const localPath = path.join(this.cacheDir, relativePath);

        // Check if file is already open and dirty
        const existingDoc = vscode.workspace.textDocuments.find(
            doc => doc.uri.fsPath === localPath
        );
        if (existingDoc && existingDoc.isDirty) {
            const choice = await vscode.window.showWarningMessage(
                `${label} has unsaved local changes. Download will overwrite them.`,
                'Download Anyway', 'Cancel'
            );
            if (choice !== 'Download Anyway') {
                await vscode.window.showTextDocument(existingDoc.uri);
                return;
            }
        }

        fs.mkdirSync(path.dirname(localPath), { recursive: true });

        // Download the file
        const downloaded = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Downloading ${label}...`,
            cancellable: false
        }, async () => {
            const result = await executeC64U(['fs', 'download', remotePath, localPath]);
            if (!result.success) {
                vscode.window.showErrorMessage(`Failed to download ${label}: ${result.error}`);
                return false;
            }
            return true;
        });

        if (!downloaded) {
            return;
        }

        // Track the mapping
        this.fileMap.set(localPath, { localPath, remotePath, isText });

        // Open in the appropriate editor
        const uri = vscode.Uri.file(localPath);
        if (isText) {
            await vscode.window.showTextDocument(uri);
        } else {
            // Check if Hex Editor extension is available
            const hexEditorExt = vscode.extensions.getExtension('ms-vscode.hexeditor');
            console.log(`[C64U FileOpen] Hex Editor extension found: ${!!hexEditorExt}`);
            if (hexEditorExt) {
                console.log(`[C64U FileOpen] Opening with hexEditor.hexedit: ${uri.fsPath}`);
                await vscode.commands.executeCommand('vscode.openWith', uri, 'hexEditor.hexedit');
            } else {
                vscode.window.showWarningMessage(
                    'Hex Editor extension not found. Install "Hex Editor" from the marketplace to view binary files.',
                    'Install'
                ).then(choice => {
                    if (choice === 'Install') {
                        vscode.commands.executeCommand('workbench.extensions.installExtension', 'ms-vscode.hexeditor');
                    }
                });
            }
        }
    }

    private setupSaveWatcher(): void {
        const watcher = vscode.workspace.onDidSaveTextDocument(async (document) => {
            const localPath = document.uri.fsPath;
            const cached = this.fileMap.get(localPath);

            if (!cached || !cached.isText) {
                return;
            }

            // Prevent concurrent uploads of the same file
            if (this.uploading.has(localPath)) {
                return;
            }

            this.uploading.add(localPath);
            try {
                const result = await executeC64U(['fs', 'upload', localPath, cached.remotePath]);
                if (result.success) {
                    vscode.window.setStatusBarMessage(
                        `$(cloud-upload) Uploaded ${path.basename(localPath)} to C64 Ultimate`,
                        3000
                    );
                } else {
                    vscode.window.showErrorMessage(
                        `Failed to upload ${path.basename(localPath)}: ${result.error}`
                    );
                }
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Upload failed: ${msg}`);
            } finally {
                this.uploading.delete(localPath);
            }
        });

        this.disposables.push(watcher);
    }

    dispose(): void {
        for (const d of this.disposables) {
            d.dispose();
        }
        this.disposables = [];
        this.fileMap.clear();
    }
}
