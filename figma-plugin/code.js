// Open H2D Figma Plugin - Main Code
// Handles ZIP import, CSS-to-Figma conversion, and layout reconstruction

// Plugin initialization
figma.showUI(__html__, { 
  width: 360, 
  height: 600,
  themeColors: true 
});

// Message handler
figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case 'import':
      await handleImport(msg.data, msg.settings);
      break;
  }
};

// CSS to Figma Conversion Utilities
class CSSConverter {
  
  // Convert CSS color to Figma RGB format
  static parseColor(cssColor) {
    if (!cssColor || cssColor === 'transparent' || cssColor === 'rgba(0, 0, 0, 0)') {
      return null;
    }

    // Handle hex colors
    if (cssColor.startsWith('#')) {
      const hex = cssColor.slice(1);
      let r, g, b, a = 1;
      
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      } else if (hex.length === 8) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
        a = parseInt(hex.slice(6, 8), 16) / 255;
      }
      
      return { r: r / 255, g: g / 255, b: b / 255, a };
    }

    // Handle rgb/rgba colors
    const rgbaMatch = cssColor.match(/rgba?\(([^)]+)\)/);
    if (rgbaMatch) {
      const values = rgbaMatch[1].split(',').map(v => parseFloat(v.trim()));
      const [r, g, b, a = 1] = values;
      return { r: r / 255, g: g / 255, b: b / 255, a };
    }

    // Handle named colors (basic set)
    const namedColors = {
      'black': { r: 0, g: 0, b: 0, a: 1 },
      'white': { r: 1, g: 1, b: 1, a: 1 },
      'red': { r: 1, g: 0, b: 0, a: 1 },
      'green': { r: 0, g: 0.5, b: 0, a: 1 },
      'blue': { r: 0, g: 0, b: 1, a: 1 },
      'gray': { r: 0.5, g: 0.5, b: 0.5, a: 1 },
      'grey': { r: 0.5, g: 0.5, b: 0.5, a: 1 }
    };

    const lowerColor = cssColor.toLowerCase();
    return namedColors[lowerColor] || { r: 0, g: 0, b: 0, a: 1 };
  }

  // Convert CSS font weight to Figma format
  static parseFontWeight(fontWeight) {
    if (!fontWeight) return 400;
    
    const weightMap = {
      'thin': 100,
      'extralight': 200,
      'light': 300,
      'normal': 400,
      'medium': 500,
      'semibold': 600,
      'bold': 700,
      'extrabold': 800,
      'black': 900
    };

    const lowerWeight = fontWeight.toString().toLowerCase();
    return weightMap[lowerWeight] || parseInt(fontWeight) || 400;
  }

  // Convert CSS font size to number
  static parseFontSize(fontSize) {
    if (!fontSize) return 14;
    
    const match = fontSize.match(/^(\d*\.?\d+)(.*)$/);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
      
      // Convert different units to pixels (approximate)
      switch (unit) {
        case 'px':
          return value;
        case 'em':
          return value * 16; // Assume 16px base
        case 'rem':
          return value * 16;
        case 'pt':
          return value * 1.333; // 1pt ≈ 1.333px
        default:
          return value || 14;
      }
    }
    
    return 14;
  }

  // Parse CSS padding
  static parsePadding(paddingObj) {
    if (!paddingObj || typeof paddingObj !== 'object') {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    const parseValue = (val) => {
      if (!val) return 0;
      const match = val.match(/^(\d*\.?\d+)/);
      return match ? parseFloat(match[1]) : 0;
    };

    return {
      top: parseValue(paddingObj.top),
      right: parseValue(paddingObj.right),
      bottom: parseValue(paddingObj.bottom),
      left: parseValue(paddingObj.left)
    };
  }

  // Parse CSS border radius
  static parseBorderRadius(borderRadius) {
    if (!borderRadius || borderRadius === '0px') return 0;
    
    const match = borderRadius.match(/^(\d*\.?\d+)/);
    return match ? parseFloat(match[1]) : 0;
  }

  // Convert CSS box shadow to Figma effect
  static parseBoxShadow(boxShadowData) {
    if (!boxShadowData || typeof boxShadowData !== 'object') {
      return null;
    }

    const color = this.parseColor(boxShadowData.color);
    if (!color) return null;

    return {
      type: 'DROP_SHADOW',
      color: color,
      offset: {
        x: boxShadowData.x || 0,
        y: boxShadowData.y || 0
      },
      radius: Math.abs(boxShadowData.blur || 0),
      spread: boxShadowData.spread || 0,
      visible: true,
      blendMode: 'NORMAL'
    };
  }

  // Convert CSS text align to Figma format
  static parseTextAlign(textAlign) {
    const alignMap = {
      'left': 'LEFT',
      'center': 'CENTER', 
      'right': 'RIGHT',
      'justify': 'JUSTIFIED'
    };
    
    return alignMap[textAlign && textAlign.toLowerCase()] || 'LEFT';
  }
}

