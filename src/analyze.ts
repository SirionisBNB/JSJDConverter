import * as vscode from 'vscode';

export function analyzeDynamicProperties(document: vscode.TextDocument): Map<string, Set<string>>
{
    const dynamicProperties = new Map<string, Set<string>>();
    const text = document.getText();
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
