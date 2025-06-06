// Configuration
const CONFIG = {
    SUPABASE_URL: "https://uomyodvgfgtvmbqjeazm.supabase.co",
    API_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvbXlvZHZnZmd0dm1icWplYXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1MDE0NTQsImV4cCI6MjA2MzA3NzQ1NH0.ufzKKHpyDm34CwDlNB8zs4rGGV5MbvpE3cA6P_Hvu9g",
    TOGETHER_AI_KEY: "1b8390600849e2ba1c81a0dbaf1b62cf958e127cb9e8a67f203394e46ab75a32"
};

// DOM Elements
const form = document.getElementById("application-form");
const message = document.getElementById("message");
const autofillBtn = document.getElementById("autofill-btn");
const submitBtn = document.getElementById("submit-btn");
const fileInput = document.getElementById("thesis_file");
const fileLabel = document.getElementById("file-label");

// Utility Functions
function showMessage(text, type = 'info') {
    message.textContent = text;
    message.className = `message-${type}`;
}

function setButtonState(button, disabled, text) {
    button.disabled = disabled;
    button.textContent = text;
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validateForm(formData) {
    const errors = [];

    if (!formData.get("full_name")?.trim()) errors.push("Full Name is required");
    if (!formData.get("position")?.trim()) errors.push("Position is required");
    if (!formData.get("birthplace")?.trim()) errors.push("Place of Birth is required");
    if (!formData.get("birthdate")) errors.push("Date of Birth is required");
    if (!formData.get("gender")) errors.push("Gender is required");
    if (!formData.get("location")?.trim()) errors.push("Current Location is required");

    const email = formData.get("email")?.trim();
    if (!email) {
    errors.push("Email is required");
    } else if (!validateEmail(email)) {
    errors.push("Please enter a valid email address");
    }

    if (!formData.get("artistic_practice")?.trim()) errors.push("Artistic Practice is required");
    if (!formData.get("artistic_research")?.trim()) errors.push("Artistic Research is required");

    const gradYear = parseInt(formData.get("graduation_year"));
    if (!gradYear || gradYear < 1950 || gradYear > 2030) {
    errors.push("Please enter a valid graduation year (1950-2030)");
    }

    if (!formData.get("goal")?.trim()) errors.push("Purpose or Idea of Participation is required");

    return errors;
}

// File handling
fileInput.addEventListener('change', function () {
    const fileName = this.files[0]?.name || "📁 Click to select file or drag & drop";
    fileLabel.textContent = fileName;
});

// Navigation
function goBack() {
    if (confirm("Are you sure you want to go back? Any unsaved changes will be lost.")) {
    window.location.href = 'index.html';
    }
}

// AI Auto-fill functionality
async function autoFillForm() {
    setButtonState(autofillBtn, true, "🤖 Generating...");
    showMessage("AI is generating sample data for the form...", 'info');

    try {
    const aiResponse = await fetch("https://api.together.xyz/v1/chat/completions", {
        method: "POST",
        headers: {
        "Authorization": `Bearer ${CONFIG.TOGETHER_AI_KEY}`,
        "Content-Type": "application/json"
        },
        body: JSON.stringify({
        model: "Qwen/Qwen2.5-72B-Instruct-Turbo",
        messages: [
            {
            role: "system",
            content: "You are a helpful assistant that generates realistic and unique sample data for application forms. Each time, generate a completely new and different fictional person with a unique background."
            },
            {
            role: "user",
            content: `Fill in these fields of the questionnaire as a completely unique fictional person. Return ONLY a JSON object with these exact keys:
{
"full_name": "realistic full name",
"position": "artistic position/role",
"birthplace": "city, country",
"birthdate": "YYYY-MM-DD format (between 1980-2005)",
"gender": "Male/Female/Non-binary/Other",
"location": "current city, country",
"email": "realistic email",
"artistic_practice": "detailed description of artistic practice (2-3 sentences)",
"artistic_research": "detailed description of artistic research (2-3 sentences)",
"graduation_year": "year as number (between 2000-2025)",
"social_link": "social media username or link",
"goal": "detailed purpose or idea of participation (2-3 sentences)"
}`
            }
        ],
        temperature: 1,
        max_tokens: 600
        })
    });

    if (!aiResponse.ok) {
        throw new Error(`AI API error: ${aiResponse.status} ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content?.trim();

    if (!content) {
        throw new Error("AI did not return content");
    }

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

    showMessage("✅ Form auto-filled successfully! You can modify any fields before submitting.", 'success');

    } catch (error) {
    console.error('Auto-fill error:', error);
    showMessage(`❌ Auto-fill error: ${error.message}`, 'error');
    } finally {
    setButtonState(autofillBtn, false, "🤖 Auto-fill with AI");
    }
}

// File processing
async function processFile(file) {
    if (!file) return "[No file uploaded]";

    try {
    if (file.name.toLowerCase().endsWith(".docx")) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value.trim() || "[Empty document]";
    } else if (file.name.toLowerCase().endsWith(".pdf")) {
        return "[PDF file uploaded - content extraction not supported in this environment]";
    } else if (file.name.toLowerCase().endsWith(".doc")) {
        return "[DOC file uploaded - content extraction not supported in this environment]";
    } else {
        return "[Unsupported file format]";
    }
    } catch (error) {
    console.error('File processing error:', error);
    return `[Error processing file: ${error.message}]`;
    }
}

// AI Summary generation
async function generateSummary(formData, thesisText) {
    const userText = `
Candidate Profile:
- Full Name: ${formData.get("full_name")}
- Position: ${formData.get("position")}
- Place of Birth: ${formData.get("birthplace")}
- Date of Birth: ${formData.get("birthdate")}
- Gender: ${formData.get("gender")}
- Location: ${formData.get("location")}
- Email: ${formData.get("email")}
- Artistic Practice: ${formData.get("artistic_practice")}
- Artistic Research: ${formData.get("artistic_research")}
- Graduation Year: ${formData.get("graduation_year")}
- Social Link: ${formData.get("social_link") || "Not provided"}
- Goal: ${formData.get("goal")}
- Thesis Content: ${thesisText}
    `.trim();

    const aiResponse = await fetch("https://api.together.xyz/v1/chat/completions", {
    method: "POST",
    headers: {
        "Authorization": `Bearer ${CONFIG.TOGETHER_AI_KEY}`,
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        model: "Qwen/Qwen2.5-72B-Instruct-Turbo",
        messages: [
        {
            role: "system",
            content: "You are a professional resume writer. Create concise, professional summaries."
        },
        {
            role: "user",
            content: `Based on this candidate profile, write a professional summary starting with "You are: [First Name] [Last Name]". Keep it to 2-3 sentences focusing on their artistic background and goals. Profile: ${userText}`
        }
        ],
        temperature: 0.4,
        max_tokens: 200
    })
    });

    if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    throw new Error(`AI API error: ${aiResponse.status} ${aiResponse.statusText}\n${errorText}`);
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content?.trim();

    if (!summary) {
    throw new Error("AI did not return a summary");
    }

    return summary;
}

// Supabase submission
async function submitToSupabase(fullName, summary) {
    const submission = {
    Full_Name: fullName,
    Resume: summary
    };

    const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/user_profiles`, {
    method: "POST",
    headers: {
        "apikey": CONFIG.API_KEY,
        "Authorization": `Bearer ${CONFIG.API_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    },
    body: JSON.stringify([submission])
    });

    if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Database error: ${response.status} ${response.statusText}\n${errorBody}`);
    }

    return await response.json();
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

    showMessage("Processing file and generating summary...", 'info');

    // Process file
    const file = formData.get("thesis_file");
    const thesisText = await processFile(file);

    // Generate AI summary
    const summary = await generateSummary(formData, thesisText);

    showMessage("Submitting to database...", 'info');

    // Submit to Supabase
    await submitToSupabase(formData.get("full_name"), summary);

    // Success
    showMessage(`✅ Application submitted successfully!\n\nGenerated Summary:\n${summary}`, 'success');
    form.reset();
    fileLabel.textContent = "📁 Click to select file or drag & drop";

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