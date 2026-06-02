const form = document.getElementById("contact-form");

if (form) {
  const submitButton = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", () => {
    submitButton.disabled = true;
    submitButton.textContent = "送出中...";
  });
}
