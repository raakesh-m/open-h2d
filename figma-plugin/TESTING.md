# Testing the Figma Plugin

This document provides sample data and testing instructions for the Open H2D Figma Plugin.

## Sample ZIP Structure for Testing

For testing purposes, you can create a test ZIP file with this structure:

### Directory Structure
```
test-page.zip/
├── manifest.json
├── data.json
└── assets/
    └── images/
        └── sample.png
```

### Sample manifest.json
```json
{
  "format": "zip-pack",
  "version": "1.0",
  "created": "2024-01-01T12:00:00.000Z",
  "source": {
    "title": "Test Page",
    "url": "https://example.com/test"
  }
}
```

### Sample data.json
```json
{
  "version": "1.0",
  "title": "Test Page",
  "url": "https://example.com/test",
  "viewport": {
    "width": 1200,
    "height": 800
  },
  "elements": [
    {
      "tag": "div",
      "text": "",
      "x": 0,
      "y": 0,
      "width": 1200,
      "height": 800,
      "backgroundColor": "#ffffff",
      "borderRadius": "0px"
    },
    {
      "tag": "h1", 
      "text": "Welcome to Test Page",
      "x": 50,
      "y": 50,
      "width": 400,
      "height": 60,
      "color": "#333333",
      "fontSize": "32px",
      "fontFamily": "Arial",
      "fontWeight": "bold",
      "textAlign": "left"
    },
    {
      "tag": "p",
      "text": "This is a sample paragraph with some text content to test the import functionality.",
      "x": 50,
      "y": 120,
      "width": 500,
      "height": 40,
      "color": "#666666", 
      "fontSize": "16px",
      "fontFamily": "Arial",
      "fontWeight": "normal",
      "textAlign": "left",
      "padding": {
        "top": "8px",
        "right": "0px", 
        "bottom": "8px",
        "left": "0px"
      }
    },
    {
      "tag": "button",
      "text": "Click Me",
      "x": 50,
      "y": 180,
      "width": 120,
      "height": 40,
      "color": "#ffffff",
      "backgroundColor": "#007bff",
      "fontSize": "14px", 
      "fontFamily": "Arial",
      "fontWeight": "600",
      "textAlign": "center",
      "borderRadius": "6px",
      "padding": {
        "top": "10px",
        "right": "20px",
        "bottom": "10px", 
        "left": "20px"
      },
      "boxShadow": {
        "x": 0,
        "y": 2,
        "blur": 4,
        "spread": 0,
        "color": "rgba(0, 123, 255, 0.25)"
      }
    },
    {
      "tag": "div",
      "text": "",
      "x": 600,
      "y": 50, 
      "width": 300,
      "height": 200,
      "backgroundColor": "#f8f9fa",
      "borderRadius": "8px",
      "padding": {
        "top": "20px",
        "right": "20px",
        "bottom": "20px",
        "left": "20px"
      }
    },
    {
      "tag": "img",
      "text": "",
      "x": 620,
      "y": 70,
      "width": 260,
      "height": 160
    }
  ],
  "assets": {
    "img/sample.png": {
      "filename": "assets/images/sample.png",
      "originalUrl": "https://example.com/sample.png",
      "type": "image"
    }
  }
}
```

## Testing Checklist

### ✅ Basic Import Tests
- [ ] Plugin loads without errors in Figma
- [ ] Drag & drop zone responds to mouse events
- [ ] File selection dialog opens when clicking drop zone
- [ ] ZIP file validation works correctly
- [ ] Progress indicators display during import

### ✅ Validation Tests
- [ ] Valid ZIP files pass validation with green checkmarks
- [ ] Missing `manifest.json` shows appropriate error
- [ ] Missing `data.json` shows appropriate error  
- [ ] Invalid JSON format shows parsing error
- [ ] Wrong format field shows format error

### ✅ Element Creation Tests
- [ ] Text elements (h1, p) create proper text layers
- [ ] Container elements (div) create frames
- [ ] Button elements create frames with text children
- [ ] Image elements create rectangles (with placeholder if no asset)

### ✅ Styling Tests
- [ ] Background colors apply correctly
- [ ] Text colors and fonts render properly
- [ ] Border radius creates rounded corners
- [ ] Box shadows create drop shadow effects
- [ ] Padding applies to auto-layout frames
- [ ] Opacity values transfer correctly

### ✅ Layout Tests
- [ ] Element positions match original coordinates
- [ ] Element sizes match original dimensions
- [ ] Root frame contains all elements
- [ ] Viewport sizing works correctly
- [ ] Auto-layout applies where appropriate

### ✅ Error Handling Tests
- [ ] Missing assets create placeholders instead of failing
- [ ] Invalid CSS properties degrade gracefully
- [ ] Large files show progress without hanging
- [ ] Memory limits handle appropriately
- [ ] Font loading failures fallback to Inter

### ✅ Performance Tests
- [ ] Small pages (< 50 elements) import quickly
- [ ] Medium pages (50-200 elements) show progress
- [ ] Large pages (> 200 elements) complete successfully
- [ ] ZIP files up to 10MB process without issues

## Common Test Scenarios

### Scenario 1: Simple Text Page
Create a ZIP with just text elements (h1, h2, p) to test basic text rendering and positioning.

### Scenario 2: Layout with Containers  
Include nested div elements with background colors and padding to test frame creation and styling.

### Scenario 3: Button Components
Add button elements with text, colors, and shadows to test composite element creation.

### Scenario 4: Image Gallery
Include multiple img elements with corresponding assets to test image loading and fallbacks.

### Scenario 5: Complex Layout
Combine all element types in a realistic page layout to test comprehensive reconstruction.

## Debugging Tips

### Enable Console Logging
1. Open Figma's developer console (Ctrl/Cmd + Shift + I)
2. Look for plugin-related console messages
3. Check for JavaScript errors during import

### Validate ZIP Contents
1. Manually extract and examine ZIP file contents
2. Verify JSON files parse correctly in a JSON validator
3. Check that asset paths match references in data.json

### Test Incrementally
1. Start with minimal test cases (1-2 elements)
2. Gradually increase complexity
3. Isolate specific features that may be failing

### Monitor Memory Usage
1. Watch Figma's memory usage during large imports
2. Test with different file sizes to find limits
3. Restart Figma if memory issues occur

## Expected Behavior

### Successful Import
- All validation items show green checkmarks
- Progress bar reaches 100% without errors
- Success message appears with element count
- Figma canvas shows new frame with imported content
- All elements are selectable and editable

### Partial Success
- Some elements import successfully
- Error messages indicate specific failures
- Remaining elements still create properly
- Placeholders appear for missing assets

### Complete Failure
- Clear error message indicates root cause
- No partial content created on canvas
- Plugin returns to ready state for retry
- Console logs provide additional debugging info

This testing framework ensures the plugin handles both ideal cases and edge cases gracefully while providing clear feedback to users throughout the process.