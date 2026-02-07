import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export class KickassemblerService {
    private outputChannel: vscode.OutputChannel;
    private diagnosticCollection: vscode.DiagnosticCollection;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Kick Assembler');
        // Use a unique name to avoid conflicts with LSP diagnostics
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('kickass-assembler');
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
        const outputFile = filePath.replace(/\.(asm|kasm)$/, '.prg');

        // Clear previous diagnostics
        this.diagnosticCollection.clear();

        this.outputChannel.clear();
        this.outputChannel.show(true);
        this.outputChannel.appendLine(`Assembling: ${filePath}`);

        return new Promise((resolve) => {
            const command = `java -jar "${kickassJarPath}" "${filePath}" -o "${outputFile}"`;

            const timeout = 60000; // 60 seconds timeout for Java process
            child_process.exec(command, { cwd: outputDir, timeout }, (error, stdout, stderr) => {
                const output = stdout + stderr;

                this.outputChannel.appendLine(output);

                // Parse output for errors and warnings
                this.parseDiagnostics(filePath, output);

                if (error) {
                    if (error.killed) {
                        vscode.window.showErrorMessage('Assembly timeout - process exceeded 60 seconds');
                        this.outputChannel.appendLine(`\nAssembly timeout - process killed after 60 seconds`);
                    } else {
                        vscode.window.showErrorMessage('Assembly failed. Check Problems panel for errors.');
                        this.outputChannel.appendLine(`\nAssembly failed with exit code ${error.code}`);
                    }
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

        // Kick Assembler error formats:
        // Format 1: (filename line:col) Error: message
        // Example: (/path/to/file.asm 19:1) Error: Too few arguments
        const format1Regex = /\(([^)]+)\s+(\d+):(\d+)\)\s*(Error|Warning):\s*(.+)/;

        // Format 2: at line X, column Y in filename
        // Example: at line 19, column 1 in file.asm
        const format2Regex = /at line (\d+), column (\d+) in (.+)/;

        // Format 3: filename:line: message
        // Example: file.asm:10: Error message
        const format3Regex = /^([^:]+):(\d+):\s*(.+)$/;

        let lastError: string | undefined;

        for (const line of lines) {
            let match;
            let lineNum: number;
            let col: number = 0;
            let message: string;
            let severity: vscode.DiagnosticSeverity = vscode.DiagnosticSeverity.Error;

            // Try Format 1: (filename line:col) Error: message
            match = line.match(format1Regex);
            if (match) {
                const [, , lineStr, colStr, severityStr, msg] = match;
                lineNum = parseInt(lineStr, 10) - 1;
                col = parseInt(colStr, 10) - 1;
                message = msg;
                lastError = message;
                severity = severityStr.toLowerCase() === 'warning'
                    ? vscode.DiagnosticSeverity.Warning
                    : vscode.DiagnosticSeverity.Error;

                const diagnostic = new vscode.Diagnostic(
                    new vscode.Range(lineNum, col, lineNum, Number.MAX_VALUE),
                    message,
                    severity
                );
                diagnostic.source = 'kickass';
                diagnostics.push(diagnostic);
                continue;
            }

            // Try Format 2: at line X, column Y in filename
            match = line.match(format2Regex);
            if (match) {
                const [, lineStr, colStr] = match;
                lineNum = parseInt(lineStr, 10) - 1;
                col = parseInt(colStr, 10) - 1;
                message = lastError || line;

                const diagnostic = new vscode.Diagnostic(
                    new vscode.Range(lineNum, col, lineNum, Number.MAX_VALUE),
                    message,
                    vscode.DiagnosticSeverity.Error
                );
                diagnostic.source = 'kickass';
                diagnostics.push(diagnostic);
                continue;
            }

            // Try Format 3: filename:line: message
            match = line.match(format3Regex);
            if (match) {
                const [, , lineStr, msg] = match;
                lineNum = parseInt(lineStr, 10) - 1;
                message = msg;

                const diagnostic = new vscode.Diagnostic(
                    new vscode.Range(lineNum, 0, lineNum, Number.MAX_VALUE),
                    message,
                    vscode.DiagnosticSeverity.Error
                );
                diagnostic.source = 'kickass';
                diagnostics.push(diagnostic);
            }
        }

        // Update diagnostics
        const uri = vscode.Uri.file(filePath);
        this.diagnosticCollection.set(uri, diagnostics);
    }

    clearDiagnostics(uri: vscode.Uri) {
        this.diagnosticCollection.delete(uri);
    }

    dispose() {
        this.outputChannel.dispose();
        this.diagnosticCollection.dispose();
    }
}
