import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

class NestedWorkspaceItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly workspacePath: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.iconPath = new vscode.ThemeIcon('folder');
        this.contextValue = 'nestedWorkspace';
		this.resourceUri = vscode.Uri.file(workspacePath);
    }
}

export class PackageManagerProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData: vscode.Event<void> = this._onDidChangeTreeData.event;

	private nestedWorkspaces: string[];

    constructor(nestedWorkspaces: string[]) {
        this.nestedWorkspaces = nestedWorkspaces;
    }

	getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
		if (!element) {
			return Promise.resolve(this.getSections());
		}

		if (element.contextValue === 'nestedWorkspacesParent') {
			// Return the list of nested workspaces under "Nested Workspaces"
			const workspaceItems = this.nestedWorkspaces.map(workspacePath => {
				const workspaceName = path.basename(workspacePath);
				return new NestedWorkspaceItem(workspaceName, workspacePath, vscode.TreeItemCollapsibleState.Collapsed);
			});
			return Promise.resolve(workspaceItems);
		} else if (element.contextValue === 'nestedWorkspace') {
			// Return the items for a specific nested workspace
			const workspacePath = element.resourceUri?.fsPath;
			if (workspacePath) {
				return Promise.resolve(this.getSectionsForWorkspace(workspacePath));
			}
			return Promise.resolve([]);
		} else if (element.contextValue === 'workspaceScripts') {
			// Return the scripts for the specific workspace
			return Promise.resolve(this.getScripts(element.resourceUri?.fsPath));
		} else if (element.contextValue === 'workspaceActions') {
			// Return the actions for the specific workspace
			return Promise.resolve(this.getActions(element.resourceUri?.fsPath));
		} else if (element.contextValue === 'workspaceDependencies') {
			// Return the dependencies for the specific workspace
			return Promise.resolve(this.getDependencies(false, element.resourceUri?.fsPath));
		} else if (element.contextValue === 'workspaceDevDependencies') {
			// Return the dev dependencies for the specific workspace
			return Promise.resolve(this.getDependencies(true, element.resourceUri?.fsPath));
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

		// Create the "Nested Workspaces" section
		if (this.nestedWorkspaces.length > 0) {
			const nestedWorkspacesSection = new vscode.TreeItem('Nested Workspaces', vscode.TreeItemCollapsibleState.Expanded);
			nestedWorkspacesSection.iconPath = new vscode.ThemeIcon('folder');
			nestedWorkspacesSection.contextValue = 'nestedWorkspacesParent';
	
			sections.push(nestedWorkspacesSection);
		}

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

		sections.push(new vscode.TreeItem(''), scripts, actions, new vscode.TreeItem(''), dependencies, devDependencies);

		return sections;
	}

	private getDependencyCount(isDevDependency: boolean, workspacePath?: string): number {
		const rootPath = workspacePath || (vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '');
		if (!rootPath) {
			return 0;
		}
	
		const pubspecPath = path.join(rootPath, 'pubspec.yaml');
		if (!fs.existsSync(pubspecPath)) {
			return 0;
		}
	
		const fileContent = fs.readFileSync(pubspecPath, 'utf8');
		const pubspec = yaml.parse(fileContent);
		const dependencies = isDevDependency ? pubspec.dev_dependencies : pubspec.dependencies;
	
		return Object.keys(dependencies || {}).length;
	}

	private getCustomCommands(workspacePath?: string): vscode.TreeItem[] {
		const rootPath = workspacePath || (vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '');
		const customCommands = vscode.workspace.getConfiguration('pubStudio', vscode.Uri.file(rootPath)).get<{ [key: string]: string }>('customCommands', {});
	
		return Object.keys(customCommands).map(key => {
			const command = customCommands[key];
			return this.createScriptItem(key, command, rootPath);
		});
	}
	

	private getCommandsFromMakefile(workspacePath?: string): vscode.TreeItem[] {
		const rootPath = workspacePath || (vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '');
		if (!rootPath) {
			return [];
		}
	
		const makefilePath = path.join(rootPath, 'Makefile');
		if (!fs.existsSync(makefilePath)) {
			return [];
		}
	
		const fileContent = fs.readFileSync(makefilePath, 'utf8');
	
		const firstTargetRegex = new RegExp('(^[a-zA-Z0-9_.][a-zA-Z0-9-_]+):', 'g');
		const firstTarget = firstTargetRegex.exec(fileContent)?.[0];
	
		let commands = [];
	
		if (firstTarget) {
			commands.push(this.createMakefileTargetScriptItem(firstTarget, rootPath));
		}
	
		const regex = new RegExp('([\n\r][a-zA-Z0-9_.][a-zA-Z0-9-_]+):', 'g');
		let match;
	
		while (match = regex.exec(fileContent)) {
			commands.push(this.createMakefileTargetScriptItem(match[0], rootPath));
		}
		return commands;
	}

	private createMakefileTargetScriptItem(target: string, workspacePath: string): vscode.TreeItem {
		target = target.substring(0, target.length - 1).trim();
		return this.createScriptItem(target, `make ${target}`, workspacePath);
	}

	private getSectionsForWorkspace(workspacePath: string): vscode.TreeItem[] {
		const sections: vscode.TreeItem[] = [];
		if (workspacePath) {
			// Create "Scripts" section
			const scriptsSection = new vscode.TreeItem('Scripts', vscode.TreeItemCollapsibleState.Collapsed);
			scriptsSection.contextValue = 'workspaceScripts';
			scriptsSection.iconPath = new vscode.ThemeIcon('terminal');
			scriptsSection.resourceUri = vscode.Uri.file(workspacePath);
			sections.push(scriptsSection);
	
			// Create "Actions" section
			const actionsSection = new vscode.TreeItem('Actions', vscode.TreeItemCollapsibleState.Collapsed);
			actionsSection.contextValue = 'workspaceActions';
			actionsSection.iconPath = new vscode.ThemeIcon('tools');
			actionsSection.resourceUri = vscode.Uri.file(workspacePath);
			sections.push(actionsSection);

			sections.push(new vscode.TreeItem(''));
	
			// Create "Dependencies" section
			const dependenciesCount = this.getDependencyCount(false, workspacePath);
			const dependenciesSection = new vscode.TreeItem(`Dependencies (${dependenciesCount})`, vscode.TreeItemCollapsibleState.Collapsed);
			dependenciesSection.contextValue = 'workspaceDependencies';
			dependenciesSection.iconPath = new vscode.ThemeIcon('package');
			dependenciesSection.resourceUri = vscode.Uri.file(workspacePath);
			sections.push(dependenciesSection);
	
			// Create "Dev Dependencies" section
			const devDependenciesCount = this.getDependencyCount(true, workspacePath);
			const devDependenciesSection = new vscode.TreeItem(`Dev Dependencies (${devDependenciesCount})`, vscode.TreeItemCollapsibleState.Collapsed);
			devDependenciesSection.contextValue = 'workspaceDevDependencies';
			devDependenciesSection.iconPath = new vscode.ThemeIcon('package');
			devDependenciesSection.resourceUri = vscode.Uri.file(workspacePath);
			sections.push(devDependenciesSection);
		}
	
		return sections;
	}

	private getScripts(workspacePath?: string): vscode.TreeItem[] {
		const scripts: vscode.TreeItem[] = [];
		const rootPath = workspacePath || (vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '');
		
		scripts.push(this.createScriptItem('Flutter clean', 'flutter clean', rootPath));
		scripts.push(this.createScriptItem('Upgrade dependencies', 'flutter pub upgrade --major-versions', rootPath));
		scripts.push(this.createScriptItem('Static analysis', 'dart analyze .', rootPath));
		scripts.push(this.createScriptItem('View available dart fixes', 'dart fix --dry-run', rootPath));
		scripts.push(this.createScriptItem('Apply available dart fixes', 'dart fix --apply', rootPath));
		scripts.push(this.createScriptItem('Format dart files', 'dart format .', rootPath));
		
		scripts.push(...this.getCustomCommands(rootPath));
		scripts.push(...this.getCommandsFromMakefile(rootPath));
		
		return scripts;
	}

	private getActions(workspacePath?: string): vscode.TreeItem[] {
		const rootPath = workspacePath || (vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '');
	
		const installAll = new vscode.TreeItem('Install All Dependencies');
		if(workspacePath)installAll.resourceUri = vscode.Uri.file(workspacePath);
		installAll.command = { command: 'pub-studio.installAllDependencies', title: 'Install All Dependencies', arguments: [rootPath] };
		installAll.iconPath = new vscode.ThemeIcon('cloud-download');
	
		const sortDependencies = new vscode.TreeItem('Sort All Dependencies');
		if(workspacePath)sortDependencies.resourceUri = vscode.Uri.file(workspacePath);
		sortDependencies.command = { command: 'pub-studio.sortDependencies', title: 'Sort All Dependencies', arguments: [rootPath] };
		sortDependencies.iconPath = new vscode.ThemeIcon('sort-precedence');
	
		const addDependency = new vscode.TreeItem('Add Dependency');
		if(workspacePath)addDependency.resourceUri = vscode.Uri.file(workspacePath);
		addDependency.command = { command: 'pub-studio.addDependency', title: 'Add Dependency', arguments: [rootPath] };
		addDependency.iconPath = new vscode.ThemeIcon('add');
	
		const addDevDependency = new vscode.TreeItem('Add Dev Dependency');
		if(workspacePath)addDevDependency.resourceUri = vscode.Uri.file(workspacePath);
		addDevDependency.command = { command: 'pub-studio.addDevDependency', title: 'Add Dev Dependency', arguments: [rootPath] };
		addDevDependency.iconPath = new vscode.ThemeIcon('add');
	
		const removeUnusedDependencies = new vscode.TreeItem('Remove Unused Dependencies');
		if(workspacePath)removeUnusedDependencies.resourceUri = vscode.Uri.file(workspacePath);
		removeUnusedDependencies.command = { command: 'pub-studio.removeUnusedDependencies', title: 'Remove Unused Dependencies', arguments: [rootPath] };
		removeUnusedDependencies.iconPath = new vscode.ThemeIcon('trash');
	
		const removeUnusedImports = new vscode.TreeItem('Remove Unused Imports');
		if(workspacePath)removeUnusedImports.resourceUri = vscode.Uri.file(workspacePath);
		removeUnusedImports.command = { command: 'pub-studio.findRemoveUnusedImports', title: 'Remove Unused Imports', arguments: [rootPath] };
		removeUnusedImports.iconPath = new vscode.ThemeIcon('trash');
	
		const allActions = [installAll, sortDependencies, addDependency, addDevDependency, removeUnusedDependencies, removeUnusedImports];

		return allActions;
	}

	private getDependencies(isDevDependency: boolean, workspacePath?: string): vscode.TreeItem[] {
		const packages: vscode.TreeItem[] = [];
		const rootPath = workspacePath || (vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '');
	
		const pubspecPath = path.join(rootPath, 'pubspec.yaml');
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
			if(workspacePath)item.resourceUri = vscode.Uri.file(workspacePath);
			item.command = {
				command: 'pub-studio.viewDependency',
				title: 'View Dependency',
				arguments: [item, rootPath]
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

	private createScriptItem(label: string, command: string, workspacePath?: string): vscode.TreeItem {
		const item = new vscode.TreeItem(label);
		item.iconPath = new vscode.ThemeIcon('terminal');
		if(workspacePath)item.resourceUri = vscode.Uri.file(workspacePath);
		item.command = { command: 'pub-studio.runScript', title: label, arguments: [command, workspacePath] };
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