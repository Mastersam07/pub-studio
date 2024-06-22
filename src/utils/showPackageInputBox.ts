import * as vscode from 'vscode';
import { fetchPackageSuggestions } from "./fetchPackageSuggestions";

export async function showPackageInputBox(isDev: boolean): Promise<string | undefined> {
    const quickPick = vscode.window.createQuickPick();
    quickPick.title = 'Enter package name(s)'
    quickPick.placeholder = 'Enter package name(s) to add (separate by comma)';

    let shouldCancel = false;

    quickPick.onDidChangeValue(async value => {
        const parts = value.split(',').map(part => part.trim());
        const lastPart = parts.pop() || '';
        const currentInput = parts.join(', ');

        if (lastPart.length === 0) {
            quickPick.items = [];
            return;
        }

        try {
            const suggestions = await fetchPackageSuggestions(lastPart);
            quickPick.items = suggestions.map(label => ({
                label: currentInput ? `${currentInput}, ${label}` : label
            }));
        } catch (error) {
            quickPick.items = [];
        }
    });

    quickPick.onDidAccept(() => {
        const selectedItem = quickPick.selectedItems[0];
        if (selectedItem) {
            quickPick.hide();
        }
    });

    quickPick.onDidTriggerButton(() => {
        shouldCancel = true;
        quickPick.hide();
    });

    return new Promise<string | undefined>(resolve => {
        quickPick.onDidHide(() => {
            if (shouldCancel) {
                resolve(undefined);
            } else {
                resolve(quickPick.selectedItems[0]?.label?.trim());
            }
            quickPick.dispose();
        });

        quickPick.show();
    });
}