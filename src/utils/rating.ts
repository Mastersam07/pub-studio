import * as vscode from 'vscode';

export function promptForRating(context: vscode.ExtensionContext) {
    const RATE_PROMPT_KEY = 'pubStudio.ratePrompt';
    const didPrompt = context.globalState.get<boolean>(RATE_PROMPT_KEY);

    if (!didPrompt) {
        vscode.window.showInformationMessage(
            'Enjoying Pub Studio? Please consider giving us a rating on the VS Code Marketplace or GitHub!',
            'Rate on Marketplace',
            'Star on GitHub',
            'Remind Me Later',
            'No, Thanks'
        ).then(selection => {
            if (selection === 'Rate on Marketplace') {
                vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=Mastersam.pub-studio'));
                context.globalState.update(RATE_PROMPT_KEY, true);
            } else if (selection === 'Star on GitHub') {
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/Mastersam07/pub-studio'));
                context.globalState.update(RATE_PROMPT_KEY, true);
            } else if (selection === 'No, Thanks' || selection === undefined) {
                context.globalState.update(RATE_PROMPT_KEY, true);
            }
        });
    }
}