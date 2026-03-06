import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export async function analizarCambios(diff: string) {

    const response = await client.responses.create({
        model: "gpt-4.1-mini",
        input: `
Analiza estos cambios de código de un proyecto Laravel.

Explica:
- que cambió
- que métodos nuevos existen
- que clases fueron modificadas

Cambios:
${diff}
`
    });

    return response.output_text;

}