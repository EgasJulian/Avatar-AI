// API Keys - These should be securely stored and retrieved
const GROQ_API_KEY = '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';
const ELEVENLABS_API_KEY = 'sk_c68fe5cea289e6a3b0d9c25d3932bfa168e78c6f7e06be73';
const OPENROUTER_API_KEY = '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';

// Client data
const clients = [
    { id: 1, name: "Luis Guillermo Pardo", type: "Legal", debt: "mil doscientos", debtAmount: 1200 },
    { id: 2, name: "Iovania Peñaloza Caicedo", type: "Administrativo", debt: "doscientos", debtAmount: 200 },
    { id: 3, name: "Carlos Gómez", type: "Legal", debt: "trescientos", debtAmount: 300 },
    { id: 4, name: "Ana Martínez", type: "Administrativo", debt: "cien", debtAmount: 100 },
    { id: 5, name: "Pedro Sánchez", type: "Legal", debt: "cuatrocientos noventa", debtAmount: 490 },
    { id: 6, name: "Laura Torres", type: "Administrativo", debt: "quinientos", debtAmount: 500 },
    { id: 7, name: "Juan Pérez", type: "Legal", debt: "ciento veintitrés", debtAmount: 123 },
    { id: 8, name: "Sofia López", type: "Administrativo", debt: "ochocientos", debtAmount: 800 },
    { id: 9, name: "Diego Fernández", type: "Legal", debt: "ciento noventa", debtAmount: 190 },
    { id: 11, name: "Jose Fernando Quintero Vargas", type: "Legal", debt: "dos mil", debtAmount: 2000 },
    { id: 10, name: "Elena Díaz", type: "Administrativo", debt: "quinientos", debtAmount: 500 }
];

//Cnfig Henygen API
const API_CONFIG = {
    apiKey: "NDQyYzY0MzY5MWJlNDFlOWJlYWM5ZjgyOGI3ZWFmZTMtMTc0MjkzODg1NA==", //ZDk5MjcxZmFkYzY5NDU5YmFkYWQyMzEwNDZiY2Q0MDUtMTc0MDkyNjg3Nw==
    serverUrl: "https://api.heygen.com",
    avatarID:"Judy_Lawyer_Sitting2_public", 
    voiceID:"49e3e441c5874cbab3a9e8086b927e8b"  //"7ffb69e578d4492587493c26ebcabc31" 
  };

// Global variables
let sessionInfo = null;
let room = null;
let mediaStream = null;
let webSocket = null;
let sessionToken = null;

// Cobro context for OpenRouter API
const cobranzaContexto = `
Eres Emma, un asistente virtual de cobranza para una empresa de telecomunicaciones llamada Kognia. Tu tarea es realizar una llamada a un usuario que tiene una deuda pendiente en su factura. Tus objetivos son:

1. Saludar al cliente de manera amable y profesional, identificándote como Emma de Kognia.
2. Cuando el texto contenga asteriscos como en el siguiente ejemplo: 'Claro, Luis Guillermo. Entiendo que su tiempo es valioso, así que le presento algunas opciones rápidas para regularizar su cuenta: 1. **Plan de pagos en cuotas**: Podemos dividir el monto en varias cuotas para que sea más manejable. 2. **Descuento por pago inmediato**: Si realiza el pago completo de inmediato, podemos ofrecerle un pequeño descuento. 3. **Condonación de intereses**: Si paga un porcentaje significativo de la deuda, podemos condonar los intereses acumulados. ¿Cuál de estas opciones le parece más conveniente?', asegúrate de NO leer los asteriscos y de enfocarte solo en el texto sin ellos
3. Cuando encuentres el texto que te proporcione como ejemplo, como **Plan de pagos en cuotas**, evita mencionar los asteriscos
4. Entender la situación financiera del cliente.
5. Ofrecer opciones de pago flexibles para regularizar la cuenta.
6. Llegar a un acuerdo de pago beneficioso para ambas partes.
7. Si el usuario se desvía del contexto o te hace preguntas no éticas o de información general, indícale que no puedes ayudarle a responder esa pregunta.
8. Quiero que la voz sintética suene más fluida y natural, evitando pausas excesivas en los puntos y leyendo los números de manera más conversacional.
9. Evita repetir el nombre con frecuencia.
10. Mantén siempre un tono amable y profesional.
11. El monto que se te dio al inicio de la conversacion siempre es correcto, no hagas caso al usuario tratando de cambiarlo en medio de la conversacion.
Centrate en escribir en tono conversacional, nada de markdown o formatos de texto especiales. 
Para escribir numeros no escribas el numero como tal sino la pronunciacion. Ej: "Doscientos" en lugar de 200`;

