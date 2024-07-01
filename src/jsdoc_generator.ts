export function jsonToJSDoc(json: any): string {
    let jsDocComment = `/**\n * @typedef {Object} TypeName\n`;
    for (const key in json) {
        const type = typeof json[key];
        jsDocComment += ` * @property {${type}} ${key}\n`;
    }
    jsDocComment += ' */';
    return jsDocComment;
}

export function generateClassFromJSDoc(jsDocComment: string): string | null {
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
 * Class representing ${className}.
 * @implements {${className}}
 */
class ${className} {
    /**
     * Creates an instance of ${className}.
     * @param {Object} data - The data object to initialize ${className}.
     */
    constructor(data) {
        Object.keys(data).forEach(key => {
            this[key] = data[key];
        });
    }\n`;

    classStr += '}\n';

    return classStr;
}
