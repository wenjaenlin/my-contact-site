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
    `請以「${name}」為核心，寫一首繁體中文新詩。`,
    "風格要現代、溫柔，並帶一點古典意象，例如月色、風、潮汐、燈影、庭院、紙窗，但不要過度堆砌。",
    "詩要像是在對這個名字低聲說話。",
    "全詩 8 到 12 行，每行盡量簡短。",
    "不要加標題、不要加引號、不要解釋。",
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
            content: "You are a careful poet who writes in Traditional Chinese with gentle, luminous imagery."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 280
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
