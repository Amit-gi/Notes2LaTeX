import { requestUrl } from 'obsidian';

// Best first. If a model is overloaded (503), out of quota (429) or unknown (404),
// the next one is tried.
const MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
const ROUNDS = 3; // full passes over the list, waiting 15s and then 30s between passes
const RETRY_STATUSES = [404, 429, 503];

export class Gemini {
    constructor(private apiKey: string) {}

    // Sends a base64 PDF and the prompt to Gemini, returns the model's text
    async convert(pdfBase64: string, prompt: string): Promise<string> {
        const body = JSON.stringify({
            contents: [
                {
                    parts: [
                        { inline_data: { mime_type: 'application/pdf', data: pdfBase64 } },
                        { text: prompt },
                    ],
                },
            ],
        });

        let lastError = '';
        for (let round = 1; round <= ROUNDS; round++) {
            for (const model of MODELS) {
                const res = await requestUrl({
                    url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
                    body,
                    throw: false,
                });

                if (res.status < 400) {
                    const parts = res.json.candidates?.[0]?.content?.parts;
                    if (!parts) throw new Error(`Gemini returned no text: ${JSON.stringify(res.json)}`);
                    console.log('Model used:', model);
                    return parts.map((p: { text?: string }) => p.text ?? '').join('');
                }

                lastError = `Gemini ${res.status} (${model}): ${res.text}`;
                // Other errors (bad key, bad request) won't fix themselves, so stop
                if (!RETRY_STATUSES.includes(res.status)) throw new Error(lastError);
                console.warn(`${model} failed with ${res.status}, trying next`);
            }
            if (round < ROUNDS) await new Promise((r) => window.setTimeout(r, 15000 * round));
        }
        throw new Error(lastError);
    }
}