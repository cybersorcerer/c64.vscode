import * as vscode from 'vscode';
import { executeC64UJson } from './cli';

interface FileEntry {
    Name: string;
    Size: number;
    IsDir: boolean;
    Type: string;
}

interface QuickPickFileItem extends vscode.QuickPickItem {
    path: string;
    isDir: boolean;
    isParent?: boolean;
}

export class FileBrowserProvider {
    async show(initialPath: string = '/'): Promise<void> {
        await this.browse(initialPath);
    }

    private async browse(currentPath: string): Promise<void> {
        const entries = await this.listDirectory(currentPath);
        if (!entries) {
            vscode.window.showErrorMessage('Failed to list directory');
            return;
        }

        const items: QuickPickFileItem[] = [];

        // Add parent directory entry if not at root
        if (currentPath !== '/') {
            items.push({
                label: '$(arrow-up) ..',
                description: 'Parent directory',
                path: this.getParentPath(currentPath),
                isDir: true,
                isParent: true
            });
        }

        // Add directory entries
        const dirs = entries.filter(e => e.IsDir).sort((a, b) => a.Name.localeCompare(b.Name));
        for (const dir of dirs) {
            const path = this.joinPath(currentPath, dir.Name);
            items.push({
                label: `$(folder) ${dir.Name}`,
                description: 'Directory',
                path,
                isDir: true
            });
        }

        // Add file entries
        const files = entries.filter(e => !e.IsDir).sort((a, b) => a.Name.localeCompare(b.Name));
        for (const file of files) {
            const path = this.joinPath(currentPath, file.Name);
            const sizeKb = (file.Size / 1024).toFixed(1);
            items.push({
                label: `$(file) ${file.Name}`,
                description: `${sizeKb} KB`,
                path,
                isDir: false
            });
        }

        const quickPick = vscode.window.createQuickPick<QuickPickFileItem>();
        quickPick.title = `C64 Ultimate File Browser: ${currentPath}`;
        quickPick.placeholder = 'Select a file or directory';
        quickPick.items = items;

        quickPick.onDidAccept(async () => {
            const selected = quickPick.selectedItems[0];
            if (!selected) {
                return;
            }

            quickPick.hide();

            if (selected.isDir) {
                // Navigate into directory
                await this.browse(selected.path);
            } else {
                // Show file actions
                await this.showFileActions(selected.path);
            }
        });

        quickPick.onDidHide(() => quickPick.dispose());
        quickPick.show();
    }

    private async listDirectory(path: string): Promise<FileEntry[] | null> {
        return await executeC64UJson<FileEntry[]>(['fs', 'ls', path]);
    }

    private joinPath(base: string, name: string): string {
        if (base === '/') {
            return `/${name}`;
        }
        return `${base}/${name}`;
    }

    private getParentPath(path: string): string {
        const parts = path.split('/').filter(p => p.length > 0);
        parts.pop();
        return parts.length === 0 ? '/' : '/' + parts.join('/');
    }

    private async showFileActions(filePath: string): Promise<void> {
        const actions = [
            { label: '$(cloud-download) Download', value: 'download' },
            { label: '$(play) Run (PRG)', value: 'run' },
            { label: '$(play) Run (CRT)', value: 'runc' },
            { label: '$(save-as) Mount (Disk Image)', value: 'mount' },
            { label: '$(info) File Info', value: 'info' },
            { label: '$(trash) Delete', value: 'delete' }
        ];

        const selected = await vscode.window.showQuickPick(actions, {
            placeHolder: `Actions for ${filePath.split('/').pop()}`
        });

        if (!selected) {
            return;
        }

        switch (selected.value) {
            case 'download':
                await this.downloadFile(filePath);
                break;
            case 'run':
                await this.runPrg(filePath);
                break;
            case 'runc':
                await this.runCrt(filePath);
                break;
            case 'mount':
                await this.mountImage(filePath);
                break;
            case 'info':
                await this.showFileInfo(filePath);
                break;
            case 'delete':
                await this.deleteFile(filePath);
                break;
        }
    }

