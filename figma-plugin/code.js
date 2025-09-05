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
    console.log('Parsing color:', cssColor);
    
    if (!cssColor || cssColor === 'transparent' || cssColor === 'rgba(0, 0, 0, 0)' || cssColor === 'initial' || cssColor === 'inherit') {
      console.log('Color is transparent or invalid, returning null');
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
      } else {
        console.warn('Invalid hex color format:', cssColor);
        return { r: 0, g: 0, b: 0, a: 1 };
      }
      
      const result = { r: r / 255, g: g / 255, b: b / 255, a };
      console.log('Parsed hex color:', cssColor, '→', result);
      return result;
    }

    // Handle rgb/rgba colors
    const rgbaMatch = cssColor.match(/rgba?\(([^)]+)\)/);
    if (rgbaMatch) {
      const values = rgbaMatch[1].split(',').map(v => parseFloat(v.trim()));
      const [r, g, b, a = 1] = values;
      const result = { r: r / 255, g: g / 255, b: b / 255, a };
      console.log('Parsed rgba color:', cssColor, '→', result);
      return result;
    }

    // Handle named colors (extended set)
    const namedColors = {
      'black': { r: 0, g: 0, b: 0, a: 1 },
      'white': { r: 1, g: 1, b: 1, a: 1 },
      'red': { r: 1, g: 0, b: 0, a: 1 },
      'green': { r: 0, g: 0.5, b: 0, a: 1 },
      'blue': { r: 0, g: 0, b: 1, a: 1 },
      'gray': { r: 0.5, g: 0.5, b: 0.5, a: 1 },
      'grey': { r: 0.5, g: 0.5, b: 0.5, a: 1 },
      'yellow': { r: 1, g: 1, b: 0, a: 1 },
      'orange': { r: 1, g: 0.647, b: 0, a: 1 },
      'purple': { r: 0.5, g: 0, b: 0.5, a: 1 },
      'pink': { r: 1, g: 0.753, b: 0.796, a: 1 },
      'brown': { r: 0.647, g: 0.165, b: 0.165, a: 1 }
    };

    const lowerColor = cssColor.toLowerCase();
    const result = namedColors[lowerColor] || { r: 0, g: 0, b: 0, a: 1 };
    
    if (namedColors[lowerColor]) {
      console.log('Parsed named color:', cssColor, '→', result);
    } else {
      console.warn('Unknown color format, defaulting to black:', cssColor, '→', result);
    }
    
    return result;
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
      console.log('Starting layout reconstruction with:', {
        title: pageData.title,
        elementsCount: pageData.elements ? pageData.elements.length : 0,
        viewport: pageData.viewport,
        assetsCount: Object.keys(assets || {}).length
      });
      
      // Create root frame for the page
      const rootFrame = figma.createFrame();
      rootFrame.name = pageData.title || 'Imported Page';
      rootFrame.layoutMode = 'NONE'; // Start with absolute positioning
      
      // Set page dimensions from viewport
      if (pageData.viewport) {
        console.log('Setting viewport dimensions:', pageData.viewport);
        rootFrame.resize(pageData.viewport.width, pageData.viewport.height);
      } else {
        console.warn('No viewport data, using default size');
        rootFrame.resize(1200, 800);
      }

      // Set background - make it white by default
      rootFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      console.log('Root frame configured:', {
        name: rootFrame.name,
        size: { width: rootFrame.width, height: rootFrame.height }
      });

      // Process all elements
      console.log('Processing elements...');
      await this.processElements(pageData.elements, rootFrame, assets);

      // Add to current page
      figma.currentPage.appendChild(rootFrame);
      figma.viewport.scrollAndZoomIntoView([rootFrame]);
      
      console.log('Layout reconstruction completed, final frame:', {
        name: rootFrame.name,
        childrenCount: rootFrame.children.length,
        size: { width: rootFrame.width, height: rootFrame.height }
      });

      return rootFrame;

    } catch (error) {
      console.error('Layout reconstruction error:', error);
      throw new Error(`Layout reconstruction failed: ${error.message}`);
    }
  }

  // Process elements and create Figma nodes
  async processElements(elements, parentFrame, assets) {
    if (!elements || !Array.isArray(elements)) {
      console.error('Invalid elements data:', elements);
      throw new Error('Invalid elements data');
    }

    console.log(`Processing ${elements.length} elements...`);
    const totalElements = elements.length;
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < elements.length; i++) {
      try {
        const element = elements[i];
        console.log(`\n--- Processing element ${i}/${totalElements} ---`);
        
        if (!element) {
          console.warn(`Element ${i} is null/undefined, skipping`);
          errorCount++;
          continue;
        }
        
        const createdNode = await this.createElement(element, parentFrame, assets, i);
        
        if (createdNode) {
          successCount++;
          console.log(`✓ Element ${i} created successfully`);
        } else {
          errorCount++;
          console.warn(`✗ Element ${i} creation failed`);
        }
        
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
          
          console.log(`Progress: ${processedCount}/${totalElements} (${percent}%) - Success: ${successCount}, Errors: ${errorCount}`);
        }

      } catch (elementError) {
        console.error(`Error creating element ${i}:`, elementError);
        console.error('Element data:', elements[i]);
        errorCount++;
        // Continue with other elements
      }
    }
    
    console.log(`\n=== ELEMENT PROCESSING COMPLETED ===`);
    console.log(`Total: ${totalElements}, Success: ${successCount}, Errors: ${errorCount}`);
    
    if (successCount === 0) {
      console.error('No elements were created successfully!');
      throw new Error(`Failed to create any elements (${errorCount} errors)`);
    }
  }

  // Create individual Figma element
  async createElement(elementData, parent, assets, index) {
    console.log(`Creating element ${index}:`, {
      tag: elementData.tag,
      text: elementData.text ? elementData.text.substring(0, 30) : '',
      position: { x: elementData.x, y: elementData.y },
      size: { width: elementData.width, height: elementData.height },
      backgroundColor: elementData.backgroundColor,
      color: elementData.color,
      fontSize: elementData.fontSize
    });

    const { tag, text, x, y, width, height } = elementData;

    // Skip invalid elements
    if (width <= 0 || height <= 0) {
      console.warn(`Skipping element ${index}: invalid dimensions (${width}x${height})`);
      return null;
    }

    let node = null;

    // Create appropriate node type based on tag
    switch (tag) {
      case 'img':
        console.log(`Creating image node for element ${index}`);
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
        console.log(`Creating text node for element ${index} (${tag})`);
        node = await this.createTextNode(elementData);
        break;
        
      case 'button':
        console.log(`Creating button node for element ${index}`);
        node = await this.createButtonNode(elementData);
        break;
        
      case 'a':
        console.log(`Creating link node for element ${index}`);
        node = text ? await this.createTextNode(elementData) : this.createFrameNode(elementData);
        break;
        
      default:
        // div and other block elements
        console.log(`Creating frame node for element ${index} (${tag})`);
        node = text && text.trim() ? await this.createTextNode(elementData) : this.createFrameNode(elementData);
        break;
    }

    if (!node) {
      console.warn(`Failed to create node for element ${index}`);
      return null;
    }

    // Set basic properties
    console.log(`Setting position and size for element ${index}: x=${x}, y=${y}, w=${width}, h=${height}`);
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

    console.log(`Applying styles to element ${index}`);
    // Apply styling
    await this.applyCommonStyles(node, elementData);

    // Add to parent
    parent.appendChild(node);
    this.createdNodes.set(index, node);

    console.log(`Element ${index} created successfully:`, {
      name: node.name,
      type: node.type,
      position: { x: node.x, y: node.y },
      size: { width: node.width, height: node.height },
      fills: node.fills && node.fills.length > 0 ? 'has fills' : 'no fills'
    });

    return node;
  }

  // Create text node
  async createTextNode(elementData) {
    console.log('Creating text node with data:', {
      text: elementData.text,
      fontSize: elementData.fontSize,
      fontFamily: elementData.fontFamily,
      color: elementData.color,
      backgroundColor: elementData.backgroundColor
    });
    
    const textNode = figma.createText();
    
    // Set text content
    const textContent = elementData.text || '';
    textNode.characters = textContent;
    
    console.log('Text node created, applying styles...');
    // Apply text styling
    await this.applyTextStyles(textNode, elementData);
    
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
  async createButtonNode(elementData) {
    console.log('Creating button node with data:', {
      text: elementData.text,
      backgroundColor: elementData.backgroundColor,
      color: elementData.color,
      borderRadius: elementData.borderRadius
    });
    
    const button = figma.createFrame();
    button.layoutMode = 'NONE';
    
    // Add text if present
    if (elementData.text && elementData.text.trim()) {
      console.log('Adding text to button:', elementData.text);
      const textNode = figma.createText();
      textNode.characters = elementData.text;
      
      // Center the text in the button
      textNode.x = 0;
      textNode.y = 0;
      textNode.resize(elementData.width, elementData.height);
      
      await this.applyTextStyles(textNode, elementData);
      
      // Center alignment for button text
      textNode.textAlignHorizontal = 'CENTER';
      textNode.textAlignVertical = 'CENTER';
      
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
  async applyCommonStyles(node, elementData) {
    console.log('Applying common styles:', {
      backgroundColor: elementData.backgroundColor,
      borderRadius: elementData.borderRadius,
      opacity: elementData.opacity,
      boxShadow: !!elementData.boxShadow
    });
    
    // Background color
    if (elementData.backgroundColor && elementData.backgroundColor !== 'transparent') {
      console.log('Parsing background color:', elementData.backgroundColor);
      const bgColor = CSSConverter.parseColor(elementData.backgroundColor);
      console.log('Parsed background color:', bgColor);
      
      if (bgColor && node.fills !== undefined) {
        node.fills = [{ type: 'SOLID', color: bgColor }];
        console.log('Applied background color to node');
      } else {
        console.warn('Failed to apply background color');
      }
    }

    // Border radius
    if (elementData.borderRadius && node.cornerRadius !== undefined) {
      const radius = CSSConverter.parseBorderRadius(elementData.borderRadius);
      console.log('Applying border radius:', radius);
      node.cornerRadius = radius;
    }

    // Box shadow effect
    if (elementData.boxShadow) {
      const effect = CSSConverter.parseBoxShadow(elementData.boxShadow);
      console.log('Applying box shadow:', effect);
      if (effect && node.effects !== undefined) {
        node.effects = [effect];
      }
    }

    // Opacity
    if (elementData.opacity && elementData.opacity !== '1') {
      const opacity = parseFloat(elementData.opacity);
      console.log('Applying opacity:', opacity);
      if (!isNaN(opacity) && opacity >= 0 && opacity <= 1) {
        node.opacity = opacity;
      }
    }

    // Padding (for frames with auto-layout)
    if (elementData.padding && node.paddingTop !== undefined) {
      const padding = CSSConverter.parsePadding(elementData.padding);
      console.log('Applying padding:', padding);
      node.paddingTop = padding.top;
      node.paddingRight = padding.right;
      node.paddingBottom = padding.bottom;
      node.paddingLeft = padding.left;
    }
  }

  // Apply text-specific styles
  async applyTextStyles(textNode, elementData) {
    try {
      console.log('Applying text styles:', {
        fontFamily: elementData.fontFamily,
        fontSize: elementData.fontSize,
        fontWeight: elementData.fontWeight,
        color: elementData.color,
        textAlign: elementData.textAlign
      });
      
      // Load font before applying styles
      const fontFamily = elementData.fontFamily || 'Inter';
      const fontWeight = CSSConverter.parseFontWeight(elementData.fontWeight);
      
      console.log('Loading font:', { family: fontFamily, weight: fontWeight });
      
      // Try to load the font, fallback to Inter if not available
      let fontName = { family: fontFamily, style: 'Regular' };
      
      try {
        await figma.loadFontAsync(fontName);
        console.log('Font loaded successfully:', fontName);
      } catch (fontError) {
        console.warn('Failed to load font:', fontName, 'falling back to Inter');
        // Fallback to Inter
        fontName = { family: 'Inter', style: 'Regular' };
        await figma.loadFontAsync(fontName);
      }

      // Apply font
      textNode.fontName = fontName;

      // Font size
      if (elementData.fontSize) {
        const fontSize = CSSConverter.parseFontSize(elementData.fontSize);
        console.log('Applying font size:', fontSize);
        textNode.fontSize = fontSize;
      }

      // Text color
      if (elementData.color && elementData.color !== 'transparent') {
        const textColor = CSSConverter.parseColor(elementData.color);
        console.log('Applying text color:', elementData.color, '→', textColor);
        if (textColor) {
          textNode.fills = [{ type: 'SOLID', color: textColor }];
        }
      }

      // Text alignment
      if (elementData.textAlign) {
        const textAlign = CSSConverter.parseTextAlign(elementData.textAlign);
        console.log('Applying text alignment:', textAlign);
        textNode.textAlignHorizontal = textAlign;
      }

      // Text auto resize
      textNode.textAutoResize = 'WIDTH_AND_HEIGHT';
      
      console.log('Text styles applied successfully');

    } catch (textError) {
      console.error('Text styling error:', textError);
      console.error('Element data:', elementData);
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
    console.log('=== STARTING IMPORT DEBUG ===');
    console.log('Import data structure:', {
      hasManifest: !!importData.manifest,
      hasData: !!importData.data,
      hasAssets: !!importData.assets,
      dataKeys: importData.data ? Object.keys(importData.data) : 'no data'
    });
    
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

    // Enhanced validation with detailed logging
    console.log('Validating data structure...');
    console.log('Data object:', data);
    console.log('Elements array:', data ? data.elements : undefined);
    console.log('Elements length:', data && data.elements ? data.elements.length : 0);
    
    if (!data || !data.elements) {
      console.error('VALIDATION FAILED: Missing data or elements');
      throw new Error('Invalid page data structure: missing data or elements array');
    }

    if (!Array.isArray(data.elements)) {
      console.error('VALIDATION FAILED: Elements is not an array:', typeof data.elements);
      throw new Error('Invalid page data structure: elements is not an array');
    }

    console.log('Page data validation successful:', {
      elementsCount: data.elements.length,
      hasViewport: !!data.viewport,
      viewport: data.viewport,
      title: data.title,
      url: data.url
    });

    // Log first few elements for debugging
    console.log('Sample elements (first 3):');
    data.elements.slice(0, 3).forEach((element, index) => {
      console.log(`Element ${index}:`, {
        tag: element.tag,
        text: element.text ? element.text.substring(0, 50) + (element.text.length > 50 ? '...' : '') : '',
        position: { x: element.x, y: element.y },
        size: { width: element.width, height: element.height },
        colors: { 
          color: element.color, 
          backgroundColor: element.backgroundColor 
        },
        font: {
          fontSize: element.fontSize,
          fontFamily: element.fontFamily,
          fontWeight: element.fontWeight
        }
      });
    });

    figma.ui.postMessage({
      type: 'import-progress',
      data: { percent: 15, message: 'Starting layout reconstruction...' }
    });

    // Reconstruct layout
    const rootFrame = await layoutEngine.reconstructLayout(data, assets);

    console.log('Layout reconstruction completed');
    console.log('Root frame created:', {
      name: rootFrame.name,
      size: { width: rootFrame.width, height: rootFrame.height },
      childrenCount: rootFrame.children.length,
      fills: rootFrame.fills
    });

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

    console.log('=== IMPORT COMPLETED SUCCESSFULLY ===');

  } catch (error) {
    console.error('=== IMPORT FAILED ===');
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
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