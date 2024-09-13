import * as vscode from 'vscode';
import { getKindFromString } from './utils';
import { analyzeDynamicProperties } from './analyze';

export class DynamicCompletionItemProvider implements vscode.CompletionItemProvider {
    private completionItems: vscode.CompletionItem[] = [];
    private dynamicProperties: Map<string, Set<string>> = new Map();

    updateCompletionItems(contextInfo: Record<string, any>, document: vscode.TextDocument) {
        this.completionItems = [];
        this.dynamicProperties = analyzeDynamicProperties(document);

        for (const [key, element] of Object.entries(contextInfo)) {
            const kind = getKindFromString(element.kind);
            const item = new vscode.CompletionItem(element.label, kind);
            item.detail = element.detail || 'Function defined in V8 context';
            item.insertText = new vscode.SnippetString(element.insertText);

            let markdownDocumentation = new vscode.MarkdownString();
            if (element.documentation) {
                markdownDocumentation.appendMarkdown(element.documentation);
            }
            if (element.example) {
                markdownDocumentation.appendCodeblock(element.example, "javascript");
            }
            item.documentation = markdownDocumentation;

            this.completionItems.push(item);
        }

        // Adding dynamic properties to completionItems
        for (const [objectName, properties] of this.dynamicProperties.entries()) {
            properties.forEach(prop => {
                const item = new vscode.CompletionItem(prop, vscode.CompletionItemKind.Property);
                item.detail = `Dynamic property of ${objectName}`;
                item.insertText = prop;
                item.documentation = new vscode.MarkdownString(`Dynamically added property to the object ${objectName}.`);
                this.completionItems.push(item);
            });
        }
    }

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[]> {
        return this.completionItems;
    }
}
