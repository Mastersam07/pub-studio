import * as vscode from 'vscode';
import * as child_process from 'child_process';
import { PackageManagerProvider } from './provider';

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
		vscode.commands.registerCommand('pub-studio.viewDependencyReadme', (item: vscode.TreeItem) => {
			viewDependencyReadme(item);
		}),
		vscode.commands.registerCommand('pub-studio.runScript', (command: string) => {
			runScript(command);
		})
	);
}


function manageDependencies(command: string, callback?: () => void) {
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
					if (callback) {
						callback();
					}
					resolve();
				}
			});
		});
	});
}

function addDependency(isDev: boolean, provider: PackageManagerProvider) {
	vscode.window.showInputBox({ prompt: 'Enter package names to add (separate by comma)' })
		.then(packageNames => {
			if (packageNames) {
				const packages = packageNames.split(',').map(pkg => pkg.trim());
				vscode.window.withProgress({
					location: vscode.ProgressLocation.Notification,
					title: "Adding dependencies",
					cancellable: false
				}, async (progress, __) => {
					for (const packageName of packages) {
						progress.report({ message: `Adding ${packageName}...` });
						await new Promise<void>((resolve, reject) => {
							const command = `flutter pub add ${packageName} ${isDev ? '--dev' : ''}`;
							manageDependencies(command, resolve);
						});
					}
					vscode.window.showInformationMessage(`Successfully added dependencies: ${packageNames}`);
					provider.refresh();
				});
			}
		});
}

function updateDependency(item: vscode.TreeItem, provider: PackageManagerProvider) {
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
	const label = typeof item.label === 'string' ? item.label : item.label?.label;
	if (!label) {
		vscode.window.showErrorMessage('Invalid package name');
		return;
	}

	const packageName = label.split(' ')[0];
	const command = `flutter pub remove ${packageName}`;
	manageDependencies(command, () => provider.refresh());
}

async function viewDependencyReadme(item: vscode.TreeItem) {
	const label = typeof item.label === 'string' ? item.label : item.label?.label;
	if (!label) {
		vscode.window.showErrorMessage('Invalid package name');
		return;
	}

	const packageName = label.split(' ')[0];
	const panel = vscode.window.createWebviewPanel(
		'dependencyReadme',
		`README: ${packageName}`,
		vscode.ViewColumn.One,
		{
			enableScripts: true
		}
	);
	// TODO: Load readme
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