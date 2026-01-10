import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export class KickassemblerService {
    private outputChannel: vscode.OutputChannel;
    private diagnosticCollection: vscode.DiagnosticCollection;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Kick Assembler');
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('kickass');
    }

    async assemble(filePath: string): Promise<boolean> {
        const config = vscode.workspace.getConfiguration('c64');
        const kickassJarPath = config.get<string>('kickassJarPath');

        if (!kickassJarPath || kickassJarPath.trim() === '') {
            vscode.window.showErrorMessage('Kick Assembler JAR path not configured. Please set c64.kickassJarPath in settings.');
            return false;
        }

        if (!fs.existsSync(kickassJarPath)) {
            vscode.window.showErrorMessage(`Kick Assembler JAR not found at: ${kickassJarPath}`);
            return false;
        }

        const outputDir = path.dirname(filePath);
        const outputFile = filePath.replace(/\.(asm|s)$/, '.prg');

        this.outputChannel.clear();
        this.outputChannel.show(true);
        this.outputChannel.appendLine(`Assembling: ${filePath}`);

        return new Promise((resolve) => {
            const command = `java -jar "${kickassJarPath}" "${filePath}" -o "${outputFile}"`;

            child_process.exec(command, { cwd: outputDir }, (error, stdout, stderr) => {
                this.outputChannel.appendLine(stdout);
                if (stderr) {
                    this.outputChannel.appendLine(stderr);
                }

                // Parse output for errors and warnings
                this.parseDiagnostics(filePath, stdout + stderr);

                if (error) {
                    vscode.window.showErrorMessage('Assembly failed. Check output for errors.');
                    this.outputChannel.appendLine(`\nAssembly failed with exit code ${error.code}`);
                    resolve(false);
                } else {
                    vscode.window.showInformationMessage(`Assembly successful: ${path.basename(outputFile)}`);
                    this.outputChannel.appendLine(`\nAssembly successful: ${outputFile}`);
                    resolve(true);
                }
            });
        });
    }

    private parseDiagnostics(filePath: string, output: string) {
        const diagnostics: vscode.Diagnostic[] = [];
        const lines = output.split('\n');

        // Parse Kick Assembler error/warning format:
        // Error: file.asm:10: Error message here
        // Warning: file.asm:10: Warning message here
        const errorRegex = /^(Error|Warning):\s*(.+?):(\d+):\s*(.+)$/;

        for (const line of lines) {
            const match = line.match(errorRegex);
            if (match) {
                const [, severity, file, lineNum, message] = match;
                const lineNumber = parseInt(lineNum, 10) - 1; // VSCode uses 0-based line numbers

                const diagnostic = new vscode.Diagnostic(
                    new vscode.Range(lineNumber, 0, lineNumber, Number.MAX_VALUE),
                    message,
                    severity.toLowerCase() === 'error'
                        ? vscode.DiagnosticSeverity.Error
                        : vscode.DiagnosticSeverity.Warning
                );

                diagnostic.source = 'kickass';
                diagnostics.push(diagnostic);
            }
        }

        // Update diagnostics
        const uri = vscode.Uri.file(filePath);
        this.diagnosticCollection.set(uri, diagnostics);
    }

    dispose() {
        this.outputChannel.dispose();
        this.diagnosticCollection.dispose();
    }
}
