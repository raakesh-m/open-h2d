// Simple test function to verify basic functionality
function testBasicCapture() {
  try {
    console.log('Testing basic page access...');
    console.log('Document title:', document.title);
    console.log('Window location:', window.location.href);
    console.log('Viewport:', window.innerWidth, 'x', window.innerHeight);
    
    const divs = document.querySelectorAll('div');
    console.log('Found', divs.length, 'div elements');
    
    if (divs.length > 0) {
      const firstDiv = divs[0];
      console.log('First div:', firstDiv);
      const rect = firstDiv.getBoundingClientRect();
      console.log('First div rect:', rect);
      const styles = window.getComputedStyle(firstDiv);
      console.log('First div styles available:', !!styles);
    }
    
    console.log('Basic test completed successfully');
    return true;
  } catch (error) {
    console.error('Basic test failed:', error);
    return false;
  }
}

// Helper function to parse box shadow
function parseBoxShadow(boxShadow) {
  if (!boxShadow || boxShadow === 'none') return null;
  
  // Simple parser for box-shadow (handles basic cases)
  const match = boxShadow.match(/([+-]?\d*\.?\d+)px\s+([+-]?\d*\.?\d+)px\s+([+-]?\d*\.?\d+)px\s+([+-]?\d*\.?\d+)px\s+(.+)/);
  if (match) {
    return {
      x: parseInt(match[1]),
      y: parseInt(match[2]),
      blur: parseInt(match[3]),
      spread: parseInt(match[4]),
      color: match[5].trim()
    };
  }
  return null;
}

// Helper function to clean font family
function cleanFontFamily(fontFamily) {
  try {
    if (!fontFamily || typeof fontFamily !== 'string') return '';
    // Get first font and remove quotes
    const firstFont = fontFamily.split(',')[0].trim();
    return firstFont.replace(/["']/g, '');
  } catch (error) {
    console.warn('Error cleaning font family:', error);
    return '';
  }
}

// Helper function to convert image to base64
async function imageToBase64(imgElement) {
  try {
    if (!imgElement || !imgElement.src) {
      throw new Error('Invalid image element');
    }
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    canvas.width = imgElement.naturalWidth || imgElement.width || 0;
    canvas.height = imgElement.naturalHeight || imgElement.height || 0;
    
    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error('Image has no dimensions');
    }
    
    ctx.drawImage(imgElement, 0, 0);
    return canvas.toDataURL();
  } catch (error) {
    console.warn('Could not convert image to base64:', error);
    return null;
  }
}

// Helper function to check if element is visible
function isElementVisible(element) {
  try {
    if (!element || typeof element.getBoundingClientRect !== 'function') {
      return false;
    }
    
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    if (!rect || !style) return false;
    
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0'
    );
  } catch (error) {
    console.warn('Error checking element visibility:', error);
    return false;
  }
}

// Main capture function
async function capturePageData() {
  console.log('Starting page capture...');
  
  try {
    console.log('Step 1: Creating page metadata...');
    // 1. Page metadata
    const pageData = {
      version: "1.0",
      title: document.title || 'Untitled',
      url: window.location.href || '',
      viewport: {
        width: window.innerWidth || 0,
        height: window.innerHeight || 0
      },
      elements: [],
      assets: {}
    };
    console.log('Page metadata created:', pageData.title, pageData.url);
    
    console.log('Step 2: Finding elements...');
    // 2. Target element selectors
    const targetSelectors = ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'a', 'button', 'img'];
    const elements = document.querySelectorAll(targetSelectors.join(','));
    
    console.log('Found', elements.length, 'elements to process');
    
    console.log('Step 3: Processing elements...');
    // 3. Process each element
    let processedCount = 0;
    for (let i = 0; i < elements.length; i++) {
      try {
        const element = elements[i];
        if (!element || !isElementVisible(element)) continue;
        
        const rect = element.getBoundingClientRect();
        const styles = window.getComputedStyle(element);
        
        if (!rect || !styles) continue;
        
        const elementData = {
          tag: (element.tagName || '').toLowerCase(),
          text: element.innerText ? element.innerText.trim() : '',
          x: Math.round(rect.x || 0),
          y: Math.round(rect.y || 0),
          width: Math.round(rect.width || 0),
          height: Math.round(rect.height || 0),
          color: styles.color || '',
          fontSize: styles.fontSize || '',
          fontFamily: cleanFontFamily(styles.fontFamily || ''),
          fontWeight: styles.fontWeight || '',
          textAlign: styles.textAlign || '',
          padding: {
            top: styles.paddingTop || '0px',
            right: styles.paddingRight || '0px',
            bottom: styles.paddingBottom || '0px',
            left: styles.paddingLeft || '0px'
          },
          borderRadius: styles.borderRadius || '0px',
          boxShadow: parseBoxShadow(styles.boxShadow),
          opacity: styles.opacity || '1',
          zIndex: styles.zIndex || 'auto'
        };
        
        // Only include backgroundColor if it's not transparent
        const bgColor = styles.backgroundColor;
        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
          elementData.backgroundColor = bgColor;
        }
        
        pageData.elements.push(elementData);
        processedCount++;
        
        // Log progress every 100 elements
        if (processedCount % 100 === 0) {
          console.log('Processed', processedCount, 'elements so far...');
        }
      } catch (elementError) {
        console.warn('Error processing element', i, ':', elementError);
        // Continue with next element
      }
    }
    
    console.log('Step 3 completed: Processed', pageData.elements.length, 'elements successfully');
    
    console.log('Step 4: Processing images...');
    // 4. Extract and convert images to base64
    const images = document.querySelectorAll('img');
    console.log('Found', images.length, 'images to process');
    
    let imageCount = 0;
    for (let i = 0; i < images.length; i++) {
      try {
        const img = images[i];
        if (!img || !img.src) continue;
        
        console.log('Processing image', i + 1, 'of', images.length, ':', img.src);
        
        // Wait for image to load if not already loaded
        if (!img.complete) {
          console.log('Waiting for image to load...');
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              console.log('Image load timeout');
              reject(new Error('Image load timeout'));
            }, 3000);
            
            img.onload = () => {
              console.log('Image loaded successfully');
              clearTimeout(timeout);
              resolve();
            };
            img.onerror = () => {
              console.log('Image load error');
              clearTimeout(timeout);
              reject(new Error('Image load error'));
            };
          });
        }
        
        const base64 = await imageToBase64(img);
        const url = new URL(img.src, window.location.href);
        const filename = url.pathname.split('/').pop() || 'image.png';
        
        if (base64) {
          pageData.assets[`img/${filename}`] = {
            base64: base64,
            url: img.src,
            type: 'image'
          };
          console.log('Image converted to base64 successfully');
        } else {
          // Fallback to URL if base64 conversion failed
          pageData.assets[`img/${filename}`] = {
            base64: null,
            url: img.src,
            type: 'image',
            corsBlocked: true
          };
          console.log('Image base64 conversion failed, using URL fallback');
        }
        imageCount++;
      } catch (error) {
        console.warn('Could not process image', i, ':', images[i]?.src, error);
        try {
          const img = images[i];
          const url = new URL(img.src, window.location.href);
          const filename = url.pathname.split('/').pop() || 'image.png';
          pageData.assets[`img/${filename}`] = {
            base64: null,
            url: img.src,
            type: 'image',
            error: error && error.message ? error.message : 'Unknown error'
          };
        } catch (urlError) {
          console.warn('Could not process image URL:', urlError);
        }
      }
    }
    
    console.log('Step 4 completed: Processed', imageCount, 'images');
    console.log('Page capture completed successfully!');
    console.log('Final results - Elements:', pageData.elements.length, 'Assets:', Object.keys(pageData.assets).length);
    return pageData;
    
  } catch (error) {
    console.error('Fatal error in capturePageData:', error);
    console.error('Error stack:', error.stack);
    throw new Error('Failed to capture page data: ' + (error && error.message ? error.message : 'Unknown error'));
  }
}

