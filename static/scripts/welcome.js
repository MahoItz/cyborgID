// Configuration
const CONFIG = {
    SUPABASE_URL: "https://uomyodvgfgtvmbqjeazm.supabase.co",
    API_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvbXlvZHZnZmd0dm1icWplYXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1MDE0NTQsImV4cCI6MjA2MzA3NzQ1NH0.ufzKKHpyDm34CwDlNB8zs4rGGV5MbvpE3cA6P_Hvu9g",
    TOGETHER_AI_KEY: "7664bf1eb8c141ba9763769b2297f81e405db57f1531929c3acbf0481de96968",
    OPEN_ROUTER_KEY: "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"

};

// DOM Elements
const form = document.getElementById("application-form");
const message = document.getElementById("message");
const autofillBtn = document.getElementById("autofill-btn");
const submitBtn = document.getElementById("submit-btn");

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
                model: "Qwen/Qwen2-VL-72B-Instruct",
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful assistant that generates realistic and unique sample data for application forms. Each time, generate a completely new and different fictional person with a unique background."
                    },
                    {
                        role: "user",
                        content: `Fill in these fields of the questionnaire as a completely unique fictional person. Return ONLY a JSON object with these exact keys:
{
    "system_name": "realistic full name",
    "real_name": "fictional name. nickname",
    "system_position": "artistic position/role",
    "self_defined_role": "role or identity defined by the character themselves",
    "system_place_of_birth": "city, country",
    "place_of_becoming": "city or context where transformation occurred",
    "system_date_of_birth": "YYYY-MM-DD format (between 1980-2005)",
    "time_of_awakening": "YYYY-MM-DD format (between 1980-2005)",
    "system_gender": "Male/Female/Non-binary/Other",
    "fluid_zone": "abstract or metaphorical space of identity transition",
    "current_location": "current city, country",
    "inner_coordinates": "metaphorical or psychological location (e.g. 'between longing and logic')"
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

// AI Summary generation
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

    const aiResponse = await fetch("https://api.together.xyz/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${CONFIG.TOGETHER_AI_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
            messages: [
                {
                    role: "system",
                    content: "You are a professional resume writer. Create concise, professional summaries."
                },
                {
                    role: "user",
                    content: `Based on this candidate profile, write a professional summary starting with "You are: [System Name]". Keep it to 2-3 sentences focusing on their artistic background and goals. Profile: ${userText}`
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