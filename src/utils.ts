import { YAMLMap } from "yaml";
import * as https from 'https';
import * as vscode from 'vscode';

export function sortMapKeys(map: YAMLMap): YAMLMap {
    const sortedMap = new YAMLMap();
    const sortedKeys = map.items.sort((a, b) => {
        const keyA = String(a.key);
        const keyB = String(b.key);
        return keyA.localeCompare(keyB);
    });
    sortedMap.items = sortedKeys;
    return sortedMap;
}

async function fetchPackageSuggestions(query: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'pub.dev',
            path: `/api/search?q=${query}`,
            method: 'GET'
        };

        const req = https.request(options, res => {
            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    const results = parsedData.packages.map((pkg: any) => pkg.package);
                    resolve(results);
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', error => {
            reject(error);
        });

        req.end();
    });
}

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