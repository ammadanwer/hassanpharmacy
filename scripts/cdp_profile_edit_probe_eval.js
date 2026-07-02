(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const visibleText = (root = document.body) => (root.innerText || "").trim();
  const buttons = () => Array.from(document.querySelectorAll("button,a,[role='button']"));
  const textElements = () => Array.from(document.querySelectorAll("button,a,[role='button'],span,p,div,li"));
  const clickByText = (text) => {
    const wanted = text.trim().toLowerCase();
    const target = buttons().find((el) => (el.innerText || el.getAttribute("aria-label") || el.title || "").trim().toLowerCase() === wanted);
    if (!target) return false;
    target.click();
    return true;
  };
  const readDialog = () => {
    const dialog = document.querySelector("[role='dialog']") || document.querySelector(".simple-modal.profile-modal") || document.querySelector(".MuiDialog-root") || document.body;
    return {
      text: visibleText(dialog).slice(0, 3000),
      buttons: Array.from(dialog.querySelectorAll("button")).map((button) => button.innerText || button.getAttribute("aria-label") || button.title).filter(Boolean),
      inputs: Array.from(dialog.querySelectorAll("input,select,textarea")).map((el) => ({
        tag: el.tagName,
        type: el.type || "",
        placeholder: el.placeholder || "",
        value: el.value || "",
        text: el.innerText || "",
      })),
      html: (dialog.outerHTML || "").slice(0, 5000),
    };
  };

  if (visibleText().includes("Please complete all fields")) {
    clickByText("Ok");
    await wait(500);
  }
  if (!visibleText().includes("Pharmacy Profile")) {
    clickByText("Renew") || clickByText("Profile") || (() => {
      const target = textElements().find((el) => (el.innerText || "").trim().toLowerCase() === "renew");
      if (!target) return false;
      target.click();
      return true;
    })();
    await wait(900);
  }

  const before = readDialog();
  const dialog = document.querySelector("[role='dialog']") || document.querySelector(".simple-modal.profile-modal") || document.querySelector(".MuiDialog-root") || document.body;
  const candidates = Array.from(dialog.querySelectorAll("button")).filter((button) => {
    const label = (button.innerText || button.getAttribute("aria-label") || "").trim().toLowerCase();
    return label !== "close" && !label.includes("close");
  });
  const editButton = candidates.find((button) => {
    const label = (button.innerText || button.getAttribute("aria-label") || "").trim().toLowerCase();
    const html = button.innerHTML.toLowerCase();
    return label.includes("edit") || html.includes("path") || html.includes("svg");
  }) || candidates.at(-1);
  if (editButton) {
    editButton.click();
    await wait(900);
  }

  return { clickedEdit: Boolean(editButton), before, after: readDialog() };
})()
