async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function textOf(element) {
  return (element?.innerText || element?.textContent || element?.getAttribute?.("aria-label") || element?.title || "").trim();
}

function readInputs(root = document) {
  return Array.from(root.querySelectorAll("input, select, textarea")).map((element) => ({
    tag: element.tagName,
    type: element.type || "",
    placeholder: element.placeholder || "",
    value: element.value || "",
    checked: Boolean(element.checked),
    text: element.innerText || "",
  }));
}

function readTables() {
  return Array.from(document.querySelectorAll("table")).map((table) => ({
    headers: Array.from(table.querySelectorAll("th")).map(textOf).filter(Boolean),
    rows: Array.from(table.querySelectorAll("tbody tr"))
      .map((row) => Array.from(row.querySelectorAll("td")).map(textOf))
      .filter((cells) => cells.some(Boolean))
      .slice(0, 8),
  }));
}

function readModal() {
  const modal = document.querySelector(".modal-backdrop, [role='dialog'], .MuiDialog-root, .simple-modal, .modal");
  if (!modal) return null;
  return {
    headings: Array.from(modal.querySelectorAll("h1,h2,h3")).map(textOf).filter(Boolean),
    labels: Array.from(modal.querySelectorAll("label")).map(textOf).filter(Boolean),
    buttons: Array.from(modal.querySelectorAll("button")).map(textOf).filter(Boolean),
    inputs: readInputs(modal),
  };
}

function readPageState(label) {
  return {
    label,
    url: location.href,
    title: document.title,
    headings: Array.from(document.querySelectorAll("h1,h2,h3")).map(textOf).filter(Boolean).slice(0, 20),
    buttons: Array.from(document.querySelectorAll("button")).map(textOf).filter(Boolean).slice(0, 80),
    inputs: readInputs(document).slice(0, 80),
    tables: readTables(),
    modal: readModal(),
    footerText: document.body.innerText.match(/\b\d+\s*-\s*\d+\s*of\s*\d+\b/)?.[0] || "",
    emptyText: document.body.innerText.includes("No Data found!") ? "No Data found!" : "",
  };
}

function clickByText(label) {
  const wanted = label.trim().toLowerCase();
  const target = Array.from(document.querySelectorAll("button,a,[role='button']"))
    .find((element) => textOf(element).toLowerCase() === wanted);
  if (!target) return false;
  target.click();
  return true;
}

(async () => {
  const config = __CDP_CAPTURE_CONFIG__;
  const states = [];
  await wait(config.initialWait || 700);
  states.push(readPageState("initial"));
  if (config.page === "expense") {
    const rangeInput = document.querySelector("input[value='range']");
    if (rangeInput) {
      rangeInput.click();
      await wait(config.filterWait || 1400);
      states.push(readPageState("range-selected"));
    }
    clickByText("Add Expense");
    await wait(700);
    states.push(readPageState("add-modal"));
  }
  if (config.page === "expense-category") {
    clickByText("Add New Category");
    await wait(700);
    states.push(readPageState("add-modal"));
  }
  return { page: config.page, states };
})();
