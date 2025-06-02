// Bot Dialog Generator JavaScript
class BotDialogGenerator {
    constructor() {
        this.isGenerating = false;
        this.isPaused = false;
        this.currentMessageCount = 0;
        this.messageLimit = 2;
        this.users = [];
        this.apiKeys = {
            openai: '',
            togetherai: '1b8390600849e2ba1c81a0dbaf1b62cf958e127cb9e8a67f203394e46ab75a32',
            openrouter: ''
        };
        this.temperatures = {
            bot1: 0.7,
            bot2: 0.7
        };
        this.selectedModel = 'TogetherAI';
        
        this.init();
    }

    async init() {
        await this.loadUsers();
        this.setupEventListeners();
        this.setupAccordions();
        this.setupMobileNavigation();
        this.populateUserDropdowns();
    }

    // Supabase integration
    async loadUsers() {
        try {
            // Данные Supabase
            const supabaseUrl = 'https://uomyodvgfgtvmbqjeazm.supabase.co';
            const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvbXlvZHZnZmd0dm1icWplYXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1MDE0NTQsImV4cCI6MjA2MzA3NzQ1NH0.ufzKKHpyDm34CwDlNB8zs4rGGV5MbvpE3cA6P_Hvu9g';
            
            const response = await fetch(`${supabaseUrl}/rest/v1/user_profiles?select=Full_Name,Resume`, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                this.users = await response.json();
                this.populateUserDropdowns();
                this.logMessage('Users loaded successfully', 'success');
            } else {
                throw new Error('Failed to load users');
            }
        } catch (error) {
            this.logMessage(`Error loading users: ${error.message}`, 'error');
            // Fallback users for testing
            this.users = [
                { Full_Name: 'Josefin Hello', Resume: 'You are Josefin Hello, a Swedish artist specializing in food photography and culinary storytelling.' },
                { Full_Name: 'Leila Farouk', Resume: 'You are Leila Farouk, an interdisciplinary artist based in Cairo, working with digital media and traditional crafts.' },
                { Full_Name: 'Default User', Resume: 'You are a helpful assistant.' }
            ];
            this.populateUserDropdowns();
        }
    }

    populateUserDropdowns() {
        const dropdowns = document.querySelectorAll('.bot-profile select, .mobile-bot-select');
        dropdowns.forEach(dropdown => {
            dropdown.innerHTML = '';
            this.users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.Full_Name;
                option.textContent = user.Full_Name;
                dropdown.appendChild(option);
            });
        });
    }

    setupEventListeners() {
        // Send button listeners
        document.querySelector('.send-button')?.addEventListener('click', () => this.startDialog());
        document.querySelector('.mobile-send-button')?.addEventListener('click', () => this.startDialog());

        // Control buttons
        document.querySelector('.pause')?.addEventListener('click', () => this.togglePause());
        document.querySelector('.clear')?.addEventListener('click', () => this.clearDialog());
        
        // Mobile control buttons
        document.querySelector('.mobile-input-controls .pause')?.addEventListener('click', () => this.togglePause());
        document.querySelector('.mobile-input-controls .clear')?.addEventListener('click', () => this.clearDialog());

        // Message limit input
        document.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('change', (e) => {
                this.messageLimit = parseInt(e.target.value) || 2;
            });
        });

        // Refresh button
        document.querySelectorAll('.refresh-btn').forEach(btn => {
            btn.addEventListener('click', () => this.resetCounters());
        });

        // Model selection
        document.querySelectorAll('select').forEach(select => {
            if (select.closest('.control-group') && select.previousElementSibling?.textContent.includes('model')) {
                select.addEventListener('change', (e) => {
                    this.selectedModel = e.target.value;
                });
            }
        });

        // User selection dropdowns
        document.querySelectorAll('.bot-profile select, .mobile-bot-select').forEach(select => {
            select.addEventListener('change', (e) => this.updateBotPrompt(e.target));
        });

        // Enter key support for textareas
        document.querySelectorAll('textarea').forEach(textarea => {
            if (textarea.placeholder.includes('initial prompt')) {
                textarea.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        this.startDialog();
                    }
                });
            }
        });
    }

    setupAccordions() {
        // Desktop accordions
        document.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', () => {
                this.toggleAccordion(header);
            });
        });

        // Mobile accordions
        document.querySelectorAll('.mobile-accordion-header').forEach(header => {
            header.addEventListener('click', () => {
                this.toggleAccordion(header);
            });
        });

        // Create accordion content
        this.createAccordionContent();
    }

    toggleAccordion(header) {
        const arrow = header.querySelector('.accordion-arrow');
        const content = header.nextElementSibling;
        
        if (arrow.textContent === '▼') {
            arrow.textContent = '▶';
            if (content) content.style.display = 'none';
        } else {
            arrow.textContent = '▼';
            if (content) content.style.display = 'block';
        }
    }

