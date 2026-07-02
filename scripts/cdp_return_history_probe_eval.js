(async () => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const text = (el) => (el?.innerText || el?.textContent || "").trim();
  const fire = (el) => {
    if (!el) return false;
    ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach((type) => {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    });
    return true;
  };
  const setValue = (el, value) => {
    if (!el) return false;
    el.focus();
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value");
    if (descriptor?.set) descriptor.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText", data: value }));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, cancelable: true, key: "Enter", code: "Enter" }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
    return true;
  };
  const findInputByPlaceholder = (needle) => {
    const lower = needle.toLowerCase();
    return Array.from(document.querySelectorAll("input, textarea")).find((el) =>
      (el.placeholder || "").toLowerCase().includes(lower),
    );
  };
  const clickRadio = (needle) => {
    const lower = needle.toLowerCase();
    const labels = Array.from(document.querySelectorAll("label"));
    const label = labels.find((el) => text(el).toLowerCase().includes(lower));
    if (label) {
      const input = label.querySelector("input");
      return fire(input || label);
    }
    const input = Array.from(document.querySelectorAll("input[type='radio']")).find((el) =>
      (el.value || "").toLowerCase().includes(lower),
    );
    return fire(input);
  };
  const scrapeTables = () => Array.from(document.querySelectorAll("table")).map((table) => ({
    headers: Array.from(table.querySelectorAll("th")).map((cell) => text(cell)).filter(Boolean),
    rows: Array.from(table.querySelectorAll("tbody tr"))
      .map((row) => Array.from(row.querySelectorAll("td")).map((cell) => text(cell)))
      .filter((row) => row.some(Boolean)),
  }));
  const scrapeInputs = () => Array.from(document.querySelectorAll("input, select, textarea")).map((el) => ({
    tag: el.tagName,
    type: el.type || "",
    placeholder: el.placeholder || "",
    value: el.value || "",
    checked: Boolean(el.checked),
  }));
  const scrapeRadios = () => Array.from(document.querySelectorAll("label")).map((label) => {
    const input = label.querySelector("input[type='radio']");
    return input ? { label: text(label).replace(/\s+/g, " "), value: input.value, checked: input.checked } : null;
  }).filter(Boolean);
  const scrapeSummary = () => {
    const lines = document.body.innerText.split("\n").map((line) => line.trim()).filter(Boolean);
    const summary = {};
    for (const label of ["Gross Sales", "Total Return", "Net Sale"]) {
      const index = lines.findIndex((line) => line === label);
      if (index >= 0) summary[label] = lines[index + 1] || "";
    }
    return summary;
  };
  const scrapeState = (phase) => ({
    phase,
    url: location.href,
    title: document.title,
    headings: Array.from(document.querySelectorAll("h1,h2,h3")).map((el) => text(el)).filter(Boolean),
    buttons: Array.from(document.querySelectorAll("button")).map((button) => text(button) || button.getAttribute("aria-label") || button.title || "").filter(Boolean),
    inputs: scrapeInputs(),
    radios: scrapeRadios(),
    summary: scrapeSummary(),
    pagination: document.body.innerText.match(/\d+\s*-\s*\d+\s+of\s+\d+/)?.[0] || "",
    selectCount: document.querySelectorAll("select").length,
    tables: scrapeTables(),
    bodyText: document.body.innerText.slice(0, 12000),
  });

  clickRadio("range");
  await sleep(250);
  Array.from(document.querySelectorAll("input[type='date']")).forEach((input) => setValue(input, ""));
  const search = findInputByPlaceholder("invoice");
  setValue(search, "");
  await sleep(2200);
  const allRange = scrapeState("all-range");

  const invoiceSearch = findInputByPlaceholder("invoice");
  setValue(invoiceSearch, "229275");
  await sleep(1800);
  const focused = scrapeState("focused-229275");

  const firstDataRow = Array.from(document.querySelectorAll("table tbody tr")).find((row) =>
    Array.from(row.querySelectorAll("td")).some((cell) => text(cell).includes("229275")),
  );
  const actionButton = firstDataRow?.querySelector("button, [role='button'], a")
    || Array.from(document.querySelectorAll("button, [role='button'], a")).find((el) =>
      ["view", ""].includes(text(el).toLowerCase()) && (el.getAttribute("aria-label") || el.title || "").toLowerCase().includes("view"),
    );
  const clickedDetails = fire(actionButton);
  await sleep(1800);
  const withModal = scrapeState("details-229275");
  withModal.clickedDetails = clickedDetails;

  return { allRange, focused, withModal };
})()
