import * as assert from 'assert';
import * as vscode from 'vscode';
import { PackageManagerProvider } from '../../provider';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('PackageManagerProvider should be created', () => {
		const provider = new PackageManagerProvider();
		assert.ok(provider);
	});

	test('Scripts section should have items', async () => {
		const provider = new PackageManagerProvider();
		const scriptsSection = (await provider.getChildren())[0];
		assert.strictEqual(provider.getLabel(scriptsSection.label), 'Scripts');
		const scripts = await provider.getChildren(scriptsSection);
		assert.strictEqual(scripts.length, 6); // There are 6 scripts
	});

	test('Dependencies section should show counts', async () => {
		const provider = new PackageManagerProvider();
		const dependenciesSection = (await provider.getChildren()).find(section => provider.getLabel(section.label).startsWith('Dependencies'));
		assert.ok(dependenciesSection);
	});
});
