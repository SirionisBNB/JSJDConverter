import * as vscode from 'vscode';
import { analyzeDynamicProperties } from './analyze';
import { log } from './utils';

export class MyHoverProvider implements vscode.HoverProvider {
    private dynamicProperties: Map<string, Set<string>> = new Map();

    updateDynamicProperties(document: vscode.TextDocument) {
        this.dynamicProperties = analyzeDynamicProperties(document);
    }

    provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        const range = document.getWordRangeAtPosition(position);
        const word = document.getText(range);
        log(`Hover request for word: ${word}`);
        // Проверка динамических свойств
        for (const [objectName, properties] of this.dynamicProperties.entries()) {
            if (properties.has(word)) {
                const hoverContents = new vscode.MarkdownString();
                hoverContents.appendMarkdown(`### ${word}\n`);
                hoverContents.appendMarkdown(`**Type:** Dynamic Property\n`);
                hoverContents.appendMarkdown(`Dynamically added property to the object ${objectName}.`);
                return new vscode.Hover(hoverContents, range);
            }
        }

        return null;  // Возвращаем null для стандартных функций, чтобы они обрабатывались обычным образом
    }
}
