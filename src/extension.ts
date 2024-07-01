import * as vscode from 'vscode';
import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';

const writeFile = util.promisify(fs.writeFile);

async function loadConfig(): Promise<any> {
    const config = vscode.workspace.getConfiguration('JSJDConverter');

    return {
        serverAddress: config.get<string>("serverAddress", ""),
        serverPort: config.get<number>("serverPort", 0),
        token: config.get<string>("token", ""),
        who: config.get<string>("who", "")
    };
}

async function saveConfig(config: any) {
    const configuration = vscode.workspace.getConfiguration('JSJDConverter');

    await configuration.update("serverAddress", config.serverAddress, vscode.ConfigurationTarget.Global);
    await configuration.update("serverPort", config.serverPort, vscode.ConfigurationTarget.Global);
    await configuration.update("token", config.token, vscode.ConfigurationTarget.Global);
    await configuration.update("who", config.who, vscode.ConfigurationTarget.Global);
}

async function promptForConfigParam(prompt: string): Promise<string | undefined> {
    const value = await vscode.window.showInputBox({ prompt });
    return value;
}

async function ensureConfigParams(config: any): Promise<boolean> {
    let updated = false;

    if (!config.serverAddress) {
        const value = await promptForConfigParam("Enter server address");
        if (value === undefined) {
            return false;
        }
        config.serverAddress = value;
        updated = true;
    }

    if (!config.serverPort) {
        const value = await promptForConfigParam("Enter server port");
        if (value === undefined) {
            return false;
        }
        config.serverPort = parseInt(value, 10);
        updated = true;
    }

    if (!config.token) {
        const value = await promptForConfigParam("Enter token");
        if (value === undefined) {
            return false;
        }
        config.token = value;
        updated = true;
    }

    if (!config.who) {
        const value = await promptForConfigParam("Enter who");
        if (value === undefined) {
            return false;
        }
        config.who = value;
        updated = true;
    }

    if (updated) {
        await saveConfig(config);
    }

    return true;
}

function analyzeDynamicProperties(document: vscode.TextDocument): Map<string, Set<string>> {
    const dynamicProperties = new Map<string, Set<string>>();
    const text = document.getText();

    // Регулярное выражение для поиска присвоений свойств объектам (e.g., obj.prop = value)
    const regex = /(\w+)\.(\w+)\s*=\s*[^;]+;/g;
    let match;

    while (match = regex.exec(text)) {
        const objectName = match[1];
        const propertyName = match[2];

        if (!dynamicProperties.has(objectName)) {
            dynamicProperties.set(objectName, new Set());
        }
        dynamicProperties.get(objectName).add(propertyName);
    }

    return dynamicProperties;
}

const hoverData = new Map<string, any>(); // создаем хранилище данных для hover

// Логирование в отдельное окно
const outputChannel = vscode.window.createOutputChannel("JSJDConverter Logs");

function log(message: string) {
    outputChannel.appendLine(message);
    console.log(message);
}

