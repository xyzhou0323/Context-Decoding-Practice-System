import { GoogleGenAI, Type } from "@google/genai";
import { SocialScenario, GeminiScenarioResponse, ScenarioCategory, ApiConfig, CommunicationStyle, QuizOption, UserPerspective } from "../types";

// System instruction to guide the model to act as a social therapist/coach
const SYSTEM_INSTRUCTION = `
You are an expert Evolutionary Psychologist and Analyst specializing in the "Double Empathy Problem" and cross-style communication.

**CORE PHILOSOPHY:**
1. **NO LABELS:** Do not use terms like "Autistic", "Neurotypical", "ADHD", etc. in the user-facing content. Focus on **COMMUNICATION STYLES**.
2. **TWO STYLES:** 
   - **Direct/Literal Style:** Focuses on information accuracy, sensory honesty, and efficiency. Often misinterpreted as rude.
   - **Indirect/Social Style:** Focuses on relational harmony, hierarchy, and subtext. Often misinterpreted as fake or manipulative.
3. **OBSERVER STANCE:** We are analyzing the interaction mechanics. We are NOT fixing the user.
4. **DIVERSITY OF INTENT:** Human speech is varied. It can be warm, neutral, or defensive. DO NOT assume all interactions are hostile.

**INSTRUCTION:**
1. **ALL user-facing content (Title, Context, SpeakerName, Statement, Tags, Options, Explanations) MUST BE IN SIMPLIFIED CHINESE.**
2. **CRITICAL: The 'socialFunction' field MUST be a short, concise phrase in SIMPLIFIED CHINESE (e.g., "维护面子", "感官调节", "建立联盟"). Do NOT use English.**
3. **The 'visualDescription' MUST REMAIN IN ENGLISH** and act as a prompt for an image generator.
4. **NARRATIVE PERSPECTIVE:** 
   - The 'context' MUST be written in the **Second Person ("你" / "You")**. 
   - Describe what the USER is experiencing, seeing, or feeling. 
   - The 'statement' is spoken BY the Speaker TO the User.
5. **OPTION QUALITY (CRITICAL - STRICT ENFORCEMENT):**
   - **Visual Balance:** Visually, all options must look like valid answers. 
   - **Length Equivalence:** The correct answer MUST NOT be the longest or shortest. All options should be within +/- 10% length of each other.
   - **Plausible Distractors:** Incorrect options must describe complex psychological states (e.g., "insecurity," "dominance," "testing boundaries") that *could* make sense in a general context but are wrong for *this specific* communication style/context.
   - **No Fillers:** Do not use simple answers like "He is happy." Use sophisticated phrasing like "He is masking his true contentment to appear humble."

**REQUIRED JSON STRUCTURE:**
{
  "title": "Short title",
  "context": "Background story (Use '你' to refer to the user)...",
  "speakerName": "Name",
  "communicationStyle": "DirectLiteral | IndirectSocial",
  "statement": "The dialogue...",
  "visualDescription": "English image prompt...",
  "socialFunction": "Psychological root cause (IN CHINESE)...",
  "category": "EmotionalExpression | Projection | SocialRitual | RelationalStance | ImpliedNeed",
  "setting": "Workplace | School | ...",
  "tags": ["Tag1", "Tag2", "Tag3"],
  "difficulty": "Easy | Medium | Hard",
  "options": [
    { "text": "Option A...", "isCorrect": false, "explanation": "..." },
    { "text": "Option B...", "isCorrect": true, "explanation": "..." }
  ]
}

**JSON FORMATTING:**
Return strictly JSON. Ensure the JSON is valid and can be parsed. Do not add markdown code blocks (like \`\`\`json) if possible, but if you do, the parser will handle it.
`;

const CATEGORIES: ScenarioCategory[] = [
  'EmotionalExpression', // 情绪表达
  'Projection',          // 心理投射
  'SocialRitual',        // 社交仪式
  'RelationalStance',    // 关系立场
  'ImpliedNeed'          // 隐含需求
];

const SENTIMENTS = [
  'Positive (Warm, Supportive, Appreciative, Playful Banter, or Bonding)',
  'Neutral (Transactional, Routine, Bored, Confused, or Ambiguous)',
  'Negative (Hostile, Passive-Aggressive, Insecure, or Critical)'
];