// Layout Reconstruction Engine
class LayoutEngine {
  constructor(settings) {
    this.settings = settings || {};
    this.createdNodes = new Map(); // Track created nodes by element index
    this.imageAssets = new Map(); // Track loaded images
  }

  // Main reconstruction method
  async reconstructLayout(pageData, assets) {
    try {
      // Create root frame for the page
      const rootFrame = figma.createFrame();
      rootFrame.name = pageData.title || 'Imported Page';
      rootFrame.layoutMode = 'NONE'; // Start with absolute positioning
      
      // Set page dimensions from viewport
      if (pageData.viewport) {
        rootFrame.resize(pageData.viewport.width, pageData.viewport.height);
      }

      // Set background if needed
      rootFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

      // Process all elements
      await this.processElements(pageData.elements, rootFrame, assets);

      // Add to current page
      figma.currentPage.appendChild(rootFrame);
      figma.viewport.scrollAndZoomIntoView([rootFrame]);

      return rootFrame;

    } catch (error) {
      console.error('Layout reconstruction error:', error);
      throw new Error(`Layout reconstruction failed: ${error.message}`);
    }
  }

  // Process elements and create Figma nodes
  async processElements(elements, parentFrame, assets) {
    if (!elements || !Array.isArray(elements)) {
      throw new Error('Invalid elements data');
    }

    const totalElements = elements.length;
    let processedCount = 0;

    for (let i = 0; i < elements.length; i++) {
      try {
        const element = elements[i];
        await this.createElement(element, parentFrame, assets, i);
        
        processedCount++;
        
        // Send progress update
        if (processedCount % 10 === 0 || processedCount === totalElements) {
          const percent = Math.round((processedCount / totalElements) * 80) + 10; // 10-90% range
          figma.ui.postMessage({
            type: 'import-progress',
            data: {
              percent,
              message: `Processing elements (${processedCount}/${totalElements})`
            }
          });
        }

      } catch (elementError) {
        console.warn(`Error creating element ${i}:`, elementError);
        // Continue with other elements
      }
    }
  }

  // Create individual Figma element
  async createElement(elementData, parent, assets, index) {
    const { tag, text, x, y, width, height } = elementData;

    // Skip invalid elements
    if (width <= 0 || height <= 0) {
      return null;
    }

    let node = null;

    // Create appropriate node type based on tag
    switch (tag) {
      case 'img':
        node = await this.createImageNode(elementData, assets);
        break;
        
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
      case 'p':
      case 'span':
        node = this.createTextNode(elementData);
        break;
        
      case 'button':
        node = this.createButtonNode(elementData);
        break;
        
      case 'a':
        node = text ? this.createTextNode(elementData) : this.createFrameNode(elementData);
        break;
        
      default:
        // div and other block elements
        node = text ? this.createTextNode(elementData) : this.createFrameNode(elementData);
        break;
    }

    if (!node) {
      return null;
    }

    // Set basic properties
    node.x = x;
    node.y = y;
    node.resize(width, height);
    
    // Set name
    let nodeName = tag.toUpperCase();
    if (text && text.length > 0) {
      const truncatedText = text.substring(0, 30);
      nodeName += `: ${truncatedText}${text.length > 30 ? '...' : ''}`;
    }
    node.name = nodeName;

    // Apply styling
    this.applyCommonStyles(node, elementData);

    // Add to parent
    parent.appendChild(node);
    this.createdNodes.set(index, node);

    return node;
  }

