import * as vscode from 'vscode';
import * as child_process from 'child_process';
import { PackageManagerProvider } from './provider';
import * as path from 'path';
import * as fs from 'fs';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
	outputChannel = vscode.window.createOutputChannel('PUB STUDIO');

	const packageManagerProvider = new PackageManagerProvider();

	vscode.window.registerTreeDataProvider('packageManagerView', packageManagerProvider);

	context.subscriptions.push(
		vscode.commands.registerCommand('pub-studio.openFlutterPackageManager', () => {
			vscode.commands.executeCommand('workbench.view.extension.flutterPackageManager');
		}),
		vscode.commands.registerCommand('pub-studio.installAllDependencies', () => {
			manageDependencies('flutter pub get');
		}),
		vscode.commands.registerCommand('pub-studio.addDependency', () => {
			addDependency(false, packageManagerProvider);
		}),
		vscode.commands.registerCommand('pub-studio.addDevDependency', () => {
			addDependency(true, packageManagerProvider);
		}),
		vscode.commands.registerCommand('pub-studio.updateDependency', (item: vscode.TreeItem) => {
			updateDependency(item, packageManagerProvider);
		}),
		vscode.commands.registerCommand('pub-studio.removeDependency', (item: vscode.TreeItem) => {
			removeDependency(item, packageManagerProvider);
		}),
		vscode.commands.registerCommand('pub-studio.viewDependency', (item: vscode.TreeItem) => {
			revealDependencyInPubspec(item);
		}),
		vscode.commands.registerCommand('pub-studio.runScript', (command: string) => {
			runScript(command);
		})
	);

	// File watcher for pubspec.yaml
	const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
	if (workspaceFolder) {
		const pubspecPath = path.join(workspaceFolder, 'pubspec.yaml');
		const fileWatcher = vscode.workspace.createFileSystemWatcher(pubspecPath);

		fileWatcher.onDidChange(() => packageManagerProvider.refresh());
		fileWatcher.onDidCreate(() => packageManagerProvider.refresh());
		fileWatcher.onDidDelete(() => packageManagerProvider.refresh());

		context.subscriptions.push(fileWatcher);
	}
}


function manageDependencies(command: string, callback?: (err?: Error) => void) {
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

function addDependency(isDev: boolean, provider: PackageManagerProvider) {
	vscode.window.showInputBox({ prompt: 'Enter package names to add (separate by comma)' })
		.then(packageNames => {
			if (packageNames) {
				const packages = packageNames.split(',').map(pkg => pkg.trim());
				const command = `flutter pub add ${packages.join(' ')} ${isDev ? '--dev' : ''}`;

				vscode.window.withProgress({
					location: vscode.ProgressLocation.Notification,
					title: "Adding dependencies",
					cancellable: false
				}, async (_, __) => {
					try {
						await new Promise<void>((resolve, reject) => {
							manageDependencies(command, (err) => {
								if (err) {
									reject(err);
								} else {
									resolve();
								}
							});
						});
						vscode.window.showInformationMessage(`Successfully added dependencies: ${packageNames}`);
					} catch (error) {
						const errorMessage = error instanceof Error ? error.message : String(error);
						vscode.window.showErrorMessage(`Error adding dependencies: ${errorMessage}`);
						outputChannel.appendLine(`Error adding dependencies: ${errorMessage}`);
						outputChannel.show();
					} finally {
						provider.refresh();
					}
				});
			}
		});
}

function updateDependency(item: vscode.TreeItem, provider: PackageManagerProvider) {
	if (!item) return;
	const label = typeof item.label === 'string' ? item.label : item.label?.label;
	if (!label) {
		vscode.window.showErrorMessage('Invalid package name');
		return;
	}

	const packageName = label.split(' ')[0];
	const command = `flutter pub upgrade ${packageName}`;
	manageDependencies(command, () => provider.refresh());
}

function removeDependency(item: vscode.TreeItem, provider: PackageManagerProvider) {
	if (!item) return;
	const label = typeof item.label === 'string' ? item.label : item.label?.label;
	if (!label) {
		vscode.window.showErrorMessage('Invalid package name');
		return;
	}

	const packageName = label.split(' ')[0];
	const command = `flutter pub remove ${packageName}`;
	manageDependencies(command, () => provider.refresh());
}

async function revealDependencyInPubspec(item: vscode.TreeItem) {
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

function runScript(command: string) {
	const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
	if (!workspaceFolder) {
		vscode.window.showErrorMessage('No workspace folder found');
		return;
	}
	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: `Running ${command}`,
		cancellable: false
	}, (_, __) => {
		return new Promise<void>((resolve, reject) => {
			child_process.exec(command, { cwd: workspaceFolder }, (err, stdout, stderr) => {
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