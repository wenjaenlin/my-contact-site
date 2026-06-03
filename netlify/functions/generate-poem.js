exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: "Method not allowed." })
    };
  }

  const apiKey = process.env.POE_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: "Missing POE_API_KEY environment variable." })
    };
  }

  let name = "";

  try {
    const payload = JSON.parse(event.body || "{}");
    name = typeof payload.name === "string" ? payload.name.trim() : "";
  } catch {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: "Invalid request body." })
    };
  }

  if (!name) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: "Name is required." })
    };
  }

  if (name.length > 40) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: "Name is too long." })
    };
  }

  const prompt = [
    `請以「${name}」創作一首繁體中文藏頭新詩。`,
    "",
    "藏頭規則：",
    "",
    "1. 僅在詩的前 N 行使用藏頭。",
    "2. N 等於姓名字數。",
    "3. 若姓名為三個字，只有前三行藏頭。",
    "4. 若姓名為四個字，只有前四行藏頭。",
    "5. 從第 N+1 行開始，禁止繼續藏頭。",
    "6. 禁止重複使用姓名進行第二輪藏頭。",
    "7. 姓名字詞不得刻意重複出現在後續行首。",
    "",
    "內容方向：",
    "",
    "1. 以現代生活為主要場景。",
    "2. 優先使用：",
    "   捷運、超商、手機通知、耳機、咖啡店、辦公室、電梯、",
    "   深夜便利商店、書店、車站、外送員、社群訊息、",
    "   雨天通勤、城市夜景、紅綠燈等意象。",
    "3. 可少量加入詩意或古典感，但自然元素僅作點綴。",
    "4. 避免大量使用月亮、花朵、海洋、潮汐、微風等意象。",
    "5. 情感溫柔、有陪伴感、有餘韻。",
    "",
    "格式要求：",
    "",
    "1. 全詩 6~12 行。",
    `2. 第一行到第 ${name.length} 行必須依序藏頭。`,
    `3. 第 ${name.length + 1} 行開始正常書寫。`,
    "4. 不要標題。",
    "5. 不要姓名分析。",
    "6. 不要解釋。",
    "7. 只輸出詩本身。",
    "8. 藏頭行數不得超過姓名字數。"
  ].join("\n");

  try {
    const response = await fetch("https://api.poe.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "GPT-5.4",
        messages: [
          {
            role: "system",
            content: "You are a careful poet who writes in Traditional Chinese with gentle, cinematic urban imagery and follows acrostic constraints precisely. Only the first N lines may use the acrostic, where N is the number of characters in the provided name."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 320
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          error: data.error?.message || "Poe API request failed."
        })
      };
    }

    const poem = data.choices?.[0]?.message?.content?.trim();

    if (!poem) {
      return {
        statusCode: 502,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ error: "The model returned an empty poem." })
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ poem })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown server error."
      })
    };
  }
};
