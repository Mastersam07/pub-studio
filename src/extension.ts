import * as vscode from 'vscode';
import { PackageManagerProvider } from './provider';
import * as path from 'path';
import * as fs from 'fs';
import { promptForRating } from './utils/rating';
import { manageDependencies } from './commands/manageDependencies';
import { sortPubspecDependencies } from './commands/sortDependencies';
import { addDependency } from './commands/addDependency';
import { removeDependency, updateDependency } from './commands/updateRemoveDependency';
import { runScript } from './commands/runCommand';
import { removeUnusedDependencies } from './commands/removeUnusedDependencies';
import { revealDependencyInPubspec } from './commands/revealDependency';
import { findRemoveUnusedImports } from './commands/findRemoveUnusedImports';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
	outputChannel = vscode.window.createOutputChannel('Pub Studio');

	const TIME_THRESHOLD = 5 * 24 * 60 * 60 * 1000;

	const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
	const pubspecPath = path.join(workspaceFolder, 'pubspec.yaml');

	if (workspaceFolder && fs.existsSync(pubspecPath)) {

		const firstUse = context.globalState.get<number>('firstUse', Date.now());
		const now = Date.now();

		context.globalState.update('firstUse', firstUse);

		const packageManagerProvider = new PackageManagerProvider();

		vscode.window.registerTreeDataProvider('packageManagerView', packageManagerProvider);

		context.subscriptions.push(
			vscode.commands.registerCommand('pub-studio.openFlutterPackageManager', () => {
				vscode.commands.executeCommand('workbench.view.extension.flutterPackageManager');
			}),
			vscode.commands.registerCommand('pub-studio.installAllDependencies', () => {
				manageDependencies('flutter pub get', outputChannel, (_) => sortPubspecDependencies());
			}),
			vscode.commands.registerCommand('pub-studio.removeUnusedDependencies', () => {
				removeUnusedDependencies(outputChannel);
			}),
			vscode.commands.registerCommand('pub-studio.addDependency', () => {
				addDependency(false, outputChannel, packageManagerProvider);
			}),
			vscode.commands.registerCommand('pub-studio.addDevDependency', () => {
				addDependency(true, outputChannel, packageManagerProvider);
			}),
			vscode.commands.registerCommand('pub-studio.sortDependencies', () => {
				sortPubspecDependencies();
			}),
			vscode.commands.registerCommand('pub-studio.updateDependency', (item: vscode.TreeItem) => {
				updateDependency(item, outputChannel, packageManagerProvider);
			}),
			vscode.commands.registerCommand('pub-studio.removeDependency', (item: vscode.TreeItem) => {
				removeDependency(item, outputChannel, packageManagerProvider);
			}),
			vscode.commands.registerCommand('pub-studio.viewDependency', (item: vscode.TreeItem) => {
				revealDependencyInPubspec(item);
			}),
			vscode.commands.registerCommand('pub-studio.runScript', (command: string) => {
				runScript(command, outputChannel);
			}),
			vscode.commands.registerCommand('pub-studio.findRemoveUnusedImports', () => {
				findRemoveUnusedImports(outputChannel);
			}),
		);

		// File watcher for pubspec.yaml
		const fileWatcher = vscode.workspace.createFileSystemWatcher(pubspecPath);

		fileWatcher.onDidChange(() => packageManagerProvider.refresh());
		fileWatcher.onDidCreate(() => packageManagerProvider.refresh());
		fileWatcher.onDidDelete(() => packageManagerProvider.refresh());

		context.subscriptions.push(fileWatcher);

		// Configuration change listener for custom commands
		context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
			if (event.affectsConfiguration('pubStudio.customCommands')) {
				packageManagerProvider.refresh();
			}
		}));

		if (now - firstUse >= TIME_THRESHOLD) {
			promptForRating(context);
		}

		const makefilePath = path.join(workspaceFolder, 'Makefile');
		if (workspaceFolder && fs.existsSync(makefilePath)) {

			// File watcher for Makefile
			const fileWatcher = vscode.workspace.createFileSystemWatcher(makefilePath);

			fileWatcher.onDidChange(() => packageManagerProvider.refresh());
			fileWatcher.onDidCreate(() => packageManagerProvider.refresh());
			fileWatcher.onDidDelete(() => packageManagerProvider.refresh());
		}
	}
}