import { App, normalizePath } from 'obsidian';
import type { Settings, TopicFormat } from './settings';

// Splits the model's output into the Topic line and the rest of the content
function parseOutput(raw: string): { topic: string; content: string } {
    const text = raw.trim();
    const firstLine = text.split('\n', 1)[0];
    const match = firstLine.match(/^Topic:\s*(.+)$/i);
    const topic = match ? match[1].trim() : 'Unsorted';
    const content = match ? text.slice(firstLine.length).trim() : text;
    return { topic, content };
}

function formatTopic(name: string, format: TopicFormat): string {
    if (format === 'link') return `[[${name}]]`;
    if (format === 'tag') return `#${name}`;
    return name;
}

// Builds the properties section + body, and saves it as a new note
export async function createNoteFromOutput(
    app: App,
    settings: Settings,
    sourceName: string,
    rawOutput: string,
): Promise<void> {
    const { topic, content } = parseOutput(rawOutput);

    // Use the matching topic's folder/format if it has one, else the default folder and plain format
    const match = settings.topics.find((t) => t.name === topic);
    const targetFolder = match?.path || settings.defaultFolder;
    const folder = targetFolder ? normalizePath(targetFolder) : '';
    const topicValue = formatTopic(topic, match?.format ?? 'plain');

    const body = `---\nparent: "[[Math]]"\nTopic: "${topicValue}"\n---\n\n${content}\n`;

    const baseName =
        sourceName
            .replace(/\.pdf$/i, '')
            .replace(/[\\/:]/g, '-') || 'Note';

    if (folder && !app.vault.getFolderByPath(folder)) {
        await app.vault.createFolder(folder);
    }

    // Avoid overwriting a note with the same name
    let fileName = baseName;
    let suffix = 1;
    while (app.vault.getFileByPath(normalizePath(`${folder}/${fileName}.md`))) {
        fileName = `${baseName} ${++suffix}`;
    }

    const path = normalizePath(folder ? `${folder}/${fileName}.md` : `${fileName}.md`);
    await app.vault.create(path, body);
}