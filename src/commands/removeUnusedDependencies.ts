import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parseDocument, YAMLMap } from 'yaml';
import { sortPubspecDependencies } from './sortDependencies';
import { glob } from 'glob';

export async function removeUnusedDependencies(outputChannel: vscode.OutputChannel) {
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

            const allDependencies = { ...dependencies?.toJSON() };
            const unusedDependencies = Object.keys(allDependencies).filter(dep => !usedDependencies.has(dep));

            if (unusedDependencies.length > 0) {
                unusedDependencies.forEach(dep => {
                    if (dependencies) {
                        dependencies.delete(dep);
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

            // Check for import statements
            const importMatches = content.match(/import\s+['"]package:([^\/]+)\//g);
            if (importMatches) {
                importMatches.forEach(match => {
                    const dep = match.split('/')[0].replace(/import\s+['"]package:/, '');
                    usedDependencies.add(dep);
                });
            }

            // Check for export statements
            const exportMatches = content.match(/export\s+['"]package:([^\/]+)\//g);
            if (exportMatches) {
                exportMatches.forEach(match => {
                    const dep = match.split('/')[0].replace(/export\s+['"]package:/, '');
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