import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export async function revealDependencyInPubspec(item: vscode.TreeItem) {
	const label = typeof item.label === 'string' ? item.label : item.label?.label;
	if (!label) {
		vscode.window.showErrorMessage('Invalid package name');
		return;
	}

	const packageName = label.split(' ')[0];
	const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
	if (!workspaceFolder) {
		vscode.window.showErrorMessage('No workspace folder found');
		return;
	}

	const pubspecPath = path.join(workspaceFolder, 'pubspec.yaml');
	if (!fs.existsSync(pubspecPath)) {
		vscode.window.showErrorMessage('pubspec.yaml not found in workspace');
		return;
	}

	const document = await vscode.workspace.openTextDocument(pubspecPath);
	const editor = await vscode.window.showTextDocument(document);

	const text = document.getText();
	const regex = new RegExp(`\\b${packageName}:`, 'g');
	const match = regex.exec(text);

	if (match) {
		const position = document.positionAt(match.index);
		editor.selection = new vscode.Selection(position, position);
		editor.revealRange(new vscode.Range(position, position));
	} else {
		vscode.window.showErrorMessage(`Dependency ${packageName} not found in pubspec.yaml`);
	}
}