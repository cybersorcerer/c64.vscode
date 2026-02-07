import * as vscode from 'vscode';
import * as path from 'path';
import { C64UTreeItem } from './treeview';
import { C64UClient } from './client';
import { C64UFileOpenManager } from './file-open-manager';

export class C64UTreeViewActions implements vscode.Disposable {
    private fileOpenManager: C64UFileOpenManager;

    constructor(
        private client: C64UClient,
        private refreshCallback: () => void,
        extensionStoragePath: string
    ) {
        this.fileOpenManager = new C64UFileOpenManager(extensionStoragePath);
    }

    // Open file in editor (text or hex)
    async openFile(item: C64UTreeItem): Promise<void> {
        await this.fileOpenManager.openFile(item.resourcePath, item.label as string);
    }

    dispose(): void {
        this.fileOpenManager.dispose();
    }

    // Navigation
    async navigate(item: C64UTreeItem): Promise<void> {
        // Navigation is handled by the tree item command
        this.refreshCallback();
    }

    // File Operations
    async deleteFile(item: C64UTreeItem): Promise<void> {
        const confirmation = await vscode.window.showWarningMessage(
            `Delete "${item.label}"?`,
            { modal: true },
            'Delete'
        );

        if (confirmation !== 'Delete') {
            return;
        }

        try {
            await this.execC64U(['fs', 'rm', item.resourcePath]);
            vscode.window.showInformationMessage(`Deleted: ${item.label}`);
            this.refreshCallback();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to delete: ${error}`);
        }
    }

    async renameFile(item: C64UTreeItem): Promise<void> {
        const newName = await vscode.window.showInputBox({
            prompt: 'Enter new name',
            value: item.label,
            validateInput: (value) => {
                if (!value || value.trim() === '') {
                    return 'Name cannot be empty';
                }
                if (value.includes('/')) {
                    return 'Name cannot contain /';
                }
                return null;
            }
        });

        if (!newName) {
            return;
        }

        const parentPath = path.dirname(item.resourcePath);
        const newPath = parentPath === '/' ? `/${newName}` : `${parentPath}/${newName}`;

        try {
            await this.execC64U(['fs', 'mv', item.resourcePath, newPath]);
            vscode.window.showInformationMessage(`Renamed to: ${newName}`);
            this.refreshCallback();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to rename: ${error}`);
        }
    }

    async copyFile(item: C64UTreeItem): Promise<void> {
        const newName = await vscode.window.showInputBox({
            prompt: 'Enter destination name',
            value: `${item.label}.copy`,
            validateInput: (value) => {
                if (!value || value.trim() === '') {
                    return 'Name cannot be empty';
                }
                return null;
            }
        });

        if (!newName) {
            return;
        }

        const parentPath = path.dirname(item.resourcePath);

        // Check if parent is root directory
        if (parentPath === '/') {
            vscode.window.showErrorMessage('Cannot copy files to root directory. C64 Ultimate file system does not support files in root.');
            return;
        }

        const newPath = `${parentPath}/${newName}`;

        try {
            await this.execC64U(['fs', 'cp', item.resourcePath, newPath]);
            vscode.window.showInformationMessage(`Copied to: ${newName}`);
            this.refreshCallback();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to copy: ${error}`);
        }
    }

    async createDirectory(parentItem?: C64UTreeItem): Promise<void> {
        const dirName = await vscode.window.showInputBox({
            prompt: 'Enter directory name',
            value: 'NEWDIR',
            validateInput: (value) => {
                if (!value || value.trim() === '') {
                    return 'Name cannot be empty';
                }
                if (value.includes('/')) {
                    return 'Name cannot contain /';
                }
                return null;
            }
        });

        if (!dirName) {
            return;
        }

        const parentPath = parentItem?.resourcePath || '/';
        const newPath = parentPath === '/' ? `/${dirName}` : `${parentPath}/${dirName}`;

        try {
            await this.execC64U(['fs', 'mkdir', newPath]);
            vscode.window.showInformationMessage(`Created directory: ${dirName}`);
            this.refreshCallback();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create directory: ${error}`);
        }
    }

    // Disk Image Operations
    async createDiskImage(parentItem?: C64UTreeItem): Promise<void> {
        const imageType = await vscode.window.showQuickPick(
            [
                { label: 'd64 (35 tracks)', value: 'd64', tracks: 35 },
                { label: 'd64 (40 tracks)', value: 'd64', tracks: 40 },
                { label: 'd71', value: 'd71' },
                { label: 'd81', value: 'd81' },
                { label: 'g64', value: 'g64' },
                { label: 'dnp (custom tracks)', value: 'dnp' }
            ],
            { placeHolder: 'Select disk image type' }
        );

        if (!imageType) {
            return;
        }

        const fileName = await vscode.window.showInputBox({
            prompt: 'Disk image filename (without extension)',
            value: 'disk',
            validateInput: (value) => {
                if (!value || value.trim() === '') {
                    return 'Filename cannot be empty';
                }
                return null;
            }
        });

        if (!fileName) {
            return;
        }

        const diskLabel = await vscode.window.showInputBox({
            prompt: 'Disk label (max 16 characters)',
            value: fileName.substring(0, 16).toUpperCase(),
            validateInput: (value) => {
                if (value && value.length > 16) {
                    return 'Label cannot exceed 16 characters';
                }
                return null;
            }
        });

        if (!diskLabel) {
            return;
        }

        const parentPath = parentItem?.resourcePath || '/';
        const fullPath = parentPath === '/'
            ? `/${fileName}.${imageType.value}`
            : `${parentPath}/${fileName}.${imageType.value}`;

        const args = ['files', `create-${imageType.value}`, fullPath, '--name', diskLabel];

        // Handle special cases
        if (imageType.tracks === 40) {
            args.push('--tracks', '40');
        } else if (imageType.value === 'dnp') {
            const tracks = await vscode.window.showInputBox({
                prompt: 'Number of tracks (1-255)',
                value: '35',
                validateInput: (value) => {
                    const num = parseInt(value);
                    if (isNaN(num) || num < 1 || num > 255) {
                        return 'Must be a number between 1 and 255';
                    }
                    return null;
                }
            });

            if (!tracks) {
                return;
            }

            args.push('--tracks', tracks);
        }

        try {
            await this.execC64U(args);
            vscode.window.showInformationMessage(`Created ${imageType.value.toUpperCase()} image: ${fileName}.${imageType.value}`);
            this.refreshCallback();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create disk image: ${error}`);
        }
    }

    async mountDiskImage(item: C64UTreeItem): Promise<void> {
        const drive = await vscode.window.showQuickPick(
            [
                { label: 'IEC Drive A', value: 'a' },
                { label: 'IEC Drive B', value: 'b' }
            ],
            { placeHolder: 'Select IEC drive' }
        );

        if (!drive) {
            return;
        }

        const mode = await vscode.window.showQuickPick(
            [
                { label: 'Read/Write', value: 'readwrite' },
                { label: 'Read Only', value: 'readonly' },
                { label: 'Unlinked', value: 'unlinked' }
            ],
            { placeHolder: 'Select mount mode' }
        );

        if (!mode) {
            return;
        }

        // Determine image type from extension
        const ext = path.extname(item.label).toLowerCase();
        let imageType = ext.substring(1); // Remove leading dot

        // Map g64 -> d64, g71 -> d71
        if (imageType === 'g64') {
            imageType = 'd64';
        } else if (imageType === 'g71') {
            imageType = 'd71';
        }

        try {
            await this.execC64U([
                'drives',
                'mount',
                drive.value,
                item.resourcePath,
                '--type',
                imageType,
                '--mode',
                mode.value
            ]);
            vscode.window.showInformationMessage(
                `Mounted ${item.label} on drive ${drive.value.toUpperCase()} (${mode.label})`
            );
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to mount disk image: ${error}`);
        }
    }

    async unmountDrive(): Promise<void> {
        const drive = await vscode.window.showQuickPick(
            [
                { label: 'IEC Drive A', value: 'a' },
                { label: 'IEC Drive B', value: 'b' }
            ],
            { placeHolder: 'Select IEC drive to unmount' }
        );

        if (!drive) {
            return;
        }

        try {
            await this.execC64U(['drives', 'unmount', drive.value]);
            vscode.window.showInformationMessage(`Unmounted drive ${drive.value.toUpperCase()}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to unmount drive: ${error}`);
        }
    }

    // File Download/Upload
    async downloadFile(item: C64UTreeItem): Promise<void> {
        const saveUri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(item.label),
            filters: {
                'All Files': ['*']
            }
        });

        if (!saveUri) {
            return;
        }

        try {
            await this.execC64U(['fs', 'download', item.resourcePath, saveUri.fsPath]);
            vscode.window.showInformationMessage(`Downloaded to: ${saveUri.fsPath}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to download: ${error}`);
        }
    }

    async uploadFile(targetDir?: C64UTreeItem): Promise<void> {
        const fileUris = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: 'Upload',
            filters: {
                'All Files': ['*']
            }
        });

        if (!fileUris || fileUris.length === 0) {
            return;
        }

        const targetPath = targetDir?.resourcePath || '/';

        // Check if target is root directory
        if (targetPath === '/') {
            vscode.window.showErrorMessage('Cannot upload files to root directory. C64 Ultimate file system does not support files in root. Please select a subdirectory.');
            return;
        }

        const fileName = path.basename(fileUris[0].fsPath);
        // FTP requires full destination path including filename
        const destPath = targetPath === '/'
            ? `/${fileName}`
            : `${targetPath}/${fileName}`;

        console.log(`[C64U Upload] Source: ${fileUris[0].fsPath}`);
        console.log(`[C64U Upload] Target path: ${targetPath}`);
        console.log(`[C64U Upload] Dest path: ${destPath}`);
        console.log(`[C64U Upload] Command: c64u fs upload "${fileUris[0].fsPath}" "${destPath}"`);

        try {
            const { executeC64U } = await import('./cli');
            const result = await executeC64U(['fs', 'upload', fileUris[0].fsPath, destPath]);

            console.log(`[C64U Upload] Result:`, result);

            if (!result.success) {
                throw new Error(result.error || 'Upload failed');
            }

            vscode.window.showInformationMessage(`Uploaded: ${fileName}`);
            this.refreshCallback();
        } catch (error) {
            console.error(`[C64U Upload] Error:`, error);
            vscode.window.showErrorMessage(`Failed to upload: ${error}`);
        }
    }

    // Program Execution
    async runProgram(item: C64UTreeItem): Promise<void> {
        try {
            await this.execC64U(['runners', 'run-prg', item.resourcePath]);
            vscode.window.showInformationMessage(`Running: ${item.label}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to run program: ${error}`);
        }
    }

    // Cardridge Execution
    async runCrt(item: C64UTreeItem): Promise<void> {
        try {
            await this.execC64U(['runners', 'run-crt', item.resourcePath]);
            vscode.window.showInformationMessage(`Running: ${item.label}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to run cardridge: ${error}`);
        }
    }

    // Helper: Execute c64u CLI command
    private async execC64U(args: string[]): Promise<void> {
        const { executeC64U } = await import('./cli');
        const result = await executeC64U(args);

        if (!result.success) {
            throw new Error(result.error || 'Command failed');
        }
    }
}
