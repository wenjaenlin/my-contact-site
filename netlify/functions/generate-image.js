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

  let poem = "";

  try {
    const payload = JSON.parse(event.body || "{}");
    poem = typeof payload.poem === "string" ? payload.poem.trim() : "";
  } catch {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: "Invalid request body." })
    };
  }

  if (!poem) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: "Poem is required." })
    };
  }

  const prompt = [
    "請根據以下新詩生成一張意象圖：",
    "",
    `「${poem}」`,
    "",
    "風格要求：",
    "日式明信片插畫風格，溫柔、細膩、手繪感，柔和光影，淡雅配色，城市生活場景，帶有詩意留白，不要過度奇幻，不要寫實照片風格，不要文字，不要浮水印。"
  ].join("\n");

  try {
    const response = await fetch("https://api.poe.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-image-1.5",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        stream: false
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
          error: data.error?.message || "Poe image request failed."
        })
      };
    }

    const content = data.choices?.[0]?.message?.content?.trim() || "";
    const match = content.match(/!\[[^\]]*\]\((https?:[^)\s]+)\)/i) || content.match(/(https?:\/\/\S+)/i);
    const imageUrl = match?.[1] || match?.[0] || "";

    if (!imageUrl) {
      return {
        statusCode: 502,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          error: content || "The image model did not return an image URL."
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ imageUrl })
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
