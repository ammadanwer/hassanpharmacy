(async () => {
  const config = __CDP_CAPTURE_CONFIG__;
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
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  };
  const buttons = () => Array.from(document.querySelectorAll("button,[role='button'],a"));
  const inputs = () => Array.from(document.querySelectorAll("input, select, textarea"));
  const byText = (wanted) => buttons().find((element) => text(element) === wanted);
  const readInputs = () => inputs().map((input) => ({
    tag: input.tagName,
    type: input.type || "",
    name: input.name || "",
    placeholder: input.placeholder || "",
    value: input.value || "",
    checked: Boolean(input.checked),
    disabled: Boolean(input.disabled),
  }));
  const readTables = () => Array.from(document.querySelectorAll("table")).map((table) => ({
    headers: Array.from(table.querySelectorAll("th")).map(text).filter(Boolean),
    rows: Array.from(table.querySelectorAll("tbody tr"))
      .map((row) => Array.from(row.querySelectorAll("td")).map(text))
      .filter((row) => row.some(Boolean))
      .slice(0, 8),
  }));
  const readState = (label) => ({
    label,
    url: location.href,
    headings: Array.from(document.querySelectorAll("h1,h2,h3")).map(text).filter(Boolean),
    buttons: buttons().map(text).filter(Boolean).slice(0, 80),
    inputs: readInputs().slice(0, 80),
    paymentRadios: readInputs().filter((input) => input.name === "payment-method"),
    tables: readTables(),
    bodyExcerpt: text(document.body).slice(0, 2500),
  });
  await wait(config.initialWait || 1200);
  const states = [readState("initial")];
  const productInput = inputs().find((input) => input.placeholder === "Enter Product Name");
  setValue(productInput, config.product || "Dopamine");
  await wait(config.suggestWait || 800);
  const suggestion = Array.from(document.querySelectorAll(".suggestions button")).find((button) => text(button).toLowerCase().includes((config.product || "Dopamine").toLowerCase()));
  const selectedSuggestion = fire(suggestion);
  await wait(500);
  const qtyInput = inputs().find((input) => input.placeholder === "Enter quantity");
  setValue(qtyInput, String(config.quantity || 1));
  const addClicked = fire(byText("Add to List"));
  await wait(config.addWait || 900);
  states.push({ ...readState("after-add"), selectedSuggestion, addClicked });
  const checkoutClicked = fire(byText("Proceed to Checkout"));
  await wait(config.checkoutWait || 900);
  states.push({ ...readState("checkout"), checkoutClicked });
  return { states };
})()
