import * as vscode from 'vscode';
import * as child_process from 'child_process';

export function runScript(command: string, outputChannel: vscode.OutputChannel, workspacePath?: string) {
    const targetFolder = workspacePath ||  (vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '');
    if (!targetFolder) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
    }
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Running ${command}`,
        cancellable: true
    }, (_, __) => {
        return new Promise<void>((resolve, reject) => {
            child_process.exec(command, { cwd: targetFolder }, (err, stdout, stderr) => {
                if (err) {
                    outputChannel.appendLine(`Error running command: ${command}\n${stderr}`);
                    outputChannel.show();
                    reject();
                } else {
                    outputChannel.appendLine(stdout);
                    outputChannel.show();
                    resolve();
                }
            });
        });
    });
}