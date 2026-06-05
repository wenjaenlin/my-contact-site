function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

function normalizeQuote(text) {
  return text
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/^[「『"“]+/, "")
    .replace(/[」』"”]+$/, "")
    .trim();
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Missing GEMINI_API_KEY environment variable." });
  }

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [
            {
              text: "請只用繁體中文回答。輸出一句簡短格言，語氣溫柔、有智慧、有同理心，不要雞湯感太重，不要超過 30 個中文字，不要加標題，不要加引號。"
            }
          ]
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "一句話，有智慧與同理心的人生格言"
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 80
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Gemini API request failed."
      });
    }

    const mood = normalizeQuote(extractText(data));

    if (!mood) {
      return res.status(502).json({ error: "The model returned an empty mood reflection." });
    }

    return res.status(200).json({ mood });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown server error."
    });
  }
};
