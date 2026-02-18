import * as vscode from 'vscode';
import { executeC64U } from './cli';
import { FileBrowserProvider } from './fileBrowser';

export class C64UService {
    private fileBrowserProvider: FileBrowserProvider;

    constructor() {
        this.fileBrowserProvider = new FileBrowserProvider();
    }

    async uploadAndRun(prgPath: string): Promise<void> {
        const remotePath = `/Temp/${prgPath.split('/').pop()}`;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'C64 Ultimate',
            cancellable: false
        }, async (progress) => {
            progress.report({ message: 'Uploading PRG...' });
            const uploadResult = await executeC64U(['fs', 'upload', prgPath, remotePath]);

            if (!uploadResult.success) {
                vscode.window.showErrorMessage(`Upload failed: ${uploadResult.error}`);
                return;
            }

            progress.report({ message: 'Running on C64...' });
            const runResult = await executeC64U(['runners', 'run-prg', remotePath]);

            if (!runResult.success) {
                vscode.window.showErrorMessage(`Failed to run: ${runResult.error}`);
                return;
            }

            vscode.window.showInformationMessage('Program uploaded and running on C64 Ultimate');
        });
    }

    async showFileBrowser(): Promise<void> {
        await this.fileBrowserProvider.show();
    }

    async executeMachineAction(action: string): Promise<void> {
        const result = await executeC64U(['machine', action]);
        if (result.success) {
            vscode.window.showInformationMessage(`Machine ${action} executed`);
        } else {
            vscode.window.showErrorMessage(`Machine control failed: ${result.error}`);
        }
    }

    async showMachineControl(): Promise<void> {
        const actions = [
            { label: '$(debug-restart) Reset', value: 'reset' },
            { label: '$(refresh) Reboot', value: 'reboot' },
            { label: '$(debug-pause) Pause', value: 'pause' },
            { label: '$(debug-continue) Resume', value: 'resume' },
            { label: '$(power) Power Off', value: 'poweroff' }
        ];

        const selected = await vscode.window.showQuickPick(actions, {
            placeHolder: 'Select machine control action'
        });

        if (!selected) {
            return;
        }

        const result = await executeC64U(['machine', selected.value]);
        if (result.success) {
            vscode.window.showInformationMessage(`Machine ${selected.value} executed`);
        } else {
            vscode.window.showErrorMessage(`Machine control failed: ${result.error}`);
        }
    }

    async uploadFile(): Promise<void> {
        const fileUri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            title: 'Select file to upload'
        });

        if (!fileUri || fileUri.length === 0) {
            return;
        }

        const localPath = fileUri[0].fsPath;
        const remotePath = await vscode.window.showInputBox({
            prompt: 'Remote path on C64 Ultimate',
            value: `/Temp/${localPath.split('/').pop()}`
        });

        if (!remotePath) {
            return;
        }

        const result = await executeC64U(['fs', 'upload', localPath, remotePath]);
        if (result.success) {
            vscode.window.showInformationMessage(`Uploaded to ${remotePath}`);
        } else {
            vscode.window.showErrorMessage(`Upload failed: ${result.error}`);
        }
    }

    async downloadFile(): Promise<void> {
        const remotePath = await vscode.window.showInputBox({
            prompt: 'Remote path to download from C64 Ultimate',
            value: '/Temp/'
        });

        if (!remotePath) {
            return;
        }

        const localUri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(remotePath.split('/').pop() || 'download.prg'),
            title: 'Save downloaded file as'
        });

        if (!localUri) {
            return;
        }

        const result = await executeC64U(['fs', 'download', remotePath, localUri.fsPath]);
        if (result.success) {
            vscode.window.showInformationMessage(`Downloaded to ${localUri.fsPath}`);
        } else {
            vscode.window.showErrorMessage(`Download failed: ${result.error}`);
        }
    }

    async createDirectory(): Promise<void> {
        const dirPath = await vscode.window.showInputBox({
            prompt: 'Directory path to create on C64 Ultimate',
            value: '/Temp/'
        });

        if (!dirPath) {
            return;
        }

        const result = await executeC64U(['fs', 'mkdir', dirPath]);
        if (result.success) {
            vscode.window.showInformationMessage(`Created directory: ${dirPath}`);
        } else {
            vscode.window.showErrorMessage(`Failed to create directory: ${result.error}`);
        }
    }

    async removeFile(): Promise<void> {
        const filePath = await vscode.window.showInputBox({
            prompt: 'Path to remove from C64 Ultimate',
            value: '/Temp/'
        });

        if (!filePath) {
            return;
        }

        const confirm = await vscode.window.showWarningMessage(
            `Delete "${filePath}"?`,
            { modal: true },
            'Yes'
        );

        if (confirm !== 'Yes') {
            return;
        }

        const result = await executeC64U(['fs', 'rm', filePath]);
        if (result.success) {
            vscode.window.showInformationMessage(`Removed: ${filePath}`);
        } else {
            vscode.window.showErrorMessage(`Failed to remove: ${result.error}`);
        }
    }

    async moveFile(): Promise<void> {
        const source = await vscode.window.showInputBox({
            prompt: 'Source path on C64 Ultimate'
        });

        if (!source) {
            return;
        }

        const dest = await vscode.window.showInputBox({
            prompt: 'Destination path on C64 Ultimate'
        });

        if (!dest) {
            return;
        }

        const result = await executeC64U(['fs', 'mv', source, dest]);
        if (result.success) {
            vscode.window.showInformationMessage(`Moved: ${source} → ${dest}`);
        } else {
            vscode.window.showErrorMessage(`Failed to move: ${result.error}`);
        }
    }

    async copyFile(): Promise<void> {
        const source = await vscode.window.showInputBox({
            prompt: 'Source path on C64 Ultimate'
        });

        if (!source) {
            return;
        }

        const dest = await vscode.window.showInputBox({
            prompt: 'Destination path on C64 Ultimate'
        });

        if (!dest) {
            return;
        }

        const result = await executeC64U(['fs', 'cp', source, dest]);
        if (result.success) {
            vscode.window.showInformationMessage(`Copied: ${source} → ${dest}`);
        } else {
            vscode.window.showErrorMessage(`Failed to copy: ${result.error}`);
        }
    }

    async listDirectory(): Promise<void> {
        const dirPath = await vscode.window.showInputBox({
            prompt: 'Directory path on C64 Ultimate',
            value: '/'
        });

        if (!dirPath) {
            return;
        }

        const result = await executeC64U(['fs', 'ls', dirPath]);
        if (result.success) {
            const outputChannel = vscode.window.createOutputChannel('C64 Ultimate');
            outputChannel.clear();
            outputChannel.appendLine(`Directory listing: ${dirPath}`);
            outputChannel.appendLine('');
            outputChannel.appendLine(result.output);
            outputChannel.show();
        } else {
            vscode.window.showErrorMessage(`Failed to list directory: ${result.error}`);
        }
    }

    async showFileInfo(): Promise<void> {
        const filePath = await vscode.window.showInputBox({
            prompt: 'File path on C64 Ultimate'
        });

        if (!filePath) {
            return;
        }

        const result = await executeC64U(['fs', 'cat', filePath]);
        if (result.success) {
            vscode.window.showInformationMessage(result.output);
        } else {
            vscode.window.showErrorMessage(`Failed to get file info: ${result.error}`);
        }
    }
}
