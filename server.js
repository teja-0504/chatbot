import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files (frontend)
app.use(express.static(__dirname));

// API endpoint to get the API key securely
app.get('/api/config', (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY || '';
  res.json({ OPENROUTER_API_KEY: apiKey });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