createAccordionContent() {
    const apiAccordions = document.querySelectorAll('.accordion-header, .mobile-accordion-header');

    apiAccordions.forEach(header => {
        let content = document.createElement('div');
        content.className = 'accordion-content';

        // Вставляем нужный контент
        if (header.textContent.includes('API Keys')) {
            content.innerHTML = `
                <div class="api-keys-form">
                    <div class="input-group">
                        <label>OpenAI API Key:</label>
                        <input type="password" id="openai-key" placeholder="sk-...">
                    </div>
                    <div class="input-group">
                        <label>TogetherAI API Key:</label>
                        <input type="password" id="togetherai-key" placeholder="...">
                    </div>
                    <div class="input-group">
                        <label>Google AI API Key:</label>
                        <input type="password" id="google-key" placeholder="AI...">
                    </div>
                    <button onclick="botGenerator.saveApiKeys()">Save Keys</button>
                </div>
            `;
        } else if (header.textContent.includes('Creativity')) {
            content.innerHTML = `
                <div class="creativity-controls">
                    <div class="slider-group">
                        <label>Bot 1 Temperature: <span id="temp1-value">0.7</span></label>
                        <input type="range" id="temp1-slider" min="0" max="2" step="0.1" value="0.7">
                    </div>
                    <div class="slider-group">
                        <label>Bot 2 Temperature: <span id="temp2-value">0.7</span></label>
                        <input type="range" id="temp2-slider" min="0" max="2" step="0.1" value="0.7">
                    </div>
                </div>
            `;

            // Добавим обработчики для слайдеров
            content.querySelector('#temp1-slider').addEventListener('input', (e) => {
                this.temperatures.bot1 = parseFloat(e.target.value);
                content.querySelector('#temp1-value').textContent = e.target.value;
            });

            content.querySelector('#temp2-slider').addEventListener('input', (e) => {
                this.temperatures.bot2 = parseFloat(e.target.value);
                content.querySelector('#temp2-value').textContent = e.target.value;
            });
        } else {
            return; // пропустить, если заголовок не нужный
        }

        // Вставляем контент в DOM
        header.parentNode.insertBefore(content, header.nextSibling);

        // Обработчик клика на аккордеон
        header.addEventListener('click', () => {
            const isOpen = content.classList.toggle('open');

            // Повернуть стрелочку (если есть)
            const arrow = header.querySelector('.accordion-arrow');
            if (arrow) {
                arrow.style.transform = isOpen ? 'rotate(90deg)' : 'rotate(0deg)';
            }
        });
    });
}


    setupMobileNavigation() {
        window.showSection = (sectionId, tabElement) => {
            document.querySelectorAll('.mobile-section').forEach(section => {
                section.classList.remove('active');
            });
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            document.getElementById(sectionId).classList.add('active');
            tabElement.classList.add('active');
        };
    }

    updateBotPrompt(selectElement) {
        const selectedUser = this.users.find(user => user.Full_Name === selectElement.value);
        if (selectedUser) {
            const botCard = selectElement.closest('.bot-profile, .mobile-bot-card');
            const textarea = botCard.querySelector('textarea');
            const title = botCard.querySelector('h3');
            
            if (textarea) textarea.value = selectedUser.Resume;
            if (title) title.textContent = selectedUser.Resume.substring(0, 60) + '...';
        }
    }

    saveApiKeys() {
        this.apiKeys.openai = document.getElementById('openai-key').value;
        this.apiKeys.togetherai = document.getElementById('togetherai-key').value;
        this.apiKeys.google = document.getElementById('google-key').value;
        
        this.logMessage('API keys saved successfully', 'success');
    }

    async startDialog() {
        if (this.isGenerating) {
            this.logMessage('Dialog is already in progress', 'warning');
            return;
        }

        const initialPrompt = this.getInitialPrompt();
        if (!initialPrompt.trim()) {
            this.logMessage('Please enter an initial prompt', 'error');
            return;
        }

        if (!this.validateApiKeys()) {
            this.logMessage('Please configure API keys first', 'error');
            return;
        }

        this.isGenerating = true;
        this.isPaused = false;
        this.currentMessageCount = 0;
        
        this.logMessage('Starting dialog generation...', 'info');
        this.clearDialogArea();
        
        // Add initial prompt to dialog
        this.addMessageToDialog('user', initialPrompt);
        
        try {
            await this.generateDialog(initialPrompt);
        } catch (error) {
            this.logMessage(`Error generating dialog: ${error.message}`, 'error');
        } finally {
            this.isGenerating = false;
        }
    }

    async generateDialog(initialPrompt) {
        let currentPrompt = initialPrompt;
        let currentBot = 1;
        
        while (this.currentMessageCount < this.messageLimit && !this.isPaused) {
            try {
                const botConfig = this.getBotConfig(currentBot);
                const response = await this.callAPI(botConfig.systemPrompt, currentPrompt, currentBot);
                
                this.addMessageToDialog(`bot${currentBot}`, response);
                this.currentMessageCount++;
                
                // Switch to next bot
                currentBot = currentBot === 1 ? 2 : 1;
                currentPrompt = response;
                
                // Add delay between messages
                await this.delay(1000);
                
            } catch (error) {
                this.logMessage(`Error from bot ${currentBot}: ${error.message}`, 'error');
                break;
            }
        }
        
        if (this.currentMessageCount >= this.messageLimit) {
            this.logMessage(`Dialog completed. Generated ${this.currentMessageCount} messages.`, 'success');
        }
    }

    getBotConfig(botNumber) {
        const selector = botNumber === 1 ? '.bot-profile:first-child textarea, .mobile-bot-card:first-child textarea' 
                                        : '.bot-profile:last-child textarea, .mobile-bot-card:last-child textarea';
        const textarea = document.querySelector(selector);
        return {
            systemPrompt: textarea?.value || 'You are a helpful assistant.',
            temperature: this.temperatures[`bot${botNumber}`]
        };
    }

    async callAPI(systemPrompt, userPrompt, botNumber) {
        const temperature = this.temperatures[`bot${botNumber}`];
        
        switch (this.selectedModel) {
            case 'GPT-4':
                return await this.callOpenAI(systemPrompt, userPrompt, temperature);
            case 'TogetherAI':
                return await this.callTogetherAI(systemPrompt, userPrompt, temperature);
            case 'Gemini':
                return await this.callGoogle(systemPrompt, userPrompt, temperature);
            default:
                throw new Error('Unknown model selected');
        }
    }

    async callOpenAI(systemPrompt, userPrompt, temperature) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKeys.openai}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: temperature,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async callTogetherAI(systemPrompt, userPrompt, temperature) {
        const response = await fetch('https://api.together.xyz/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKeys.togetherai}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'Qwen/Qwen2.5-72B-Instruct-Turbo',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: temperature,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            throw new Error(`TogetherAI API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async callGoogle(systemPrompt, userPrompt, temperature) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKeys.google}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `${systemPrompt}\n\nUser: ${userPrompt}`
                    }]
                }],
                generationConfig: {
                    temperature: temperature,
                    maxOutputTokens: 500
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Google AI API error: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    addMessageToDialog(sender, message) {
        const dialogArea = document.querySelector('.dialog-section') || document.querySelector('.mobile-chat-section');
        if (!dialogArea) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${sender}`;
        
        let senderLabel = '';
        if (sender === 'user') senderLabel = 'Initial Prompt';
        else if (sender === 'bot1') senderLabel = 'Bot 1';
        else if (sender === 'bot2') senderLabel = 'Bot 2';
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <strong>${senderLabel}</strong>
                <span class="message-time">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="message-content">${message}</div>
        `;
        
        dialogArea.appendChild(messageDiv);
        dialogArea.scrollTop = dialogArea.scrollHeight;
    }

    getInitialPrompt() {
        const textarea = document.querySelector('textarea[placeholder*="initial prompt"]') || 
                        document.querySelector('.mobile-input-textarea');
        return textarea?.value || '';
    }

    validateApiKeys() {
        switch (this.selectedModel) {
            case 'GPT-4':
                return this.apiKeys.openai.length > 0;
            case 'TogetherAI':
                return this.apiKeys.togetherai.length > 0;
            case 'Gemini':
                return this.apiKeys.google.length > 0;
            default:
                return false;
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseButtons = document.querySelectorAll('.pause');
        pauseButtons.forEach(btn => {
            btn.textContent = this.isPaused ? '▶️ Resume' : '⏸️ Пауза';
        });
        
        this.logMessage(this.isPaused ? 'Dialog paused' : 'Dialog resumed', 'info');
    }

    clearDialog() {
        this.clearDialogArea();
        this.isGenerating = false;
        this.isPaused = false;
        this.currentMessageCount = 0;
        
        // Clear input
        const textareas = document.querySelectorAll('textarea[placeholder*="initial prompt"], .mobile-input-textarea');
        textareas.forEach(textarea => textarea.value = '');
        
        this.logMessage('Dialog cleared', 'info');
    }

    clearDialogArea() {
        const dialogAreas = document.querySelectorAll('.dialog-section, .mobile-chat-section');
        dialogAreas.forEach(area => {
            // Keep header, remove messages
            const messages = area.querySelectorAll('.message');
            messages.forEach(msg => msg.remove());
        });
    }

    resetCounters() {
        this.currentMessageCount = 0;
        this.logMessage('Message counters have been reset', 'info');
    }

    logMessage(message, type = 'info') {
        const logAreas = document.querySelectorAll('.logs-section, .mobile-logs-section');
        logAreas.forEach(logArea => {
            // Clear example text on first real log
            if (logArea.textContent.includes('Chat history cleared')) {
                logArea.innerHTML = '';
            }
            
            const logDiv = document.createElement('div');
            logDiv.className = `log-message log-${type}`;
            logDiv.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            logArea.appendChild(logDiv);
            
            // Keep only last 50 messages
            const messages = logArea.querySelectorAll('.log-message');
            if (messages.length > 50) {
                messages[0].remove();
            }
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the bot dialog generator
const botGenerator = new BotDialogGenerator();

// CSS for additional styling (add to your existing CSS file)
const additionalCSS = `
.message {
    margin: 10px 0;
    padding: 10px;
    border-radius: 8px;
    max-width: 80%;
}

.message-user {
    background-color: rgba(57, 57, 57, 0.5);
    backdrop-filter: blur(10px);           
    -webkit-backdrop-filter: blur(10px);    
    border: 1px solid rgba(215, 215, 215, 0.1); 
    border-radius: 8px;                     
    margin-left: auto;
    margin-right: 0;
}

.message-bot1 {
    background-color: rgba(49, 30, 70, 0.5);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(150, 0, 195, 0.1);
    border-radius: 8px;
    margin-right: auto;
    margin-left: 0;
}

.message-bot2 {
    background-color: rgba(7, 84, 84, 0.5);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 174, 55, 0.1);
    border-radius: 8px;
    margin-left: auto;
    margin-right: 0;
}

.message-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
    font-size: 0.9em;
    color: #666;
}

.message-content {
    line-height: 1.5;
}

.accordion-content {
    border-top: 1px solid #eee;
}

.api-keys-form .input-group {
    margin-bottom: 10px;
}

.api-keys-form label {
    display: block;
    margin-bottom: 5px;
}

.api-keys-form input {
    width: 100%;
    padding: 5px;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.creativity-controls .slider-group {
    margin-bottom: 15px;
}

.creativity-controls input[type="range"] {
    width: 100%;
    margin-top: 5px;
}

.log-message {
    padding: 2px 0;
    font-size: 0.9em;
}

.log-error { color: #d32f2f; }
.log-warning { color: #f57c00; }
.log-success { color: #388e3c; }
.log-info { color: #1976d2; }
`;

// Add CSS to page
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);