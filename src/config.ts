import * as vscode from 'vscode';
import * as path from 'path';
import { promises as fs } from 'fs';
import { log } from './utils'

export async function loadConfig(): Promise<any> {
    const configPath = path.join(__dirname, '..', 'config.json');
    const configBuffer = await fs.readFile(configPath);
    return JSON.parse(configBuffer.toString());
}

export async function saveConfig(config: any) {
    const configPath = path.join(__dirname, '..', 'config.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 4), 'utf8');
}

export async function promptForConfigParam(prompt: string): Promise<string | undefined> {
    const value = await vscode.window.showInputBox({ prompt });
    return value;
}

export async function ensureConfigParams(config: any): Promise<boolean> {
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
