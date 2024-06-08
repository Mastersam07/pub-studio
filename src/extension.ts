import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import * as child_process from 'child_process';
import axios from 'axios';

class FlutterActionsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
		if (!element) {
			return Promise.resolve(this.getActions());
		}
		return Promise.resolve([]);
	}

	private getActions(): vscode.TreeItem[] {
		const installAll = new vscode.TreeItem('Install All Dependencies');
		installAll.command = { command: 'pub-studio.installAllDependencies', title: 'Install All Dependencies' };

		const addDependency = new vscode.TreeItem('Add Dependency');
		addDependency.command = { command: 'pub-studio.addDependency', title: 'Add Dependency' };

		const addDevDependency = new vscode.TreeItem('Add Dev Dependency');
		addDevDependency.command = { command: 'pub-studio.addDevDependency', title: 'Add Dev Dependency' };

		return [installAll, addDependency, addDevDependency];
	}
}

class FlutterDependenciesProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	private _isDevDependency: boolean;
	private _onDidChangeTreeData: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData: vscode.Event<void> = this._onDidChangeTreeData.event;

	constructor(isDevDependency: boolean) {
		this._isDevDependency = isDevDependency;
	}

	getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
		if (!element) {
			return Promise.resolve(this.getPackages());
		}
		return Promise.resolve([]);
	}

	private getPackages(): vscode.TreeItem[] {
		const packages: vscode.TreeItem[] = [];
		const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
		if (!workspaceFolder) {
			vscode.window.showErrorMessage('No workspace folder found');
			return packages;
		}

		const pubspecPath = path.join(workspaceFolder, 'pubspec.yaml');
		if (!fs.existsSync(pubspecPath)) {
			vscode.window.showErrorMessage('pubspec.yaml not found in workspace');
			return packages;
		}

		const fileContent = fs.readFileSync(pubspecPath, 'utf8');
		const pubspec = yaml.parse(fileContent);

		const dependencies = this._isDevDependency ? pubspec.dev_dependencies : pubspec.dependencies;

		for (const [key, value] of Object.entries(dependencies || {})) {
			const item = new vscode.TreeItem(`${key} ${value}`);
			item.contextValue = this._isDevDependency ? 'devDependency' : 'dependency';
			item.command = {
				command: 'pub-studio.viewDependencyReadme',
				title: 'View Dependency README',
				arguments: [item]
			};
			packages.push(item);
		}

		return packages;
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}
}

const actionsProvider = new FlutterActionsProvider();
const dependenciesProvider = new FlutterDependenciesProvider(false);
const devDependenciesProvider = new FlutterDependenciesProvider(true);

export function activate(context: vscode.ExtensionContext) {

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
			removeDependency(item);
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
	vscode.window.showInputBox({ prompt: 'Enter package name to add' })
		.then(packageName => {
			if (packageName) {
				const command = `flutter pub add ${packageName} ${isDev ? '--dev' : ''}`;
				manageDependencies(command);
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

function removeDependency(item: vscode.TreeItem) {
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

	const readmeContent = await fetchReadmeContent(packageName);
	panel.webview.html = getWebviewContent(packageName, readmeContent);
}

async function fetchReadmeContent(packageName: string): Promise<string> {
	const url = `https://pub.dev/packages/${packageName}`;
	try {
		const response = await axios.get(url);
		return response.data;
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to fetch README for ${packageName}`);
		return `# Error\nFailed to fetch README for ${packageName}`;
	}
}

function getWebviewContent(packageName: string, readmeContent: string): string {
	return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${packageName} README</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
          'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
          sans-serif;
          padding: 10px;
        }
      </style>
    </head>
    <body>
      ${readmeContent}
    </body>
    </html>
  `;
}