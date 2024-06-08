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
		scripts.iconPath = new vscode.ThemeIcon('terminal-view-icon');

		const actions = new vscode.TreeItem('Actions', vscode.TreeItemCollapsibleState.Expanded);
		actions.iconPath = new vscode.ThemeIcon('tools');

		const dependenciesCount = this.getDependencyCount(false);
		const dependencies = new vscode.TreeItem(`Dependencies (${dependenciesCount})`, vscode.TreeItemCollapsibleState.Expanded);
		dependencies.iconPath = new vscode.ThemeIcon('package');

		const devDependenciesCount = this.getDependencyCount(true);
		const devDependencies = new vscode.TreeItem(`Dev Dependencies (${devDependenciesCount})`, vscode.TreeItemCollapsibleState.Expanded);
		devDependencies.iconPath = new vscode.ThemeIcon('package');

		sections.push(scripts, actions, new vscode.TreeItem(''), dependencies, devDependencies);

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
		return [
			this.createScriptItem('clean'),
			this.createScriptItem('static analysis')
		];
	}

	private getActions(): vscode.TreeItem[] {
		const installAll = new vscode.TreeItem('Install All Dependencies');
		installAll.command = { command: 'pub-studio.installAllDependencies', title: 'Install All Dependencies' };
		installAll.iconPath = new vscode.ThemeIcon('cloud-download');

		const addDependency = new vscode.TreeItem('Add Dependency');
		addDependency.command = { command: 'pub-studio.addDependency', title: 'Add Dependency' };
		addDependency.iconPath = new vscode.ThemeIcon('add');

		const addDevDependency = new vscode.TreeItem('Add Dev Dependency');
		addDevDependency.command = { command: 'pub-studio.addDevDependency', title: 'Add Dev Dependency' };
		addDevDependency.iconPath = new vscode.ThemeIcon('add');

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
			item.iconPath = new vscode.ThemeIcon('library');
			packages.push(item);
		}

		return packages;
	}

	private createScriptItem(label: string): vscode.TreeItem {
		const item = new vscode.TreeItem(label);
		item.iconPath = new vscode.ThemeIcon('terminal');
		return item;
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}
}