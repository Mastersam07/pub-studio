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
		} else if (element.label === 'Scripts') {
			return Promise.resolve(this.getScripts());
		} else if (element.label === 'Actions') {
			return Promise.resolve(this.getActions());
		} else if (element.label === 'Dependencies') {
			return Promise.resolve(this.getDependencies(false));
		} else if (element.label === 'Dev Dependencies') {
			return Promise.resolve(this.getDependencies(true));
		}
		return Promise.resolve([]);
	}

	private getSections(): vscode.TreeItem[] {
		const sections: vscode.TreeItem[] = [];

		const scripts = new vscode.TreeItem('Scripts', vscode.TreeItemCollapsibleState.Expanded);
		const actions = new vscode.TreeItem('Actions', vscode.TreeItemCollapsibleState.Expanded);
		const dependencies = new vscode.TreeItem('Dependencies', vscode.TreeItemCollapsibleState.Expanded);
		const devDependencies = new vscode.TreeItem('Dev Dependencies', vscode.TreeItemCollapsibleState.Expanded);

		sections.push(scripts, actions, dependencies, devDependencies);

		return sections;
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