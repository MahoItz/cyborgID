class BotDialogGenerator {
  constructor() {
    this.isGenerating = false;
    this.isPaused = false;
    this.messageLimit = 2;
    this.users = [];
    this.currentBatchCount = 0; // Количество сообщений в текущей пачке генерации
    this.generatedMessages = []; // Сгенерированные сообщения
    this.delayMs = 1000; // Задержка между воспроизведением сообщений
    this.isPlaying = false; // Флаг для отслеживания начала диалога
    this.currentIndex = 0;
    this.timeoutId = null;
    this.isReplaying = false;
    this.replayPaused = false;
    this.apiKeys = {
      openai: "",
      openrouter: "",
    };
    this.temperatures = {
      bot1: 0.7,
      bot2: 0.7,
    };
    this.selectedModel = "TogetherAI";

    this.init();
  }

  async init() {
    await this.loadUsers();
    this.setupEventListeners();
    this.setupAccordions();
    this.setupMobileNavigation();
    this.populateUserDropdowns();
    this.bindUserDeletion();
    this.setupFullscreenMenu();
  }

  // Supabase integration
  async loadUsers() {
    try {
      const response = await fetch("/api/supabase", {
        method: "GET",
      });

      if (response.ok) {
        this.users = await response.json();
        this.populateUserDropdowns();
        this.logMessage("Users loaded successfully", "success");
      } else {
        throw new Error("Failed to load users");
      }
    } catch (error) {
      this.logMessage(`Error loading users: ${error.message}`, "error");
    }
  }

  populateUserDropdowns() {
    const dropdowns = document.querySelectorAll(
      ".bot-profile select, .mobile-bot-select"
    );
    dropdowns.forEach((dropdown) => {
      dropdown.innerHTML = "";

      const emptyOption = document.createElement("option");
      emptyOption.value = "";
      emptyOption.textContent = "Select user...";
      dropdown.appendChild(emptyOption);

      this.users.forEach((user) => {
        const option = document.createElement("option");
        option.value = user.Full_Name;
        option.textContent = user.Full_Name;
        dropdown.appendChild(option);
      });
    });
  }

  setupEventListeners() {
    // Send button listeners
    document
      .querySelector(".send-button")
      ?.addEventListener("click", () => this.startDialog());
    document
      .querySelector(".mobile-send-button")
      ?.addEventListener("click", () => this.startDialog());

    // Control buttons
    document
      .querySelector(".pause")
      ?.addEventListener("click", () => this.togglePause());
    document
      .querySelector(".play")
      ?.addEventListener("click", () => this.togglePlay());
    document
      .querySelector(".clear")
      ?.addEventListener("click", () => this.clearDialog());

    document
      .getElementById("menu-play")
      ?.addEventListener("click", () => this.toggleReplay());

    document
      .getElementById("delay-slider")
      ?.addEventListener(
        "input",
        (e) => (this.delayMs = parseInt(e.target.value, 10))
      );

    // Mobile control buttons
    document
      .querySelector(".mobile-input-controls .pause")
      ?.addEventListener("click", () => this.togglePause());
    document
      .querySelector(".mobile-input-controls .clear")
      ?.addEventListener("click", () => this.clearDialog());

    // Message limit input
    document.querySelectorAll('input[type="number"]').forEach((input) => {
      input.addEventListener("change", (e) => {
        this.messageLimit = parseInt(e.target.value) || 2;
      });
    });

    // Refresh button
    document.querySelectorAll(".refresh-btn").forEach((btn) => {
      btn.addEventListener("click", () => this.resetCounters());
    });

    // Model selection
    document.querySelectorAll("select").forEach((select) => {
      if (
        select.closest(".control-group") &&
        select.previousElementSibling?.textContent.includes("model")
      ) {
        select.addEventListener("change", (e) => {
          this.selectedModel = e.target.value;
        });
      }
    });

    // User selection dropdowns
    document
      .querySelectorAll(".bot-profile select, .mobile-bot-select")
      .forEach((select) => {
        select.addEventListener("change", (e) =>
          this.updateBotPrompt(e.target)
        );
      });

    // Enter key support for textareas
    document.querySelectorAll("textarea").forEach((textarea) => {
      if (textarea.placeholder.includes("initial prompt")) {
        textarea.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            this.startDialog();
          }
        });
      }
    });
  }

  initVantaBackground() {
    VANTA.CELLS({
      el: "#vanta-bg",
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200.0,
      minWidth: 200.0,
      scale: 1.0,
      color1: 0x208c00,
      color2: 0x3577f2,
      size: 5.0,
      speed: 0.3,
    });
  }

  bindUserDeletion() {
    document.querySelectorAll(".delete-user-button").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const select = btn.nextElementSibling;
        const user = select.value;

        if (!confirm(`Delete ${user}?`)) return;

        try {
          const res = await fetch("/api/supabase", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ user }),
          });

          if (res.ok) {
            select.removeChild(select.querySelector(`option[value="${user}"]`));
            alert(`${user} Deleted.`);
          } else {
            const err = await res.json();
            alert(`Error deleting ${user}: ${err.error}`);
          }
        } catch (err) {
          alert(`Network error: ${err.message}`);
        }
      });
    });
  }

  setupAccordions() {
    // Desktop accordions
    document.querySelectorAll(".accordion-header").forEach((header) => {
      header.addEventListener("click", () => {
        this.toggleAccordion(header);
      });
    });

    // Mobile accordions
    document.querySelectorAll(".mobile-accordion-header").forEach((header) => {
      header.addEventListener("click", () => {
        this.toggleAccordion(header);
      });
    });

    // Create accordion content
    this.createAccordionContent();
  }

  toggleAccordion(header) {
    const arrow = header.querySelector(".accordion-arrow");
    const content = header.nextElementSibling;

    if (arrow.textContent === "▼") {
      arrow.textContent = "▶";
      if (content) content.style.display = "none";
    } else {
      arrow.textContent = "▼";
      if (content) content.style.display = "block";
    }
  }

  createAccordionContent() {
    const apiAccordions = document.querySelectorAll(
      ".accordion-header, .mobile-accordion-header"
    );

    apiAccordions.forEach((header) => {
      let content = document.createElement("div");
      content.className = "accordion-content";

      // Вставляем нужный контент
      if (header.textContent.includes("API Keys")) {
        content.innerHTML = `
                <div class="api-keys-form">
                    <div class="input-group">
                        <label>TogetherAI API Key:</label>
                        <input type="password" id="togetherai-key" placeholder="...">
                    </div>
                    <div class="input-group">
                        <label>OpenAI API Key:</label>
                        <input type="password" id="openai-key" placeholder="sk-...">
                    </div>
                    <div class="input-group">
                        <label>Google AI API Key:</label>
                        <input type="password" id="google-key" placeholder="AI...">
                    </div>
                    <button onclick="botGenerator.saveApiKeys()">Save Keys</button>
                </div>
            `;
      } else if (header.textContent.includes("Creativity")) {
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
        content
          .querySelector("#temp1-slider")
          .addEventListener("input", (e) => {
            this.temperatures.bot1 = parseFloat(e.target.value);
            content.querySelector("#temp1-value").textContent = e.target.value;
          });

        content
          .querySelector("#temp2-slider")
          .addEventListener("input", (e) => {
            this.temperatures.bot2 = parseFloat(e.target.value);
            content.querySelector("#temp2-value").textContent = e.target.value;
          });
      } else {
        return; // пропустить, если заголовок не нужный
      }

      // Вставляем контент в DOM
      header.parentNode.insertBefore(content, header.nextSibling);

      // Обработчик клика на аккордеон
      header.addEventListener("click", () => {
        const isOpen = content.classList.toggle("open");

        // Повернуть стрелочку
        const arrow = header.querySelector(".accordion-arrow");
        if (arrow) {
          arrow.style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)";
        }
      });
    });
  }

  setupMobileNavigation() {
    window.showSection = (sectionId, tabElement) => {
      document.querySelectorAll(".mobile-section").forEach((section) => {
        section.classList.remove("active");
      });
      document.querySelectorAll(".nav-tab").forEach((tab) => {
        tab.classList.remove("active");
      });
      document.getElementById(sectionId).classList.add("active");
      tabElement.classList.add("active");
    };
  }

  updateBotPrompt(selectElement) {
    const selectedUser = this.users.find(
      (user) => user.Full_Name === selectElement.value
    );
    if (selectedUser) {
      const botCard = selectElement.closest(".bot-profile, .mobile-bot-card");
      const textarea = botCard.querySelector("textarea");
      const title = botCard.querySelector("h3");

      if (textarea) textarea.value = selectedUser.Resume;
      if (title)
        title.textContent = selectedUser.Resume.substring(0, 60) + "...";
    }
  }

  saveApiKeys() {
    this.apiKeys.openai = document.getElementById("openai-key").value;
    this.apiKeys.togetherai = document.getElementById("togetherai-key").value;
    this.apiKeys.google = document.getElementById("google-key").value;

    this.logMessage("API keys saved successfully", "success");
  }

  async startDialog() {
    if (this.isGenerating && !this.isPaused) {
      this.logMessage("Dialog is already in progress", "warning");
      return;
    }

    // Если диалог на паузе, продолжаем его
    if (this.isPaused) {
      this.isPaused = false;
      this.updatePauseButtons();
      this.logMessage("Dialog resumed", "info");
      await this.continueDialog();
      return;
    }

    // Сбрасываем счетчик текущей пачки для новой генерации
    this.currentBatchCount = 0;

    // Если это первый запуск диалога
    if (!this.dialogStarted) {
      const initialPrompt = this.getInitialPrompt();
      if (!initialPrompt.trim()) {
        this.logMessage("Please enter an initial prompt", "error");
        return;
      }

      if (!this.validateApiKeys()) {
        this.logMessage("Please configure API keys first", "error");
        return;
      }

      this.logMessage("Starting dialog generation...", "info");
      this.clearDialogArea();

      // Add initial prompt to dialog
      this.addMessageToDialog("user", initialPrompt);
      this.dialogStarted = true;
    } else {
      // Если диалог уже начался, просто продолжаем
      this.logMessage("Continuing dialog generation...", "info");
    }

    if (!this.validateApiKeys()) {
      this.logMessage("Please configure API keys first", "error");
      return;
    }

    this.isGenerating = true;
    this.isPaused = false;

    try {
      await this.generateDialog();
    } catch (error) {
      this.logMessage(`Error generating dialog: ${error.message}`, "error");
    } finally {
      this.isGenerating = false;
    }
  }

  async continueDialog() {
    if (!this.dialogStarted) {
      this.logMessage("No dialog to continue", "warning");
      return;
    }

    this.isGenerating = true;

    try {
      await this.generateDialog();
    } catch (error) {
      this.logMessage(`Error continuing dialog: ${error.message}`, "error");
    } finally {
      this.isGenerating = false;
    }
  }

  getLastBotMessage() {
    const messages = document.querySelectorAll(".message-bot1, .message-bot2");
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      return lastMessage.querySelector(".message-content").textContent;
    }

    // Если нет сообщений от ботов, используем initial prompt
    const userMessages = document.querySelectorAll(".message-user");
    if (userMessages.length > 0) {
      const lastUserMessage = userMessages[userMessages.length - 1];
      return lastUserMessage.querySelector(".message-content").textContent;
    }

    return "";
  }

  async generateDialog() {
    let currentPrompt = this.getLastBotMessage();
    let currentBot = this.getCurrentBot();

    // Генерируем именно messageLimit сообщений в каждой пачке
    while (this.currentBatchCount < this.messageLimit && !this.isPaused) {
      try {
        // Показываем индикатор "Thinking..."
        this.showThinkingIndicator(currentBot);

        const botConfig = this.getBotConfig(currentBot);
        const response = await this.callAPI(
          botConfig.systemPrompt,
          currentPrompt,
          currentBot
        );

        // Убираем индикатор "Thinking..." и добавляем реальное сообщение
        this.removeThinkingIndicator();
        this.addMessageToDialog(`bot${currentBot}`, response);
        this.currentBatchCount++;

        // Switch to next bot
        currentBot = currentBot === 1 ? 2 : 1;
        currentPrompt = response;

        // Add delay between messages
        await this.delay(1000);
      } catch (error) {
        this.removeThinkingIndicator();
        this.logMessage(
          `Error from bot ${currentBot}: ${error.message}`,
          "error"
        );
        break;
      }
    }

    if (this.currentBatchCount >= this.messageLimit) {
      this.logMessage(
        `Generated ${this.currentBatchCount} messages. Click Send to generate more.`,
        "success"
      );
    }
  }

  setupFullscreenMenu() {
    const fullscreenBtn = document.querySelector(".fullscreen");
    const fullscreenDialogue = document.getElementById("fullscreen-dialogue");
    const menu = document.getElementById("fullscreen-menu");
    const triggerZone = document.querySelector(".bottom-trigger-zone");

    let isInTriggerZone = false;
    let isInMenu = false;

    if (!fullscreenBtn || !fullscreenDialogue || !menu || !triggerZone) return;

    fullscreenBtn.addEventListener("click", () => {
      fullscreenDialogue.classList.add("active");

      if (!this.vantaEffect) {
        this.initVantaBackground();
      }
    });

    // Закрытие fullscreen
    document.getElementById("menu-exit")?.addEventListener("click", () => {
      fullscreenDialogue.classList.remove("active");

      if (this.vantaEffect) {
        this.vantaEffect.destroy();
        this.vantaEffect = null;
      }
    });

    // Остальная логика меню при наведении
    triggerZone.addEventListener("mouseenter", () => {
      isInTriggerZone = true;
      menu.classList.add("visible");
    });

    triggerZone.addEventListener("mouseleave", () => {
      isInTriggerZone = false;
      setTimeout(() => {
        if (!isInMenu) {
          menu.classList.remove("visible");
        }
      }, 200);
    });

    menu.addEventListener("mouseenter", () => {
      isInMenu = true;
    });

    menu.addEventListener("mouseleave", () => {
      isInMenu = false;
      setTimeout(() => {
        if (!isInTriggerZone) {
          menu.classList.remove("visible");
        }
      }, 200);
    });

    document.addEventListener("click", (e) => {
      const isOutside =
        !menu.contains(e.target) &&
        !triggerZone.contains(e.target) &&
        !fullscreenBtn.contains(e.target);
      if (isOutside) {
        menu.classList.remove("visible");
      }
    });
  }

  toggleReplay() {
    this.isReplaying = !this.isReplaying;

    const playBtn = document.getElementById("menu-play");
    const playIcon = '<img src="static/image/play.png" alt="Play">';
    const pauseIcon = '<img src="static/image/pause.png" alt="Pause">';
    playBtn.innerHTML = this.isReplaying ? pauseIcon : playIcon;

    if (this.isReplaying) {
      this.replayMessages();
    } else {
      clearTimeout(this.timeoutId);
    }
  }

  replayMessages() {
    if (this.isReplaying || this.generatedMessages.length === 0) return;

    this.isReplaying = true;
    this.replayPaused = false;
    this.currentIndex = 0;

    const container = document.getElementById("fullscreen-messages");
    container.innerHTML = "";

    const showNextMessage = () => {
      if (
        this.replayPaused ||
        this.currentIndex >= this.generatedMessages.length
      ) {
        this.isReplaying = false;
        return;
      }

      const msg = this.generatedMessages[this.currentIndex];

      container.innerHTML += `<div class="message"><b>${msg.user}:</b> ${msg.message}</div>`;
      container.scrollTop = container.scrollHeight;

      this.currentIndex++;
      this.timeoutId = setTimeout(showNextMessage, this.delayMs);
    };

    showNextMessage();
  }

  getCurrentBot() {
    // Определяем какой бот должен отвечать следующим на основе количества сообщений
    const botMessages = document.querySelectorAll(
      ".message-bot1, .message-bot2"
    );
    if (botMessages.length === 0) return 1;

    const lastBotMessage = botMessages[botMessages.length - 1];
    if (lastBotMessage.classList.contains("message-bot1")) {
      return 2;
    } else {
      return 1;
    }
  }

  getBotConfig(botNumber) {
    const selector =
      botNumber === 1
        ? ".bot-profile:first-child textarea, .mobile-bot-card:first-child textarea"
        : ".bot-profile:last-child textarea, .mobile-bot-card:last-child textarea";
    const textarea = document.querySelector(selector);
    return {
      systemPrompt: textarea?.value || "You are a nothing.",
      temperature: this.temperatures[`bot${botNumber}`],
    };
  }

  getBotName(botNumber) {
    const selector =
      botNumber === 1
        ? ".bot-profile:first-child select, .mobile-bot-card:first-child select"
        : ".bot-profile:last-child select, .mobile-bot-card:last-child select";
    const select = document.querySelector(selector);
    return select?.value || `Bot${botNumber}`;
  }

  async callAPI(systemPrompt, userPrompt, botNumber) {
    const temperature = this.temperatures[`bot${botNumber}`];

    switch (this.selectedModel) {
      case "TogetherAI":
        return await this.callTogetherAI(systemPrompt, userPrompt, temperature);
      case "GPT-4":
        return await this.callOpenAI(systemPrompt, userPrompt, temperature);
      case "Gemini":
        return await this.callGoogle(systemPrompt, userPrompt, temperature);
      default:
        throw new Error("Unknown model selected");
    }
  }

  async callOpenAI(systemPrompt, userPrompt, temperature) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKeys.openai}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: temperature,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async callTogetherAI(systemPrompt, userPrompt, temperature) {
    const response = await fetch("/api/together", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemPrompt,
        userPrompt,
        temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`Proxy TogetherAI API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Invalid response from TogetherAI proxy");
    }

    return data.choices[0].message.content;
  }

  async callGoogle(systemPrompt, userPrompt, temperature) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKeys.google}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${systemPrompt}\n\nUser: ${userPrompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: temperature,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Google AI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  showThinkingIndicator(botNumber) {
    const dialogArea =
      document.querySelector(".dialog-section") ||
      document.querySelector(".mobile-chat-section");
    if (!dialogArea) return;

    // Удаляем предыдущий индикатор, если он есть
    this.removeThinkingIndicator();

    const thinkingDiv = document.createElement("div");
    thinkingDiv.className = `message message-bot${botNumber} thinking-indicator`;
    thinkingDiv.id = "thinking-indicator";

    const botName = this.getBotName(botNumber);
    const timeStamp = new Date().toLocaleTimeString();
    let headerContent = "";

    if (botNumber === 1) {
      headerContent = `<strong>${botName}</strong><span class="message-time">${timeStamp}</span>`;
    } else {
      headerContent = `<span class="message-time">${timeStamp}</span><strong>${botName}</strong>`;
    }

    thinkingDiv.innerHTML = `
            <div class="message-header">
                ${headerContent}
            </div>
            <div class="message-content thinking-content">
                <span class="thinking-text">Thinking</span>
                <span class="thinking-dots">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                </span>
            </div>
        `;

    dialogArea.appendChild(thinkingDiv);
    dialogArea.scrollTop = dialogArea.scrollHeight;
  }

  removeThinkingIndicator() {
    const thinkingIndicator = document.getElementById("thinking-indicator");
    if (thinkingIndicator) {
      thinkingIndicator.remove();
    }
  }

  addMessageToDialog(sender, message) {
    const dialogArea =
      document.querySelector(".dialog-section") ||
      document.querySelector(".mobile-chat-section");
    if (!dialogArea) return;

    const messageDiv = document.createElement("div");
    messageDiv.className = `message message-${sender}`;

    let senderLabel = "";
    let timeStamp = new Date().toLocaleTimeString();
    let headerContent = "";

    if (sender === "user") {
      senderLabel = "Initial Prompt";
      headerContent = `<strong>${senderLabel}</strong><span class="message-time">${timeStamp}</span>`;
    } else if (sender === "bot1") {
      senderLabel = this.getBotName(1);
      headerContent = `<strong>${senderLabel}</strong><span class="message-time">${timeStamp}</span>`;
    } else if (sender === "bot2") {
      senderLabel = this.getBotName(2);
      headerContent = `<span class="message-time">${timeStamp}</span><strong>${senderLabel}</strong>`;
    }

    messageDiv.innerHTML = `
            <div class="message-header">
                ${headerContent}
            </div>
            <div class="message-content">${message}</div>
        `;

    dialogArea.appendChild(messageDiv);
    this.generatedMessages.push({ sender, message }); // Сохраняем для повтора
    dialogArea.scrollTop = dialogArea.scrollHeight;
  }

  getInitialPrompt() {
    const textarea =
      document.querySelector('textarea[placeholder*="initial prompt"]') ||
      document.querySelector(".mobile-input-textarea");
    return textarea?.value || "";
  }

  validateApiKeys() {
    switch (this.selectedModel) {
      case "TogetherAI":
        return true;
      case "GPT-4":
        return this.apiKeys.openai.length > 0;
      case "Gemini":
        return this.apiKeys.google.length > 0;
      default:
        return false;
    }
  }

  togglePause() {
    if (!this.isGenerating && !this.dialogStarted) {
      this.logMessage("No active dialog to pause/resume", "warning");
      return;
    }

    this.isPaused = !this.isPaused;
    this.updatePauseButtons();

    if (this.isPaused) {
      // Remove thinking indicator when pausing
      this.removeThinkingIndicator();
      this.logMessage("Dialog paused", "info");
    } else {
      this.logMessage("Dialog resumed", "info");
      if (this.dialogStarted && this.currentBatchCount < this.messageLimit) {
        this.continueDialog();
      }
    }
  }

  updatePauseButtons() {
    const pauseButtons = document.querySelectorAll(".pause");
    pauseButtons.forEach((btn) => {
      btn.textContent = this.isPaused ? "▶️ Resume" : "⏸️ Pause";
    });
  }

  clearDialog() {
    this.clearDialogArea();
    this.clearLogs();
    this.isGenerating = false;
    this.isPaused = false;
    this.currentBatchCount = 0;
    this.dialogStarted = false;

    // Remove thinking indicator if present
    this.removeThinkingIndicator();

    // Clear input
    const textareas = document.querySelectorAll(
      'textarea[placeholder*="initial prompt"], .mobile-input-textarea'
    );
    textareas.forEach((textarea) => (textarea.value = ""));

    // Reset pause buttons
    this.updatePauseButtons();

    this.logMessage("Chat cleared successfully", "success");
  }

  clearDialogArea() {
    const dialogAreas = document.querySelectorAll(
      ".dialog-section, .mobile-chat-section"
    );
    dialogAreas.forEach((area) => {
      // Keep header, remove messages
      const messages = area.querySelectorAll(".message");
      messages.forEach((msg) => msg.remove());
    });
  }

  clearLogs() {
    const logAreas = document.querySelectorAll(
      ".logs-section, .mobile-logs-section"
    );
    logAreas.forEach((logArea) => {
      logArea.innerHTML = "";
    });
  }

  resetCounters() {
    this.currentBatchCount = 0;
    this.logMessage("Message counters have been reset", "info");
  }

  logMessage(message, type = "info") {
    const logAreas = document.querySelectorAll(
      ".logs-section, .mobile-logs-section"
    );
    logAreas.forEach((logArea) => {
      // Clear example text on first real log
      if (logArea.textContent.includes("Chat history cleared")) {
        logArea.innerHTML = "";
      }

      const logDiv = document.createElement("div");
      logDiv.className = `log-message log-${type}`;
      logDiv.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
      logArea.appendChild(logDiv);

      // Keep only last 50 messages
      const messages = logArea.querySelectorAll(".log-message");
      if (messages.length > 50) {
        messages[0].remove();
      }
    });
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
    margin: 0 auto; /* Центрирование по горизонтали */
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

// Кнопка Save Keys
.api-keys-form button {
    background: linear-gradient(135deg, #3c3c3c, #5a5a5a);
    border: 1px solid #777;
    border-radius: 6px;
    padding: 8px 14px;
    color: #fff;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: background 0.3s, border-color 0.3s, transform 0.1s;
}

.api-keys-form button:hover {
    background: linear-gradient(135deg,rgb(15, 103, 0),rgb(0, 131, 11));
    border-color: #aaa;
    color: #fff;
    transform: translateY(-1px);
}

.api-keys-form button:active {
    background: #333;
    transform: translateY(1px);
}

.creativity-controls .slider-group {
    margin-bottom: 15px;
}

.creativity-controls input[type="range"] {
    width: 100%;
    margin-top: 5px;
}

.thinking-indicator {
    opacity: 0.8;
}

.thinking-content {
    display: flex;
    align-items: center;
    font-style: italic;
    color: #888;
}

.thinking-text {
    margin-right: 4px;
}

.thinking-dots {
    display: inline-flex;
}

.thinking-dots span {
    animation: thinking 1.4s infinite;
    animation-fill-mode: both;
}

.thinking-dots span:nth-child(1) {
    animation-delay: 0s;
}

.thinking-dots span:nth-child(2) {
    animation-delay: 0.2s;
}

.thinking-dots span:nth-child(3) {
    animation-delay: 0.4s;
}

@keyframes thinking {
    0%, 80%, 100% {
        opacity: 0.3;
        transform: scale(1);
    }
    40% {
        opacity: 1;
        transform: scale(1.2);
    }
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
const style = document.createElement("style");
style.textContent = additionalCSS;
document.head.appendChild(style);
