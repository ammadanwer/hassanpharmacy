(async () => {
  const config = __CDP_CAPTURE_CONFIG__;
  const invoice = config.invoice || "233964";
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const text = (element) => (element?.innerText || element?.textContent || element?.getAttribute?.("aria-label") || element?.title || "").replace(/\s+/g, " ").trim();
  const fire = (element) => {
    if (!element) return false;
    ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach((type) => {
      element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    });
    return true;
  };
  const setValue = (element, value) => {
    if (!element) return false;
    element.focus();
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value");
    if (descriptor?.set) descriptor.set.call(element, value);
    else element.value = value;
    element.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText", data: value }));
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  };
  const pressEnter = (element) => {
    if (!element) return false;
    element.focus();
    element.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter", code: "Enter" }));
    element.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, cancelable: true, key: "Enter", code: "Enter" }));
    return true;
  };
  const readTables = () => Array.from(document.querySelectorAll("table")).map((table) => ({
    headers: Array.from(table.querySelectorAll("th")).map(text).filter(Boolean),
    rows: Array.from(table.querySelectorAll("tbody tr"))
      .map((row) => Array.from(row.querySelectorAll("td")).map((cell) => text(cell)))
      .filter((row) => row.some(Boolean)),
  })).filter((table) => table.headers.length || table.rows.length);
  const readState = (label) => ({
    label,
    url: location.href,
    title: document.title,
    headings: Array.from(document.querySelectorAll("h1,h2,h3")).map(text).filter(Boolean),
    buttons: Array.from(document.querySelectorAll("button,[role='button'],a")).map(text).filter(Boolean).slice(0, 80),
    inputs: Array.from(document.querySelectorAll("input, select, textarea")).map((input) => ({
      tag: input.tagName,
      type: input.type || "",
      placeholder: input.placeholder || "",
      value: input.value || "",
      checked: Boolean(input.checked),
      readOnly: Boolean(input.readOnly),
      disabled: Boolean(input.disabled),
    })).slice(0, 80),
    selectCount: document.querySelectorAll("select").length,
    tables: readTables(),
    bodyExcerpt: text(document.body).slice(0, 2600),
  });
  await wait(config.initialWait || 1200);
  const before = readState("empty");
  const invoiceInput = Array.from(document.querySelectorAll("input")).find((input) =>
    (input.placeholder || "").toLowerCase().includes("invoice") || text(input.closest("label")).toLowerCase().includes("reference invoice")
  );
  const setInvoice = setValue(invoiceInput, invoice);
  await wait(config.enterDelay || 250);
  const enterPressed = pressEnter(invoiceInput);
  await wait(config.lookupWait || 1800);
  const after = { ...readState("after-lookup"), setInvoice, enterPressed };
  return { invoice, before, after };
})()