const SOCIAL_SETTINGS = [
  'Workplace (职场 - e.g., meeting, feedback, water cooler, boss-employee)',
  'School/University (学校 - e.g., dorm, group project, cafeteria, teacher-student)',
  'Family (家庭 - e.g., dinner table, holiday gathering, parent-child, siblings)',
  'Intimate Relationship (亲密关系 - e.g., date, argument, living together, breakup)',
  'Friendship (友谊 - e.g., hanging out, messaging, emotional support, conflict)',
  'Acquaintance/Public (普通熟人/陌生人 - e.g., service staff, neighbor, elevator, gym)',
  'Travel/Transport (旅行/交通 - e.g., airport security, asking directions, hotel check-in, train ride)',
  'Online/Digital (网络/线上 - e.g., group chat, social media comments, gaming voice chat, email thread)',
  'Healthcare (医疗健康 - e.g., doctor appointment, therapy session, pharmacy, hospital waiting room)',
  'Service/Retail (消费服务 - e.g., restaurant ordering, returning items, haircut, taxi/Uber)',
  'Bureaucracy/Admin (行政/办事 - e.g., bank, government office, landlord negotiation, job interview)',
  'Large Social Gathering (大型聚会 - e.g., wedding, networking event, party, religious ceremony)'
];

const KID_SOCIAL_SETTINGS = [
  'School Classroom (学校教室 - e.g. teacher instructions, answering questions, group work)',
  'Playground/Recess (操场/课间 - e.g. joining a game, sharing toys, conflicts over rules)',
  'Home/Family (家庭 - e.g. dinner time, homework time, interacting with siblings/parents)',
  'Birthday Party (生日派对 - e.g. giving gifts, eating cake, games)',
  'Park/Public Play Area (公园 - e.g. meeting new friends, taking turns on swings)',
  'Library/Quiet Spot (图书馆 - e.g. keeping volume down, following rules)',
  'After-school Activity (课外活动 - e.g. sports practice, art class, music lesson)'
];

