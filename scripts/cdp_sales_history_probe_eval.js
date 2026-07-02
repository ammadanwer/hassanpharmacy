(async () => {
  const config = __CDP_CAPTURE_CONFIG__;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const text = (element) => (element?.innerText || element?.textContent || element?.getAttribute?.("aria-label") || element?.title || "").trim();
  const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
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
  const tableData = () => Array.from(document.querySelectorAll("table")).map((table) => ({
    headers: Array.from(table.querySelectorAll("th")).map(text).filter(Boolean),
    rows: Array.from(table.querySelectorAll("tbody tr"))
      .map((row) => Array.from(row.querySelectorAll("td")).map((cell) => normalize(text(cell))))
      .filter((row) => row.some(Boolean))
      .slice(0, config.maxRows || 20),
  }));
  const inputs = () => Array.from(document.querySelectorAll("input, select, textarea")).map((element) => ({
    tag: element.tagName,
    type: element.type || "",
    placeholder: element.placeholder || "",
    value: element.value || "",
    checked: Boolean(element.checked),
    text: element.innerText || "",
  })).slice(0, 80);
  const buttons = () => Array.from(document.querySelectorAll("button,[role='button'],a"))
    .map((element) => normalize(text(element)))
    .filter(Boolean)
    .slice(0, 100);
  const rangeFooters = () => Array.from(document.body.innerText.matchAll(/\b\d+\s*-\s*\d+\s*of\s*\d+\b/g)).map((match) => match[0]);
  const summaryCards = () => Array.from(document.querySelectorAll(".sales-summary-metric")).map((card) => normalize(card.innerText));
  const readState = (label) => ({
    label,
    url: location.href,
    title: document.title,
    headings: Array.from(document.querySelectorAll("h1,h2,h3,h4")).map(text).filter(Boolean).slice(0, 40),
    buttons: buttons(),
    inputs: inputs(),
    tables: tableData(),
    summaries: summaryCards(),
    footers: rangeFooters(),
    selectCount: document.querySelectorAll("select").length,
    bodyExcerpt: normalize(document.body.innerText).slice(0, 2400),
  });
  const clickDateRange = () => {
    const input = document.querySelector("input[value='range']");
    if (input) return fire(input);
    const label = Array.from(document.querySelectorAll("label")).find((candidate) => normalize(text(candidate)).toLowerCase().includes("date range"));
    return fire(label?.querySelector("input") || label);
  };
  const openStatusPicker = () => {
    const target = document.querySelector("[aria-label='Sale status']") || Array.from(document.querySelectorAll("button,[role='button']")).find((button) => normalize(text(button)) === "All");
    return fire(target);
  };
  const closeOpenPopup = () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape", code: "Escape" }));
  };
  const openPrintOptions = () => {
    const target = Array.from(document.querySelectorAll("button,[role='button']")).find((button) => normalize(text(button)).includes("Print Sales History"));
    return fire(target);
  };
  const clickFirstView = () => {
    const table = Array.from(document.querySelectorAll("table")).find((candidate) =>
      Array.from(candidate.querySelectorAll("th")).some((th) => text(th) === "Invoice Number")
    );
    const firstRow = table?.querySelector("tbody tr");
    const actionCell = firstRow ? Array.from(firstRow.querySelectorAll("td")).at(-1) : null;
    const target = actionCell?.querySelector("button,[role='button'],[aria-label],svg,img");
    return fire(target?.closest("button,[role='button'],[aria-label]") || target);
  };
  const closeModal = () => {
    const closeButtons = Array.from(document.querySelectorAll("button"))
      .filter((button) => ["cancel", "close", "x"].includes(normalize(text(button)).toLowerCase()));
    if (closeButtons.length) return fire(closeButtons.at(-1));
    const modalHeads = Array.from(document.querySelectorAll(".invoice-head, .modal-head, .modal-header"));
    const iconButton = modalHeads.at(-1)?.querySelector("button");
    return fire(iconButton);
  };

  const states = [];
  await wait(config.initialWait || 1200);
  states.push(readState("initial"));
  const rangeClicked = clickDateRange();
  await wait(config.rangeWait || 1600);
  states.push({ ...readState("all-range"), rangeClicked });
  const statusOpened = openStatusPicker();
  await wait(config.popupWait || 500);
  states.push({ ...readState("status-picker-open"), statusOpened });
  closeOpenPopup();
  await wait(200);
  const printOptionsOpened = openPrintOptions();
  await wait(config.popupWait || 500);
  states.push({ ...readState("print-options-open"), printOptionsOpened });
  closeModal();
  await wait(300);
  const detailOpened = clickFirstView();
  await wait(config.modalWait || 1000);
  states.push({ ...readState("first-detail"), detailOpened });
  return { states };
})()
