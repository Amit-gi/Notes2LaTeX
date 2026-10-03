import { Notice, Plugin, arrayBufferToBase64 } from 'obsidian';
import { DEFAULTS, Settings, SettingsTab } from './settings';
import { GDrive } from './Gdrive';
import { Gemini } from './Gemini';
import { createNoteFromOutput } from './note';

export default class NotesToLaTeX extends Plugin {
    settings!: Settings;
    private busy = false;

    async onload() {
        this.settings = Object.assign({}, DEFAULTS, await this.loadData());
        this.addSettingTab(new SettingsTab(this.app, this));
        this.addCommand({
            id: 'process-drive-pdfs',
            name: 'Process PDFs from Google Drive',
            callback: () => void this.processDrive(),
        });
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async processDrive() {
        if (this.busy) return;

        const driveKey = await this.app.secretStorage.getSecret(this.settings.driveKeySecret);
        const geminiKey = await this.app.secretStorage.getSecret(this.settings.geminiKeySecret);
        if (!driveKey || !geminiKey || !this.settings.folderId) {
            new Notice('Set both API keys and the Drive folder ID in settings first');
            return;
        }

        this.busy = true;
        try {
            const drive = new GDrive(driveKey, this.settings.folderId);
            const gemini = new Gemini(geminiKey);
            const prompt = (
                await this.app.vault.adapter.read(`${this.manifest.dir}/prompt.md`)
            ).replace('{{TOPICS}}', this.settings.topics.map((t) => t.name).join(', ') || 'Unsorted');

            // Re-list every time, so files added during processing get picked up
            const next = async () =>
                (await drive.list()).find((f) => !this.settings.processedIds.includes(f.id));

            for (let file = await next(); file; file = await next()) {
                console.log('Processing file:', file.name);

                const base64 = arrayBufferToBase64(await drive.download(file.id));
                const text = await gemini.convert(base64, prompt);
                console.log('model output is working')
                await createNoteFromOutput(this.app, this.settings, file.name, text);
                console.log('creating file is working')
                this.settings.processedIds = [...this.settings.processedIds, file.id];
                await this.saveSettings();
            }
            new Notice('Done');
        } catch (e) {
            console.error(e);
            new Notice('Failed, see console');
        } finally {
            this.busy = false;
        }
    }
}