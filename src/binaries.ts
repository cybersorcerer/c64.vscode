import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as child_process from 'child_process';

export type BinarySource = 'settings' | 'path' | 'bundled' | 'not_found';

export interface BinaryResolution {
    path: string;
    source: BinarySource;
}

/**
 * Get the platform-specific binary directory name
 */
function getPlatformDir(): string {
    const platform = os.platform();
    const arch = os.arch();

    let platformName: string;
    switch (platform) {
        case 'darwin':
            platformName = 'darwin';
            break;
        case 'linux':
            platformName = 'linux';
            break;
        case 'win32':
            platformName = 'windows';
            break;
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }

    let archName: string;
    switch (arch) {
        case 'x64':
            archName = 'amd64';
            break;
        case 'arm64':
            archName = 'arm64';
            break;
        default:
            throw new Error(`Unsupported architecture: ${arch}`);
    }

    return `${platformName}-${archName}`;
}

/**
 * Get the file extension for executables on the current platform
 */
function getExecutableExtension(): string {
    return os.platform() === 'win32' ? '.exe' : '';
}

/**
 * Check if a binary exists in the system PATH
 */
function findInPath(binaryName: string): string | undefined {
    try {
        const command = os.platform() === 'win32' ? 'where' : 'which';
        const result = child_process.execSync(`${command} ${binaryName}`, {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
        });
        const foundPath = result.trim().split('\n')[0];
        if (foundPath && fs.existsSync(foundPath)) {
            return foundPath;
        }
    } catch {
        // Binary not found in PATH
    }
    return undefined;
}

/**
 * Get the path to a bundled binary
 */
function getBundledPath(extensionPath: string, binaryName: string): string | undefined {
    try {
        const platformDir = getPlatformDir();
        const ext = getExecutableExtension();
        const bundledPath = path.join(extensionPath, 'binaries', platformDir, `${binaryName}${ext}`);

        if (fs.existsSync(bundledPath)) {
            return bundledPath;
        }
    } catch {
        // Platform not supported
    }
    return undefined;
}

/**
 * Resolve a binary path with priority:
 * 1. User-configured path in settings (if set and exists)
 * 2. System PATH lookup
 * 3. Bundled binary as fallback
 */
export function resolveBinaryPath(
    extensionPath: string,
    binaryName: string,
    configuredPath?: string
): BinaryResolution {
    // 1. Check if user has configured an explicit path
    if (configuredPath && configuredPath.trim() !== '') {
        // If it's an absolute path, check if it exists
        if (path.isAbsolute(configuredPath)) {
            if (fs.existsSync(configuredPath)) {
                return { path: configuredPath, source: 'settings' };
            }
            // Configured path doesn't exist - continue to other options
        } else {
            // Relative path or just binary name - try to find in PATH
            const pathResult = findInPath(configuredPath);
            if (pathResult) {
                return { path: pathResult, source: 'settings' };
            }
        }
    }

    // 2. Try to find in system PATH
    const pathResult = findInPath(binaryName);
    if (pathResult) {
        return { path: pathResult, source: 'path' };
    }

    // 3. Fall back to bundled binary
    const bundledPath = getBundledPath(extensionPath, binaryName);
    if (bundledPath) {
        return { path: bundledPath, source: 'bundled' };
    }

    // Not found anywhere
    return { path: binaryName, source: 'not_found' };
}

/**
 * Get the path to kickass_ls binary
 * Settings key: c64.kickassLsBinary
 */
export function getKickassLsPath(extensionPath: string): BinaryResolution {
    const config = vscode.workspace.getConfiguration('c64');
    const configuredPath = config.get<string>('kickassLsBinary');
    return resolveBinaryPath(extensionPath, 'kickass_ls', configuredPath);
}

/**
 * Get the path to c64u binary
 * Settings key: c64u.cliBinary
 */
export function getC64uPath(extensionPath: string): BinaryResolution {
    const config = vscode.workspace.getConfiguration('c64u');
    const configuredPath = config.get<string>('cliBinary');
    return resolveBinaryPath(extensionPath, 'c64u', configuredPath);
}

/**
 * Get the path to the kickass_ls config directory (for JSON data files)
 */
export function getKickassLsConfigDir(extensionPath: string): string | undefined {
    // Check user's home config first
    const homeConfig = path.join(os.homedir(), '.config', 'kickass_ls');
    if (fs.existsSync(homeConfig)) {
        return homeConfig;
    }

    // Fall back to bundled config
    try {
        const platformDir = getPlatformDir();
        const configDir = path.join(extensionPath, 'binaries', platformDir);

        const kickassJson = path.join(configDir, 'kickass.json');
        if (fs.existsSync(kickassJson)) {
            return configDir;
        }
    } catch {
        // Platform not supported
    }

    return undefined;
}

/**
 * Check if bundled binaries are available for the current platform
 */
export function hasBundledBinaries(extensionPath: string): boolean {
    try {
        const platformDir = getPlatformDir();
        const binariesDir = path.join(extensionPath, 'binaries', platformDir);
        return fs.existsSync(binariesDir);
    } catch {
        return false;
    }
}

/**
 * Log binary resolution for debugging
 */
export function logBinaryResolution(binaryName: string, result: BinaryResolution): void {
    const sourceLabel = {
        'settings': 'user settings',
        'path': 'system PATH',
        'bundled': 'bundled binary',
        'not_found': 'NOT FOUND'
    };
    console.log(`[C64] ${binaryName}: ${sourceLabel[result.source]} (${result.path})`);
}