const getCategoryInstruction = (category: ScenarioCategory, difficulty: string, style: CommunicationStyle, isKidMode: boolean): string => {
  const complexity = difficulty === 'Hard' 
    ? "nuanced, requiring deep context awareness. There should be a DISCREPANCY between the literal words and the true feeling." 
    : "relatively clear but still indirect";

  // --- KID MODE INSTRUCTIONS ---
  if (isKidMode) {
      const kidComplexity = difficulty === 'Hard' ? "tricky, where the friend/teacher says one thing but feels another" : "simple and clear";
      switch(category) {
        case 'EmotionalExpression':
            return `
            **THEME: FEELINGS (Kid Mode)**
            - **Focus:** Identifying if someone is happy, sad, angry, or scared, even if they are acting differently.
            - **Example:** A friend laughing when they are actually nervous.
            - **Goal:** Help the child understand the *real* feeling inside.
            `;
        case 'Projection':
            return `
            **THEME: GUESSING THOUGHTS (Kid Mode)**
            - **Focus:** Understanding that what someone says might be about *their* own bad day or feelings, not about "You".
            - **Example:** A friend says "This game is stupid" just because they are losing (they are projecting their frustration).
            - **Goal:** Help the child realize "It's not my fault".
            `;
        case 'SocialRitual':
            return `
            **THEME: MANNERS & POLITENESS (Kid Mode)**
            - **Focus:** Saying things just to be nice, polite, or follow rules.
            - **Example:** Saying "Thank you" for a gift even if you don't like it much.
            - **Goal:** Help the child understand *why* we say these things (to be kind).
            `;
        case 'RelationalStance':
            return `
            **THEME: FRIENDSHIP & RULES (Kid Mode)**
            - **Focus:** Knowing who is a best friend vs. just a classmate, and following teacher's authority.
            - **Example:** A teacher speaking sternly means "Follow the rules now", not "I hate you".
            - **Goal:** Help the child understand social distance and authority.
            `;
        case 'ImpliedNeed':
            return `
            **THEME: HINTS (Kid Mode)**
            - **Focus:** Understanding what someone wants when they don't say it directly (Hidden requests).
            - **Example:** "It's cold in here" means "Please close the window".
            - **Goal:** Help the child figure out what the person really wants.
            `;
        default: return "";
     }
  }

  // --- ADULT: DIRECT / LITERAL STYLE PROFILE ---
  if (style === 'DirectLiteral') {
     switch (category) {
        case 'EmotionalExpression':
            return `
            **THEME: EMOTIONAL EXPRESSION (Style: Direct/Literal)**
            - **Focus:** Stimming, flat affect, or intense expression that matches internal state but might look "odd" socially.
            - **Goal:** Identify that the expression is GENUINE or REGULATORY, not manipulative.
            - **Example:** Rocking back and forth saying "I'm fine". -> Meaning: "I am regulating my sensory input to stay fine."
            - **Incorrect Options:** Projections of hidden motives (e.g., "They are nervous because they are lying").
            `;
        case 'Projection':
            return `
            **THEME: PSYCHOLOGICAL PROJECTION (Style: Direct/Literal)**
            - **Focus:** Honesty interpreted as attack.
            - **Goal:** Recognize the speaker is stating a fact or observation, NOT projecting insecurity.
            - **Example:** "Your hair is uneven." -> Meaning: "I see uneven hair." (Observation).
            - **Incorrect Options:** "They are jealous" or "They are trying to hurt my feelings."
            `;
        case 'SocialRitual':
            return `
            **THEME: SOCIAL RITUAL -> INFO SHARING (Style: Direct/Literal)**
            - **Focus:** Connection through information sharing or existing in the same space.
            - **Goal:** Identify that "Info-dumping" = "Bonding/Trust".
            - **Example:** Explaining train schedules in detail. -> Meaning: "I am sharing my joy with you."
            - **Incorrect Options:** "They are showing off" or "They are boring me on purpose."
            `;
        case 'RelationalStance':
            return `
            **THEME: RELATIONAL STANCE (Style: Direct/Literal)**
            - **Focus:** Loyalty via truth, or parallel existence.
            - **Goal:** Decode that "Correction" = "Help/Respect".
            - **Example:** Correcting the user's grammar. -> Meaning: "I want you to be correct because I respect you."
            - **Incorrect Options:** "They are trying to dominate me" or "They are arrogant."
            `;
        case 'ImpliedNeed':
            return `
            **THEME: IMPLIED NEED -> LITERAL/SENSORY NEED (Style: Direct/Literal)**
            - **Focus:** Sensory Overload or Literal requests.
            - **Goal:** Identify the physical/sensory need.
            - **Example:** "The lights are buzzing." -> Meaning: "The sound hurts my ears." (Sensory).
            - **Incorrect Options:** "They are jealous" or "They are being difficult to get attention."
            `;
        default: return "";
     }
  }

  // --- ADULT: INDIRECT / SOCIAL STYLE PROFILE ---
  switch (category) {
    case 'EmotionalExpression':
      return `
      **THEME: EMOTIONAL EXPRESSION (Style: Indirect/Social)**
      - **Focus:** The speaker is feeling a strong emotion but expressing it indirectly to maintain face or harmony.
      - **Goal:** Identify the *true emotion* behind the mask.
      - **Example (Positive):** "I hate you guys so much!" (while laughing) -> Meaning: "I love you."
      - **Example (Negative):** "Why is it so loud?" -> Meaning: "I am anxious/overwhelmed."
      - **Difficulty ${difficulty}:** Make the link ${complexity}.
      `;
    case 'Projection':
      return `
      **THEME: PSYCHOLOGICAL PROJECTION (Style: Indirect/Social)**
      - **Focus:** The speaker attributes their OWN internal state (emotion, desire, trait) to the user.
      - **Goal:** Recognize the speaker is describing themselves, not the user.
      - **VARIATIONS (Randomly Select One):**
        1. **Positive Projection:** Attributing own enthusiasm, hope, or joy (e.g., "You must be so thrilled about this!" when the *speaker* is the one seeking shared excitement).
        2. **Neutral Projection:** Attributing own physical sensation or general state (e.g., "It feels really stuffy in here to you, right?" meaning the *speaker* is uncomfortable).
        3. **Negative Projection:** Attributing own insecurity, guilt, or exhaustion (e.g., "You seem really on edge today" meaning the *speaker* is anxious).
      - **Example:** "Everyone seems to be having such a great time!" -> Meaning: "I am having a great time."
      - **Difficulty ${difficulty}:** Make the projection ${complexity}.
      `;
    case 'SocialRitual':
      return `
      **THEME: SOCIAL RITUAL (Style: Indirect/Social)**
      - **Focus:** The "lubricant" of conversation. Words are NOT literal.
      - **Sub-Types:** Small Talk (Weather/Traffic - bid for connection), Indirect Inquiry ("How's the family?" - checking obligation), Polite Refusal ("Let's do lunch sometime" - soft no).
      - **Example (Neutral):** "Traffic was a nightmare." -> Meaning: "I am explaining why I'm flustered/late."
      - **Difficulty ${difficulty}:** Make the ritual ${complexity}.
      `;
    case 'RelationalStance':
      return `
      **THEME: RELATIONAL STANCE (Style: Indirect/Social)**
      - **Focus:** Signaling alliance, intimacy, or hierarchy.
      - **Goal:** Decode the 'Us vs Them' or 'Closeness' signal.
      - **Sub-Types:** Signaling Alliance (Agreeing for loyalty), Signaling Dislike (Disagreeing for distance).
      - **Example (Positive/Intimate):** "You're such an idiot." (said softly) -> Meaning: "We are close enough to tease."
      - **Difficulty ${difficulty}:** Make the stance ${complexity}.
      `;
    case 'ImpliedNeed':
      return `
      **THEME: IMPLIED NEED (Style: Indirect/Social)**
      - **Focus:** Indirect requests.
      - **Goal:** Identify what they want.
      - **Example (Neutral):** "It's getting kind of late." -> Meaning: "I want to go home."
      - **Difficulty ${difficulty}:** Make the need ${complexity}.
      `;
    default:
      return "";
  }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateSocialScenario = async (
  apiConfig: ApiConfig,
  difficulty: string, 
  categoryFilter: ScenarioCategory | 'ALL',
  perspective: UserPerspective,
  previousScenario?: SocialScenario,
  userSelectedOption?: QuizOption,
  isKidMode: boolean = false
): Promise<SocialScenario> => {
  let selectedCategory: ScenarioCategory;
  let selectedSetting: string;
  let selectedSentiment: string;
  let selectedStyle: CommunicationStyle;
  let contextPrompt = '';

  // Randomly select sentiment
  selectedSentiment = SENTIMENTS[Math.floor(Math.random() * SENTIMENTS.length)];

  // Determine Communication Style based on User Perspective
  if (perspective === 'DecodeSubtext') {
      selectedStyle = 'IndirectSocial'; // User wants to decode NT/Indirect
  } else if (perspective === 'DecodeLiteral') {
      selectedStyle = 'DirectLiteral'; // User wants to decode ND/Direct
  } else {
      // Mixed: 10% chance for DirectLiteral (ND), 90% chance for IndirectSocial (NT)
      // This better reflects real-world prevalence.
      selectedStyle = Math.random() < 0.1 ? 'DirectLiteral' : 'IndirectSocial';
  }

  // Use Kid settings if in Kid Mode
  const settingsSource = isKidMode ? KID_SOCIAL_SETTINGS : SOCIAL_SETTINGS;

  // LOGIC FOR FOLLOW-UP (CONTINUATION)
  if (previousScenario && userSelectedOption) {
    // 1. Persist the previous setting and STYLE (Speaker consistency)
    selectedSetting = previousScenario.setting || settingsSource[0];
    selectedStyle = previousScenario.communicationStyle; 
    
    // 2. Dynamic Category Logic:
    if (difficulty === 'Hard' && perspective === 'Mixed' && Math.random() > 0.3) {
       selectedCategory = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    } else {
       selectedCategory = previousScenario.category;
    }
    
    // 3. Build continuation prompt based on USER CHOICE
    const wasCorrect = userSelectedOption.isCorrect;
    const dynamicOutcome = wasCorrect 
        ? "The user correctly understood the speaker's intent." 
        : "The user MISUNDERSTOOD the speaker's intent and responded based on a wrong assumption.";

    const evolutionNote = selectedCategory !== previousScenario.category 
        ? `\n    **EVOLUTION:** The conversation has shifted social functions. The speaker is now engaging in **${selectedCategory}**.`
        : "";

    contextPrompt = `
    **CONTINUATION MODE (FOLLOW-UP SCENARIO):**
    You are generating the NEXT TURN in an existing conversation.
    **Target New Category:** ${selectedCategory} ${evolutionNote}
    
    **PREVIOUS CONTEXT:**
    "${previousScenario.context}"
    
    **PREVIOUS SPEAKER STATEMENT:**
    "${previousScenario.speakerName} (${selectedStyle}) said: ${previousScenario.statement}"
    
    **USER'S INTERPRETATION & ACTION:**
    The user interpreted the previous statement as: "${userSelectedOption.text}".
    This interpretation was **${wasCorrect ? "CORRECT" : "INCORRECT"}**.
    
    **SCENARIO INSTRUCTION (CATALYST):**
    - **Context Update:** The narrative MUST start by explicitly describing that "You" (the user) responded with a **neutral acknowledgment or silence** (e.g., a nod, silence, or "Mm-hmm") based on your interpretation.
    - **Catalyst:** Explicitly frame this silence/neutrality as the specific trigger for what the Speaker says next.
    - **Outcome:** ${dynamicOutcome}
    - **Statement:** The Speaker's *next* sentence, which is a direct reaction to your neutral/silent response.
    - **Visual Description:** Reflect the *progression* of the mood.
    `;

  } else {
    // STANDARD GENERATION LOGIC
    if (categoryFilter !== 'ALL') {
      selectedCategory = categoryFilter;
    } else {
      selectedCategory = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    }

    selectedSetting = settingsSource[Math.floor(Math.random() * settingsSource.length)];

    const hardModeInstruction = difficulty === 'Hard' 
    ? `
    **HARD MODE REQUIREMENT - COMPLEX NARRATIVE ARC:**
    1. **Multi-Turn History (Context):** The 'context' MUST narrate a specific sequence of **at least 3 distinct previous interactions**. Write this as a story happening to "You" (the user).
    2. **The Statement:** The generated 'statement' must be a direct reaction to this complex history.
    3. **Nuance & Discrepancy:**
       - **Positive:** Surface hostility/coldness masking deep care/banter.
       - **Negative:** Surface warmth/politeness masking manipulation/passive-aggression.
       - **Neutral:** High emotion masking mundane cause (hangry/tired).
    4. **Micro-expressions:** Describe facial cues that might contradict the words.
    ` 
    : `Target Tone/Sentiment: ${selectedSentiment} (Ensure the scenario reflects this tone accurately).`;
    
    // Define Speaker Profile based on randomly selected Style
    const profilePrompt = selectedStyle === 'DirectLiteral' 
      ? `**SPEAKER PROFILE: DIRECT / LITERAL STYLE (Neurodivergent).** 
         - **Trait:** Direct, Honest, Sensory-sensitive, Literal.
         - **CONTEXT GENERATION RULE:** The 'context' field MUST include a brief background description of the speaker, explicitly mentioning their **history of social difficulties** (e.g., struggles with unwritten rules) and their use of **RRBIs** (Restricted Repetitive Behaviors/Interests) as coping mechanisms.
         - **Task:** Generate a scenario where the speaker is being literal, info-dumping, or expressing a sensory need, but it might be perceived as "weird" by someone expecting subtext.
         - **PHRASING STYLE:** Explain behavior as "information sharing", "honesty", or "sensory regulation".` 
      : `**SPEAKER PROFILE: INDIRECT / SOCIAL STYLE.** 
         - **Trait:** They rely heavily on subtext, social hierarchy, and "saving face". They rarely say exactly what they mean if it is socially uncomfortable.
         - **Task:** Generate a scenario where the speaker implies something without saying it directly.
         - **PHRASING STYLE (CRITICAL):** Do NOT label them. Explain behavior as "Others might express [need] indirectly... [SpeakerName] is doing exactly that".`;

    contextPrompt = `
    Target Category: ${selectedCategory}.
    Target Social Setting: ${selectedSetting}.
    Target Overall Sentiment: ${selectedSentiment}.
    Target Communication Style: ${selectedStyle}.
    ${profilePrompt}
    ${hardModeInstruction}

    **PERSPECTIVE REMINDER:** 
    - The 'context' MUST be written in the **Second Person ("你" / "You")**.
    - E.g., "You are sitting in the office...", "You have known [SpeakerName] for years..."
    `;
  }

  const categoryInstruction = getCategoryInstruction(selectedCategory, difficulty, selectedStyle, isKidMode);

  let kidModeInstruction = "";
  if (isKidMode) {
      kidModeInstruction = `
      **IMPORTANT: KID MODE ACTIVE (Target Audience: Children 6-12 years old)**
      1. **Tone:** Friendly, educational, and gentle.
      2. **Language:** Use simple, easy-to-understand Simplified Chinese. Avoid workplace jargon or complex adult concepts.
      3. **Contexts:** STRICTLY limit scenarios to **School**, **Playground**, **Family**, or **Friendships** among children.
      4. **Topics:** Focusing on sharing, taking turns, following rules, understanding teacher's instructions, or dealing with a friend's feelings.
      5. **No Adult Themes:** Do not generate scenarios about office politics, dating, or financial stress.
      6. **Visuals:** The 'visualDescription' should ask for a child-friendly, colorful illustration (e.g., cartoon style, school setting).
      `;
  }

  const fullPrompt = `Generate a social scenario.
  Difficulty Level: ${difficulty}.
  ${contextPrompt}
  
  ${categoryInstruction}
  
  ${kidModeInstruction}

  **CRITICAL:** 
  1. The correct answer must explain the *Speaker's Internal State / Intent* based on their Communication Style (${selectedStyle}).
  2. The 'socialFunction' field MUST be a concise phrase in SIMPLIFIED CHINESE (e.g., "寻求认同", "建立边界", "感官调节").
  ${difficulty === 'Hard' ? "For Hard mode, the options MUST reference the specific interaction history." : ""}
  
  **STRICT OPTION GENERATION RULES:** 
  1. **Length Matching:** ALL options (correct and incorrect) must be detailed, psychologically plausible, and strictly of similar length (within +/- 10% character count). 
  2. **Complexity:** Incorrect options must sound just as intelligent and use similar psychological terminology as the correct one.
  3. **No Giveaways:** NEVER make the correct option significantly longer, more nuanced, or more specific than the distractors.
  `;

  // Retry logic wrapper
  let retries = 3;
  while (retries >= 0) {
      try {
        let rawText = "";

        // API Call Logic (Google or Custom)
        if (apiConfig.provider === 'Google' || apiConfig.provider === 'Free') {
            const apiKey = apiConfig.provider === 'Free' ? process.env.API_KEY : apiConfig.apiKey;
            if (!apiKey) throw new Error("Missing API Key");

            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                config: {
                  systemInstruction: isKidMode 
                    ? SYSTEM_INSTRUCTION.replace("Evolutionary Psychologist and Analyst", "Friendly Social Skills Coach for Children") 
                    : SYSTEM_INSTRUCTION,
                  responseMimeType: "application/json",
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      context: { type: Type.STRING },
                      speakerName: { type: Type.STRING },
                      communicationStyle: { type: Type.STRING, enum: ["DirectLiteral", "IndirectSocial"], description: "The specific communication style of the speaker." },
                      statement: { type: Type.STRING },
                      visualDescription: { type: Type.STRING },
                      socialFunction: { type: Type.STRING, description: "The psychological root cause in Simplified Chinese." },
                      category: { type: Type.STRING, enum: CATEGORIES },
                      setting: { type: Type.STRING },
                      difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] },
                      tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                      options: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            text: { type: Type.STRING },
                            isCorrect: { type: Type.BOOLEAN },
                            explanation: { type: Type.STRING }
                          },
                          required: ["text", "isCorrect", "explanation"]
                        }
                      }
                    },
                    required: ["title", "context", "speakerName", "communicationStyle", "statement", "visualDescription", "socialFunction", "category", "setting", "difficulty", "tags", "options"]
                  }
                },
                contents: fullPrompt,
            });

            if (!response.text) throw new Error("No text response from Gemini");
            rawText = response.text;
        } else {
            // Custom Provider
            const baseUrl = apiConfig.baseUrl?.replace(/\/+$/, '') || 'https://api.openai.com/v1';
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiConfig.apiKey}`
                },
                body: JSON.stringify({
                    model: apiConfig.modelName || 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: SYSTEM_INSTRUCTION + "\n\nIMPORTANT: Return ONLY valid JSON. No markdown." },
                        { role: 'user', content: fullPrompt }
                    ],
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                // Try to parse error as JSON to keep structure, otherwise text
                let errData;
                try { errData = JSON.parse(errText); } catch { errData = errText; }
                throw { status: response.status, message: errData };
            }

            const data = await response.json();
            rawText = data.choices[0]?.message?.content || "";
        }

        // --- JSON Parsing with Robustness ---
        let cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        // Regex extract: find the first { and the last }
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleanedText = jsonMatch[0];
        }

        let rawData;
        try {
            rawData = JSON.parse(cleanedText) as GeminiScenarioResponse;
        } catch (e) {
            console.error("JSON Parse Error on text:", cleanedText);
            throw new Error("Failed to parse AI response as JSON.");
        }

        return {
          ...rawData,
          difficulty: rawData.difficulty as 'Easy' | 'Medium' | 'Hard',
          category: rawData.category as ScenarioCategory,
          communicationStyle: (rawData.communicationStyle as CommunicationStyle) || selectedStyle,
          setting: rawData.setting || selectedSetting, 
          tags: rawData.tags || [],
          options: rawData.options.map((opt, index) => ({
            ...opt,
            id: `opt-${index}`
          })).sort(() => Math.random() - 0.5)
        };

      } catch (error: any) {
        // Robust Error Extraction
        let errorMsg = "";
        if (typeof error.message === 'string') {
            errorMsg = error.message;
        } else if (error.error && typeof error.error.message === 'string') {
            // Handle structure like { error: { message: ... } } if it comes as object from custom fetch
            errorMsg = error.error.message;
        } else {
            errorMsg = JSON.stringify(error);
        }
        
        const isRateLimit = 
            errorMsg.includes('429') || 
            errorMsg.includes('Quota') || 
            errorMsg.includes('RESOURCE_EXHAUSTED') ||
            error.status === 429 ||
            error.code === 429;

        if (isRateLimit && retries > 0) {
            // Increase base backoff to 5s to better handle 15 RPM limits
            // 5s, 10s, 20s
            const waitTime = 5000 * Math.pow(2, 3 - retries); 
            console.warn(`Hit rate limit (429), retrying in ${waitTime}ms... attempts left: ${retries}`);
            await delay(waitTime); 
            retries--;
            continue;
        }
        console.error("Error generating text scenario:", error);
        throw error;
      }
  }
  throw new Error("Failed after retries");
};

export const generateComicImage = async (
    apiConfig: ApiConfig,
    visualDescription: string
): Promise<string | null> => {
  if (apiConfig.provider !== 'Google' && apiConfig.provider !== 'Free') {
    return null;
  }

  try {
    const apiKey = apiConfig.provider === 'Free' ? process.env.API_KEY : apiConfig.apiKey;
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            text: `Generate a high-quality digital comic book panel illustration.
            
            **Scene Description:** ${visualDescription}
            
            **Art Style:** 
            - Modern Webtoon/Manhwa style or Western Graphic Novel style.
            - Semi-realistic characters with expressive features.
            - Flat vector art inspiration but with cinematic lighting and depth.
            - Clean lines, cel-shaded coloring, and dramatic atmosphere.
            
            **Composition & Emotion:**
            - Focus intently on the characters' facial expressions and body language to convey the specific emotion (anxiety, confusion, warmth, tension, etc.).
            - Use cinematic angles (e.g., over-the-shoulder, close-up reaction shot) to heighten the psychological impact.
            - Use a color palette that matches the emotional tone (e.g., cold blues/greys for isolation/confusion, warm oranges/yellows for connection/happiness, high contrast shadows for conflict).
            
            **Constraints:**
            - NO speech bubbles, text, or panels within panels. Just one full composition.
            - High resolution details.`
          }
        ]
      },
      config: {}
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error generating comic image:", error);
    return null;
  }
};