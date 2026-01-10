import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as fs from 'fs';

export class ViceService {
    async run(prgPath: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('c64');
        const viceBinary = config.get<string>('viceBinary') || 'x64';

        if (!fs.existsSync(prgPath)) {
            vscode.window.showErrorMessage(`PRG file not found: ${prgPath}. Assemble first.`);
            return;
        }

        // Use VICE autostart mode to load and run the PRG
        const command = `${viceBinary} -autostartprgmode 1 "${prgPath}"`;

        try {
            child_process.exec(command, (error) => {
                if (error) {
                    vscode.window.showErrorMessage(`Failed to start VICE: ${error.message}`);
                }
            });

            vscode.window.showInformationMessage(`Started VICE with ${prgPath}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to start VICE: ${error}`);
        }
    }
}
