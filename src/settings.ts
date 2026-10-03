import { App, PluginSettingTab, SecretComponent, Setting } from 'obsidian';
import type NotesToLaTeX from './main';

export type TopicFormat = 'plain' | 'link' | 'tag';

export interface Topic {
    name: string;
    path: string; // optional vault folder to sort this topic's notes into
    format: TopicFormat; // how the topic is written into the note's Topic property
}

export interface Settings {
    driveKeySecret: string; // names of secrets in Obsidian's secrets tab
    geminiKeySecret: string;
    folderId: string;
    topics: Topic[];
    defaultFolder: string; // vault folder new notes are saved to; empty = vault root
    processedIds: string[];
}

export const DEFAULTS: Settings = {
    driveKeySecret: '',
    geminiKeySecret: '',
    folderId: '',
    topics: [],
    defaultFolder: '',
    processedIds: [],
};

export class SettingsTab extends PluginSettingTab {
    constructor(app: App, private plugin: NotesToLaTeX) {
        super(app, plugin);
    }

    display() {
        this.containerEl.empty();

        new Setting(this.containerEl).setName('Google Drive API key').addComponent((el) =>
            new SecretComponent(this.app, el)
                .setValue(this.plugin.settings.driveKeySecret)
                .onChange(async (v) => {
                    this.plugin.settings.driveKeySecret = v;
                    await this.plugin.saveSettings();
                }),
        );

        new Setting(this.containerEl).setName('Gemini API key').addComponent((el) =>
            new SecretComponent(this.app, el)
                .setValue(this.plugin.settings.geminiKeySecret)
                .onChange(async (v) => {
                    this.plugin.settings.geminiKeySecret = v;
                    await this.plugin.saveSettings();
                }),
        );

        new Setting(this.containerEl).setName('Drive folder ID').addText((t) =>
            t.setValue(this.plugin.settings.folderId).onChange(async (v) => {
                this.plugin.settings.folderId = v.trim();
                await this.plugin.saveSettings();
            }),
        );

        new Setting(this.containerEl)
            .setName('Default notes folder')
            .setDesc('Where new notes are saved. Leave empty for the vault root.')
            .addText((t) =>
                t
                    .setPlaceholder('e.g. Math/inbox')
                    .setValue(this.plugin.settings.defaultFolder)
                    .onChange(async (v) => {
                        this.plugin.settings.defaultFolder = v.trim();
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(this.containerEl)
            .setName('Topics')
            .setDesc('Gemini picks one of these as the note topic. Folder path is optional.')
            .setHeading();

        // One row per topic: name, folder path, format, remove button
        for (const topic of this.plugin.settings.topics) {
            new Setting(this.containerEl)
                .setName(topic.name)
                .addText((t) =>
                    t
                        .setPlaceholder('path/to/folder (optional)')
                        .setValue(topic.path)
                        .onChange(async (v) => {
                            topic.path = v.trim();
                            await this.plugin.saveSettings();
                        }),
                )
                .addDropdown((d) =>
                    d
                        .addOption('plain', 'Plain')
                        .addOption('link', '[[Topic]]')
                        .addOption('tag', '#Topic')
                        .setValue(topic.format)
                        .onChange(async (v) => {
                            topic.format = v as TopicFormat;
                            await this.plugin.saveSettings();
                        }),
                )
                .addExtraButton((b) =>
                    b
                        .setIcon('trash')
                        .setTooltip('Remove')
                        .onClick(async () => {
                            this.plugin.settings.topics = this.plugin.settings.topics.filter(
                                (t) => t !== topic,
                            );
                            await this.plugin.saveSettings();
                            this.display();
                        }),
                );
        }

        // Add a new topic
        let newName = '';
        new Setting(this.containerEl)
            .addText((t) =>
                t.setPlaceholder('e.g. Algebra').onChange((v) => {
                    newName = v.trim();
                }),
            )
            .addButton((b) =>
                b
                    .setButtonText('Add new topic')
                    .setCta()
                    .onClick(async () => {
                        if (!newName || this.plugin.settings.topics.some((t) => t.name === newName))
                            return;
                        this.plugin.settings.topics = [
                            ...this.plugin.settings.topics,
                            { name: newName, path: '', format: 'plain' },
                        ];
                        await this.plugin.saveSettings();
                        this.display();
                    }),
            );
    }
}