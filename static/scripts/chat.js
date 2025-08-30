class BotDialogGenerator {
  constructor() {
    this.isGenerating = false;
    this.isPaused = false;
    this.messageLimit = 20;
    this.users = [];
    this.currentBatchCount = 0; // Количество сообщений в текущей пачке генерации
    this.generatedMessages = []; // Сгенерированные сообщения
    this.delayMs = 1000; // Задержка между воспроизведением сообщений
    this.thinkingDelayMs = 500; // Задержка перед показом "Thinking..."
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
    // Default to OpenRouter with a service key unless user saved another choice
    this.selectedModel = "OpenRouter";
    const stored = localStorage.getItem("useServiceKey");
    this.useServiceKey = stored === null ? true : stored === "true";

    this.init();
  }

  async init() {
    await this.loadUsers();
    this.setupEventListeners();
    this.setupAccordions();
    this.loadApiKeys();
    this.loadSelectedModel();
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
        this.messageLimit = parseInt(e.target.value) || 20;
      });
    });

    // Refresh button
    document.querySelectorAll(".refresh-btn").forEach((btn) => {
      btn.addEventListener("click", () => this.resetCounters());
    });

    // Fullscreen clear button
    document.getElementById("menu-clear")?.addEventListener("click", () => {
      clearTimeout(this.timeoutId);
      this.isReplaying = false;
      this.replayPaused = false;
      this.currentIndex = 0;
      const container = document.getElementById("fullscreen-messages");
      container.innerHTML = "";
      const playBtn = document.getElementById("menu-play");
      playBtn.innerHTML = '<img src="static/image/play.png" alt="Play">';
      this.logMessage("Fullscreen dialog cleared", "success");
    });

    // Fullscreen delay slider
    document.getElementById("delay-range")?.addEventListener("input", (e) => {
      this.delayMs = parseInt(e.target.value, 10);
      this.logMessage(`Delay set to ${this.delayMs} ms`, "info");
    });

    // Fullscreen thinking delay slider
    document
      .getElementById("thinking-delay-range")
      ?.addEventListener("input", (e) => {
        this.thinkingDelayMs = parseInt(e.target.value, 10);
        this.logMessage(
          `Thinking delay set to ${this.thinkingDelayMs} ms`,
          "info"
        );
      });

    // Model selection
    document.querySelectorAll("select").forEach((select) => {
      if (
        select.closest(".control-group") &&
        select.previousElementSibling?.textContent.includes("model")
      ) {
        select.addEventListener("change", (e) => {
          this.selectedModel = e.target.value;
          localStorage.setItem("selectedModel", this.selectedModel);
          document
            .querySelectorAll(
              ".control-group select, .mobile-control-group select"
            )
            .forEach((s) => (s.value = this.selectedModel));
          this.updateModelInfo();
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
      btn.addEventListener("click", () => {
        const select = btn.nextElementSibling;
        const user = select.value;
        if (!user) return;
        this.showDeleteConfirmation(user);
      });
    });
  }

  showDeleteConfirmation(user) {
    const overlay = document.getElementById("confirm-overlay");
    const message = document.getElementById("confirm-message");
    const okBtn = document.getElementById("confirm-ok");
    const cancelBtn = document.getElementById("confirm-cancel");

    message.textContent = `Delete ${user}?`;
    overlay.classList.add("active");

    const onCancel = () => {
      overlay.classList.remove("active");
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
    };

    const onOk = async () => {
      overlay.classList.remove("active");
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      await this.deleteUser(user);
    };

    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
  }

  async deleteUser(user) {
    try {
      const res = await fetch("/api/supabase", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user }),
      });

      if (res.ok) {
        this.users = this.users.filter((u) => u.Full_Name !== user);
        this.populateUserDropdowns();
        this.logMessage(`${user} deleted successfully`, "success");
      } else {
        const err = await res.json();
        this.logMessage(`Error deleting ${user}: ${err.error}`, "error");
      }
    } catch (err) {
      this.logMessage(`Network error: ${err.message}`, "error");
    }
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

    if (!content) return;

    const isOpen = content.classList.toggle("open");

    if (arrow) {
      arrow.style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)";
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
                        <label>Open AI:</label>
                        <input type="password" class="openai-key" placeholder="...">
                        <button class="clear-key" data-key="openai">
                            <img src="static/image/clear.png" alt="Delete">
                        </button>
                        <button class="toggle-key" data-target="openai">👁️</button>
                    </div>
                    <div class="input-group">
                        <label>OpenRouter:</label>
                        <input type="password" class="openrouter-key" placeholder="...">
                        <button class="clear-key" data-key="openrouter">
                            <img src="static/image/clear.png" alt="Delete">
                        </button>
                        <button class="toggle-key" data-target="openrouter">👁️</button>
                    </div>
                    <div class="input-group">
                        <label>Gemini AI:</label>
                        <input type="password" class="google-key" placeholder="...">
                        <button class="clear-key" data-key="google">
                            <img src="static/image/clear.png" alt="Delete">
                        </button>
                        <button class="toggle-key" data-target="google">👁️</button>
                    </div>
                    <button class="save-keys">Save Keys</button>
                    <button class="use-service-key">Use Service Key</button>
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

      // Кнопка сохранения ключей
      content.querySelector(".save-keys")?.addEventListener("click", () => {
        this.saveApiKeys();
      });

      content
        .querySelector(".use-service-key")
        ?.addEventListener("click", () => {
          this.useServiceKey = true;
          localStorage.setItem("useServiceKey", "true");
          this.logMessage("Using service OpenRouter key", "info");
          this.updateModelInfo();
        });

      // Кнопки очистки ключей
      content.querySelectorAll(".clear-key").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.clearApiKey(btn.dataset.key);
        });
      });

      // Кнопки просмотра ключей
      content.querySelectorAll(".toggle-key").forEach((btn) => {
        btn.addEventListener("click", () => {
          const target = btn.dataset.target;
          const input = content.querySelector(`.${target}-key`);
          if (input) {
            input.type = input.type === "password" ? "text" : "password";
          }
        });
      });

      // Контент скрыт по умолчанию
      content.classList.remove("open");
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

    // Sync the corresponding dropdown in the other layout
    const firstDesktop = document.querySelector(
      ".bot-profile:first-child select"
    );
    const firstMobile = document.querySelector(
      ".mobile-bot-card:first-child select"
    );
    const secondDesktop = document.querySelector(
      ".bot-profile:last-child select"
    );
    const secondMobile = document.querySelector(
      ".mobile-bot-card:last-child select"
    );

    if (
      selectElement === firstDesktop ||
      selectElement === firstMobile
    ) {
      if (firstDesktop && firstDesktop !== selectElement)
        firstDesktop.value = selectElement.value;
      if (firstMobile && firstMobile !== selectElement)
        firstMobile.value = selectElement.value;
    } else if (
      selectElement === secondDesktop ||
      selectElement === secondMobile
    ) {
      if (secondDesktop && secondDesktop !== selectElement)
        secondDesktop.value = selectElement.value;
      if (secondMobile && secondMobile !== selectElement)
        secondMobile.value = selectElement.value;
    }
  }

  saveApiKeys() {
    this.apiKeys.openai =
      document.querySelector(".openai-key")?.value.trim() || "";
    this.apiKeys.openrouter =
      document.querySelector(".openrouter-key")?.value.trim() || "";
    this.apiKeys.google =
      document.querySelector(".google-key")?.value.trim() || "";

    this.useServiceKey = false;
    localStorage.setItem("useServiceKey", "false");

    localStorage.setItem("openaiKey", this.apiKeys.openai);
    localStorage.setItem("openrouterKey", this.apiKeys.openrouter);
    localStorage.setItem("googleKey", this.apiKeys.google);

    this.logMessage("API keys saved successfully", "success");
    this.loadApiKeys();
    this.updateModelInfo();
  }

  loadApiKeys() {
    const openai = localStorage.getItem("openaiKey") || "";
    const openrouter = localStorage.getItem("openrouterKey") || "";
    const google = localStorage.getItem("googleKey") || "";
    const stored = localStorage.getItem("useServiceKey");
    this.useServiceKey = stored === null ? true : stored === "true";

    if (openai) {
      this.apiKeys.openai = openai;
      const input = document.querySelector(".openai-key");
      if (input) input.value = openai;
    }
    if (openrouter) {
      this.apiKeys.openrouter = openrouter;
      const input = document.querySelector(".openrouter-key");
      if (input) input.value = openrouter;
    }
    if (google) {
      this.apiKeys.google = google;
      const input = document.querySelector(".google-key");
      if (input) input.value = google;
    }
    this.updateModelInfo();
  }

  loadSelectedModel() {
    const saved = localStorage.getItem("selectedModel");
    if (saved) {
      this.selectedModel = saved;
    }
    document
      .querySelectorAll(".control-group select, .mobile-control-group select")
      .forEach((s) => {
        if (this.selectedModel) {
          s.value = this.selectedModel;
        }
      });
    this.updateModelInfo();
  }

  clearApiKey(type) {
    if (!type) return;
    this.apiKeys[type] = "";
    localStorage.removeItem(`${type}Key`);
    const input = document.querySelector(`.${type}-key`);
    if (input) input.value = "";
    this.logMessage(`${type} API key removed`, "info");
    this.updateModelInfo();
  }

  updateApiKeysFromInputs() {
    const o = document.querySelector(".openai-key");
    if (o) this.apiKeys.openai = o.value.trim();
    const r = document.querySelector(".openrouter-key");
    if (r) this.apiKeys.openrouter = r.value.trim();
    const g = document.querySelector(".google-key");
    if (g) this.apiKeys.google = g.value.trim();
  }

  async startDialog() {
    this.updateApiKeysFromInputs();
    this.updateModelInfo();
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
        this.logMessage("Please select the model and configure the API key or select the OpenRouter model and use the Service Key in the API KEYS menu", "error");
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
      this.logMessage("Please select the model and configure the API key or select the OpenRouter model and use the Service Key in the API KEYS menu", "error");
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
        // Небольшая задержка перед показом "Thinking..."
        await this.delay(this.thinkingDelayMs);
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
    triggerZone.addEventListener("pointerenter", () => {
      isInTriggerZone = true;
      menu.classList.add("visible");
    });

    triggerZone.addEventListener("pointerleave", () => {
      isInTriggerZone = false;
      setTimeout(() => {
        if (!isInMenu) {
          menu.classList.remove("visible");
        }
      }, 200);
    });

    menu.addEventListener("pointerenter", () => {
      isInMenu = true;
    });

    menu.addEventListener("pointerleave", () => {
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

    const hideMenu = () => {
      isInTriggerZone = false;
      isInMenu = false;
      menu.classList.remove("visible");
    };

    window.addEventListener("blur", hideMenu);
    document.addEventListener("mouseleave", hideMenu);
    document.addEventListener("pointerleave", hideMenu);
  }

  toggleReplay() {
    const playBtn = document.getElementById("menu-play");
    const playIcon = '<img src="static/image/play.png" alt="Play">';
    const pauseIcon = '<img src="static/image/pause.png" alt="Pause">';

    if (this.isReplaying) {
      // Pause replay
      this.replayPaused = true;
      this.isReplaying = false;
      playBtn.innerHTML = playIcon;
      clearTimeout(this.timeoutId);
    } else {
      if (this.generatedMessages.length === 0) {
        this.logMessage("No messages to replay", "warning");
        return;
      }
      // Start/restart replay
      this.replayPaused = false;
      this.isReplaying = true;
      playBtn.innerHTML = pauseIcon;
      this.replayMessages();
    }
  }

  async replayMessages() {
    if (this.generatedMessages.length === 0) {
      this.logMessage("No messages to replay", "warning");
      return;
    }

    if (!this.isReplaying) {
      this.currentIndex = 0;
      document.getElementById("fullscreen-messages").innerHTML = "";
    }

    this.isReplaying = true;
    this.replayPaused = false;

    const container = document.getElementById("fullscreen-messages");

    const delay = (ms) => new Promise((res) => setTimeout(res, ms));

    const thinkingWords = [
      "Initiating",
      "Estimating",
      "Analyzing",
      "Observing",
      "Responding",
      "Recalling",
      "Simulating",
      "Reconfiguring",
      "Thinking",
    ];

    const showNextMessage = async () => {
      if (
        this.replayPaused ||
        this.currentIndex >= this.generatedMessages.length
      ) {
        this.isReplaying = false;

        // Обновляем иконку на Play после завершения
        const playBtn = document.getElementById("menu-play");
        if (playBtn) {
          playBtn.innerHTML = '<img src="static/image/play.png" alt="Play">';
        }

        return;
      }

      const msg = this.generatedMessages[this.currentIndex];
      const sender = msg.sender;
      const name = msg.name || sender;
      const timeStamp = new Date().toLocaleTimeString();

      const messageDiv = document.createElement("div");

      // Initial prompt — по центру
      if (sender === "user") {
        messageDiv.className = "fullscreen-message bubble center";
        messageDiv.innerHTML = `
      <div class="bubble-text">
        <b>Initial Prompt:</b> ${msg.message}
      </div>
    `;
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;

        this.currentIndex++;
        await delay(this.delayMs);
        if (!this.replayPaused) {
          showNextMessage();
        }
        return;
      }

      // Небольшая задержка перед отображением Thinking
      await delay(this.thinkingDelayMs);
      if (this.replayPaused) {
        return;
      }

      // Показываем Thinking...
      const isLeft = sender === "bot1";
      const thinkingWord =
        thinkingWords[Math.floor(Math.random() * thinkingWords.length)];
      const thinkingDiv = document.createElement("div");
      thinkingDiv.className = `fullscreen-message bubble ${
        isLeft ? "left" : "right"
      } thinking-indicator`;
      thinkingDiv.innerHTML = `
    <div class="bubble-text thinking-content">
      <span class="thinking-text">${thinkingWord}</span>
      <span class="thinking-dots">
        <span>.</span><span>.</span><span>.</span>
      </span>
    </div>
  `;
      container.appendChild(thinkingDiv);
      container.scrollTop = container.scrollHeight;

      // Задержка отображения Thinking
      await delay(this.delayMs);
      if (this.replayPaused) {
        container.removeChild(thinkingDiv);
        return;
      }
      container.removeChild(thinkingDiv);

      // Сообщение
      messageDiv.className = `fullscreen-message bubble ${
        isLeft ? "left" : "right"
      }`;
      messageDiv.innerHTML = `
    <div class="bubble-text">
      <div class="fullscreen-message-header">
        ${
          isLeft
            ? `<strong>${name}</strong><span class="message-time">${timeStamp}</span>`
            : `<span class="message-time">${timeStamp}</span><strong>${name}</strong>`
        }
      </div>
      ${msg.message}
    </div>
  `;
      container.appendChild(messageDiv);
      container.scrollTop = container.scrollHeight;

      this.currentIndex++;
      if (!this.replayPaused) {
        showNextMessage();
      }
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
    // Prefer the value from the mobile dropdown if it exists
    const mobileSelect = document.querySelector(
      `.mobile-bot-card:nth-child(${botNumber}) select`
    );
    const desktopSelect = document.querySelector(
      `.bot-profile:nth-child(${botNumber}) select`
    );

    const name = mobileSelect?.value || desktopSelect?.value;
    return name || `Bot${botNumber}`;
  }

  async callAPI(systemPrompt, userPrompt, botNumber) {
    const temperature = this.temperatures[`bot${botNumber}`];

    switch (this.selectedModel) {
      case "OpenRouter":
        return await this.callOpenRouter(systemPrompt, userPrompt, temperature);
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
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: temperature,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const msg = this.getFriendlyErrorMessage(response.status);
      throw new Error(msg);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async callOpenRouter(systemPrompt, userPrompt, temperature) {
    if (!this.useServiceKey && !this.apiKeys.openrouter) {
      this.logMessage("Please provide an API key or use a Service Key in the API KEYS menu", "error");
      throw new Error("Missing OpenRouter API key");
    }
    const providers = [
      { provider: "QWEN3", name: "Qwen3" },
      { provider: "META_LLAMA", name: "Meta Llama" },
    ];

    let lastError = null;

    for (const { provider, name } of providers) {
      try {
        console.log(`🧠 Trying ${name}...`);

        const response = await fetch("/api/openrouter", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemPrompt,
            userPrompt,
            temperature,
            provider,
            mode: "autofill",
            apiKey: this.useServiceKey ? undefined : this.apiKeys.openrouter,
          }),
        });

        if (!response.ok) {
          const friendly = this.getFriendlyErrorMessage(response.status);
          throw new Error(`${name}: ${friendly}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();

        if (!content) {
          throw new Error(`${name} вернул пустой ответ`);
        }

        console.log(`✅ Success with ${name}`);
        return content;
      } catch (err) {
        console.warn(`⚠️ ${name} failed:`, err.message);
        lastError = err;
      }
    }

    throw new Error(
      `❌ Обе модели OpenRouter не ответили: ${lastError.message}`
    );
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
      const msg = this.getFriendlyErrorMessage(response.status);
      throw new Error(msg);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  showThinkingIndicator(botNumber) {
    const dialogAreas = document.querySelectorAll(
      ".dialog-section, .mobile-chat-section"
    );
    if (dialogAreas.length === 0) return;

    // Удаляем предыдущий индикатор, если он есть
    this.removeThinkingIndicator();

    dialogAreas.forEach((dialogArea) => {
      const thinkingDiv = document.createElement("div");
      thinkingDiv.className = `message message-bot${botNumber} thinking-indicator`;

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
    });
  }

  removeThinkingIndicator() {
    document
      .querySelectorAll(".thinking-indicator")
      .forEach((indicator) => indicator.remove());
  }

  addMessageToDialog(sender, message) {
    const dialogAreas = document.querySelectorAll(
      ".dialog-section, .mobile-chat-section"
    );
    if (dialogAreas.length === 0) return;

    const messageHTML = (() => {
      let senderLabel = "";
      const timeStamp = new Date().toLocaleTimeString();
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

      return `
            <div class="message-header">
                ${headerContent}
            </div>
            <div class="message-content">${message}</div>
        `;
    })();

    dialogAreas.forEach((area) => {
      const messageDiv = document.createElement("div");
      messageDiv.className = `message message-${sender}`;
      messageDiv.innerHTML = messageHTML;
      area.appendChild(messageDiv);
      area.scrollTop = area.scrollHeight;
    });
    const name =
      sender === "bot1"
        ? this.getBotName(1)
        : sender === "bot2"
        ? this.getBotName(2)
        : "User";

    this.generatedMessages.push({ sender, message, name });
  }

  getInitialPrompt() {
    // Prioritize the mobile textarea only when it's visible
    const mobileActive = document.querySelector(
      ".mobile-section.active .mobile-input-textarea"
    );
    if (mobileActive && mobileActive.offsetParent !== null) {
      return mobileActive.value || "";
    }

    // Fallback to the desktop textarea
    const desktopTextarea = document.querySelector(
      ".input-wrapper textarea"
    );
    return desktopTextarea?.value || "";
  }

  validateApiKeys() {
    switch (this.selectedModel) {
      case "OpenRouter":
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
      btn.textContent = this.isPaused ? "Resume" : "Pause";
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

    // Reset replay state
    this.generatedMessages = [];
    this.currentIndex = 0;
    this.isReplaying = false;
    this.replayPaused = false;

    // Clear fullscreen messages and reset play icon
    const fsContainer = document.getElementById("fullscreen-messages");
    if (fsContainer) fsContainer.innerHTML = "";
    const playBtn = document.getElementById("menu-play");
    if (playBtn)
      playBtn.innerHTML = '<img src="static/image/play.png" alt="Play">';

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
      ".logs-content, .mobile-logs-content"
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
      ".logs-content, .mobile-logs-content"
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

  getFriendlyErrorMessage(status) {
    const messages = {
      400: "Bad request. Please check the submitted data.",
      401: "Authorization error. Please check your API key.",
      404: "Resource not found. Please check the URL.",
      429: "Too many requests. Please try again later.",
      500: "Server encountered an error. Please try again later.",
    };
    return messages[status] || `Unknown error (${status}). Please try again.`;
  }

  updateModelInfo() {
    const model = this.selectedModel || "none";
    let keyText = "";
    let key = "";

    if (model === "GPT-4") {
      key = this.apiKeys.openai;
    } else if (model === "OpenRouter") {
      if (this.useServiceKey) {
        keyText = "Service Key";
      } else {
        key = this.apiKeys.openrouter;
      }
    } else if (model === "Gemini") {
      key = this.apiKeys.google;
    }

    if (!keyText) {
      const shortKey = key ? `${key.slice(0, 2)}...${key.slice(-3)}` : "no key";
      keyText = `User Key: ${shortKey}`;
    }

    document.querySelectorAll(".model-info").forEach((el) => {
      el.textContent = `${model} | ${keyText}`;
    });
  }
}

// Initialize the bot dialog generator
const botGenerator = new BotDialogGenerator();
