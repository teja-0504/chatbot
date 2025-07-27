import { OPENROUTER_API_KEY } from './config.js';
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// DOM Elements
const voiceCircle = document.getElementById('voiceCircle');
const chatMode = document.getElementById('chatMode');
const chatBody = document.getElementById('chatBody');
const messageInput = document.getElementById('messageInput');
const textBtn = document.getElementById('textBtn');
const sendBtn = document.getElementById('sendBtn');

// App State
let recognition;
let isListening = false;
const synth = window.speechSynthesis;

// Initialize Speech Recognition
function initSpeechRecognition() {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isListening = true;
            voiceCircle.classList.add('listening');
            console.log('Voice recognition started');
        };

        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('Voice input:', transcript);
            switchToTextMode(transcript);
            await processMessage(transcript);
        };

        recognition.onerror = (event) => {
            console.error('Recognition error:', event.error);
            isListening = false;
            voiceCircle.classList.remove('listening');
            if (event.error === 'network') {
                addMessage('bot', 'Network error. Please check your connection.');
            } else {
                addMessage('bot', `Error: ${event.error}`);
            }
        };

        recognition.onend = () => {
            console.log('Voice recognition ended');
            isListening = false;
            voiceCircle.classList.remove('listening');
        };
    } else {
        console.warn('Speech recognition not supported');
        addMessage('bot', 'Voice features not supported in this browser');
    }
}

// Switch to text mode and display the recognized text
function switchToTextMode(transcript) {
    chatMode.classList.add('active');
    textBtn.style.display = 'none';
    messageInput.value = transcript;
}

// Add messages to chat
function addMessage(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.textContent = text;
    chatBody.appendChild(messageDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
    
    if (sender === 'bot') {
        speakResponse(text);
    }
}

// Process messages
async function processMessage(message) {
    try {
        console.log('Processing message:', message);
        const response = await getAIResponse(message);
        console.log('AI Response:', response);
        addMessage('bot', response);
        await saveChat('user', message, response); // Save chat after processing
    } catch (error) {
        console.error('Processing Error:', error);
        addMessage('bot', "Sorry, I'm having trouble responding. Please try again.");
    }
}

function speakResponse(text) {
    if (synth.speaking) {
        synth.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    const femaleVoice = voices.find(voice => voice.lang === 'en-US' && voice.gender === 'female') || voices.find(voice => voice.gender === 'female');
    utterance.voice = femaleVoice;
    
    utterance.onstart = () => {
        toggleSpeakingAnimation(true);
    };
    
    utterance.onend = () => {
        toggleSpeakingAnimation(false);
    };
    
    synth.speak(utterance);
}

// Add this function to avoid errors if not implemented
function toggleSpeakingAnimation(isSpeaking) {
    if (isSpeaking) {
        voiceCircle.classList.add('speaking');
    } else {
        voiceCircle.classList.remove('speaking');
    }
}

// Handle text input
sendBtn.addEventListener('click', async () => {
    const message = messageInput.value.trim();
    if (message) {
        addMessage('user', message);
        messageInput.value = '';
        await processMessage(message);
    }
});

messageInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const message = messageInput.value.trim();
        if (message) {
            addMessage('user', message);
            messageInput.value = '';
            await processMessage(message);
        }
    }
});

// Handle voice input
voiceCircle.addEventListener('click', () => {
    if (!isListening && recognition) {
        recognition.start();
    }
});

// Mode switching
textBtn.addEventListener('click', () => {
    chatMode.classList.add('active');
    textBtn.style.display = 'none';
});

// API Communication
async function getAIResponse(query) {
    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'deepseek/deepseek-chat:free',
                messages: [{ role: 'user', content: query }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error:', errorData);
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
        
    } catch (error) {
        console.error('API Call Failed:', error);
        throw error;
    }
}

// Initialize the app
initSpeechRecognition();
console.log('App initialized');

// Save Chat
async function saveChat(user, message, response) {
    try {
        const res = await fetch('http://localhost:3000/api/chats', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user, message, response })
        });

        if (res.status === 405) {
            throw new Error('Method Not Allowed');
        }
    } catch (error) {
        console.error('Failed to save chat:', error);
    }
}

// Load History
async function loadHistory(user) {
    try {
        const response = await fetch(`/api/chats/${user}`);
        if (response.status === 405) {
            throw new Error('Method Not Allowed');
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to load history:', error);
        return [];
    }
}