// Listen for messages from the popup (non-async listener so we can return synchronously)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    // Validate message object
    if (!message || typeof message !== 'object') {
      console.error('Invalid message received:', message);
      try { sendResponse({ success: false, error: 'Invalid message format' }); } catch {}
      return false; // responded synchronously
    }

    // Handle ping messages for health check (sync)
    if (message.action === 'ping') {
      try { sendResponse({ success: true, status: 'ready' }); } catch {}
      return false; // responded synchronously
    }

    // Handle test messages for debugging (sync)
    if (message.action === 'test') {
      console.log('Test mode triggered');
      const testResult = testBasicCapture();
      try { sendResponse({ success: testResult, status: testResult ? 'test passed' : 'test failed' }); } catch {}
      return false; // responded synchronously
    }

    if (message.action === 'capturePageTriggered') {
      console.log('Capture triggered');
      console.log('Starting capture process...');

      (async () => {
        try {
          // Capture all page data
          console.log('Calling capturePageData()...');
          const capturedData = await capturePageData();
          console.log('capturePageData() completed successfully');
          console.log('Capture workflow completed on page, preparing response...');

          // Guard for payload size
          const approximateSize = (() => {
            try { return JSON.stringify(capturedData).length; } catch { return 0; }
          })();
          console.log('Approximate payload size (chars):', approximateSize);
          const MAX_PAYLOAD_CHARS = 1.5 * 1024 * 1024;
          if (approximateSize > MAX_PAYLOAD_CHARS && capturedData && capturedData.assets) {
            console.warn('Payload too large, stripping base64 from assets before responding');
            try {
              const simplifiedAssets = {};
              for (const [key, asset] of Object.entries(capturedData.assets)) {
                simplifiedAssets[key] = {
                  url: asset && asset.url ? asset.url : null,
                  type: asset && asset.type ? asset.type : 'image',
                  note: 'Base64 omitted to reduce payload size'
                };
              }
              capturedData.assets = simplifiedAssets;
            } catch (e) {
              console.warn('Failed to simplify assets:', e);
            }
          }

          console.log('Captured page data summary:', {
            elements: capturedData.elements.length,
            assets: Object.keys(capturedData.assets).length,
            title: capturedData.title,
            url: capturedData.url
          });

          // Send response as JSON string
          console.log('Sending response back to popup...');
          let jsonPayload = null;
          try {
            jsonPayload = JSON.stringify(capturedData);
          } catch (e) {
            console.error('Failed to stringify captured data:', e);
            throw new Error('Serialization error');
          }
          try { sendResponse({ success: true, data: jsonPayload, encoding: 'json' }); } catch {}
          console.log('Response sent successfully');
        } catch (error) {
          console.error('Error during page capture:', error);
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
      const errorMessage = error && error.message ? error.message : 'Unknown capture error';
      try { sendResponse({ success: false, error: errorMessage }); } catch {}
        }
      })();

      return true; // Keep the message channel open for async response
    }

    console.warn('Unknown action received:', message.action);
    try { sendResponse({ success: false, error: 'Unknown action' }); } catch {}
    return false; // responded synchronously
  } catch (err) {
    console.error('Unhandled error in onMessage listener:', err);
    try { sendResponse({ success: false, error: err?.message || 'Listener error' }); } catch {}
    return false;
  }
});
