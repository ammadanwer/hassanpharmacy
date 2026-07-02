(async () => {
  const config = __CDP_CAPTURE_CONFIG__;
  const limit = Number(config.limit || 20);
  const page = Math.max(1, Number(config.page || 1));
  const offset = Math.max(0, Number(config.offset || 0));
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const text = (element) => (element?.innerText || "").replace(/\s+/g, " ").trim();
  const clickLabel = async (labelText) => {
    const target = Array.from(document.querySelectorAll("label,button,[role='button']")).find((element) => text(element).toLowerCase() === labelText.toLowerCase());
    if (!target) return false;
    target.click();
    await sleep(1200);
    return true;
  };
  const tableInfo = (root) => Array.from(root.querySelectorAll("table")).map((table) => ({
    headers: Array.from(table.querySelectorAll("th")).map((cell) => text(cell)).filter(Boolean),
    rows: Array.from(table.querySelectorAll("tbody tr")).map((row) => Array.from(row.querySelectorAll("td")).map((cell) => text(cell))).filter((row) => row.some(Boolean)),
  }));
  const historyTable = () => Array.from(document.querySelectorAll("table")).find((table) => {
    const headers = Array.from(table.querySelectorAll("th")).map((cell) => text(cell));
    return headers.includes("Invoice Number") && headers.includes("Change Returned") && headers.includes("Action");
  });
  const historyRows = () => Array.from(historyTable()?.querySelectorAll("tbody tr") || []).filter((row) => row.querySelector("td"));
  const waitForHistoryRows = async (minimumRows = 1, timeoutMs = 8000) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const rows = historyRows();
      if (rows.length >= minimumRows) return rows;
      await sleep(250);
    }
    return historyRows();
  };
  const firstInvoiceNumber = () => {
    const firstRow = historyRows()[0];
    const firstCell = firstRow?.querySelector("td");
    return firstCell ? invoiceIdFromCell(text(firstCell)) : "";
  };
  const waitForFirstInvoiceChange = async (previousInvoice, timeoutMs = 8000) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const currentInvoice = firstInvoiceNumber();
      if (currentInvoice && currentInvoice !== previousInvoice) return historyRows();
      await sleep(250);
    }
    return historyRows();
  };
  const closeModal = async () => {
    const modal = Array.from(document.querySelectorAll(".MuiDialog-root,[role='dialog'],.modal-backdrop,section")).find((element) => text(element).includes("Sales History Details"));
    const closeButton = Array.from((modal || document).querySelectorAll("button")).reverse().find((button) => ["close", "Close"].includes(text(button)) || (button.getAttribute("aria-label") || "").toLowerCase() === "close");
    if (closeButton) {
      closeButton.click();
      await sleep(500);
      return true;
    }
    return false;
  };
  const invoiceIdFromCell = (cellText) => cellText.split(/\s+/).find((part) => /^\d+$/.test(part)) || cellText;

  await clickLabel("Date Range");
  await waitForHistoryRows(1);
  for (let currentPage = 1; currentPage < page; currentPage += 1) {
    const next = Array.from(document.querySelectorAll("button")).find((button) => text(button) === "NEXT >" && !button.disabled);
    if (!next) break;
    const beforeInvoice = firstInvoiceNumber();
    next.click();
    await waitForFirstInvoiceChange(beforeInvoice);
  }

  const rows = (await waitForHistoryRows(offset + 1)).slice(offset, offset + limit);
  const captures = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = historyRows()[offset + index];
    if (!row) continue;
    const cells = Array.from(row.querySelectorAll("td")).map((cell) => text(cell));
    const invoiceNumber = invoiceIdFromCell(cells[0] || "");
    const viewButton = Array.from(row.querySelectorAll("button")).find((button) => text(button).toLowerCase() === "view" || button.title?.toLowerCase() === "view" || button.getAttribute("aria-label")?.toLowerCase() === "view");
    if (!viewButton) {
      captures.push({ invoiceNumber, index, row: cells, error: "view button not found" });
      continue;
    }
    viewButton.click();
    await sleep(900);
    const detailRoot = Array.from(document.querySelectorAll(".MuiDialog-root,[role='dialog'],.modal-backdrop,section")).find((element) => text(element).includes("Sales History Details")) || document.body;
    captures.push({
      invoiceNumber,
      index: offset + index,
      row: cells,
      headingText: text(detailRoot.querySelector("h2,h3") || detailRoot),
      detailText: text(detailRoot).slice(0, 5000),
      tables: tableInfo(detailRoot),
    });
    await closeModal();
  }
  return {
    url: location.href,
    page,
    offset,
    limit,
    captured: captures.length,
    captures,
  };
})()
