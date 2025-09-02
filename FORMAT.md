Zip Archive Structure

Overview

The exporter creates a standard `.zip` that packages captured webpage structure and assets for later import into design tools (e.g., a Figma plugin). The archive contains two JSON files and an optional assets directory.

Archive Layout

page-YYYYMMDD_HHMMSS.zip/
- manifest.json: Format metadata and source info
- data.json: Captured DOM-derived data
- assets/
  - images/
    - <original-filenames>

manifest.json

{
  "format": "zip-pack",
  "version": "1.0",
  "created": "2025-01-01T12:00:00.000Z",
  "source": {
    "title": "<page title>",
    "url": "<page url>"
  }
}

data.json

{
  "version": "1.0",
  "title": "<page title>",
  "url": "<page url>",
  "viewport": { "width": <number>, "height": <number> },
  "elements": [
    {
      "tag": "div|p|h1|...",
      "text": "<innerText>",
      "x": <int>, "y": <int>, "width": <int>, "height": <int>,
      "color": "css-color",
      "backgroundColor": "css-color?",
      "fontSize": "px",
      "fontFamily": "string",
      "fontWeight": "string|number",
      "textAlign": "left|center|right|justify",
      "padding": { "top": "px", "right": "px", "bottom": "px", "left": "px" },
      "borderRadius": "px",
      "boxShadow": { "x": <int>, "y": <int>, "blur": <int>, "spread": <int>, "color": "css-color" } | null,
      "opacity": "0..1",
      "zIndex": "auto|number"
    }
  ],
  "assets": {
    "img/<filename>": {
      // one of the following (the exporter will prefer local files if present)
      "filename": "assets/images/<filename>",
      "originalUrl": "https://...",
      "type": "image",
      "note": "Base64 omitted to reduce payload size" // optional
    }
  }
}

Export Rules

- Elements contain only computed data necessary for layout and typography reconstruction.
- Images are embedded as files when possible; otherwise, they are referenced by URL with a note explaining why.
- To keep message passing reliable, the extension may omit base64 in the content-script response; the popup rebuilds assets as needed when creating the archive.

Importer Guidance (for a later Figma plugin)

- Map block-level elements to frames; inline text nodes to text layers.
- Use `x`, `y`, `width`, `height` for frame geometry; map `padding` and `borderRadius` to corresponding node properties.
- Parse `boxShadow` into Figma’s effect structure.
- Resolve asset paths from `assets` by checking for `filename` first, falling back to `originalUrl`.