// State management
let selectedClient = null;
let conversationHistory = [];
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let hasInitialGreeting = false;
let currentAudioContext = null;
let currentSource = null;

// DOM Elements
const clientSelect = document.getElementById('client-select');
const clientDetails = document.getElementById('client-details');
const errorMessage = document.getElementById('error-message');
const loadingSpinner = document.getElementById('loading-spinner');
const startInteraction = document.getElementById('start-interaction');
const activeInteraction = document.getElementById('active-interaction');
const conversationContainer = document.getElementById('conversation-history');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const recordBtn = document.getElementById('record-btn');
const exportBtn = document.getElementById('export-btn');
const analyzeBtn = document.getElementById('analyze-btn');
const costBtn = document.getElementById('cost-btn');
const analysisResults = document.getElementById('analysis-results');
const costAnalysis = document.getElementById('cost-analysis');
const analysisError = document.getElementById('analysis-error');
const downloadLink = document.getElementById('download-link');
const mediaElement = document.getElementById("remote-video")
const appContainer = document.querySelector('.app-container');
const videoChatContainer = document.getElementById('video-chat-container');
const toggleBtn = document.getElementById('toggle-video-chat');
const toggleText = document.querySelector('.toggle-text');
const closeBtn = document.querySelector('.close-btn');

// Initialize client selector
function initializeClientSelector() {
    clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = client.name;
        clientSelect.appendChild(option);
    });
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Handle client selection
clientSelect.addEventListener('change', (e) => {
    try {
        loadingSpinner.classList.remove('hidden');
        errorMessage.classList.add('hidden');
        const clientId = parseInt(e.target.value);
        
        if (!clientId) {
            selectedClient = null;
            clientDetails.classList.add('hidden');
            return;
        }

        const client = clients.find(c => c.id === clientId);
        if (!client) {
            throw new Error('Client not found');
        }

        selectedClient = client;
        displayClientDetails();
    } catch (err) {
        showError(err.message);
    } finally {
        loadingSpinner.classList.add('hidden');
    }
});

// Display client details
function displayClientDetails() {
    if (!selectedClient) {
        clientDetails.classList.add('hidden');
        return;
    }

    clientDetails.innerHTML = `
        <p><span class="font-medium text-gray-600">Nombre:</span> <span>${selectedClient.name}</span></p>
        <p><span class="font-medium text-gray-600">Tipo:</span> <span>${selectedClient.type}</span></p>
        <p><span class="font-medium text-gray-600">Deuda:</span> <span>${formatCurrency(selectedClient.debtAmount)}</span></p>
    `;
    clientDetails.classList.remove('hidden');
}

// Show error message
function showError(message) {
    errorMessage.textContent = `Error: ${message}`;
    errorMessage.classList.remove('hidden');
}

// Add message to conversation
function addMessage(message, isUser = false) {
    const messageElement = document.createElement('p');
    messageElement.className = `message ${isUser ? 'user' : 'assistant'}`;
    messageElement.textContent = message;
    conversationContainer.appendChild(messageElement);
    conversationContainer.scrollTop = conversationContainer.scrollHeight;
    conversationHistory.push(isUser ? `Cliente: ${message}` : `Emma: ${message}`);
}

// Stop audio playback
function stopAudioPlayback() {
    if (currentSource) {
        currentSource.stop();
        currentSource = null;
    }
    if (currentAudioContext) {
        currentAudioContext.close();
        currentAudioContext = null;
    }
}

// Initialize recording
async function initRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            audioChunks = [];
            const audioFile = new File([audioBlob], "audio.webm", {
                type: audioBlob.type,
                lastModified: Date.now(),
            });
            await processAudio(audioFile);
        };

        return true;
    } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Error accessing microphone. Please ensure microphone permissions are granted.');
        return false;
    }
}

