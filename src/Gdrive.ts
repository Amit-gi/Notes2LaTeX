import { requestUrl } from 'obsidian';

const API = 'https://www.googleapis.com/drive/v3/files';

export class GDrive {
    constructor(private apiKey: string, private folderId: string) {}

    async list(): Promise<{ id: string; name: string }[]> {
        const q = `'${this.folderId}' in parents and mimeType='application/pdf' and trashed=false`;
        const res = await requestUrl({
            url: `${API}?q=${encodeURIComponent(q)}&fields=files(id,name)&key=${this.apiKey}`,
        });
        return res.json.files;
    }

    async download(id: string): Promise<ArrayBuffer> {
        const res = await requestUrl({ url: `${API}/${id}?alt=media&key=${this.apiKey}` });
        return res.arrayBuffer;
    }
}