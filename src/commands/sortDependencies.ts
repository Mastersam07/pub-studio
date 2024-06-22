import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parseDocument, YAMLMap } from 'yaml';
import { sortMapKeys } from '../utils/sortMap';

export function sortPubspecDependencies() {
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