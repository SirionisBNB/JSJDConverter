const vscode = require('vscode');
const axios = require('axios');

function getKindFromString(kindString)
{
    switch (kindString) {
        case 'function':
            return vscode.CompletionItemKind.Function;
        case 'variable':
            return vscode.CompletionItemKind.Variable;
        case 'class':
            return vscode.CompletionItemKind.Class;
        // добавьте здесь другие сопоставления, если они вам нужны
        default:
            return vscode.CompletionItemKind.Text;
    }
}

class HoverProvider
{
    provideHover(document, position, token)
    {
        const range = document.getWordRangeAtPosition(position);
        const word = document.getText(range);

        if (hoverData.has(word)) {
            const element = hoverData.get(word);
            const hoverContents = new vscode.MarkdownString();

            hoverContents.appendMarkdown(`### ${element.label}`);
            hoverContents.appendMarkdown(`**Type:** ${element.kind}`);
            if (element.detail) {
                hoverContents.appendMarkdown(`**Detail:** ${element.detail}`);
            }
            if (element.documentation) {
                hoverContents.appendMarkdown(`**Description:** ${element.documentation}`);
            }
            if (element.example) {
                hoverContents.appendCodeblock(element.example, "javascript");
            }

            return new vscode.Hover(hoverContents, range);
        }

        return null;  // Возвращаем null для стандартных функций, чтобы они обрабатывались обычным образом
    }
}


class DynamicCompletionItemProvider
{
    constructor()
    {
        this.completionItems = [];
    }

    updateCompletionItems(contextInfo)
    {
        this.completionItems = [];

        for (const [key, element] of Object.entries(contextInfo)) {
            // Пропускаем свойства, которые не являются объектами (например, `start` и `duration_ms`)
            if (element && typeof element === 'object' && !Array.isArray(element) && element.kind) {
                // Создаем элемент автодополнения
                const kind = getKindFromString(element.kind);
                const item = new vscode.CompletionItem(element.label, kind);
                let markdownDocumentation = new vscode.MarkdownString();
                markdownDocumentation.appendText(element.documentation || 'Documentation not provided');
                markdownDocumentation.appendCodeblock("function example(arg) {\n  // ...code\n}", "javascript");
                markdownDocumentation.appendMarkdown(`**Description:** ${element.documentation}`);
                item.documentation = markdownDocumentation;
                item.detail = element.detail || 'Function defined in V8 context';
                item.insertText = new vscode.SnippetString(element.insertText);
                this.completionItems.push(item);
            }
        }
    }

    provideCompletionItems(document, position, token, context)
    {
        // Основываясь на контексте, вы можете добавить подробную сигнатуру
        // метода в свойство detail каждого CompletionItem
        const word = document.getText(document.getWordRangeAtPosition(position));
        this.completionItems.forEach(item =>
        {
            if (item.label === word && item.kind === vscode.CompletionItemKind.Function) {
                item.detail = `function ${word}(args: any): any`; // Пример сигнатуры
                // Вы также можете использовать item.documentation для подробного описания
            }
        });
        return this.completionItems;
    }
}

function activate(context)
{
    let disposable = vscode.commands.registerCommand('extension.generateJSDoc', function ()
    {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const text = editor.document.getText(editor.selection);
            try {
                const json = JSON.parse(text);
                const jsDocComment = jsonToJSDoc(json);
                editor.edit(editBuilder =>
                {
                    editBuilder.insert(editor.selection.start, jsDocComment + '\n');
                });
            } catch (err) {
                vscode.window.showErrorMessage('Cannot parse the JSON: ' + err);
            }
        }
    });

    // Регистрация команды GenerateClassFromJSDoc
    let classDisposable = vscode.commands.registerCommand('extension.GenerateClassFromJSDoc', function ()
    {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const text = editor.document.getText(editor.selection);
            const classCode = generateClassFromJSDoc(text);
            if (classCode) {
                editor.edit(editBuilder =>
                {
                    editBuilder.insert(editor.selection.end, '\n\n' + classCode);
                });
            } else {
                vscode.window.showErrorMessage('Cannot generate class from JSDoc. Please ensure the JSDoc is well-formed.');
            }
        }
    });

    const completionProvider = new DynamicCompletionItemProvider();
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('javascript', completionProvider));
    const updateIntelliSenseCommand = 'extension.updateIntelliSense';

    let updateIntelliSenseDisposable = vscode.commands.registerCommand(updateIntelliSenseCommand, async function ()
    {
        try {
            vscode.window.setStatusBarMessage('Updating IntelliSense...', 5000);

            const response = await axios.post('http://i9u.bmgd.xyz:7200/get_v8_context', {
                token: "CrownSoldiers",
                who: "Alexei"
            });

            completionProvider.updateCompletionItems(response.data);
        } catch (error) {
            vscode.window.showErrorMessage('Failed to update IntelliSense: ' + error.message);
        }
    });

    context.subscriptions.push(updateIntelliSenseDisposable);
    context.subscriptions.push(classDisposable);
    context.subscriptions.push(disposable);


    context.subscriptions.push(vscode.languages.registerHoverProvider('javascript', new HoverProvider()));
}

function deactivate() { }

function jsonToJSDoc(json)
{
    let jsDocComment = `/**\n * @typedef {Object} TypeName\n`;
    for (const key in json) {
        const type = typeof json[key];
        jsDocComment += ` * @property {${type}} ${key}\n`;
    }
    jsDocComment += ' */';
    return jsDocComment;
}

function generateClassFromJSDoc(jsDocComment)
{
    // Извлечение данных из JSDoc
    const propertyLines = jsDocComment.match(/\* @property {(\w+)} (\w+)/g);
    if (!propertyLines) {
        return null;
    }

    const properties = propertyLines.map(line =>
    {
        const match = line.match(/\* @property {(\w+)} (\w+)/);
        return { type: match[1], name: match[2] };
    });

    const classNameMatch = jsDocComment.match(/\* @typedef {Object} (\w+)/);
    if (!classNameMatch) {
        return null;
    }
    const className = classNameMatch[1]; // Извлечение имени класса

    // Генерация кода класса
    let classStr = `/**
 * Класс, представляющий ${className}.
 * @implements {${className}}
 */
class ${className} {
    /**
     * Создаёт экземпляр ${className}.
     * @param {Object} data - Объект с данными для ${className}.
     */
    constructor(data) {
        Object.keys(data).forEach(key => {
            this[key] = data[key];
        });
    }\n`;

    // Добавление JSDoc комментариев для свойств
    //  properties.forEach(prop =>
    //  {
    //      classStr += `    /**\n     * @type {${prop.type}}\n     */\n`;
    //      classStr += `    this.${prop.name} = undefined;\n`;
    //  });

    // Конец класса
    classStr += '}\n';

    return classStr;
}


module.exports = {
    activate,
    deactivate
};
