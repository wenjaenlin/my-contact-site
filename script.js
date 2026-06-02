const form = document.getElementById("contact-form");
const statusMessage = document.getElementById("form-status");
const submitButton = form.querySelector('button[type="submit"]');

function encodeFormData(data) {
  return new URLSearchParams(data).toString();
}

async function handleSubmit(event) {
  event.preventDefault();

  statusMessage.textContent = "";
  submitButton.disabled = true;
  submitButton.textContent = "送出中...";

  const formData = new FormData(form);

  try {
    const response = await fetch("/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: encodeFormData(formData)
    });

    if (!response.ok) {
      throw new Error("Form submission failed.");
    }

    form.reset();
    statusMessage.textContent = "感謝您的留言，我們會盡快回覆。";
  } catch (error) {
    statusMessage.textContent = "送出失敗，請稍後再試一次。";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "送出留言";
  }
}

form.addEventListener("submit", handleSubmit);
