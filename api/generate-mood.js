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
    .replace(/\n+/g, "")
    .replace(/\s+/g, "")
    .replace(/^[\u300c\u300e"\u201c]+/, "")
    .replace(/[\u300d\u300f"\u201d]+$/, "")
    .trim();
}

function finalizeMood(text) {
  let mood = normalizeQuote(text);

  if (!mood) {
    return "";
  }

  const firstSentenceEnd = mood.search(/[。！？!?]/u);

  if (firstSentenceEnd >= 0) {
    mood = mood.slice(0, firstSentenceEnd + 1);
  }

  mood = mood.replace(/[，、：；,;:]+$/u, "").trim();

  if (!/[。！？!?]$/u.test(mood)) {
    mood = `${mood}。`;
  }

  return mood;
}

function countChineseCharacters(text) {
  const matches = text.match(/[\u3400-\u9fff]/g);
  return matches ? matches.length : 0;
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
              text: "請只用繁體中文回答。你只能輸出一句完整的人生格言，長度必須是 12 到 30 個中文字。句子必須語意完整、可以獨立成立，不要只寫半句，不要標題，不要解釋，不要換行，不要引號，不要以逗號、頓號或冒號結尾。若不是完整一句，請直接重寫成完整一句。"
            }
          ]
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "一句話，有智慧與同理心的人生格言。請輸出一句簡短、溫柔、有智慧、有同理心、但不雞湯的完整繁體中文句子。"
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.8,
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

    const mood = finalizeMood(extractText(data));
    const chineseCharacterCount = countChineseCharacters(mood);

    if (!mood) {
      return res.status(502).json({ error: "The model returned an empty mood reflection." });
    }

    if (chineseCharacterCount < 12 || chineseCharacterCount > 30) {
      return res.status(502).json({ error: "The model returned an incomplete or invalid mood reflection." });
    }

    return res.status(200).json({ mood });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown server error."
    });
  }
};
