import * as vscode from 'vscode';
import * as child_process from 'child_process';
import { FlutterActionsProvider, FlutterDependenciesProvider } from './providers';

export function activate(context: vscode.ExtensionContext) {

	const actionsProvider = new FlutterActionsProvider();
	const dependenciesProvider = new FlutterDependenciesProvider(false);
	const devDependenciesProvider = new FlutterDependenciesProvider(true);

	vscode.window.registerTreeDataProvider('actionsView', actionsProvider);
	vscode.window.registerTreeDataProvider('dependenciesView', dependenciesProvider);
	vscode.window.registerTreeDataProvider('devDependenciesView', devDependenciesProvider);

	context.subscriptions.push(
		vscode.commands.registerCommand('pub-studio.openFlutterPackageManager', () => {
			vscode.commands.executeCommand('workbench.view.extension.flutterPackageManager');
		}),
		vscode.commands.registerCommand('pub-studio.installAllDependencies', () => {
			manageDependencies('flutter pub get');
		}),
		vscode.commands.registerCommand('pub-studio.addDependency', () => {
			addDependency(false);
		}),
		vscode.commands.registerCommand('pub-studio.addDevDependency', () => {
			addDependency(true);
		}),
		vscode.commands.registerCommand('pub-studio.updateDependency', (item: vscode.TreeItem) => {
			updateDependency(item);
		}),
		vscode.commands.registerCommand('pub-studio.removeDependency', (item: vscode.TreeItem) => {
			removeDependency(item, dependenciesProvider, devDependenciesProvider);
		}),
		vscode.commands.registerCommand('pub-studio.viewDependencyReadme', (item: vscode.TreeItem) => {
			viewDependencyReadme(item);
		})
	);
}


function manageDependencies(command: string, callback?: () => void) {
	const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
	if (!workspaceFolder) {
		vscode.window.showErrorMessage('No workspace folder found');
		return;
	}
	child_process.exec(command, { cwd: workspaceFolder }, (err, stdout, stderr) => {
		if (err) {
			vscode.window.showErrorMessage(`Error running command: ${command}\n${stderr}`);
		} else {
			vscode.window.showInformationMessage(stdout);
			if (callback) {
				callback();
			}
		}
	});
}

function addDependency(isDev: boolean) {
	vscode.window.showInputBox({ prompt: 'Enter package names to add (separate by comma)' })
		.then(packageNames => {
			if (packageNames) {
				const packages = packageNames.split(',').map(pkg => pkg.trim());
				vscode.window.withProgress({
					location: vscode.ProgressLocation.Notification,
					title: "Adding dependencies",
					cancellable: false
				}, async (progress, token) => {
					for (const packageName of packages) {
						progress.report({ message: `Adding ${packageName}...` });
						await new Promise<void>((resolve, reject) => {
							const command = `flutter pub add ${packageName} ${isDev ? '--dev' : ''}`;
							manageDependencies(command, resolve);
						});
					}
					vscode.window.showInformationMessage(`Successfully added dependencies: ${packageNames}`);
				});
			}
		});
}

function updateDependency(item: vscode.TreeItem) {
	const label = typeof item.label === 'string' ? item.label : item.label?.label;
	if (!label) {
		vscode.window.showErrorMessage('Invalid package name');
		return;
	}

	const packageName = label.split(' ')[0];
	const command = `flutter pub upgrade ${packageName}`;
	manageDependencies(command);
}

function removeDependency(item: vscode.TreeItem,
	dependenciesProvider: FlutterDependenciesProvider,
	devDependenciesProvider: FlutterDependenciesProvider) {
	const label = typeof item.label === 'string' ? item.label : item.label?.label;
	if (!label) {
		vscode.window.showErrorMessage('Invalid package name');
		return;
	}

	const packageName = label.split(' ')[0];
	const command = `flutter pub remove ${packageName}`;
	manageDependencies(command, () => {
		dependenciesProvider.refresh();
		devDependenciesProvider.refresh();
	});
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

	// TODO: Load readme in vs code
}