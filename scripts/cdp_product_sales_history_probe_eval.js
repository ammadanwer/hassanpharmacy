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
    element.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, cancelable: true, key: "Enter", code: "Enter" }));
    return true;
  };
  const scrapeTables = () => Array.from(document.querySelectorAll("table")).map((table) => ({
    headers: Array.from(table.querySelectorAll("th")).map(text).filter(Boolean),
    rows: Array.from(table.querySelectorAll("tbody tr"))
      .map((row) => Array.from(row.querySelectorAll("td")).map((cell) => normalize(text(cell))))
      .filter((row) => row.some(Boolean))
      .slice(0, 60),
  }));
  const scrapeInputs = () => Array.from(document.querySelectorAll("input, select, textarea")).map((element) => ({
    tag: element.tagName,
    type: element.type || "",
    placeholder: element.placeholder || "",
    value: element.value || "",
    checked: Boolean(element.checked),
    text: element.innerText || "",
  })).slice(0, 80);
  const readState = (label) => ({
    label,
    url: location.href,
    title: document.title,
    headings: Array.from(document.querySelectorAll("h1,h2,h3")).map(text).filter(Boolean).slice(0, 30),
    buttons: Array.from(document.querySelectorAll("button,[role='button'],a")).map(text).filter(Boolean).slice(0, 120),
    inputs: scrapeInputs(),
    tables: scrapeTables(),
    footerText: document.body.innerText.match(/\b\d+\s*-\s*\d+\s*of\s*\d+\b/)?.[0] || "",
    bodyExcerpt: normalize(document.body.innerText).slice(0, 2000),
  });
  const clickRange = () => {
    const input = document.querySelector("input[value='range']");
    if (input) return fire(input);
    const label = Array.from(document.querySelectorAll("label")).find((candidate) => text(candidate).toLowerCase().includes("date range"));
    return fire(label?.querySelector("input") || label);
  };
  const clickFirstProductHistory = () => {
    const exact = Array.from(document.querySelectorAll("button,[role='button'],a")).find((element) => text(element) === "View Product History");
    if (exact) return fire(exact);
    const firstRow = document.querySelector("table tbody tr");
    const actionCell = firstRow ? Array.from(firstRow.querySelectorAll("td")).at(-1) : null;
    const target = actionCell?.querySelector("button,[role='button'],[aria-label],svg,img");
    return fire(target?.closest("button,[role='button'],[aria-label]") || target);
  };
  const readModalHistoryPage = () => {
    const table = scrapeTables().find((candidate) => candidate.headers[0] === "Invoice Number");
    const footers = Array.from(document.body.innerText.matchAll(/\b\d+\s*-\s*\d+\s*of\s*\d+\b/g)).map((match) => match[0]);
    return { table, footer: footers.at(-1) || "" };
  };
  const clickModalNext = () => {
    const buttons = Array.from(document.querySelectorAll("button,[role='button']"))
      .filter((button) => text(button) === "NEXT >" && !button.disabled && button.getAttribute("aria-disabled") !== "true");
    return fire(buttons.at(-1));
  };

  const states = [];
  await wait(config.initialWait || 1200);
  states.push(readState("initial"));
  const rangeClicked = clickRange();
  await wait(config.filterWait || 900);
  const search = Array.from(document.querySelectorAll("input")).find((input) => input.placeholder === "Search...");
  const searchSet = setValue(search, config.search || "Panadol");
  await wait(config.searchWait || 1600);
  states.push({ ...readState("search-results"), rangeClicked, searchSet });
  const openedModal = clickFirstProductHistory();
  await wait(config.modalWait || 1400);
  states.push({ ...readState("history-modal"), openedModal });
  const modalPages = [];
  if (config.captureModalPages) {
    for (let index = 0; index < (config.maxModalPages || 5); index += 1) {
      modalPages.push(readModalHistoryPage());
      const beforeFooter = modalPages.at(-1).footer;
      if (!clickModalNext()) break;
      await wait(config.pageWait || 1100);
      const afterFooter = readModalHistoryPage().footer;
      if (afterFooter === beforeFooter) break;
    }
  }
  return { states, modalPages };
})()
