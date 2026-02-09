// api/proxy.js - Lightweight proxy for smaller files
export const config = {
  api: {
    responseLimit: '50mb', // Limit to 50MB for safety
    bodyParser: false
  }
};

export default async function handler(req, res) {
  const { url, filename = 'file.mp4' } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL required' });
  }
  
  try {
    const response = await fetch(decodeURIComponent(url));
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    // Set headers
    res.setHeader('Content-Type', response.headers.get('content-type') || 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-DANUWA-Proxy', 'Vercel-Fast');
    
    // Buffer small files
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