  // Create text node
  createTextNode(elementData) {
    const textNode = figma.createText();
    
    // Set text content
    textNode.characters = elementData.text || '';
    
    // Apply text styling
    this.applyTextStyles(textNode, elementData);
    
    return textNode;
  }

  // Create frame node for containers
  createFrameNode(elementData) {
    const frame = figma.createFrame();
    
    // Set layout based on settings and element type
    if (this.settings.useAutoLayout && this.shouldUseAutoLayout(elementData)) {
      frame.layoutMode = 'VERTICAL';
      frame.primaryAxisSizingMode = 'FIXED';
      frame.counterAxisSizingMode = 'FIXED';
      frame.itemSpacing = 0;
    } else {
      frame.layoutMode = 'NONE';
    }

    return frame;
  }

  // Create button node (frame with text)
  createButtonNode(elementData) {
    const button = figma.createFrame();
    button.layoutMode = 'NONE';
    
    // Add text if present
    if (elementData.text) {
      const textNode = figma.createText();
      textNode.characters = elementData.text;
      textNode.x = 0;
      textNode.y = 0;
      textNode.resize(elementData.width, elementData.height);
      
      this.applyTextStyles(textNode, elementData);
      button.appendChild(textNode);
    }

    return button;
  }

  // Create image node
  async createImageNode(elementData, assets) {
    try {
      // Try to find corresponding asset
      const assetKey = this.findImageAsset(elementData, assets);
      
      if (assetKey && assets[assetKey]) {
        // Load image from ZIP assets
        const imageData = assets[assetKey];
        const image = figma.createImage(imageData);
        
        const rect = figma.createRectangle();
        rect.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }];
        
        return rect;
      } else {
        // Fallback: create placeholder rectangle
        const rect = figma.createRectangle();
        rect.fills = [{ 
          type: 'SOLID', 
          color: { r: 0.9, g: 0.9, b: 0.9 } 
        }];
        rect.name = 'Image Placeholder';
        
        return rect;
      }
    } catch (imageError) {
      console.warn('Image creation failed:', imageError);
      
      // Create placeholder
      const rect = figma.createRectangle();
      rect.fills = [{ 
        type: 'SOLID', 
        color: { r: 0.9, g: 0.9, b: 0.9 } 
      }];
      rect.name = 'Image Error';
      
      return rect;
    }
  }

  // Find matching image asset
  findImageAsset(elementData, assets) {
    // This would need to match based on image references in the data
    // For now, return first available image asset as fallback
    const assetKeys = Object.keys(assets);
    return assetKeys.find(key => key.startsWith('assets/images/'));
  }

  // Apply common styles to any node
  applyCommonStyles(node, elementData) {
    // Background color
    if (elementData.backgroundColor) {
      const bgColor = CSSConverter.parseColor(elementData.backgroundColor);
      if (bgColor && node.fills) {
        node.fills = [{ type: 'SOLID', color: bgColor }];
      }
    }

    // Border radius
    if (elementData.borderRadius && node.cornerRadius !== undefined) {
      const radius = CSSConverter.parseBorderRadius(elementData.borderRadius);
      node.cornerRadius = radius;
    }

    // Box shadow effect
    if (elementData.boxShadow) {
      const effect = CSSConverter.parseBoxShadow(elementData.boxShadow);
      if (effect && node.effects !== undefined) {
        node.effects = [effect];
      }
    }

    // Opacity
    if (elementData.opacity && elementData.opacity !== '1') {
      const opacity = parseFloat(elementData.opacity);
      if (!isNaN(opacity) && opacity >= 0 && opacity <= 1) {
        node.opacity = opacity;
      }
    }

    // Padding (for frames with auto-layout)
    if (elementData.padding && node.paddingTop !== undefined) {
      const padding = CSSConverter.parsePadding(elementData.padding);
      node.paddingTop = padding.top;
      node.paddingRight = padding.right;
      node.paddingBottom = padding.bottom;
      node.paddingLeft = padding.left;
    }
  }

  // Apply text-specific styles
  async applyTextStyles(textNode, elementData) {
    try {
      // Load font before applying styles
      const fontFamily = elementData.fontFamily || 'Inter';
      const fontWeight = CSSConverter.parseFontWeight(elementData.fontWeight);
      
      // Try to load the font, fallback to Inter if not available
      let fontName = { family: fontFamily, style: 'Regular' };
      
      try {
        await figma.loadFontAsync(fontName);
      } catch (fontError) {
        // Fallback to Inter
        fontName = { family: 'Inter', style: 'Regular' };
        await figma.loadFontAsync(fontName);
      }

      // Apply font
      textNode.fontName = fontName;

      // Font size
      const fontSize = CSSConverter.parseFontSize(elementData.fontSize);
      textNode.fontSize = fontSize;

      // Text color
      if (elementData.color) {
        const textColor = CSSConverter.parseColor(elementData.color);
        if (textColor) {
          textNode.fills = [{ type: 'SOLID', color: textColor }];
        }
      }

      // Text alignment
      const textAlign = CSSConverter.parseTextAlign(elementData.textAlign);
      textNode.textAlignHorizontal = textAlign;

      // Text auto resize
      textNode.textAutoResize = 'WIDTH_AND_HEIGHT';

    } catch (textError) {
      console.warn('Text styling error:', textError);
    }
  }

  // Determine if element should use auto-layout
  shouldUseAutoLayout(elementData) {
    // Use auto-layout for containers that might benefit from it
    const autoLayoutTags = ['div', 'section', 'article', 'nav', 'header', 'footer'];
    return this.settings.useAutoLayout && autoLayoutTags.includes(elementData.tag);
  }
}

