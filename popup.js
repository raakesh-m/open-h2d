// Function to inject content script if not already present
async function ensureContentScript(tabId) {
  try {
    // First, try to ping the content script
    await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    return true; // Content script is already loaded
  } catch (error) {
    // Content script not loaded, inject it
    console.log('Content script not found, injecting...');
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      
      // Wait a moment for the script to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      return true;
    } catch (injectionError) {
      console.error('Failed to inject content script:', injectionError);
      throw new Error('Could not inject content script: ' + injectionError.message);
    }
  }
}

// Function to send message with retry logic
async function sendMessageWithRetry(tabId, message, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, message);
      return response;
    } catch (error) {
      console.log(`Message attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 200 * attempt));
    }
  }
}

// Utility function to convert base64 to binary data
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64.split(',')[1]); // Remove data:image/...;base64, prefix
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Function to generate timestamp for filename
function generateTimestamp() {
  const now = new Date();
  return now.getFullYear() + 
    String(now.getMonth() + 1).padStart(2, '0') + 
    String(now.getDate()).padStart(2, '0') + '_' +
    String(now.getHours()).padStart(2, '0') + 
    String(now.getMinutes()).padStart(2, '0') + 
    String(now.getSeconds()).padStart(2, '0');
}

// Minimal ZIP builder (STORE method, no compression)
const _crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0 ^ (-1);
  for (let i = 0; i < bytes.length; i++) {
    c = _crcTable[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ (-1)) >>> 0;
}

function toUint8(str) {
  return new TextEncoder().encode(str);
}

function makeLocalHeader(nameBytes, crc, size) {
  const header = new Uint8Array(30 + nameBytes.length);
  const dv = new DataView(header.buffer);
  dv.setUint32(0, 0x04034b50, true); // local file header signature
  dv.setUint16(4, 20, true); // version needed to extract
  dv.setUint16(6, 0, true); // general purpose bit flag
  dv.setUint16(8, 0, true); // compression method (0 = store)
  dv.setUint16(10, 0, true); // last mod file time
  dv.setUint16(12, 0, true); // last mod file date
  dv.setUint32(14, crc >>> 0, true); // crc-32
  dv.setUint32(18, size >>> 0, true); // compressed size
  dv.setUint32(22, size >>> 0, true); // uncompressed size
  dv.setUint16(26, nameBytes.length, true); // file name length
  dv.setUint16(28, 0, true); // extra field length
  header.set(nameBytes, 30);
  return header;
}

function makeCentralHeader(nameBytes, crc, size, offset) {
  const header = new Uint8Array(46 + nameBytes.length);
  const dv = new DataView(header.buffer);
  dv.setUint32(0, 0x02014b50, true); // central file header signature
  dv.setUint16(4, 20, true); // version made by
  dv.setUint16(6, 20, true); // version needed
  dv.setUint16(8, 0, true); // flags
  dv.setUint16(10, 0, true); // method store
  dv.setUint16(12, 0, true); // time
  dv.setUint16(14, 0, true); // date
  dv.setUint32(16, crc >>> 0, true);
  dv.setUint32(20, size >>> 0, true); // comp size
  dv.setUint32(24, size >>> 0, true); // uncomp size
  dv.setUint16(28, nameBytes.length, true); // name length
  dv.setUint16(30, 0, true); // extra length
  dv.setUint16(32, 0, true); // comment length
  dv.setUint16(34, 0, true); // disk start
  dv.setUint16(36, 0, true); // internal attrs
  dv.setUint32(38, 0, true); // external attrs
  dv.setUint32(42, offset >>> 0, true); // relative offset
  header.set(nameBytes, 46);
  return header;
}

function makeEndOfCentralDir(count, centralSize, centralOffset) {
  const eocd = new Uint8Array(22);
  const dv = new DataView(eocd.buffer);
  dv.setUint32(0, 0x06054b50, true); // End of central dir signature
  dv.setUint16(4, 0, true); // number of this disk
  dv.setUint16(6, 0, true); // number of the disk with the start of the central directory
  dv.setUint16(8, count, true); // total number of entries in the central directory on this disk
  dv.setUint16(10, count, true); // total number of entries in the central directory
  dv.setUint32(12, centralSize, true); // size of the central directory
  dv.setUint32(16, centralOffset, true); // offset of start of central directory
  dv.setUint16(20, 0, true); // ZIP file comment length
  return eocd;
}

function createZip(entries) {
  const parts = [];
  const central = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = toUint8(entry.name);
    const dataBytes = entry.data instanceof Uint8Array ? entry.data : toUint8(String(entry.data || ''));
    const crc = crc32(dataBytes);
    const size = dataBytes.length;

    const lh = makeLocalHeader(nameBytes, crc, size);
    parts.push(lh, dataBytes);
    const localOffset = offset;
    offset += lh.length + dataBytes.length;

    const ch = makeCentralHeader(nameBytes, crc, size, localOffset);
    central.push(ch);
  }

  const centralOffset = offset;
  for (const ch of central) {
    parts.push(ch);
    offset += ch.length;
  }
  const centralSize = offset - centralOffset;
  parts.push(makeEndOfCentralDir(central.length, centralSize, centralOffset));

  return new Blob(parts, { type: 'application/zip' });
}

// Function to create and download ZIP file
async function createAndDownloadZip(capturedData) {
  console.log('Starting ZIP creation with data:', {
    hasElements: !!capturedData.elements,
    elementsCount: capturedData.elements?.length,
    hasAssets: !!capturedData.assets,
    assetsCount: Object.keys(capturedData.assets || {}).length
  });
  
  try {
    console.log('Preparing H2D entries...');
    const entries = [];

    console.log('Creating manifest.json...');
    // 1. Create manifest.json for the .zip-based DesignPack (internal label only)
    const webdManifest = {
      format: "zip-pack",
      version: "1.0",
      created: new Date().toISOString(),
      source: {
        title: capturedData.title,
        url: capturedData.url
      }
    };
    entries.push({ name: 'manifest.json', data: toUint8(JSON.stringify(webdManifest, null, 2)) });
    console.log('Manifest created successfully');
    
    console.log('Processing captured data...');
    // 2. Create data.json with all captured data
    const dataForExport = {
      version: capturedData.version,
      title: capturedData.title,
      url: capturedData.url,
      viewport: capturedData.viewport,
      elements: capturedData.elements,
      assets: {}
    };
    
    console.log('Processing assets...');
    
    let imageCounter = 1;
    console.log('Processing', Object.keys(capturedData.assets || {}).length, 'assets...');
    for (const [assetPath, assetData] of Object.entries(capturedData.assets || {})) {
      try {
        console.log('Processing asset:', assetPath, assetData.type);
        if (assetData.type === 'image') {
          let filename = assetPath.replace('img/', '');
          
          if (assetData.base64 && !assetData.corsBlocked) {
            console.log('Converting base64 to binary for:', filename);
            // Convert base64 to binary and add to ZIP
            try {
              const binaryData = base64ToArrayBuffer(assetData.base64);
              entries.push({ name: `assets/images/${filename}`, data: binaryData });
              console.log('Binary conversion successful for:', filename);
              
              // Update data.json to reference the file in assets
              dataForExport.assets[assetPath] = {
                filename: `assets/images/${filename}`,
                originalUrl: assetData.url,
                type: 'image'
              };
            } catch (conversionError) {
              console.warn('Failed to convert base64 for:', filename, conversionError);
              // Fallback to URL reference
              dataForExport.assets[assetPath] = {
                originalUrl: assetData.url,
                type: 'image',
                note: 'Binary conversion failed, kept as URL reference'
              };
            }
          } else {
            console.log('CORS blocked or no base64 for:', filename, 'keeping URL reference');
            // CORS blocked or no base64 - just keep URL reference
            dataForExport.assets[assetPath] = {
              originalUrl: assetData.url,
              type: 'image',
              note: assetData.corsBlocked ? 'CORS blocked' : 'Base64 not available'
            };
          }
        }
        imageCounter++;
      } catch (assetError) {
        console.error('Error processing asset:', assetPath, assetError);
      }
    }
    
    console.log('Adding data.json to ZIP...');
    // Add the data.json file
    entries.push({ name: 'data.json', data: toUint8(JSON.stringify(dataForExport, null, 2)) });
    
    console.log('Generating ZIP blob...');
    // 4. Generate ZIP file
    const timestamp = generateTimestamp();
    const filename = `page-${timestamp}.zip`;

    const zipBlob = createZip(entries);
    console.log('ZIP blob generated, size:', zipBlob.size, 'bytes');
    
    console.log('Creating download URL...');
    // 5. Create download URL and trigger download
    const url = URL.createObjectURL(zipBlob);
    
    console.log('Triggering download...');
    // Use Chrome downloads API
    const downloadId = await chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: false
    });
    console.log('Download triggered successfully. ID:', downloadId);
    
    // Clean up the URL
    setTimeout(() => {
      URL.revokeObjectURL(url);
      console.log('URL revoked');
    }, 1000);
    
    console.log('ZIP creation completed successfully');
    return { success: true, filename: filename };
    
  } catch (error) {
    console.error('Error creating ZIP file:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw error;
  }
}

// Function to update status message
function updateStatus(message, isError = false) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.style.color = isError ? '#d32f2f' : '#666';
}

document.addEventListener('DOMContentLoaded', function() {
  const captureBtn = document.getElementById('captureBtn');
  
  captureBtn.addEventListener('click', async function() {
    // Disable button and show status
    captureBtn.disabled = true;
    updateStatus('Initializing...');
    
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error('No active tab found');
      }
      
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        throw new Error('Cannot capture Chrome internal pages');
      }
      
      // Ensure content script is loaded
      updateStatus('Loading content script...');
      await ensureContentScript(tab.id);
      
      // Send message to the content script with retry logic
      updateStatus('Capturing page data...');
      console.log('Sending capture message to content script...');
      const response = await sendMessageWithRetry(tab.id, { action: 'capturePageTriggered' });
      console.log('Received response from content script:', response);

      if (response && response.success && response.data) {
        // Parse JSON payload if content script sent encoded data
        let captured = null;
        try {
          captured = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        } catch (parseErr) {
          console.error('Failed to parse JSON from content script:', parseErr);
          updateStatus('Capture failed', true);
          alert('Capture failed: Invalid JSON from content script');
          return;
        }
        updateStatus('Creating ZIP file...');
        console.log('Capture successful! Data summary:', {
          elements: captured.elements?.length,
          assets: Object.keys(captured.assets || {}).length,
          title: captured.title
        });
        
        console.log('Starting ZIP creation...');
        // Create and download ZIP file
        const zipResult = await createAndDownloadZip(captured);
        console.log('ZIP creation result:', zipResult);
        
        if (zipResult.success) {
          updateStatus(`Downloaded: ${zipResult.filename}`);
          console.log('ZIP download successful:', zipResult.filename);
        }
      } else {
        console.error('Capture failed - Invalid response:', response);
        updateStatus('Capture failed', true);
        console.error('Capture failed:', response?.error || 'Invalid response from content script');
      }
      
    } catch (error) {
      console.error('Error during capture process:', error);
      updateStatus('Error occurred', true);
      
      let errorMessage = error.message || 'Unknown error occurred';
      if (errorMessage.includes('Could not establish connection')) {
        errorMessage = 'Could not connect to page. Try refreshing the page and try again.';
      } else if (errorMessage.includes('Cannot capture Chrome internal pages')) {
        errorMessage = 'Cannot capture Chrome internal pages. Please navigate to a regular website.';
      } else if (errorMessage.includes('Cannot read properties of undefined')) {
        errorMessage = 'Page data processing error. Try refreshing the page and try again.';
      } else if (errorMessage.includes('Invalid message')) {
        errorMessage = 'Communication error. Please try again.';
      }
      
      console.error('Error:', errorMessage);
    } finally {
      // Re-enable button
      captureBtn.disabled = false;
      // Clear status after 3 seconds if no error
      setTimeout(() => {
        if (!captureBtn.disabled) {
          const statusDiv = document.getElementById('status');
          if (statusDiv.style.color !== '#d32f2f') { // Not an error
            updateStatus('');
          }
        }
      }, 3000);
    }
  });
});
