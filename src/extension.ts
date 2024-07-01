import * as vscode from 'vscode';
import { loadConfig, ensureConfigParams } from './config';
import { DynamicCompletionItemProvider } from './completion_provider';
import { jsonToJSDoc, generateClassFromJSDoc } from './jsdoc_generator';
import { MyHoverProvider } from './hover_provider';
import { getV8Context, getV8Metadata } from './v8_meta';
import { log } from './utils'

export async function activate(context: vscode.ExtensionContext) {
    const config = await loadConfig();

    const configValid = await ensureConfigParams(config);
    if (!configValid) {
        log('Configuration was cancelled or incomplete.');
        return;
    }

    vscode.window.showInformationMessage('Extension activated!');

    const completionProvider = new DynamicCompletionItemProvider();
    const hoverProvider = new MyHoverProvider();

    context.subscriptions.push(vscode.commands.registerCommand('extension.updateIntelliSense', async () => {
        try {
            vscode.window.setStatusBarMessage('Updating IntelliSense...', 5000);
            log('Updating IntelliSense...');
            const response = await getV8Context(config);
            const metadataResponse = await getV8Metadata(config);

            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                completionProvider.updateCompletionItems(response.data, activeEditor.document);
                hoverProvider.updateDynamicProperties(activeEditor.document);
            }
            log('IntelliSense updated successfully!');
        } catch (error) {
            const errorMessage = 'Failed to update IntelliSense: ' + error.message;
            vscode.window.showErrorMessage(errorMessage);
            log(errorMessage);
        }
    }));

    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('javascript', completionProvider));
    context.subscriptions.push(vscode.languages.registerHoverProvider('javascript', hoverProvider));

    const disposable = vscode.commands.registerCommand('extension.generateJSDoc', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const text = editor.document.getText(editor.selection);
            try {
                const json = JSON.parse(text);
                const jsDocComment = jsonToJSDoc(json);
                editor.edit(editBuilder => {
                    editBuilder.insert(editor.selection.start, jsDocComment + '\n');
                });
            } catch (err) {
                const errorMessage = 'Cannot parse the JSON: ' + err;
                vscode.window.showErrorMessage(errorMessage);
            }
        }
    });

    const classDisposable = vscode.commands.registerCommand('extension.GenerateClassFromJSDoc', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const text = editor.document.getText(editor.selection);
            const classCode = generateClassFromJSDoc(text);
            if (classCode) {
                editor.edit(editBuilder => {
                    editBuilder.insert(editor.selection.end, '\n\n' + classCode);
                });
            } else {
                const errorMessage = 'Cannot generate class from JSDoc. Please ensure the JSDoc is well-formed.';
                vscode.window.showErrorMessage(errorMessage);
            }
        }
    });

    context.subscriptions.push(disposable);
    context.subscriptions.push(classDisposable);
}
