const form = document.getElementById("contact-form");
const statusMessage = document.getElementById("form-status");
const submitButton = form.querySelector('button[type="submit"]');

function showSuccessMessageFromQuery() {
  const params = new URLSearchParams(window.location.search);

  if (params.get("success") === "true") {
    statusMessage.textContent = "感謝您的留言，我們會盡快回覆。";
    window.history.replaceState({}, "", window.location.pathname);
  }
}

form.addEventListener("submit", () => {
  submitButton.disabled = true;
  submitButton.textContent = "送出中...";
});

showSuccessMessageFromQuery();
