const form = document.getElementById("poem-form");
const nameInput = document.getElementById("name-input");
const submitButton = form.querySelector('button[type="submit"]');
const moodPanel = document.querySelector(".mood-panel");
const generateMoodButton = document.getElementById("generate-mood-button");
const moodContent = document.getElementById("mood-content");
const resultPanel = document.getElementById("result-panel");
const resultContent = document.getElementById("result-content");
const imageActions = document.getElementById("image-actions");
const generateImageButton = document.getElementById("generate-image-button");
const imagePanel = document.getElementById("image-panel");
const imageContent = document.getElementById("image-content");

let latestPoem = "";
let latestName = "";

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function encodeFormData(formData) {
  return new URLSearchParams(formData).toString();
}

async function submitToNetlify(formData) {
  const response = await fetch("/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: encodeFormData(formData)
  });

  if (!response.ok) {
    throw new Error("Netlify form submission failed.");
  }
}

async function parseJsonSafely(response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function generateMood() {
  const response = await fetch("/api/generate-mood", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });

  const data = await parseJsonSafely(response);

  if (!response.ok) {
    throw new Error(data.error || data.raw || "Mood generation failed.");
  }

  return data.mood;
}

async function generatePoem(name) {
  const response = await fetch("/api/generate-poem", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name })
  });

  const data = await parseJsonSafely(response);

  if (!response.ok) {
    throw new Error(data.error || data.raw || "Poem generation failed.");
  }

  return data.poem;
}

async function generateImage(poem) {
  const response = await fetch("/api/generate-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ poem })
  });

  const data = await parseJsonSafely(response);

  if (!response.ok) {
    throw new Error(data.error || data.raw || "Image generation failed.");
  }

  return data.imageUrl;
}

function renderMoodLoading() {
  moodPanel.setAttribute("aria-busy", "true");
  moodContent.innerHTML = '<p class="mood-loading">小新正在聽今天的心情……</p>';
}

function renderMoodError(message) {
  moodPanel.setAttribute("aria-busy", "false");
  moodContent.innerHTML = `<p class="mood-error">${escapeHtml(message)}</p>`;
}

function renderMood(mood) {
  moodPanel.setAttribute("aria-busy", "false");
  moodContent.innerHTML = `<p class="mood-quote">${escapeHtml(mood)}</p>`;
}

function hideImageSection() {
  imageActions.classList.add("hidden");
  imagePanel.classList.add("hidden");
  imagePanel.setAttribute("aria-busy", "false");
  imageContent.innerHTML = "";
}

function renderLoading() {
  resultPanel.setAttribute("aria-busy", "true");
  resultContent.innerHTML = '<p class="result-loading">小新正在為你寫詩……</p>';
  hideImageSection();
}

function renderError(message) {
  resultPanel.setAttribute("aria-busy", "false");
  resultContent.innerHTML = `<p class="result-error">${escapeHtml(message)}</p>`;
  hideImageSection();
}

function renderPoem(name, poem) {
  const lines = poem
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p class="poem-line">${escapeHtml(line)}</p>`)
    .join("");

  latestPoem = poem;
  latestName = name;
  resultPanel.setAttribute("aria-busy", "false");
  resultContent.innerHTML = `
    <div class="poem-output">
      <h3 class="poem-title">${escapeHtml(name)}，今晚的小詩</h3>
      ${lines}
    </div>
  `;
  imageActions.classList.remove("hidden");
  imagePanel.classList.add("hidden");
  imageContent.innerHTML = "";
}

function renderImageLoading() {
  imagePanel.classList.remove("hidden");
  imagePanel.setAttribute("aria-busy", "true");
  imageContent.innerHTML = '<p class="image-loading">小新正在把詩畫成一張明信片……</p>';
}

function renderImageError(message) {
  imagePanel.classList.remove("hidden");
  imagePanel.setAttribute("aria-busy", "false");
  imageContent.innerHTML = `<p class="image-error">${escapeHtml(message)}</p>`;
}

function renderImage(imageUrl) {
  imagePanel.classList.remove("hidden");
  imagePanel.setAttribute("aria-busy", "false");
  imageContent.innerHTML = `
    <div class="image-card">
      <img class="generated-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(latestName)} 的新詩意象圖">
    </div>
  `;
}

generateMoodButton.addEventListener("click", async () => {
  generateMoodButton.disabled = true;
  generateMoodButton.textContent = "聆聽中...";
  renderMoodLoading();

  try {
    const mood = await generateMood();
    renderMood(mood);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "今天的心情暫時沒有回聲，請稍後再試。";

    renderMoodError(message);
    console.error(error);
  } finally {
    generateMoodButton.disabled = false;
    generateMoodButton.textContent = "今天的心情";
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();

  if (!name) {
    nameInput.focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "寫詩中...";
  renderLoading();
  resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });

  const formData = new FormData(form);
  const [formResult, poemResult] = await Promise.allSettled([
    submitToNetlify(formData),
    generatePoem(name)
  ]);

  if (formResult.status === "rejected") {
    console.warn(formResult.reason);
  }

  if (poemResult.status === "fulfilled") {
    renderPoem(name, poemResult.value);
  } else {
    const message = poemResult.reason instanceof Error
      ? poemResult.reason.message
      : "詩句暫時還沒落下來，請稍後再試一次。";

    renderError(message);
    console.error(poemResult.reason);
  }

  submitButton.disabled = false;
  submitButton.textContent = "請小新寫詩";
});

generateImageButton.addEventListener("click", async () => {
  if (!latestPoem) {
    return;
  }

  generateImageButton.disabled = true;
  generateImageButton.textContent = "生成中...";
  renderImageLoading();
  imagePanel.scrollIntoView({ behavior: "smooth", block: "start" });

  try {
    const imageUrl = await generateImage(latestPoem);
    renderImage(imageUrl);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "圖片生成失敗，請稍後再試。";

    renderImageError(message);
    console.error(error);
  } finally {
    generateImageButton.disabled = false;
    generateImageButton.textContent = "生成意象圖";
  }
});
