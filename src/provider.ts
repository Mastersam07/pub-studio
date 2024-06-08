import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

export class PackageManagerProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData: vscode.Event<void> = this._onDidChangeTreeData.event;

	getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
		if (!element) {
			return Promise.resolve(this.getSections());
		}

		const label = typeof element.label === 'string' ? element.label : element.label?.label;

		if (label?.startsWith('Scripts')) {
			return Promise.resolve(this.getScripts());
		} else if (label?.startsWith('Actions')) {
			return Promise.resolve(this.getActions());
		} else if (label?.startsWith('Dependencies')) {
			return Promise.resolve(this.getDependencies(false));
		} else if (label?.startsWith('Dev Dependencies')) {
			return Promise.resolve(this.getDependencies(true));
		}
		return Promise.resolve([]);
	}

	private getSections(): vscode.TreeItem[] {
		const sections: vscode.TreeItem[] = [];

		const scripts = new vscode.TreeItem('Scripts', vscode.TreeItemCollapsibleState.Expanded);
		const actions = new vscode.TreeItem('Actions', vscode.TreeItemCollapsibleState.Expanded);
		const dependenciesCount = this.getDependencyCount(false);
		const dependencies = new vscode.TreeItem(`Dependencies (${dependenciesCount})`, vscode.TreeItemCollapsibleState.Expanded);
		const devDependenciesCount = this.getDependencyCount(true);
		const devDependencies = new vscode.TreeItem(`Dev Dependencies (${devDependenciesCount})`, vscode.TreeItemCollapsibleState.Expanded);

		sections.push(scripts, new vscode.TreeItem(''), actions, new vscode.TreeItem(''), dependencies, new vscode.TreeItem(''), devDependencies);

		return sections;
	}

	private getDependencyCount(isDevDependency: boolean): number {
		const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
		if (!workspaceFolder) {
			return 0;
		}

		const pubspecPath = path.join(workspaceFolder, 'pubspec.yaml');
		if (!fs.existsSync(pubspecPath)) {
			return 0;
		}

		const fileContent = fs.readFileSync(pubspecPath, 'utf8');
		const pubspec = yaml.parse(fileContent);
		const dependencies = isDevDependency ? pubspec.dev_dependencies : pubspec.dependencies;

		return Object.keys(dependencies || {}).length;
	}

	private getScripts(): vscode.TreeItem[] {
		return [new vscode.TreeItem('clean'), new vscode.TreeItem('static analysis')];
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

	private getDependencies(isDevDependency: boolean): vscode.TreeItem[] {
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

		const dependencies = isDevDependency ? pubspec.dev_dependencies : pubspec.dependencies;

		for (const [key, value] of Object.entries(dependencies || {})) {
			const item = new vscode.TreeItem(`${key} ${value}`);
			item.contextValue = isDevDependency ? 'devDependency' : 'dependency';
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