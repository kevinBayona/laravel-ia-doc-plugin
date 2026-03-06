# Laravel AI Doc

Analiza automáticamente los cambios de tu proyecto Laravel usando IA y genera documentación clara de qué cambió, qué métodos se modificaron y qué efecto tienen los cambios.

## ¿Cómo funciona?

1. Abre tu proyecto Laravel en VS Code
2. Abre el Command Palette (`Ctrl+Shift+P`)
3. Ejecuta **"Laravel AI: Analizar cambios del proyecto"**
4. La extensión detecta todos los archivos modificados via `git status`
5. Envía el diff exacto + contenido de cada archivo a la IA
6. Abre un documento Markdown con la explicación detallada

## Características

- Detecta archivos **modificados**, **en staging** y **nuevos sin trackear**
- Muestra el diff exacto (qué líneas cambiaron) con contexto completo
- Explica el impacto real de cada cambio en el sistema
- Soporta proyectos Laravel con Services, Controllers, Models, etc.
- API Key guardada de forma segura con `vscode.SecretStorage`

## Requisitos

- Git instalado y proyecto bajo control de versiones
- API Key de OpenAI ([obtener aquí](https://platform.openai.com/api-keys))

## Configuración

Al ejecutar el comando por primera vez, se te pedirá tu OpenAI API Key. Se guarda de forma segura y no se vuelve a pedir.

## Ejemplo de salida

```markdown
### [MODIFICADO] app/Services/MoodleServices/InscripcionMoodleService.php
Se cambió el campo de búsqueda de `username` a `email` en la función `getUserIdByEmail`,
lo que significa que Moodle ahora busca usuarios por correo electrónico en lugar de
nombre de usuario. Esto corrige la integración con la API de Moodle.
```

## Licencia

MIT