// api/ping.js - Health check
export default function handler(req, res) {
  res.status(200).json({
    status: 'online',
    service: 'DANUWA-MD Vercel Stream',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
}
