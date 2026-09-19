import { Notice, Plugin, arrayBufferToBase64 } from 'obsidian';
import { DEFAULTS, Settings, SettingsTab } from './settings';
import { GDrive } from './Gdrive';

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

        const key = await this.app.secretStorage.getSecret(this.settings.apiKeySecret);
        if (!key || !this.settings.folderId) {
            new Notice('Set the API key and Drive folder ID in settings first');
            return;
        }

        this.busy = true;
        try {
            const drive = new GDrive(key, this.settings.folderId);
            // Re-list every time, so files added during processing get picked up
            const next = async () =>
                (await drive.list()).find((f) => !this.settings.processedIds.includes(f.id));

            for (let file = await next(); file; file = await next()) {
                const base64 = arrayBufferToBase64(await drive.download(file.id));
                console.log(file.name, 'base64 length:', base64.length);
                // TODO: send `base64` to Gemini (mime type application/pdf) and create the note

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