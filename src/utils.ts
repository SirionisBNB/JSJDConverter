import * as vscode from 'vscode';

// Логирование в отдельное окно
const outputChannel = vscode.window.createOutputChannel("JSJDConverter Logs");

export function log(message: string) {
    outputChannel.appendLine(message);
    console.log(message);
}

export function getKindFromString(kindString: string): vscode.CompletionItemKind {
    switch (kindString) {
        case 'function':
            return vscode.CompletionItemKind.Function;
        case 'variable':
            return vscode.CompletionItemKind.Variable;
        case 'class':
            return vscode.CompletionItemKind.Class;
        default:
            return vscode.CompletionItemKind.Text;
    }
}