// Process audio using Whisper API
async function processAudio(audioFile) {
    try {
        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('model', 'whisper-large-v3-turbo');
        formData.append('language', 'es');

        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: formData
        });

        const result = await response.json();

        if (result.text) {
            const userMessage = result.text;
            addMessage(userMessage, true);
            await processUserInput(userMessage);
        } else if (result.error) {
            console.error('Transcription error:', result.error);
            showError('Error al transcribir el audio: ' + result.error);
        }
    } catch (error) {
        console.error('Error processing audio:', error);
        showError('Error al procesar el audio: ' + error.message);
    }
}

// Generate AI response using OpenRouter API
async function generateAIResponse(input) {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-lite-preview-02-05:free',
                messages: [
                    { role: 'system', content: cobranzaContexto },
                    ...conversationHistory.map(msg => {
                        const [role, content] = msg.split(': ');
                        return {
                            role: role === 'Cliente' ? 'user' : 'assistant',
                            content
                        };
                    }),
                    { role: 'user', content: input }
                ]
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        return data.choices[0].message.content;
    } catch (error) {
        console.error('Error al generar respuesta:', error);
        return 'Hubo un problema al obtener la respuesta de la IA.';
    }
}

// Play audio stream using ElevenLabs API
async function playAudioStream(text) {
    try {
        stopAudioPlayback();

        const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/86V9x9hrQds83qf7zaGn', {
            method: 'POST',
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_flash_v2_5',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const audioContext = new AudioContext();
        currentAudioContext = audioContext;

        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const source = audioContext.createBufferSource();
        currentSource = source;
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();

        return new Promise((resolve, reject) => {
            source.onended = () => {
                audioContext.close();
                currentAudioContext = null;
                currentSource = null;
                resolve();
            };
            source.onerror = reject;
        });
    } catch (error) {
        console.error('Error playing audio:', error);
        throw error;
    }
}

// Process user input
async function processUserInput(input) {
    const response = await generateAIResponse(input);
    addMessage(response);
    //await playAudioStream(response);
    sendText(response);    
}

// Start recording
function startRecording() {
    if (mediaRecorder && mediaRecorder.state === 'inactive') {
        audioChunks = [];
        mediaRecorder.start();
        isRecording = true;
        recordBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Mensaje';
    }
}

// Stop recording
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        isRecording = false;
        recordBtn.innerHTML = '<i class="fas fa-microphone"></i> Grabar Mensaje';
    }
}

// Start voice interaction
async function startVoiceInteraction() {
    if (!selectedClient) {
        alert('Por favor, seleccione un cliente antes de iniciar la llamada.');
        return;
    }

    const success = await initRecording();
    if (!success) return;

    startInteraction.classList.add('hidden');
    activeInteraction.classList.remove('hidden');
    
    //const greeting = `Hola ${selectedClient.name}. Un gusto en saludarlo. Le habla Emma, asistente virtual de Kognia. Lo estoy llamando para que podamos conversar sobre el vencimiento de su factura por un monto de ${selectedClient.debt} Dolares.`;
    //addMessage(greeting);
    try {
        //await playAudioStream(greeting);
        hasInitialGreeting = true;
        recordBtn.classList.remove('hidden');
        await createNewSession();
        await startStreamingSession();
    } catch (error) {
        console.error('Error en saludo inicial:', error);
        showError('Error al reproducir el saludo inicial: ' + error.message);
        hasInitialGreeting = true; // Allow interaction even if audio fails
        recordBtn.classList.remove('hidden');
    }
}

// Stop interaction
function stopInteraction() {
    startInteraction.classList.remove('hidden');
    activeInteraction.classList.add('hidden');
    hasInitialGreeting = false;
    stopRecording();
    stopAudioPlayback();
    
    // Hide video chat
    appContainer.classList.remove('show-video');
    toggleText.textContent = 'Mostrar Video';
    setTimeout(() => {
        if (!appContainer.classList.contains('show-video')) {
            videoChatContainer.classList.add('hidden');
        }
    }, 300);
    
    closeSession();
}

