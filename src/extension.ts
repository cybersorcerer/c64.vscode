import * as vscode from 'vscode';
import * as path from 'path';
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('C64 Assembler extension activated');

  // Start LSP client
  startLanguageClient(context);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('c64.assemble', () => assembleFile())
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('c64.run', () => runInVICE())
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('c64.debug', () => debugInVICE())
  );
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}

function startLanguageClient(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('c64');
  const lsBinary = config.get<string>('kickassLsBinary', 'kickass_ls');

  // Server options: start kickass_ls
  const serverOptions: ServerOptions = {
    command: lsBinary,
    args: []
  };

  // Client options
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'kickass' }],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.asm')
    }
  };

  // Create and start the client
  client = new LanguageClient(
    'kickassLanguageServer',
    'Kick Assembler Language Server',
    serverOptions,
    clientOptions
  );

  client.start();
}

async function assembleFile() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }

  const document = editor.document;
  if (document.languageId !== 'kickass') {
    vscode.window.showErrorMessage('Current file is not a Kick Assembler file');
    return;
  }

  // Save file before assembling
  await document.save();

  const config = vscode.workspace.getConfiguration('c64');
  const kickassJarPath = config.get<string>('kickassJarPath');

  if (!kickassJarPath) {
    vscode.window.showErrorMessage('Please set c64.kickassJarPath in settings');
    return;
  }

  const filePath = document.uri.fsPath;
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  const cwd = workspaceFolder ? workspaceFolder.uri.fsPath : path.dirname(filePath);

  // Create output channel for assembler output
  const outputChannel = vscode.window.createOutputChannel('Kick Assembler');
  outputChannel.show(true);

  const terminal = vscode.window.createTerminal({
    name: 'Kick Assembler',
    cwd: cwd,
    hideFromUser: false
  });

  terminal.show();
  terminal.sendText(`java -jar "${kickassJarPath}" "${filePath}"`);

  vscode.window.showInformationMessage('Assembling...');
}

async function runInVICE() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }

  const document = editor.document;
  const filePath = document.uri.fsPath;
  const dirPath = path.dirname(filePath);
  const baseName = path.basename(filePath, path.extname(filePath));
  const prgFile = path.join(dirPath, `${baseName}.prg`);

  const config = vscode.workspace.getConfiguration('c64');
  const viceBinary = config.get<string>('viceBinary', 'x64');

  // First assemble
  await assembleFile();

  // Give assembler time to complete
  setTimeout(() => {
    const terminal = vscode.window.createTerminal({
      name: 'VICE Emulator',
      hideFromUser: false
    });

    terminal.show();
    terminal.sendText(`${viceBinary} "${prgFile}"`);
    vscode.window.showInformationMessage(`Running ${baseName}.prg in VICE`);
  }, 1000);
}

async function debugInVICE() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }

  const document = editor.document;
  const filePath = document.uri.fsPath;
  const dirPath = path.dirname(filePath);
  const baseName = path.basename(filePath, path.extname(filePath));
  const prgFile = path.join(dirPath, `${baseName}.prg`);

  const config = vscode.workspace.getConfiguration('c64');
  const viceBinary = config.get<string>('viceBinary', 'x64');

  // First assemble
  await assembleFile();

  // Give assembler time to complete
  setTimeout(() => {
    const terminal = vscode.window.createTerminal({
      name: 'VICE Monitor',
      hideFromUser: false
    });

    terminal.show();
    terminal.sendText(`${viceBinary} -remotemonitor "${prgFile}"`);
    vscode.window.showInformationMessage(`Starting VICE monitor for ${baseName}.prg`);
  }, 1000);
}
