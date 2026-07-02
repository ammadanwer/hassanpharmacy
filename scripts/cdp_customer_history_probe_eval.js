(async () => {
  const config = __CDP_CAPTURE_CONFIG__;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const textOf = (element) => (element?.innerText || element?.textContent || element?.getAttribute?.("aria-label") || element?.title || "").trim();
  const normalize = (element) => textOf(element).replace(/\s+/g, " ").trim();
  const fire = (element) => {
    if (!element) return false;
    ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach((type) => {
      element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    });
    return true;
  };
  const readInputs = (root = document) => Array.from(root.querySelectorAll("input, select, textarea")).map((element) => ({
    tag: element.tagName,
    type: element.type || "",
    placeholder: element.placeholder || "",
    value: element.value || "",
    checked: Boolean(element.checked),
    text: element.innerText || "",
  }));
  const readTables = () => Array.from(document.querySelectorAll("table")).map((table) => ({
    headers: Array.from(table.querySelectorAll("th")).map(textOf).filter(Boolean),
    rows: Array.from(table.querySelectorAll("tbody tr"))
      .map((row) => Array.from(row.querySelectorAll("td")).map((cell) => normalize(cell)))
      .filter((cells) => cells.some(Boolean))
      .slice(0, 20),
  }));
  const readState = (label) => ({
    label,
    url: location.href,
    title: document.title,
    headings: Array.from(document.querySelectorAll("h1,h2,h3")).map(textOf).filter(Boolean).slice(0, 20),
    buttons: Array.from(document.querySelectorAll("button,[role='button'],a")).map(textOf).filter(Boolean).slice(0, 100),
    inputs: readInputs().slice(0, 60),
    tables: readTables(),
    footerText: document.body.innerText.match(/\b\d+\s*-\s*\d+\s*of\s*\d+\b/)?.[0] || "",
    bodyExcerpt: document.body.innerText.replace(/\s+/g, " ").trim().slice(0, 1800),
  });
  const rowActionTargets = (rowLabel) => {
    const wanted = rowLabel.trim().toLowerCase();
    const row = Array.from(document.querySelectorAll("tbody tr")).find((candidate) => {
      const firstCell = candidate.querySelector("td");
      return firstCell && textOf(firstCell).trim().toLowerCase() === wanted;
    });
    const actionCell = row ? Array.from(row.querySelectorAll("td")).at(-1) : null;
    return Array.from(actionCell?.querySelectorAll("button,[role='button'],svg,img,[title],[aria-label]") || [])
      .map((element) => element.closest("button,[role='button'],[aria-label],[title]") || element)
      .filter((element, index, list) => element && list.indexOf(element) === index);
  };
  const clickButtonInRow = (rowLabel, buttonIndex = 0) => fire(rowActionTargets(rowLabel)[buttonIndex]);
  const invoiceActionTargets = () => {
    const paymentTable = Array.from(document.querySelectorAll("table")).find((table) =>
      Array.from(table.querySelectorAll("th")).some((th) => textOf(th) === "Invoice No.")
    );
    const firstBodyRow = paymentTable?.querySelector("tbody tr");
    const actionCell = firstBodyRow ? Array.from(firstBodyRow.querySelectorAll("td")).at(-1) : null;
    return Array.from(actionCell?.querySelectorAll("button,[role='button'],svg,img,[title],[aria-label]") || [])
      .map((element) => element.closest("button,[role='button'],[aria-label],[title]") || element)
      .filter((element, index, list) => element && list.indexOf(element) === index);
  };
  const clickInvoiceAction = (index = 0) => fire(invoiceActionTargets()[index]);
  const closeTopModal = () => {
    const closeButtons = Array.from(document.querySelectorAll("button")).filter((button) => textOf(button).toLowerCase() === "close" || button.getAttribute("aria-label") === "close");
    return fire(closeButtons.at(-1));
  };

  const states = [];
  await wait(config.initialWait || 1200);
  states.push(readState("initial"));
  const openedPaymentHistory = clickButtonInRow(config.customer || "abdulmanan", config.customerActionIndex ?? 1) || clickButtonInRow(config.customer || "abdulmanan", 0);
  await wait(config.modalWait || 1200);
  states.push({ ...readState("payment-history"), openedPaymentHistory });
  const openedView = clickInvoiceAction(0);
  await wait(config.modalWait || 1200);
  states.push({ ...readState("sales-history-details"), openedView });
  closeTopModal();
  await wait(500);
  const openedPrint = clickInvoiceAction(1);
  await wait(config.modalWait || 1200);
  states.push({ ...readState("invoice-details"), openedPrint });
  return { states };
})()
