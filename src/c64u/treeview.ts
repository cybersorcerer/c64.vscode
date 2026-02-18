import * as vscode from 'vscode';
import * as path from 'path';
import { C64UClient } from './client';
import { C64UFileOpenManager } from './file-open-manager';

// Machine control actions shown as direct tree items
const MACHINE_ACTIONS: { label: string; action: string; icon: string; description: string }[] = [
    { label: 'Reset',     action: 'reset',    icon: 'debug-restart',  description: 'Soft reset' },
    { label: 'Reboot',    action: 'reboot',   icon: 'refresh',        description: 'Full reboot' },
    { label: 'Pause',     action: 'pause',    icon: 'debug-pause',    description: 'Pause machine' },
    { label: 'Resume',    action: 'resume',   icon: 'debug-continue', description: 'Resume machine' },
    { label: 'Power Off', action: 'poweroff', icon: 'circle-slash',   description: 'Power off' },
];

export class C64UFileSystemProvider implements vscode.TreeDataProvider<C64UTreeItem>, vscode.TreeDragAndDropController<C64UTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<C64UTreeItem | undefined | null | void> = new vscode.EventEmitter<C64UTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<C64UTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private client: C64UClient;
    private currentPath: string = '/';
    private treeItemCache: Map<string, C64UTreeItem> = new Map();

    // Drag and Drop support
    dropMimeTypes = ['application/vnd.code.tree.c64uFileExplorer'];
    dragMimeTypes = ['text/uri-list'];

    constructor(private config: vscode.WorkspaceConfiguration) {
        this.client = new C64UClient();
    }

    refresh(item?: C64UTreeItem): void {
        console.log('[C64U TreeView] Refresh called, clearing cache');
        // Clear cache to force reload
        this.treeItemCache.clear();
        // Always refresh entire tree to ensure consistency
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: C64UTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: C64UTreeItem): Promise<C64UTreeItem[]> {
        if (!this.config.get<boolean>('enabled')) {
            return [new C64UTreeItem(
                'C64 Ultimate integration disabled',
                vscode.TreeItemCollapsibleState.None,
                'message',
                '/'
            )];
        }

        // Root level: show Machine section and File System section
        if (!element) {
            return [
                new C64UTreeItem('Machine', vscode.TreeItemCollapsibleState.Expanded, 'machine-root', '__machine__'),
                new C64UTreeItem('File System', vscode.TreeItemCollapsibleState.Expanded, 'filesystem-root', '/'),
            ];
        }

        // Machine section children: individual machine actions
        if (element.itemType === 'machine-root') {
            return MACHINE_ACTIONS.map(a => new C64UTreeItem(
                a.label,
                vscode.TreeItemCollapsibleState.None,
                'machine-action',
                `__machine__/${a.action}`,
                undefined,
                a.icon,
                a.description
            ));
        }

        // File System section children: existing file browsing logic
        try {
            const targetPath = element.itemType === 'filesystem-root' ? '/' : element.resourcePath;
            console.log(`[C64U TreeView] Loading children for: ${targetPath}`);
            const files = await this.client.listFiles(targetPath);

            // Add parent directory entry if not at root
            const items: C64UTreeItem[] = [];
            if (targetPath !== '/') {
                const parentPath = targetPath.substring(0, targetPath.lastIndexOf('/')) || '/';
                items.push(new C64UTreeItem(
                    '..',
                    vscode.TreeItemCollapsibleState.None,
                    'parent',
                    parentPath
                ));
            }

            // Sort: directories first, then files
            files.sort((a, b) => {
                if (a.is_dir === b.is_dir) {
                    return a.name.localeCompare(b.name);
                }
                return a.is_dir ? -1 : 1;
            });

            for (const file of files) {
                const fullPath = targetPath === '/' ? `/${file.name}` : `${targetPath}/${file.name}`;

                // Check if this is a disk image (can be expanded like a directory)
                const ext = path.extname(file.name).toLowerCase();
                const isDiskImage = ['.d64', '.d71', '.d81', '.g64', '.g71', '.dnp'].includes(ext);

                // Directories and disk images should be collapsible
                const state = (file.is_dir || isDiskImage)
                    ? vscode.TreeItemCollapsibleState.Collapsed
                    : vscode.TreeItemCollapsibleState.None;

                const item = new C64UTreeItem(
                    file.name,
                    state,
                    this.getItemType(file),
                    fullPath,
                    file.size
                );

                items.push(item);
            }

            // If directory is empty, show a friendly message
            if (items.length === 0) {
                console.log(`[C64U TreeView] Directory ${targetPath} is empty`);
                return [new C64UTreeItem(
                    'Empty directory',
                    vscode.TreeItemCollapsibleState.None,
                    'message',
                    targetPath
                )];
            }

            console.log(`[C64U TreeView] Returning ${items.length} items for ${targetPath}`);
            return items;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to list C64U directory: ${errorMsg}`);
            return [new C64UTreeItem(
                'Failed to load directory',
                vscode.TreeItemCollapsibleState.None,
                'error',
                '/'
            )];
        }
    }

    private getItemType(file: any): C64UItemType {
        if (file.is_dir) {
            return 'directory';
        }

        const ext = path.extname(file.name).toLowerCase();
        switch (ext) {
            case '.d64':
            case '.d71':
            case '.d81':
                return 'diskimage';
            case '.g64':
            case '.g71':
                return 'diskimage-gcr';
            case '.prg':
                return 'program';
            case '.sid':
                return 'sid';
            case '.crt':
                return 'cartridge';
            case '.asm':
            case '.bas':
            case '.seq':
            case '.txt':
            case '.cfg':
            case '.inc':
            case '.sym':
            case '.dbg':
                return 'textfile';
            case '.bin':
            case '.tap':
            case '.t64':
            case '.rel':
            case '.ko':
                return 'binaryfile';
            default:
                return 'file';
        }
    }

    navigateTo(targetPath: string): void {
        this.currentPath = targetPath;
        this.refresh();
    }

    // Drag and Drop implementation
    async handleDrag(source: readonly C64UTreeItem[], dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
        // Store the dragged items
        dataTransfer.set('application/vnd.code.tree.c64uFileExplorer', new vscode.DataTransferItem(source));
    }

    async handleDrop(target: C64UTreeItem | undefined, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
        const transferItem = dataTransfer.get('application/vnd.code.tree.c64uFileExplorer');
        if (!transferItem) {
            return;
        }

        const draggedItems = transferItem.value as C64UTreeItem[];

        // Determine target directory
        let targetDir: string;
        if (!target) {
            targetDir = '/'; // Dropped on root
        } else if (target.itemType === 'directory') {
            targetDir = target.resourcePath;
        } else {
            // Dropped on a file - use parent directory (Unix-style path handling)
            const lastSlash = target.resourcePath.lastIndexOf('/');
            targetDir = lastSlash > 0 ? target.resourcePath.substring(0, lastSlash) : '/';
        }

        console.log(`[C64U Drag&Drop] Target directory: ${targetDir}`);

        // Check if target is root directory
        if (targetDir === '/') {
            vscode.window.showErrorMessage('Cannot move or copy files to root directory. C64 Ultimate file system does not support files in root. Please select a subdirectory.');
            return;
        }

        // Move each dragged item
        for (const item of draggedItems) {
            // Skip special items
            if (item.itemType === 'parent' || item.itemType === 'message' || item.itemType === 'error' ||
                item.itemType === 'machine-root' || item.itemType === 'machine-action' || item.itemType === 'filesystem-root') {
                continue;
            }

            try {
                const fileName = path.basename(item.resourcePath);
                const fileExt = path.extname(fileName);
                const baseName = path.basename(fileName, fileExt);

                console.log(`[C64U Drag&Drop] Moving: ${item.resourcePath} -> ${targetDir}`);
                console.log(`[C64U Drag&Drop] fileName: ${fileName}, baseName: ${baseName}, ext: ${fileExt}`);

                // Skip if source and target are the same directory
                const sourceDir = item.resourcePath.substring(0, item.resourcePath.lastIndexOf('/')) || '/';
                if (sourceDir === targetDir) {
                    console.log(`[C64U Drag&Drop] Source and target are same directory, skipping`);
                    continue;
                }

                // Find unique filename if conflict exists
                let finalPath = targetDir === '/' ? `/${fileName}` : `${targetDir}/${fileName}`;
                let finalFileName = fileName;

                // Check if file exists and generate unique name
                const { executeC64UJson } = await import('./cli');
                const targetFiles = await executeC64UJson<any[]>(['fs', 'ls', targetDir]);

                if (targetFiles) {
                    const existingNames = new Set(targetFiles.map((f: any) => f.Name));
                    console.log(`[C64U Drag&Drop] Existing files in target:`, Array.from(existingNames));

                    if (existingNames.has(fileName)) {
                        // Generate unique name: filename_1.ext, filename_2.ext, etc.
                        let counter = 1;
                        do {
                            finalFileName = `${baseName}_${counter}${fileExt}`;
                            finalPath = targetDir === '/' ? `/${finalFileName}` : `${targetDir}/${finalFileName}`;
                            counter++;
                        } while (existingNames.has(finalFileName));
                        console.log(`[C64U Drag&Drop] Renamed to avoid conflict: ${finalFileName}`);
                    }
                }

                console.log(`[C64U Drag&Drop] Final path: ${finalPath}`);

                // Use c64u CLI to move the file
                const { executeC64U } = await import('./cli');

                // Try mv first (works within same device/partition)
                console.log(`[C64U Drag&Drop] Executing: c64u fs mv ${item.resourcePath} ${finalPath}`);
                let moveResult = await executeC64U(['fs', 'mv', item.resourcePath, finalPath]);

                // If mv fails, fall back to copy + delete (cross-device move)
                if (!moveResult.success && moveResult.error?.includes('450')) {
                    console.log(`[C64U Drag&Drop] mv failed with 450, trying copy+delete fallback`);
                    const copyResult = await executeC64U(['fs', 'cp', item.resourcePath, finalPath]);

                    if (!copyResult.success) {
                        console.error(`[C64U Drag&Drop] Copy failed:`, copyResult.error);
                        vscode.window.showErrorMessage(`Failed to copy ${fileName}: ${copyResult.error}`);
                        continue;
                    }

                    console.log(`[C64U Drag&Drop] Copy successful, deleting original`);
                    const deleteResult = await executeC64U(['fs', 'rm', item.resourcePath]);

                    if (!deleteResult.success) {
                        console.error(`[C64U Drag&Drop] Delete failed:`, deleteResult.error);
                        vscode.window.showErrorMessage(`Copied ${fileName} but failed to delete original: ${deleteResult.error}`);
                        continue;
                    }

                    moveResult = { success: true, output: '' };
                }

                if (!moveResult.success) {
                    console.error(`[C64U Drag&Drop] Move failed:`, moveResult.error);
                    vscode.window.showErrorMessage(`Failed to move ${fileName}: ${moveResult.error}`);
                } else {
                    console.log(`[C64U Drag&Drop] Move successful`);
                    if (finalFileName !== fileName) {
                        vscode.window.showInformationMessage(`Moved ${fileName} to ${targetDir}/${finalFileName} (renamed to avoid conflict)`);
                    } else {
                        vscode.window.showInformationMessage(`Moved ${fileName} to ${targetDir}`);
                    }
                }
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Failed to move file: ${errorMsg}`);
            }
        }

        // Refresh the tree
        this.refresh();
    }
}

