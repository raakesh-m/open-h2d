# Page Capture Chrome Extension

A Chrome extension (Manifest V3) that captures comprehensive page data and exports it as a standard .zip archive.

## Features

- **Browser Action Button**: Click the toolbar icon to open the capture interface
- **Comprehensive Data Capture**: 
  - Page metadata (title, URL, viewport dimensions)
  - All visible elements with positioning and styling data
  - Image assets converted to base64 and saved as binary files
- **ZIP Export**: Creates a `.zip` file with structured data
- **CORS Handling**: Graceful fallback for cross-origin images
- **Progress Feedback**: Real-time status updates during capture

## ZIP File Structure

The exported `.zip` file contains:

```
page-{timestamp}.zip/
├── manifest.json          # Archive metadata
├── data.json             # Complete page data
└── assets/
    └── images/
        ├── image1.png    # Extracted images as binary files
        └── image2.jpg
```

### manifest.json
```json
{
  "format": "zip-pack",
  "version": "1.0",
  "created": "2024-01-01T12:00:00.000Z",
  "source": {
    "title": "Page Title",
    "url": "https://example.com"
  }
}
```

### data.json
Contains all captured elements with their properties:
- Tag names and text content
- Positioning (x, y, width, height)
- Computed styles (colors, fonts, spacing, etc.)
- Asset references to files in the assets folder

## Installation

1. Open Chrome browser
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select this directory containing the extension files
6. The extension icon should appear in your toolbar

## Usage

1. **Navigate** to any webpage you want to capture
2. **Click** the extension icon in the Chrome toolbar
3. **Click** "Capture Page" in the popup
4. **Wait** for the progress indicators:
   - "Capturing page data..."
   - "Processing elements..."
   - "Creating ZIP file..."
5. **Save** the downloaded `.zip` file when prompted

## Technical Details

### Permissions Required
- `activeTab`: Access to the current tab content
- `scripting`: Inject content scripts
- `downloads`: Trigger file downloads

### Dependencies
- No external libraries required; includes a minimal ZIP writer (STORE method)
- Chrome Extensions API: Message passing and downloads

### Captured Data

**Elements**: `<div>`, `<p>`, `<h1>`-`<h6>`, `<span>`, `<a>`, `<button>`, `<img>`

**Properties per element**:
- Position and dimensions
- Text content
- Computed styles: color, backgroundColor, fontSize, fontFamily, fontWeight, textAlign, padding, borderRadius, boxShadow, opacity, zIndex

**Image Assets**:
- Converted to base64 when possible
- Saved as binary PNG/JPG files in ZIP
- URL fallback for CORS-blocked images

### Error Handling
- CORS restrictions on images
- Network timeouts (3-second limit)
- ZIP creation failures
- Download permission issues
- Content script injection failures
- Chrome internal page restrictions

### Troubleshooting

**"Could not establish connection" Error:**
- **Cause**: Content script not loaded or communication failure
- **Solution**: The extension now automatically injects the content script and retries
- **Manual fix**: Refresh the page and try again

**"Cannot capture Chrome internal pages" Error:**
- **Cause**: Trying to capture `chrome://` or extension pages
- **Solution**: Navigate to a regular website (http:// or https://)

**No ZIP Download:**
- Check if downloads are blocked in Chrome settings
- Verify the extension has downloads permission
- Try on a different website

**Empty or Incomplete Data:**
- Ensure the page is fully loaded before capture
- Check if the page has content restrictions
- Try with a simpler test page first

## Files Structure

- `manifest.json` - Extension configuration and permissions
- `popup.html` - User interface (no external scripts)
- `popup.js` - ZIP creation and download logic
- `content.js` - Page data capture and image processing
- `README.md` - This documentation

## Development Notes

- Uses Manifest V3 for modern Chrome compatibility
- Implements proper async/await patterns
- Includes comprehensive error handling
- Optimized for performance with 3-second timeouts
- Follows a simple JSON-in-zip format

## File Format Specification

The `.zip` archive is designed for:
- Web page archiving and analysis
- Design system extraction
- Automated testing data
- Page reconstruction and comparison