    private async downloadFile(remotePath: string): Promise<void> {
        const localUri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(remotePath.split('/').pop() || 'download'),
            title: 'Save downloaded file as'
        });

        if (!localUri) {
            return;
        }

        const { executeC64U } = await import('./cli');
        const result = await executeC64U(['fs', 'download', remotePath, localUri.fsPath]);

        if (result.success) {
            vscode.window.showInformationMessage(`Downloaded to ${localUri.fsPath}`);
        } else {
            vscode.window.showErrorMessage(`Download failed: ${result.error}`);
        }
    }

    private async runPrg(prgPath: string): Promise<void> {
        const { executeC64U } = await import('./cli');
        const result = await executeC64U(['runners', 'run-prg', prgPath]);

        if (result.success) {
            vscode.window.showInformationMessage(`Running ${prgPath} on C64 Ultimate`);
        } else {
            vscode.window.showErrorMessage(`Failed to run: ${result.error}`);
        }
    }

    private async runCrt(prgPath: string): Promise<void> {
        const { executeC64U } = await import('./cli');
        const result = await executeC64U(['runners', 'run-crt', prgPath]);

        if (result.success) {
            vscode.window.showInformationMessage(`Running ${prgPath} on C64 Ultimate`);
        } else {
            vscode.window.showErrorMessage(`Failed to run: ${result.error}`);
        }
    }

    private async mountImage(imagePath: string): Promise<void> {
        const driveOptions = [
            { label: 'Drive 8 (a)', value: 'a' },
            { label: 'Drive 9 (b)', value: 'b' }
        ];

        const drive = await vscode.window.showQuickPick(driveOptions, {
            placeHolder: 'Select IEC drive'
        });

        if (!drive) {
            return;
        }

        const modeOptions = [
            { label: 'Read/Write', value: 'readwrite' },
            { label: 'Read Only', value: 'readonly' },
            { label: 'Unlinked', value: 'unlinked' }
        ];

        const mode = await vscode.window.showQuickPick(modeOptions, {
            placeHolder: 'Select mount mode'
        });

        if (!mode) {
            return;
        }

        // Determine image type from extension
        const ext = imagePath.split('.').pop()?.toLowerCase();
        let imageType = ext;

        // Map g64 -> d64, g71 -> d71
        if (ext === 'g64') {
            imageType = 'd64';
        } else if (ext === 'g71') {
            imageType = 'd71';
        }

        const { executeC64U } = await import('./cli');
        const result = await executeC64U([
            'drives', 'mount', drive.value, imagePath,
            '--mode', mode.value,
            '--type', imageType || 'd64'
        ]);

        if (result.success) {
            vscode.window.showInformationMessage(`Mounted ${imagePath} to drive ${drive.value}`);
        } else {
            vscode.window.showErrorMessage(`Mount failed: ${result.error}`);
        }
    }

    private async showFileInfo(filePath: string): Promise<void> {
        const { executeC64U } = await import('./cli');
        const result = await executeC64U(['fs', 'cat', filePath]);

        if (result.success) {
            vscode.window.showInformationMessage(result.output);
        } else {
            vscode.window.showErrorMessage(`Failed to get file info: ${result.error}`);
        }
    }

    private async deleteFile(filePath: string): Promise<void> {
        const confirm = await vscode.window.showWarningMessage(
            `Delete "${filePath}"?`,
            { modal: true },
            'Yes'
        );

        if (confirm !== 'Yes') {
            return;
        }

        const { executeC64U } = await import('./cli');
        const result = await executeC64U(['fs', 'rm', filePath]);

        if (result.success) {
            vscode.window.showInformationMessage(`Deleted: ${filePath}`);
        } else {
            vscode.window.showErrorMessage(`Delete failed: ${result.error}`);
        }
    }
}