type C64UItemType = 'directory' | 'diskimage' | 'diskimage-gcr' | 'program' | 'sid' | 'cartridge' | 'textfile' | 'binaryfile' | 'file' | 'parent' | 'message' | 'error' | 'machine-root' | 'machine-action' | 'filesystem-root';

export class C64UTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly itemType: C64UItemType,
        public readonly resourcePath: string,
        public readonly fileSize?: number,
        customIcon?: string,
        description?: string
    ) {
        super(label, collapsibleState);

        this.contextValue = itemType;
        this.tooltip = this.buildTooltip();
        this.iconPath = customIcon ? new vscode.ThemeIcon(customIcon) : this.getIcon();
        this.description = description ?? this.getDescription();

        // Machine actions execute on click
        if (itemType === 'machine-action') {
            const action = resourcePath.replace('__machine__/', '');
            this.command = {
                command: 'c64u.treeview.machine',
                title: label,
                arguments: [action]
            };
        }

        // Make clickable items that navigate
        if (itemType === 'directory' || itemType === 'parent') {
            this.command = {
                command: 'c64u.treeview.navigate',
                title: 'Navigate',
                arguments: [this]
            };
        } else if (itemType === 'filesystem-root') {
            // File System root navigates to /
            this.command = undefined;
        } else if (C64UFileOpenManager.isOpenableFile(label) && itemType !== 'machine-action') {
            this.command = {
                command: 'c64u.treeview.openFile',
                title: 'Open File',
                arguments: [this]
            };
        }
    }

    private buildTooltip(): string {
        if (this.itemType === 'message' || this.itemType === 'error') {
            return this.label;
        }
        if (this.itemType === 'machine-root') {
            return 'C64 Ultimate Machine Control';
        }
        if (this.itemType === 'machine-action') {
            return `Execute: ${this.label}`;
        }
        if (this.itemType === 'filesystem-root') {
            return 'C64 Ultimate File System';
        }

        let tooltip = `Path: ${this.resourcePath}`;
        if (this.fileSize !== undefined) {
            tooltip += `\nSize: ${this.formatFileSize(this.fileSize)}`;
        }
        tooltip += `\nType: ${this.itemType}`;
        return tooltip;
    }

    private getIcon(): vscode.ThemeIcon {
        switch (this.itemType) {
            case 'machine-root':
                return new vscode.ThemeIcon('vm');
            case 'machine-action':
                return new vscode.ThemeIcon('gear');
            case 'filesystem-root':
                return new vscode.ThemeIcon('server');
            case 'directory':
                return new vscode.ThemeIcon('folder');
            case 'parent':
                return new vscode.ThemeIcon('folder-opened');
            case 'diskimage':
            case 'diskimage-gcr':
                return new vscode.ThemeIcon('database');
            case 'program':
            case 'binaryfile':
                return new vscode.ThemeIcon('file-binary');
            case 'textfile':
                return new vscode.ThemeIcon('file-code');
            case 'sid':
                return new vscode.ThemeIcon('music');
            case 'cartridge':
                return new vscode.ThemeIcon('circuit-board');
            case 'error':
                return new vscode.ThemeIcon('error');
            case 'message':
                return new vscode.ThemeIcon('info');
            default:
                return new vscode.ThemeIcon('file');
        }
    }

    private getDescription(): string | undefined {
        if (this.fileSize !== undefined && this.itemType !== 'directory') {
            return this.formatFileSize(this.fileSize);
        }
        return undefined;
    }

    private formatFileSize(bytes: number): string {
        if (bytes < 1024) {
            return `${bytes} B`;
        } else if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        } else {
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        }
    }
}