// Main import handler
async function handleImport(importData, settings) {
  try {
    figma.ui.postMessage({
      type: 'import-progress',
      data: { percent: 5, message: 'Initializing layout engine...' }
    });

    // Initialize layout engine
    const layoutEngine = new LayoutEngine(settings);

    figma.ui.postMessage({
      type: 'import-progress',
      data: { percent: 10, message: 'Processing page data...' }
    });

    // Extract data from import
    const { manifest, data, assets } = importData;

    // Validate data structure
    if (!data || !data.elements) {
      throw new Error('Invalid page data structure');
    }

    figma.ui.postMessage({
      type: 'import-progress',
      data: { percent: 15, message: 'Starting layout reconstruction...' }
    });

    // Reconstruct layout
    const rootFrame = await layoutEngine.reconstructLayout(data, assets);

    figma.ui.postMessage({
      type: 'import-progress',
      data: { percent: 95, message: 'Finalizing import...' }
    });

    // Success
    figma.ui.postMessage({
      type: 'import-success',
      data: { 
        message: `Successfully imported ${data.elements.length} elements from "${data.title || 'Unknown Page'}"` 
      }
    });

  } catch (error) {
    console.error('Import failed:', error);
    
    figma.ui.postMessage({
      type: 'import-error',
      data: { message: error.message }
    });
  }
}

// Handle plugin close
figma.on('close', () => {
  // Cleanup if needed
});