import * as vscode from 'vscode';
import * as child_process from 'child_process';
import { getC64uPath, logBinaryResolution } from '../binaries';

export interface C64UResult {
    success: boolean;
    output: string;
    error?: string;
}

// Extension path, set during activation
let extensionPath: string = '';

export function initC64UCli(extPath: string): void {
    extensionPath = extPath;

    // Log binary resolution at startup
    const resolution = getC64uPath(extensionPath);
    logBinaryResolution('c64u', resolution);
}

function getCliBinary(): string {
    const resolution = getC64uPath(extensionPath);
    return resolution.path;
}

export async function executeC64U(args: string[]): Promise<C64UResult> {
    const config = vscode.workspace.getConfiguration('c64u');
    const cliBinary = getCliBinary();
    const host = config.get<string>('host');
    const port = config.get<number>('port');

    const cmdArgs: string[] = [];

    // Add host and port if configured
    if (host) {
        cmdArgs.push('--host', host);
    }
    if (port) {
        cmdArgs.push('--port', port.toString());
    }

    // Add the actual command arguments
    cmdArgs.push(...args);

    return new Promise((resolve) => {
        child_process.execFile(cliBinary, cmdArgs, (error, stdout, stderr) => {
            if (error) {
                resolve({
                    success: false,
                    output: stdout,
                    error: stderr || error.message
                });
            } else {
                resolve({
                    success: true,
                    output: stdout.trim()
                });
            }
        });
    });
}

export async function executeC64UJson<T>(args: string[]): Promise<T | null> {
    const config = vscode.workspace.getConfiguration('c64u');
    const cliBinary = getCliBinary();
    const host = config.get<string>('host');
    const port = config.get<number>('port');

    const cmdArgs: string[] = [];

    // Add host and port if configured
    if (host) {
        cmdArgs.push('--host', host);
    }
    if (port) {
        cmdArgs.push('--port', port.toString());
    }

    // Add JSON flag
    cmdArgs.push('--json');

    // Add the actual command arguments
    cmdArgs.push(...args);

    return new Promise((resolve) => {
        child_process.execFile(cliBinary, cmdArgs, (error, stdout, stderr) => {
            if (error) {
                console.error('c64u command failed:', stderr || error.message);
                resolve(null);
            } else {
                try {
                    // Handle empty output (e.g., empty directory)
                    const trimmedOutput = stdout.trim();
                    if (trimmedOutput === '') {
                        // Empty output means empty array for list commands
                        resolve([] as T);
                    } else {
                        const result = JSON.parse(trimmedOutput);
                        resolve(result);
                    }
                } catch (parseError) {
                    console.error('Failed to parse c64u JSON output:', parseError);
                    console.error('Output was:', stdout);
                    resolve(null);
                }
            }
        });
    });
}
