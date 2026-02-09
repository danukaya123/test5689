// api/stream.js - Main streaming endpoint
import { createReadableStream } from './utils/stream-helper';

export const config = {
  api: {
    responseLimit: false,  // Disable response limit for large files
    bodyParser: false,     // Disable body parsing
    externalResolver: true // Let Vercel handle timeouts
  }
};

export default async function handler(req, res) {
  try {
    const { url, filename = 'movie.mp4' } = req.query;
    
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        error: 'URL parameter is required' 
      });
    }
    
    console.log(`[VERCEL] Streaming: ${filename}`);
    
    // Validate URL
    let targetUrl;
    try {
      targetUrl = decodeURIComponent(url);
      
      // Convert Pixeldrain URL to direct download
      if (targetUrl.includes('pixeldrain.com/u/')) {
        const match = targetUrl.match(/pixeldrain\.com\/u\/(\w+)/);
        if (match) {
          targetUrl = `https://pixeldrain.com/api/file/${match[1]}?download`;
          console.log(`[VERCEL] Converted to direct URL: ${targetUrl}`);
        }
      }
    } catch (e) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid URL encoding' 
      });
    }
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
    
    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // Streaming logic
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    try {
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'video/mp4,video/*,application/octet-stream,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://whatsapp.com/',
          'Origin': 'https://web.whatsapp.com',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Get content info
      const contentType = response.headers.get('content-type') || 'video/mp4';
      const contentLength = response.headers.get('content-length');
      
      console.log(`[VERCEL] Response: ${response.status}, Type: ${contentType}, Size: ${contentLength || 'unknown'}`);
      
      // Set response headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('X-Powered-By', 'DANUWA-MD Vercel Stream');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      
      // Stream the response
      if (response.body) {
        const reader = response.body.getReader();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Write chunk
          const writeSuccess = res.write(value);
          
          // Handle backpressure
          if (!writeSuccess) {
            await new Promise(resolve => {
              res.once('drain', resolve);
            });
          }
        }
        
        res.end();
      } else {
        throw new Error('No response body');
      }
      
    } catch (fetchError) {
      clearTimeout(timeout);
      
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw fetchError;
    }
    
  } catch (error) {
    console.error(`[VERCEL] Streaming error: ${error.message}`);
    
    // Return error as JSON
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Streaming failed. Try direct download.'
      });
    }
  }
}
