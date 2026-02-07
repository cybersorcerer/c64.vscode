import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export class ViceService {
    async run(prgPath: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('c64');
        const viceBinary = config.get<string>('viceBinary') || 'x64';

        if (!fs.existsSync(prgPath)) {
            vscode.window.showErrorMessage(`PRG file not found: ${prgPath}. Assemble first.`);
            return;
        }

        // Use VICE autostart mode to load and run the PRG
        const command = `"${viceBinary}" -autostartprgmode 1 "${prgPath}"`;

        const process = child_process.exec(command, (error, _stdout, stderr) => {
            if (error) {
                // Check for common error cases
                if (error.message.includes('ENOENT') || error.message.includes('not found')) {
                    vscode.window.showErrorMessage(
                        `VICE emulator not found: ${viceBinary}. Please install VICE or configure c64.viceBinary in settings.`
                    );
                } else {
                    vscode.window.showErrorMessage(`Failed to start VICE: ${error.message}`);
                }
            }
            if (stderr && stderr.trim()) {
                console.error('VICE stderr:', stderr);
            }
        });

        // Check if process started successfully
        if (process.pid) {
            vscode.window.showInformationMessage(`Started VICE with ${path.basename(prgPath)}`);
        }
    }
}
