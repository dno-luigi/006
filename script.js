const menuButton = document.getElementById('menuButton');
const talkButton = document.getElementById('talkButton');
const messageInput = document.getElementById('messageInput');
const conversation = document.getElementById('conversation');
const applet = document.getElementById('applet');
const closeSettings = document.getElementById('closeSettings');
const saveSettings = document.getElementById('saveSettings');
const modelSelect = document.getElementById('modelSelect');
const apiKeyInput = document.getElementById('apiKeyInput');
const userInfoInput = document.getElementById('userInfoInput');
const responseInstructionsInput = document.getElementById('responseInstructionsInput');
const aiSpeechToggle = document.getElementById('aiSpeechToggle');
const toggleMode = document.getElementById('toggleMode');

let recognizing = false;
let recognition;
let currentUtterance = null;
let selectedModel = 'deepseek/deepseek-r1-distill-llama-70b';
let apiKey = '';
let userInfo = '';
let responseInstructions = '';
let aiSpeechEnabled = true;
let isDarkMode = false;

if ('webkitSpeechRecognition' in window) {
  recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = function() {
    recognizing = true;
    talkButton.innerHTML = '<i class="fas fa-stop"></i>';
  };

  recognition.onend = function() {
    recognizing = false;
    updateTalkButtonText();
  };

  recognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript;
    messageInput.value = transcript;
    addMessage();
  };

  recognition.onerror = function(event) {
    console.error('Speech recognition error:', event.error);
  };
} else {
  talkButton.innerHTML = '<i class="fas fa-envelope"></i>';
  talkButton.disabled = true;
}

menuButton.addEventListener('click', () => {
  applet.classList.toggle('open');
});

toggleMode.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  document.body.classList.toggle('light-mode');
  isDarkMode = !isDarkMode;
  const modeIcon = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  toggleMode.innerHTML = modeIcon;
});

closeSettings.addEventListener('click', () => {
  applet.classList.remove('open');
});

saveSettings.addEventListener('click', () => {
  selectedModel = modelSelect.value;
  apiKey = apiKeyInput.value;
  userInfo = userInfoInput.value;
  responseInstructions = responseInstructionsInput.value;
  aiSpeechEnabled = aiSpeechToggle.checked;

  localStorage.setItem('selectedModel', selectedModel);
  localStorage.setItem('apiKey', apiKey);
  localStorage.setItem('userInfo', userInfo);
  localStorage.setItem('responseInstructions', responseInstructions);
  localStorage.setItem('aiSpeechEnabled', aiSpeechEnabled.toString());
  localStorage.setItem('isDarkMode', isDarkMode);

  applet.classList.remove('open');
});

async function addMessage() {
  const message = messageInput.value.trim();
  if (message) {
    const userMessageElement = document.createElement('div');
    userMessageElement.classList.add('message', 'user-message');
    userMessageElement.textContent = message;
    conversation.appendChild(userMessageElement);
    messageInput.value = '';
    conversation.scrollTop = conversation.scrollHeight;

    const typingElement = document.createElement('div');
    typingElement.classList.add('message', 'ai-message', 'typing-indicator');
    typingElement.innerHTML = `
      <span></span>
      <span></span>
      <span></span>
    `;
    conversation.appendChild(typingElement);
    conversation.scrollTop = conversation.scrollHeight;

    try {
      const payload = {
        model: selectedModel,
        messages: [
          { role: "system", content: `What you should know about me: ${userInfo}\nHow you will respond: ${responseInstructions}` },
          { role: "user", content: message }
        ]
      };

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      const aiMessageContent = data.choices[0].message.content.trim();

      const aiMessageElement = document.createElement('div');
      aiMessageElement.classList.add('message', 'ai-message');
      aiMessageElement.innerHTML = marked.parse(aiMessageContent);
      
      // Add expand button
      const toggleButton = document.createElement('button');
      toggleButton.classList.add('message-toggle');
      toggleButton.innerHTML = '<i class="fas fa-chevron-up fa-sm"></i>';
      toggleButton.addEventListener('click', () => {
        aiMessageElement.classList.toggle('expanded');
        toggleButton.innerHTML = aiMessageElement.classList.contains('expanded')
          ? '<i class="fas fa-chevron-down fa-sm"></i>'
          : '<i class="fas fa-chevron-up fa-sm"></i>';
      });
      
      // Add delete button
      const deleteButton = document.createElement('button');
      deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
      deleteButton.style.marginLeft = '10px';
      deleteButton.addEventListener('click', () => {
        conversation.removeChild(aiMessageElement);
      });
      
      // Add copy button
      const copyButton = document.createElement('button');
      copyButton.innerHTML = '<i class="fas fa-copy"></i>';
      copyButton.style.marginLeft = '10px';
      copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(aiMessageContent).then(() => {
          alert('Response copied to clipboard');
        });
      });
      
      // Add speak button
      const speakButton = document.createElement('button');
      speakButton.innerHTML = '<i class="fas fa-volume-up"></i>';
      speakButton.style.marginLeft = '10px';
      speakButton.addEventListener('click', () => {
        const utterance = new SpeechSynthesisUtterance(aiMessageContent);
        utterance.lang = 'en-US';
        speechSynthesis.speak(utterance);
      });
      
      aiMessageElement.appendChild(toggleButton);
      aiMessageElement.appendChild(deleteButton);
      aiMessageElement.appendChild(copyButton);
      aiMessageElement.appendChild(speakButton);
      
      conversation.appendChild(aiMessageElement);
      conversation.scrollTop = conversation.scrollHeight;

      if (aiSpeechEnabled) {
        const utterance = new SpeechSynthesisUtterance(aiMessageContent);
        utterance.lang = 'en-US';
        speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessageElement = document.createElement('div');
      errorMessageElement.classList.add('message', 'ai-message');
      errorMessageElement.textContent = `Error: ${error.message}`;
      conversation.appendChild(errorMessageElement);
      conversation.scrollTop = conversation.scrollHeight;
    }
    conversation.removeChild(typingElement);
  }
}

talkButton.addEventListener('click', () => {
  if (recognizing) {
    recognition.stop();
  } else if (aiSpeechEnabled && 'webkitSpeechRecognition' in window) {
    recognition.start();
  }
});

messageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    addMessage();
  }
});

function updateTalkButtonText() {
  talkButton.innerHTML = recognizing ? '<i class="fas fa-stop"></i>' : aiSpeechEnabled && 'webkitSpeechRecognition' in window ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-envelope"></i>';
}

window.onload = () => {
  selectedModel = localStorage.getItem('selectedModel') || 'deepseek/deepseek-r1-distill-llama-70b';
  apiKey = localStorage.getItem('apiKey') || '';
  userInfo = localStorage.getItem('userInfo') || '';
  responseInstructions = localStorage.getItem('responseInstructions') || '';
  aiSpeechEnabled = localStorage.getItem('aiSpeechEnabled') === 'true';
  isDarkMode = localStorage.getItem('isDarkMode') === 'true';

  modelSelect.value = selectedModel;
  apiKeyInput.value = apiKey;
  userInfoInput.value = userInfo;
  responseInstructionsInput.value = responseInstructions;
  aiSpeechToggle.checked = aiSpeechEnabled;

  if (isDarkMode) {
    document.body.classList.add('dark-mode');
    toggleMode.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    document.body.classList.add('light-mode');
    toggleMode.innerHTML = '<i class="fas fa-moon"></i>';
  }

  updateTalkButtonText();
  if (!('webkitSpeechRecognition' in window)) {
    talkButton.innerHTML = '<i class="fas fa-envelope"></i>';
    talkButton.disabled = true;
  }
};
