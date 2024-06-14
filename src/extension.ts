import * as vscode from 'vscode';
import * as child_process from 'child_process';
import { PackageManagerProvider } from './provider';
import * as path from 'path';
import * as fs from 'fs';
import { parseDocument, YAMLMap } from 'yaml';
import { glob } from 'glob';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
	outputChannel = vscode.window.createOutputChannel('Pub Studio');

	const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
	const pubspecPath = path.join(workspaceFolder, 'pubspec.yaml');

	if (workspaceFolder && fs.existsSync(pubspecPath)) {

		const packageManagerProvider = new PackageManagerProvider();

		vscode.window.registerTreeDataProvider('packageManagerView', packageManagerProvider);

		context.subscriptions.push(
			vscode.commands.registerCommand('pub-studio.openFlutterPackageManager', () => {
				vscode.commands.executeCommand('workbench.view.extension.flutterPackageManager');
			}),
			vscode.commands.registerCommand('pub-studio.installAllDependencies', () => {
				manageDependencies('flutter pub get', (_) => sortPubspecDependencies());
			}),
			vscode.commands.registerCommand('pub-studio.removeUnusedDependencies', () => {
				removeUnusedDependencies();
			}),
			vscode.commands.registerCommand('pub-studio.addDependency', () => {
				addDependency(false, packageManagerProvider);
			}),
			vscode.commands.registerCommand('pub-studio.addDevDependency', () => {
				addDependency(true, packageManagerProvider);
			}),
			vscode.commands.registerCommand('pub-studio.sortDependencies', () => {
				sortPubspecDependencies();
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
					cancellable: true
				}, async (_, __) => {
					try {
						await new Promise<void>((resolve, reject) => {
							manageDependencies(command, (err) => {
								if (err) {
									reject(err);
								} else {
									sortPubspecDependencies();
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
	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: `Updating dependency: ${packageName}`,
		cancellable: true
	}, async (_, __) => {
		try {
			await new Promise<void>((resolve, reject) => {
				manageDependencies(command, (err) => {
					if (err) {
						reject(err);
					} else {
						sortPubspecDependencies();
						resolve();
					}
				});
			});
			vscode.window.showInformationMessage(`Successfully updated dependency: ${packageName}`);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Error updating dependency: ${errorMessage}`);
			outputChannel.appendLine(`Error updating dependency: ${errorMessage}`);
			outputChannel.show();
		} finally {
			provider.refresh();
		}
	});
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
	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: `Removing dependency: ${packageName}`,
		cancellable: true
	}, async (_, __) => {
		try {
			await new Promise<void>((resolve, reject) => {
				manageDependencies(command, (err) => {
					if (err) {
						reject(err);
					} else {
						sortPubspecDependencies();
						resolve();
					}
				});
			});
			vscode.window.showInformationMessage(`Successfully removed dependency: ${packageName}`);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Error removing dependency: ${errorMessage}`);
			outputChannel.appendLine(`Error removing dependency: ${errorMessage}`);
			outputChannel.show();
		} finally {
			provider.refresh();
		}
	});
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
		cancellable: true
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

function sortPubspecDependencies() {
	const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
	if (!workspaceFolder) {
		return;
	}

	const pubspecPath = path.join(workspaceFolder, 'pubspec.yaml');
	if (!fs.existsSync(pubspecPath)) {
		return;
	}

	const fileContent = fs.readFileSync(pubspecPath, 'utf8');
	const doc = parseDocument(fileContent);

	const dependencies = doc.get('dependencies') as YAMLMap | undefined;
	const devDependencies = doc.get('dev_dependencies') as YAMLMap | undefined;

	if (dependencies) {
		const sortedDependencies = sortMapKeys(dependencies);
		doc.set('dependencies', sortedDependencies);
	}

	if (devDependencies) {
		const sortedDevDependencies = sortMapKeys(devDependencies);
		doc.set('dev_dependencies', sortedDevDependencies);
	}

	const newYamlContent = doc.toString();
	fs.writeFileSync(pubspecPath, newYamlContent, 'utf8');
}

function sortMapKeys(map: YAMLMap): YAMLMap {
	const sortedMap = new YAMLMap();
	const sortedKeys = map.items.sort((a, b) => {
		const keyA = String(a.key);
		const keyB = String(b.key);
		return keyA.localeCompare(keyB);
	});
	sortedMap.items = sortedKeys;
	return sortedMap;
}

async function removeUnusedDependencies() {
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

	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: 'Removing unused dependencies',
		cancellable: false
	}, async (_, __) => {
		try {
			const usedDependencies = await findUsedDependencies(workspaceFolder);
			const fileContent = fs.readFileSync(pubspecPath, 'utf8');
			const doc = parseDocument(fileContent);

			const dependencies = doc.get('dependencies') as YAMLMap;
			const devDependencies = doc.get('dev_dependencies') as YAMLMap;

			const allDependencies = { ...dependencies?.toJSON(), ...devDependencies?.toJSON() };
			const unusedDependencies = Object.keys(allDependencies).filter(dep => !usedDependencies.has(dep));

			if (unusedDependencies.length > 0) {
				unusedDependencies.forEach(dep => {
					if (dependencies) {
						dependencies.delete(dep);
					}
					if (devDependencies) {
						devDependencies.delete(dep);
					}
				});

				const newYamlContent = String(doc);
				fs.writeFileSync(pubspecPath, newYamlContent, 'utf8');

				vscode.window.showInformationMessage(`Removed unused dependencies: ${unusedDependencies.join(', ')}`);
				sortPubspecDependencies();
			} else {
				vscode.window.showInformationMessage('No unused dependencies found');
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Error removing unused dependencies: ${errorMessage}`);
			outputChannel.appendLine(`Error removing unused dependencies: ${errorMessage}`);
			outputChannel.show();
		}
	});
}

async function findUsedDependencies(workspaceFolder: string): Promise<Set<string>> {
	try {
		const files = await glob(`${workspaceFolder}/**/*.dart`, { ignore: 'node_modules/**' });
		const usedDependencies = new Set<string>();

		for (const file of files) {
			const content = await fs.readFileSync(file, 'utf8');
			const matches = content.match(/import\s+['"]package:([^\/]+)\//g);
			if (matches) {
				matches.forEach(match => {
					const dep = match.split('/')[0].replace(/import\s+['"]package:/, '');
					usedDependencies.add(dep);
				});
			}
		}

		return usedDependencies;
	} catch (err) {
		console.error('Error finding used dependencies:', err);
		throw err;
	}
}