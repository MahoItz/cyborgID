// AI Providers configuration
const AI_PROVIDERS = {
  META_LLAMA: {
    name: "Meta Llama",
    models: {
      autofill: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
      summary: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free"
    }
  },
  QWEN2: {
    name: "Qwen2",
    models: {
      autofill: "Qwen/Qwen2-VL-72B-Instruct",
      summary: "Qwen/Qwen2-VL-72B-Instruct"
    }
  }
};

// DOM Elements
const form = document.getElementById("application-form");
const message = document.getElementById("message");
const autofillBtn = document.getElementById("autofill-btn");
const submitBtn = document.getElementById("submit-btn");

// Variables for shuffle animation
let shuffleInterval = null;
let originalValues = {};

// Helper to generate random letters
function randomLetters(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Helper to generate a random date string in yyyy-MM-dd format
function randomDateString() {
    const year = 1900 + Math.floor(Math.random() * 200); // 1900-2099
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Start showing random letters in all inputs
function startShuffle() {
    const inputs = form.querySelectorAll('input');
    originalValues = {};
    inputs.forEach(input => {
        originalValues[input.id] = input.value;
    });
    shuffleInterval = setInterval(() => {
        inputs.forEach(input => {
            const len = input.type === 'date' ? 10 : 8;
            input.value = input.type === 'date' ? randomDateString() : randomLetters(len);
        });
    }, 100);
}

// Stop shuffle and optionally restore original values
function stopShuffle(restore = true) {
    if (shuffleInterval) {
        clearInterval(shuffleInterval);
        shuffleInterval = null;
    }
    if (restore) {
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => {
            if (originalValues.hasOwnProperty(input.id)) {
                input.value = originalValues[input.id];
            }
        });
        originalValues = {};
    }
}

// Utility Functions
function showMessage(text, type = 'info') {
    message.textContent = text;
    message.className = `message-${type}`;
}

function setButtonState(button, disabled, text) {
    button.disabled = disabled;
    button.textContent = text;
}

function validateForm(formData) {
    const errors = [];

    if (!formData.get("system_name")?.trim()) errors.push("System Name is required");
    if (!formData.get("real_name")?.trim()) errors.push("Real Name is required");
    if (!formData.get("system_position")?.trim()) errors.push("System Position is required");
    if (!formData.get("self_defined_role")?.trim()) errors.push("Self-Defined Role is required");
    if (!formData.get("system_place_of_birth")?.trim()) errors.push("System Place Of Birth is required");
    if (!formData.get("place_of_becoming")) errors.push("Place Of Becoming is required");
    if (!formData.get("system_date_of_birth")) errors.push("System Date Of Birth is required");
    if (!formData.get("system_gender")) errors.push("System Gender is required");
    if (!formData.get("time_of_awakening")?.trim()) errors.push("Time Of Awakening is required");
    if (!formData.get("fluid_zone")?.trim()) errors.push("Fluid Zone is required");
    if (!formData.get("current_location")?.trim()) errors.push("Current Location is required");
    if (!formData.get("inner_coordinates")?.trim()) errors.push("Inner Coordinates is required");

    return errors;
}

// Navigation
function goBack() {
    if (confirm("Are you sure you want to go back? Any unsaved changes will be lost.")) {
        window.location.href = 'index.html';
    }
}

// Function to get user-friendly error messages
function getUserFriendlyError(providerName, status, statusText, errorBody = '') {
    const errorMappings = {
        400: `Invalid request to ${providerName}. Please check your settings.`,
        401: `Invalid API key for ${providerName}. The key is missing or incorrect.`,
        402: `Insufficient funds on ${providerName} account. Please top up your balance.`,
        403: `Access to ${providerName} is forbidden. Check your access permissions.`,
        404: `${providerName} service unavailable or model not found.`,
        429: `Request limit to ${providerName} exceeded. Please try again later.`,
        500: `Internal server error on ${providerName}. Please try again later.`,
        502: `${providerName} is temporarily unavailable (Bad Gateway).`,
        503: `${providerName} is overloaded or under maintenance.`,
        504: `Timeout waiting for a response from ${providerName}.`
    };

    // Try to get a user-friendly message
    const friendlyMessage = errorMappings[status];
    
    if (friendlyMessage) {
        return friendlyMessage;
    }

    // For unknown errors, provide a generic message
    if (status >= 400 && status < 500) {
        return `Client error when accessing ${providerName} (код ${status}). Check your settings.`;
    } else if (status >= 500) {
        return `Server error ${providerName} (код ${status}). Try again later.`;
    }

    return `Unknown error ${providerName}: ${status} ${statusText}`;
}

// Generic AI API call function with fallback
async function callAIWithFallback(prompt, systemPrompt, taskType = 'autofill') {
  const providers = [
    {
      config: AI_PROVIDERS.META_LLAMA,
      providerKey: "META_LLAMA",
    },
    {
      config: AI_PROVIDERS.QWEN2,
      providerKey: "QWEN2",
    }
  ];

  let lastError = null;
  let userFriendlyErrors = [];

  for (let i = 0; i < providers.length; i++) {
    const { config, providerKey } = providers[i];

    try {
      console.log(`Attempting ${config.name} for ${taskType}...`);

      const requestBody = {
        systemPrompt: systemPrompt,
        userPrompt: prompt,
        temperature: taskType === 'autofill' ? 0.7 : 0.4,
        provider: providerKey,
        mode: taskType,
      };

      const response = await fetch("/api/together", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        const userFriendlyMessage = getUserFriendlyError(
          config.name,
          response.status,
          response.statusText,
          errorBody
        );
        throw new Error(userFriendlyMessage);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();

      if (!content) {
        throw new Error(`${config.name} вернул пустой ответ. Попробуйте еще раз.`);
      }

      console.log(`✅ Success with ${config.name}`);
      return { content, provider: config.name };

    } catch (error) {
      console.error(`❌ ${config.name} failed:`, error.message);
      lastError = error;
      userFriendlyErrors.push(`${config.name}: ${error.message}`);

      if (i < providers.length - 1) {
        const nextProvider = providers[i + 1].config.name;
        showMessage(`${error.message} Switching to ${nextProvider}...`, 'info');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

    // If we get here, all providers failed
    const combinedErrors = userFriendlyErrors.join('\n\n');
    throw new Error(`All AI services are unavailable:\n\n${combinedErrors}\n\nPlease try again later or contact the administrator.`);
}

// AI Auto-fill functionality with fallback
async function autoFillForm() {
    setButtonState(autofillBtn, true, "Generating...");
    showMessage("AI is generating sample data for the form...", 'info');
    startShuffle();

    try {
        const systemPrompt = "You are a helpful assistant that generates realistic and unique sample data for application forms. Each time, generate a completely new and different fictional person with a unique background.";
        
        const userPrompt = `Fill in these fields of the questionnaire as a completely unique fictional person. Return ONLY a JSON object with these exact keys:
{
    "system_name": "full name as it would appear in official documents",
    "real_name": "the name the character chooses for themselves — could be a pseudonym, sound, word, or identity",
    "system_position": "how the system defines their role — artistic or professional (e.g., 'UX researcher', 'Sound artist')",
    "self_defined_role": "how they define themselves — informal, poetic, symbolic, or metaphorical (e.g., 'Digital prophet')",
    "system_place_of_birth": "place of birth as it appears in documents — city and country",
    "place_of_becoming": "the place, context, or metaphor where they truly began to become themselves",
    "system_date_of_birth": "date of birth from official records — YYYY-MM-DD format, between 1980 and 2005",
    "time_of_awakening": "moment of symbolic awakening — can be a date, memory, state, phrase, or age",
    "system_gender": "gender identity as recorded in documents (Male/Female)",
    "fluid_zone": "how the character experiences themselves in body and society — may be abstract, metaphorical, or sensory",
    "current_location": "where the character is currently located — city and country",
    "inner_coordinates": "current emotional, creative, or psychic state — poetic or metaphorical"
}`;

        const result = await callAIWithFallback(userPrompt, systemPrompt, 'autofill');
        const content = result.content;

        // Extract JSON from response
        let jsonData;
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("No JSON found in AI response");
            }
        } catch (parseError) {
            throw new Error("Failed to parse AI response as JSON");
        }

        // Fill form with AI data
        Object.keys(jsonData).forEach(key => {
            const element = document.getElementById(key);
            if (element && jsonData[key]) {
                element.value = jsonData[key].toString();
            }
        });

        stopShuffle(false);
        showMessage(`✅ Form auto-filled successfully using ${result.provider}! You can modify any fields before submitting.`, 'success');
        console.log("AI generated data:", jsonData);

    } catch (error) {
        console.error('Auto-fill error:', error);
        showMessage(`❌ Auto-fill error: ${error.message}`, 'error');
        stopShuffle(true);
    } finally {
        setButtonState(autofillBtn, false, "Auto-fill with AI");
    }
}

// AI Summary generation with fallback
async function generateSummary(formData) {
    const userText = `
Candidate Profile:
- System Name: ${formData.get("system_name")}
- Real Name: ${formData.get("real_name")}
- System Position: ${formData.get("system_position")}
- Self-Defined Role: ${formData.get("self_defined_role")}
- System Place Of Birth: ${formData.get("system_place_of_birth")}
- Place Of Becoming: ${formData.get("place_of_becoming")}
- System Date Of Birth: ${formData.get("system_date_of_birth")}
- System Gender: ${formData.get("system_gender")}
- Time Of Awakening: ${formData.get("time_of_awakening")}
- Fluid Zone: ${formData.get("fluid_zone")}
- Current Location: ${formData.get("current_location")}
- Inner Coordinates: ${formData.get("inner_coordinates")}
    `.trim();

    const systemPrompt = "You are a professional resume writer. Create concise, professional summaries.";
    const userPrompt = `Based on this candidate profile, write a professional summary starting with "You are: [System Name]". Keep it to 2-3 sentences focusing on their artistic background and goals. Profile: ${userText}`;

    try {
        const result = await callAIWithFallback(userPrompt, systemPrompt, 'summary');
        console.log(`Summary generated using ${result.provider}`);
        return result.content;
    } catch (error) {
        throw new Error(`Failed to generate summary: ${error.message}`);
    }
}

// Function to get user-friendly database error messages
function getDatabaseFriendlyError(status, statusText, errorBody = '') {
    const dbErrorMappings = {
        400: 'Invalid data for saving. Please check the form fields.',
        401: 'Authorization error with the database. Please contact the administrator.',
        403: 'Access denied to the database. Please contact the administrator.',
        404: 'Database or table not found. Please contact the administrator.',
        409: 'Data conflict. The record may already exist.',
        422: 'Data validation failed. Please check the entered information.',
        429: 'Too many requests to the database. Please try again later.',
        500: 'Internal database error. Please try again later.',
        502: 'The database is temporarily unavailable.',
        503: 'The database is overloaded or under maintenance.',
        504: 'Connection to the database timed out.'
    };

    const friendlyMessage = dbErrorMappings[status];
    
    if (friendlyMessage) {
        return friendlyMessage;
    }

    if (status >= 400 && status < 500) {
        return `Error sending data (code ${status}). Check that the form is filled out.`;
    } else if (status >= 500) {
        return `Error sending data (code ${status}). Try again later.`;
    }

    return `Unknown database error: ${status} ${statusText}`;
}

// Supabase submission
async function submitToSupabase(fullName, summary) {
  try {
    const response = await fetch("/api/supabase", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fullName, summary }),
    });

    if (!response.ok) {
      let errorBody = "";
      try {
        errorBody = await response.text();
      } catch (e) {}

      const userFriendlyMessage = getDatabaseFriendlyError(
        response.status,
        response.statusText,
        errorBody
      );
      throw new Error(userFriendlyMessage);
    }

    return await response.json();
  } catch (error) {
    if (error.name === "TypeError" || error.message.includes("fetch")) {
      throw new Error("No connection to the database. Check your internet connection.");
    }
    throw error;
  }
}

// Form submission handler
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    setButtonState(submitBtn, true, "Submitting...");
    showMessage("Validating form data...", 'info');

    try {
        const formData = new FormData(form);

        // Validate form
        const validationErrors = validateForm(formData);
        if (validationErrors.length > 0) {
            throw new Error(`Please fix the following errors:\n${validationErrors.join('\n')}`);
        }

        showMessage("Generating summary...", 'info');

        // Generate AI summary
        const summary = await generateSummary(formData);

        showMessage("Submitting to database...", 'info');

        // Submit to Supabase
        await submitToSupabase(formData.get("system_name"), summary);

        // Success
        showMessage(`✅ Application submitted successfully!\n\nGenerated Summary:\n${summary}`, 'success');
        form.reset();

    } catch (error) {
        console.error('Submission error:', error);
        showMessage(`❌ Error: ${error.message}`, 'error');
    } finally {
        setButtonState(submitBtn, false, "Submit Application");
    }
});

// Prevent form submission on Enter key in input fields
form.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.type !== 'submit') {
        e.preventDefault();
    }
});
