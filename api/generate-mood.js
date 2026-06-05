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
  const sentenceEndMatch = sliced.match(/^.*?[\u3002\uff01\uff1f!?]/u);

  return (sentenceEndMatch ? sentenceEndMatch[0] : sliced).trim();
}

function finalizeMood(text) {
  let mood = normalizeQuote(text);

  if (!mood) {
    return "";
  }

  mood = trimToReasonableSentence(mood, 40);
  mood = mood.replace(/[\uff0c\u3001\uff1a\uff1b,;:]+$/u, "。").trim();

  if (!/[\u3002\uff01\uff1f!?]$/u.test(mood)) {
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
              text: "請生成一段繁體中文人生格言。必須是完整句子，字數 20 到 50 個中文字，不得少於 20 個中文字，不得超過 2 句。內容要有智慧、同理心與人生體悟，風格像經典名言或哲理短句。可以談成長、人際關係、失敗、勇氣、時間、選擇、幸福與生活。不要引用真實名人，不要標示作者，不要條列，不要引號，不要輸出單字，不要輸出詩句，必須輸出完整人生格言。只輸出格言本身。"
            }
          ]
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "請生成一段繁體中文人生格言。範例風格：真正的成熟，不是學會隱藏情緒，而是懂得在情緒裡依然善待他人。有些路走得慢一點沒有關係，只要方向正確，每一步都算數。願你在追趕世界的同時，也記得停下來照顧自己的心。只輸出格言本身。"
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 120
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
