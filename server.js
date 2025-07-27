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

// Middleware
app.use(express.json());

// Serve static files (frontend)
app.use(express.static(__dirname));

// API endpoint to get the API key securely
app.get('/api/config', (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY || '';
  res.json({ OPENROUTER_API_KEY: apiKey });
});

// API endpoint to proxy chat requests to OpenRouter
app.post('/api/chat', async (req, res) => {
  try {
    const { model, messages } = req.body;
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': `http://localhost:${PORT}`,
        'X-Title': 'Chatbot App'
      },
      body: JSON.stringify({
        model: model || 'meta-llama/llama-3.1-8b-instruct:free',
        messages: messages
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenRouter API Error:', errorData);
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve the main HTML file at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'bot.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
