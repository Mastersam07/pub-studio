import * as vscode from 'vscode';
import * as child_process from 'child_process';

export function manageDependencies(command: string, outputChannel: vscode.OutputChannel, callback?: (err?: Error) => void) {
    const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found');
        if (callback) callback(new Error('No workspace folder found'));
        return;
    }
    child_process.exec(command, { cwd: workspaceFolder }, (err, stdout, stderr) => {
        if (err) {
            outputChannel.appendLine(`Error running command: ${command}\n${stderr}`);
            outputChannel.show();
            if (callback) callback(err);
        } else {
            outputChannel.appendLine(stdout);
            outputChannel.show();
            if (callback) callback();
        }
    });
}