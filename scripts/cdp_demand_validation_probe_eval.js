(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const clickText = (text) => {
    const wanted = text.trim().toLowerCase();
    const target = Array.from(document.querySelectorAll("button,a,[role='button']")).find((el) => {
      const label = (el.innerText || el.getAttribute("aria-label") || el.title || "").trim().toLowerCase();
      return label === wanted;
    });
    if (!target) return false;
    target.click();
    return true;
  };
  const clickVisibleText = (text) => {
    const wanted = text.trim().toLowerCase();
    const target = Array.from(document.querySelectorAll("button,a,[role='button'],span,div,li")).find((el) => {
      const label = (el.innerText || "").trim().toLowerCase();
      return label === wanted;
    });
    if (!target) return false;
    target.click();
    return true;
  };

  if (!location.href.includes("/demand")) {
    const clicked = clickText("Demand/Order") || clickVisibleText("Demand/Order");
    if (!clicked) location.href = "/pms/dashboard/demand";
    await wait(1000);
  }

  const beforeText = document.body.innerText;
  const clickedAdd = clickText("Add To List") || clickText("Add to List") || clickVisibleText("Add To List") || clickVisibleText("Add to List");
  await wait(800);
  const modal = document.querySelector("[role='dialog']") || document.querySelector(".simple-modal.validation-modal") || document.querySelector(".swal2-popup") || document.querySelector(".MuiDialog-root");
  return {
    url: location.href,
    clickedAdd,
    beforeText: beforeText.slice(0, 1500),
    afterText: document.body.innerText.slice(0, 2000),
    modalText: (modal?.innerText || "").trim(),
    buttons: Array.from(document.querySelectorAll("button")).map((button) => button.innerText || button.getAttribute("aria-label") || button.title).filter(Boolean).slice(0, 80),
    inputs: Array.from(document.querySelectorAll("input,select,textarea")).map((el) => ({
      tag: el.tagName,
      type: el.type || "",
      placeholder: el.placeholder || "",
      value: el.value || "",
      text: el.innerText || "",
    })).slice(0, 80),
  };
})()
