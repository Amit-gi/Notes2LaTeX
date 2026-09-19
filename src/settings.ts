import { App, PluginSettingTab, SecretComponent, Setting } from 'obsidian';
import type NotesToLaTeX from './main';

export interface Settings {
    apiKeySecret: string; // name of the secret in Obsidian's secrets tab
    folderId: string;
    processedIds: string[];
}

export const DEFAULTS: Settings = { apiKeySecret: '', folderId: '', processedIds: [] };

export class SettingsTab extends PluginSettingTab {
    constructor(app: App, private plugin: NotesToLaTeX) {
        super(app, plugin);
    }

    display() {
        this.containerEl.empty();

        new Setting(this.containerEl).setName('Google API key').addComponent((el) =>
            new SecretComponent(this.app, el)
                .setValue(this.plugin.settings.apiKeySecret)
                .onChange(async (v) => {
                    this.plugin.settings.apiKeySecret = v;
                    await this.plugin.saveSettings();
                }),
        );

        new Setting(this.containerEl).setName('Drive folder ID').addText((t) =>
            t.setValue(this.plugin.settings.folderId).onChange(async (v) => {
                this.plugin.settings.folderId = v.trim();
                await this.plugin.saveSettings();
            }),
        );
    }
}