import { PackageManagerProvider } from "../provider";
import * as vscode from 'vscode';
import { manageDependencies } from "./manageDependencies";
import { sortPubspecDependencies } from "./sortDependencies";
import { showPackageInputBox } from "../utils/showPackageInputBox";

export function addDependency(isDev: boolean, outputChannel: vscode.OutputChannel, provider: PackageManagerProvider) {
    showPackageInputBox(isDev).then(packageNames => {
        if (packageNames) {
            const packages = packageNames.split(',').map(pkg => pkg.trim());
            const command = `flutter pub add ${packages.join(' ')} ${isDev ? '--dev' : ''}`;

            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Adding dependencies ${packages}`,
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