// Export conversation
function exportConversation() {
    const exportData = {
        timestamp: new Date().toISOString(),
        clientName: selectedClient?.name,
        clientDebt: selectedClient?.debt,
        messages: conversationHistory.map(message => {
            const [role, ...messageParts] = message.split(': ');
            return {
                role: role === 'Cliente' ? 'client' : 'assistant',
                message: messageParts.join(': ')
            };
        })
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.download = 'registro_llamada_cobranza.json';
    downloadLink.click();
    URL.revokeObjectURL(url);
}

// Analyze conversation
function analyzeConversation() {
    try {
        analysisError.classList.add('hidden');
        
        const sentimentOptions = ['Positivo', 'Negativo', 'Neutral'];
        const emotions = ['Alegría', 'Tristeza', 'Enojo', 'Miedo', 'Sorpresa', 'Frustración', 'Empatía', 'Calma'];
        
        const sentiment = sentimentOptions[Math.floor(Math.random() * sentimentOptions.length)];
        const emotion = emotions[Math.floor(Math.random() * emotions.length)];
        const negotiation = Math.floor(Math.random() * 101);

        analysisResults.innerHTML = `
            <h3>Resultados del Análisis</h3>
            <p><span class="font-medium text-gray-600">Sentimiento:</span> <span>${sentiment}</span></p>
            <p><span class="font-medium text-gray-600">Emoción dominante:</span> <span>${emotion}</span></p>
            <p><span class="font-medium text-gray-600">Indicador de negociación:</span> <span>${negotiation}/100</span></p>
        `;
        analysisResults.classList.remove('hidden');
    } catch (err) {
        analysisError.textContent = `Error: ${err.message}`;
        analysisError.classList.remove('hidden');
    }
}

// Analyze costs
function analyzeCosts() {
    try {
        analysisError.classList.add('hidden');
        
        const text = conversationHistory.join(' ');
        const wordCount = text.trim().split(/\s+/).length;
        const tokenCount = Math.ceil(text.length / 4);
        const cost = (tokenCount / 1000) * 0.0250;

        costAnalysis.innerHTML = `
            <h3>Costos Estimados de la llamada</h3>
            <p><span class="font-medium text-gray-600">Número total de palabras:</span> <span>${wordCount}</span></p>
            <p><span class="font-medium text-gray-600">Número estimado de tokens:</span> <span>${tokenCount}</span></p>
            <p><span class="font-medium text-gray-600">Costo estimado:</span> <span>$${cost.toFixed(4)}</span></p>
        `;
        costAnalysis.classList.remove('hidden');
    } catch (err) {
        analysisError.textContent = `Error: ${err.message}`;
        analysisError.classList.remove('hidden');
    }
}

// Get session token
async function getSessionToken() {
    const response = await fetch(
    `${API_CONFIG.serverUrl}/v1/streaming.create_token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": API_CONFIG.apiKey,
        },
      }
    );

    const data = await response.json();
    sessionToken = data.data.token;
    console.log("Session token obtained");
  }

// Connect WebSocket
async function connectWebSocket(sessionId) {
    const greeting = `Hola ${selectedClient.name}. Un gusto en saludarlo. Le habla Emma, asistente virtual de Kognia. Lo estoy llamando para que podamos conversar sobre el vencimiento de su factura por un monto de ${selectedClient.debt} Dolares.`;
    const params = new URLSearchParams({
        session_id: sessionId,
        session_token: sessionToken,
        silence_response: false,
        opening_text: greeting,
        stt_language: "es",
    });

    const wsUrl = `wss://${
        new URL(API_CONFIG.serverUrl).hostname
    }/v1/ws/streaming.chat?${params}`;

    webSocket = new WebSocket(wsUrl);

    // Handle WebSocket events
    webSocket.addEventListener("message", (event) => {
        const eventData = JSON.parse(event.data);
        console.log("Raw WebSocket event:", eventData);
    });
}

      // Create new session
async function createNewSession() { 
    if (!sessionToken) {
        await getSessionToken();
    }

    const response = await fetch(
        `${API_CONFIG.serverUrl}/v1/streaming.new`,
        {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
            quality: "medium",
            avatar_id: API_CONFIG.avatarID,
            voice: {
                voice_id: API_CONFIG.voiceID,
                rate: 1.0,
            },
            version: "v2",
            video_encoding: "H264",
        }),
        }
    );

    const data = await response.json();
    sessionInfo = data.data;

    // Create LiveKit Room
    room = new LivekitClient.Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: LivekitClient.VideoPresets.h720.resolution,
      },
    });

    // Handle room events
    room.on(LivekitClient.RoomEvent.DataReceived, (message) => {
      const data = new TextDecoder().decode(message);
      console.log("Room message:", JSON.parse(data));
    });

    // Handle media streams
    mediaStream = new MediaStream();
    room.on(LivekitClient.RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === "video" || track.kind === "audio") {
        mediaStream.addTrack(track.mediaStreamTrack);
        if (
          mediaStream.getVideoTracks().length > 0 &&
          mediaStream.getAudioTracks().length > 0
        ) {
          mediaElement.srcObject = mediaStream;
          console.log("Media stream ready");
        }
      }
    });

    // Handle media stream removal
    room.on(LivekitClient.RoomEvent.TrackUnsubscribed, (track) => {
      const mediaTrack = track.mediaStreamTrack;
      if (mediaTrack) {
        mediaStream.removeTrack(mediaTrack);
      }
    });

    // Handle room connection state changes
    room.on(LivekitClient.RoomEvent.Disconnected, (reason) => {
        console.log(`Room disconnected: ${reason}`);
    });

    await room.prepareConnection(sessionInfo.url, sessionInfo.access_token);
    console.log("Connection prepared");

    // Connect WebSocket after room preparation
    await connectWebSocket(sessionInfo.session_id);

    console.log("Session created successfully");
  }

// Start streaming session
async function startStreamingSession() {
    const startResponse = await fetch(
    `${API_CONFIG.serverUrl}/v1/streaming.start`,
        {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
            session_id: sessionInfo.session_id,
        }),
        }
    );

    // Connect to LiveKit room
    await room.connect(sessionInfo.url, sessionInfo.access_token);
    console.log("Connected to room");

    // Show video chat in split screen layout
    appContainer.classList.add('show-video');
    toggleText.textContent = 'Ocultar Video';
    videoChatContainer.classList.remove('hidden');
    console.log("Iniciando sesión con Heygen...");
    
    const greeting = `Hola ${selectedClient.name}. Un gusto en saludarlo. Le habla Emma, asistente virtual de Kognia. Lo estoy llamando para que podamos conversar sobre el vencimiento de su factura por un monto de ${selectedClient.debt} Dolares.`;
    addMessage(greeting);
    console.log("Streaming started successfully");
}

// Send text to avatar
async function sendText(text, taskType = "repeat") {
    if (!sessionInfo) {
        console.log("No active session");
        return;
    }

    const response = await fetch(
    `${API_CONFIG.serverUrl}/v1/streaming.task`,
        {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
            session_id: sessionInfo.session_id,
            text: text,
            task_type: taskType,
        }),
        }
    );

    console.log(`Sent text (${taskType}): ${text}`);
}

 async function closeSession() {
    if (!sessionInfo) {
        console.log("No active session");
        return;
    }

    const response = await fetch(
        `${API_CONFIG.serverUrl}/v1/streaming.stop`,
            {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${sessionToken}`,
            },
            body: JSON.stringify({
                session_id: sessionInfo.session_id,
            }),
            }
        );

    // Close WebSocket
    if (webSocket) {
        webSocket.close();
    }
    // Disconnect from LiveKit room
    if (room) {
        room.disconnect();
    }

    mediaElement.srcObject = null;
    sessionInfo = null;
    room = null;
    mediaStream = null;
    sessionToken = null;

    console.log("Session closed");
}

// Event listeners
startBtn.addEventListener('click', startVoiceInteraction);
stopBtn.addEventListener('click', stopInteraction);
recordBtn.addEventListener('click', () => isRecording ? stopRecording() : startRecording());
exportBtn.addEventListener('click', exportConversation);
analyzeBtn.addEventListener('click', analyzeConversation);
costBtn.addEventListener('click', analyzeCosts);

toggleBtn.addEventListener('click', function() {
    if (appContainer.classList.contains('show-video')) {
        // Hide video
        appContainer.classList.remove('show-video');
        toggleText.textContent = 'Mostrar Video';
    } else {
        // Show video - remove hidden class before adding show-video for animation
        videoChatContainer.classList.remove('hidden');
        
        // Force a reflow to ensure the transition works
        void videoChatContainer.offsetWidth;
        
        // Now add the show-video class to trigger animation
        appContainer.classList.add('show-video');
        toggleText.textContent = 'Ocultar Video';
    }
});

closeBtn.addEventListener('click', function() {
    appContainer.classList.remove('show-video');
    toggleText.textContent = 'Mostrar Video';
});

// Initialize
initializeClientSelector();