function getKindFromString(kindString: string): vscode.CompletionItemKind {
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

function AppendCodeBlock(element, hoverContents) {
    // Получаем строки с аргументами для каждого перегруженного варианта
    const argsVariants = element.args.map((argsArray: Array<{ name: string, type?: string }>) => {
        return argsArray.map(arg => {
            // Если тип задан, создаем ссылку на его имплементацию
            if (arg.type) {
                // Создаем ссылку для перехода к определению
                return `${arg.name}: ${arg.type}`;
            }
            // Если тип не задан, просто возвращаем имя аргумента
            return `${arg.name}`;
        }).join(', ');
    });

    // Получаем строку с возвращаемым типом, добавляя ссылку на его имплементацию
    let returnTypeString = 'any';
    if (element.return_type) {
        returnTypeString = element.return_type.replace(/(\w+(\.\w+)?)/g, `${element.return_type}`);
    }

    // Создаем блок кода в зависимости от типа элемента
    switch (getKindFromString(element.kind)) {
        case vscode.CompletionItemKind.Function:
            // Для каждой перегрузки создаем отдельный блок кода
            argsVariants.forEach(argsString => {
                hoverContents.appendCodeblock(`function ${element.label}(${argsString}): ${returnTypeString}`, 'typescript');
            });
            break;
        case vscode.CompletionItemKind.Variable:
            hoverContents.appendCodeblock(`${element.label}: ${returnTypeString}`, 'typescript');
            break;
        case vscode.CompletionItemKind.Class:
            hoverContents.appendCodeblock(`class ${element.label}`, 'typescript');
            break;
    }
}

class MyHoverProvider implements vscode.HoverProvider {
    private dynamicProperties: Map<string, Set<string>> = new Map();

    updateDynamicProperties(document: vscode.TextDocument) {
        this.dynamicProperties = analyzeDynamicProperties(document);
    }

    provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        const range = document.getWordRangeAtPosition(position);
        const word = document.getText(range);
        log(`Hover request for word: ${word}`);

        if (hoverData.has(word)) {
            const element = hoverData.get(word);
            log(JSON.stringify(element, null, 2))
            const hoverContents = new vscode.MarkdownString();

            hoverContents.appendMarkdown(`### ${element.label}\n`);
            AppendCodeBlock(element, hoverContents);


            if (element.description) {
                hoverContents.appendMarkdown(`**Description:** ${element.description}\n`);
            }
            if (element.insertText) {
                hoverContents.appendMarkdown(`**Insert Text:** \`${element.insertText}\`\n`);
            }

            return new vscode.Hover(hoverContents, range);
        }

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

class DynamicCompletionItemProvider implements vscode.CompletionItemProvider {
    private completionItems: vscode.CompletionItem[] = [];
    private dynamicProperties: Map<string, Set<string>> = new Map();


    updateCompletionItems(contextInfo: Record<string, any>, document: vscode.TextDocument) {
        this.completionItems = [];
        hoverData.clear();  // очищаем хранилище перед заполнением новыми данными

        for (const [key, element] of Object.entries(contextInfo)) {
            if (element && typeof element === 'object' && !Array.isArray(element) && element.kind) {
                const kind = getKindFromString(element.kind);
                const item = new vscode.CompletionItem(element.label, kind);
                item.detail = element.short_desc || 'Function defined in V8 context';
                item.insertText = new vscode.SnippetString(element.insertText || element.label);
                item.filterText = element.label;

                let markdownDocumentation = new vscode.MarkdownString();
                if (element.description) {
                    markdownDocumentation.appendMarkdown(element.description);
                }
                if (element.example) {
                    markdownDocumentation.appendCodeblock(element.example, "javascript");
                }
                item.documentation = markdownDocumentation;

                this.completionItems.push(item);

                hoverData.set(element.label, element);
            }
        }

        this.dynamicProperties = analyzeDynamicProperties(document);
        // Добавление динамических свойств в completionItems
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

export async function activate(context: vscode.ExtensionContext) {
    const config = await loadConfig();

    const configValid = await ensureConfigParams(config);
    if (!configValid) {
        log('Configuration was cancelled or incomplete.');
        return;
    }

    outputChannel.show(); // Показываем канал вывода

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
                log(errorMessage);
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
                log(errorMessage);
            }
        }
    });

    context.subscriptions.push(disposable);
    context.subscriptions.push(classDisposable);

    const completionProvider = new DynamicCompletionItemProvider();
    const hoverProvider = new MyHoverProvider();

    context.subscriptions.push(vscode.commands.registerCommand('extension.updateIntelliSense', async () => {
        try {
            vscode.window.setStatusBarMessage('Updating IntelliSense...', 5000);
            const response = await axios.post(`${config.serverAddress}:${config.serverPort}/get_v8_context`, {
                token: config.token,
                who: config.who
            });

            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                completionProvider.updateCompletionItems(response.data, activeEditor.document);
                hoverProvider.updateDynamicProperties(activeEditor.document);
            }
        } catch (error) {
            const errorMessage = 'Failed to update IntelliSense: ' + error.message;
            vscode.window.showErrorMessage(errorMessage);
            log(errorMessage);
        }
    }));

    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('javascript', completionProvider));
    context.subscriptions.push(vscode.languages.registerHoverProvider('javascript', hoverProvider));
}

export function deactivate() { }

function jsonToJSDoc(json: any) {
    let jsDocComment = `/**\n * @typedef {Object} TypeName\n`;
    for (const key in json) {
        const type = typeof json[key];
        jsDocComment += ` * @property {${type}} ${key}\n`;
    }
    jsDocComment += ' */';
    return jsDocComment;
}

function generateClassFromJSDoc(jsDocComment: string) {
    const propertyLines = jsDocComment.match(/\* @property {(\w+)} (\w+)/g);
    if (!propertyLines) {
        return null;
    }

    const properties = propertyLines.map(line => {
        const match = line.match(/\* @property {(\w+)} (\w+)/);
        return { type: match[1], name: match[2] };
    });

    const classNameMatch = jsDocComment.match(/\* @typedef {Object} (\w+)/);
    if (!classNameMatch) {
        return null;
    }
    const className = classNameMatch[1];

    let classStr = `/**
 * Класс, представляющий ${className}.
 * @implements {${className}}
 */
class ${className} {
    /**
     * Создаёт экземпляр ${className}.
     * @param {Object} data - Объект с данными для ${className}.
     */
    constructor(data: any) {
        Object.keys(data).forEach(key => {
            this[key] = data[key];
        });
    }\n`;

    classStr += '}\n';

    return classStr;
}
