import * as vscode from "vscode";
import axios from "axios";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const MAX_CHARS_POR_ARCHIVO = 3000;
const MAX_CHARS_TOTAL = 14000;

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "laravel-ai-doc.analizarProyecto",
    async () => {
      const apiKey = await getOpenAIKey(context);

      if (!apiKey) {
        vscode.window.showErrorMessage("No se ingresó la API Key");
        return;
      }

      const workspaceRoot =
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

      if (!workspaceRoot) {
        vscode.window.showErrorMessage("No hay workspace abierto");
        return;
      }

      // ─── 1. OBTENER ARCHIVOS MODIFICADOS VÍA GIT STATUS ──────────
      let archivosModificados: { archivo: string; estado: string }[] = [];

      try {
        // Archivos modificados (no staged)
        const modified = execSync("git diff --name-only", { cwd: workspaceRoot })
          .toString().split("\n").filter(Boolean);

        // Archivos en staging
        const staged = execSync("git diff --cached --name-only", { cwd: workspaceRoot })
          .toString().split("\n").filter(Boolean);

        // Archivos nuevos sin trackear
        const untracked = execSync("git ls-files --others --exclude-standard", { cwd: workspaceRoot })
          .toString().split("\n").filter(Boolean);

        // Unificar sin duplicados
        const todos = new Map<string, string>();
        modified.forEach(f  => todos.set(f, "modificado"));
        staged.forEach(f    => todos.set(f, "staged"));
        untracked.forEach(f => todos.set(f, "nuevo (sin trackear)"));

        archivosModificados = Array.from(todos.entries()).map(([archivo, estado]) => ({ archivo, estado }));

      } catch {
        vscode.window.showErrorMessage("Error ejecutando git. ¿Estás en un repositorio git?");
        return;
      }

      if (archivosModificados.length === 0) {
        vscode.window.showInformationMessage("No hay archivos modificados según git status");
        return;
      }

      // ─── 2. PARA CADA ARCHIVO: DIFF EXACTO + CONTENIDO COMPLETO ──
      let seccionCambios = `## Archivos detectados por git status (${archivosModificados.length})\n\n`;

      for (const { archivo, estado } of archivosModificados) {
        const rutaAbsoluta = path.join(workspaceRoot, archivo);
        seccionCambios += `### [${estado.toUpperCase()}] ${archivo}\n`;

        // -- Diff exacto (solo para archivos modificados/staged, no nuevos) --
        if (estado === "modificado" || estado === "staged") {
          try {
            const diffCmd = estado === "staged"
              ? `git diff --cached -- "${archivo}"`
              : `git diff -- "${archivo}"`;

            const diffTexto = execSync(diffCmd, { cwd: workspaceRoot }).toString();

            if (diffTexto.trim()) {
              seccionCambios += `**LÍNEAS EXACTAS QUE CAMBIARON (diff):**\n`;
              seccionCambios += `\`\`\`diff\n${diffTexto.slice(0, 2000)}\n\`\`\`\n\n`;
            }
          } catch {}
        }

        // -- Contenido completo del archivo (contexto) --
        try {
          if (fs.existsSync(rutaAbsoluta)) {
            const contenido = fs.readFileSync(rutaAbsoluta, "utf8");
            seccionCambios += `**CONTENIDO COMPLETO DEL ARCHIVO:**\n`;
            seccionCambios += `\`\`\`php\n${contenido.slice(0, MAX_CHARS_POR_ARCHIVO)}\n\`\`\`\n\n`;
          } else {
            seccionCambios += `_(Archivo eliminado o no encontrado)_\n\n`;
          }
        } catch {
          seccionCambios += `_(No se pudo leer el archivo)_\n\n`;
        }
      }

      const contextoTotal = seccionCambios.slice(0, MAX_CHARS_TOTAL);

      // ─── 3. ARMAR PROMPT ──────────────────────────────────────────
      const prompt = `
Eres un asistente experto en Laravel. Para cada archivo se te proporciona DOS cosas:
1. El DIFF exacto (líneas que cambiaron: - es lo que se quitó, + es lo que se puso)
2. El contenido completo del archivo (para entender el contexto)

INSTRUCCIONES:
- Para archivos MODIFICADOS: enfócate en el diff. Explica exactamente qué línea cambió, por qué importa ese cambio y qué efecto tiene en el sistema. Sé específico (ej: "Se cambió el campo de búsqueda de 'username' a 'email' en la función getUserIdByEmail, lo que significa que ahora Moodle busca usuarios por correo en lugar de nombre de usuario").
- Para archivos NUEVOS: describe su propósito y funcionalidad principal.
- Máximo 4 líneas por archivo. Responde en español, en formato Markdown.

ARCHIVOS A ANALIZAR:
${contextoTotal}
      `.trim();

      // ─── 4. LLAMAR A OPENAI ───────────────────────────────────────
      try {
        const response = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 800,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        const resultado = response.data.choices[0].message.content;

        const doc = await vscode.workspace.openTextDocument({
          content: resultado,
          language: "markdown",
        });

        vscode.window.showTextDocument(doc);
      } catch (error) {
        vscode.window.showErrorMessage(
          "Error llamando a OpenAI. Revisa tu API Key o conexión."
        );
      }
    }
  );

  context.subscriptions.push(disposable);
}

async function getOpenAIKey(
  context: vscode.ExtensionContext
): Promise<string | undefined> {
  let apiKey = await context.secrets.get("openaiKey");

  if (!apiKey) {
    apiKey = await vscode.window.showInputBox({
      prompt: "Ingresa tu OpenAI API Key",
      password: true,
    });

    if (apiKey) {
      await context.secrets.store("openaiKey", apiKey);
    }
  }

  return apiKey;
}