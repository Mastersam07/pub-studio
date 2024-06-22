import * as vscode from 'vscode';

export function promptForRating() {
    const RATE_PROMPT_KEY = 'pubStudio.ratePrompt';
    const didPrompt = vscode.workspace.getConfiguration().get<boolean>(RATE_PROMPT_KEY);

    if (!didPrompt) {
        vscode.window.showInformationMessage(
            'Enjoying Pub Studio? Please consider rating us on the Visual Studio Marketplace!',
            'Rate Now',
            'Remind Me Later',
            'No, Thanks'
        ).then(selection => {
            if (selection === 'Rate Now') {
                vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=Mastersam.pub-studio'));
                vscode.workspace.getConfiguration().update(RATE_PROMPT_KEY, true, true);
            } else if (selection === 'No, Thanks') {
                vscode.workspace.getConfiguration().update(RATE_PROMPT_KEY, true, true);
            }
        });
    }
}