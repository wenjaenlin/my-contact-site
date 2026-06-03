function extractImageUrl(data) {
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    const markdownMatch = content.match(/!\[[^\]]*\]\((https?:[^)\s]+)\)/i);
    if (markdownMatch?.[1]) {
      return { imageUrl: markdownMatch[1], raw: content };
    }

    const urlMatch = content.match(/(https?:\/\/\S+)/i);
    if (urlMatch?.[1]) {
      return { imageUrl: urlMatch[1], raw: content };
    }

    return { imageUrl: "", raw: content };
  }

  if (Array.isArray(content)) {
    for (const item of content) {
      if (item?.type === "image_url" && item.image_url?.url) {
        return { imageUrl: item.image_url.url, raw: JSON.stringify(content) };
      }

      if (item?.type === "output_text" && typeof item.text === "string") {
        const markdownMatch = item.text.match(/!\[[^\]]*\]\((https?:[^)\s]+)\)/i);
        if (markdownMatch?.[1]) {
          return { imageUrl: markdownMatch[1], raw: item.text };
        }

        const urlMatch = item.text.match(/(https?:\/\/\S+)/i);
        if (urlMatch?.[1]) {
          return { imageUrl: urlMatch[1], raw: item.text };
        }
      }
    }

    return { imageUrl: "", raw: JSON.stringify(content) };
  }

  return { imageUrl: "", raw: JSON.stringify(data) };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const apiKey = process.env.POE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Missing POE_API_KEY environment variable." });
  }

  const poem = typeof req.body?.poem === "string" ? req.body.poem.trim() : "";

  if (!poem) {
    return res.status(400).json({ error: "Poem is required." });
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
        Authorization: `Bearer ${apiKey}`,
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
        stream: false,
        extra_body: {
          quality: "medium",
          aspect_ratio: "2:3"
        }
      })
    });

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || data.error || data.raw || "Poe image request failed."
      });
    }

    const { imageUrl, raw } = extractImageUrl(data);

    if (!imageUrl) {
      return res.status(502).json({
        error: raw || "The image model did not return an image URL."
      });
    }

    return res.status(200).json({ imageUrl });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown server error."
    });
  }
};
