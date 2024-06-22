import * as vscode from 'vscode';
import { runScript } from './runCommand';

export function findRemoveUnusedImports(outputChannel: vscode.OutputChannel) {
    runScript('dart fix --apply --code=unused_import', outputChannel);
}