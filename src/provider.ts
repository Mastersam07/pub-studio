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

		const label = this.getLabel(element.label);

		if (label.startsWith('Scripts')) {
			return Promise.resolve(this.getScripts());
		} else if (label.startsWith('Actions')) {
			return Promise.resolve(this.getActions());
		} else if (label.startsWith('Dependencies')) {
			return Promise.resolve(this.getDependencies(false));
		} else if (label.startsWith('Dev Dependencies')) {
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
			this.createScriptItem('Flutter clean', 'flutter clean'),
			this.createScriptItem('Upgrade dependencies', 'flutter pub upgrade --major-versions'),
			this.createScriptItem('Static analysis', 'dart analyze .'),
			this.createScriptItem('View available dart fixes', 'dart fix --dry-run'),
			this.createScriptItem('Apply available dart fixes', 'dart fix --apply'),
			this.createScriptItem('Format dart files', 'dart format .')
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
			const formattedValue = this.formatDependencyValue(value);
			const item = new vscode.TreeItem(`${key} ${formattedValue}`);
			item.contextValue = isDevDependency ? 'devDependency' : 'dependency';
			item.command = {
				command: 'pub-studio.viewDependency',
				title: 'View Dependency',
				arguments: [item]
			};
			item.iconPath = new vscode.ThemeIcon('library');
			packages.push(item);
		}

		return packages;
	}

	private formatDependencyValue(value: any): string {
		if (typeof value === 'string') {
			return value;
		} else if (value && typeof value === 'object') {
			if (value.git) {
				return `[git ${this.formatGitDependency(value.git)}]`;
			} else if (value.path) {
				return `[path ${value.path}]`;
			} else if (value.sdk) {
				return `[sdk ${value.sdk}]`;
			}
			return JSON.stringify(value);
		}
		return String(value);
	}

	private formatGitDependency(git: any): string {
		if (typeof git === 'string') {
			return git;
		} else if (typeof git === 'object') {
			return `${git.url}${git.ref ? `#${git.ref}` : ''}`;
		}
		return JSON.stringify(git);
	}

	private createScriptItem(label: string, command: string): vscode.TreeItem {
		const item = new vscode.TreeItem(label);
		item.iconPath = new vscode.ThemeIcon('terminal');
		item.command = { command: 'pub-studio.runScript', title: label, arguments: [command] };
		return item;
	}

	public getLabel(label: string | vscode.TreeItemLabel | undefined): string {
		if (typeof label === 'string') {
			return label;
		} else if (label && typeof label === 'object') {
			return label.label;
		}
		return '';
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}
}