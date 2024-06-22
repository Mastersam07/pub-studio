import * as vscode from 'vscode';
import { PackageManagerProvider } from '../provider';
import { manageDependencies } from './manageDependencies';
import { sortPubspecDependencies } from './sortDependencies';

export function updateDependency(item: vscode.TreeItem, outputChannel: vscode.OutputChannel, provider: PackageManagerProvider) {
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
                manageDependencies(command, outputChannel, (err) => {
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

export function removeDependency(item: vscode.TreeItem, outputChannel: vscode.OutputChannel, provider: PackageManagerProvider) {
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
                manageDependencies(command, outputChannel, (err) => {
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