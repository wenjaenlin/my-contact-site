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
    "這首詩不是介紹這個名字，而是描寫這個名字在現代城市裡留下的痕跡。",
    "",
    "規則：",
    "",
    "- 必須使用藏頭形式。",
    `- 「${name}」每個字依序出現在對應行的第一個字。`,
    "- 藏頭行必須自然。",
    "",
    "風格：",
    "",
    "- 現代中文新詩。",
    "- 像詩人深夜經過城市時寫下的片段。",
    "- 溫柔、有畫面感、有餘韻。",
    "- 避免老派祝福語與勵志語錄。",
    "- 避免生成像生日賀卡或姓名學分析。",
    "",
    "內容：",
    "",
    "優先使用現代生活意象：",
    "",
    "咖啡店、捷運、便利商店、手機訊息、辦公桌、耳機、紅綠燈、深夜街道、電梯、車站、書店、外送袋、雨天通勤、城市燈光。",
    "",
    "自然意象僅能少量點綴，不得成為主要內容。",
    "",
    "長度：",
    "",
    "8~12行。",
    "",
    "輸出：",
    "",
    "只輸出詩本身。"
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
            content: "You are a careful poet who writes in Traditional Chinese with gentle, cinematic urban imagery and follows acrostic constraints precisely."
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
