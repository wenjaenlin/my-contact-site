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
    .replace(/^[\u300c\u300e"\u201c]+/, "")
    .replace(/[\u300d\u300f"\u201d]+$/, "")
    .trim();
}

function trimToReasonableSentence(text, limit = 40) {
  const chineseMatches = text.match(/[\u3400-\u9fff]/g);

  if (!chineseMatches || chineseMatches.length <= limit) {
    return text;
  }

  let chineseCount = 0;
  let cutIndex = text.length;

  for (let index = 0; index < text.length; index += 1) {
    if (/[\u3400-\u9fff]/.test(text[index])) {
      chineseCount += 1;
    }

    if (chineseCount >= limit) {
      cutIndex = index + 1;
      break;
    }
  }

  const sliced = text.slice(0, cutIndex);
  const sentenceEndMatch = sliced.match(/^.*?[。！？!?]/u);

  return (sentenceEndMatch ? sentenceEndMatch[0] : sliced).trim();
}

function finalizeMood(text) {
  let mood = normalizeQuote(text);

  if (!mood) {
    return "";
  }

  mood = trimToReasonableSentence(mood, 40);
  mood = mood.replace(/[，、：；,;:]+$/u, "。").trim();

  if (!/[。！？!?]$/u.test(mood)) {
    mood = `${mood}。`;
  }

  return mood;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "今天的心情暫時沒有回聲，請稍後再試。" });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "今天的心情暫時沒有回聲，請稍後再試。" });
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
              text: "請只輸出一句完整的繁體中文人生格言，溫柔、有智慧、有同理心，12 到 35 個中文字，不要標題，不要解釋，不要換行。"
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
          temperature: 0.8,
          maxOutputTokens: 80
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "今天的心情暫時沒有回聲，請稍後再試。"
      });
    }

    const rawMood = extractText(data);
    const mood = finalizeMood(rawMood);

    if (!mood) {
      return res.status(502).json({ error: "今天的心情暫時沒有回聲，請稍後再試。" });
    }

    return res.status(200).json({ mood });
  } catch {
    return res.status(500).json({
      error: "今天的心情暫時沒有回聲，請稍後再試。"
    });
  }
};
