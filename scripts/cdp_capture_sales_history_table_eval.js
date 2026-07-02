(async () => {
  const config = __CDP_CAPTURE_CONFIG__;
  const maxPages = Number(config.maxPages || 20);
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const text = (element) => (element?.innerText || element?.textContent || "").replace(/\s+/g, " ").trim();
  const rawText = (element) => (element?.innerText || element?.textContent || "").trim();
  const clickElement = (element) => {
    if (!element) return false;
    ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach((type) => {
      element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    });
    return true;
  };
  const historyTable = () => Array.from(document.querySelectorAll("table")).find((table) => {
    const headers = Array.from(table.querySelectorAll("th")).map(text);
    return headers.includes("Invoice Number") && headers.includes("Change Returned") && headers.includes("Action");
  });
  const tableRows = () => Array.from(historyTable()?.querySelectorAll("tbody tr") || []).filter((row) => row.querySelector("td"));
  const invoiceId = (row) => text(row?.querySelector("td")).split(/\s+/).find((part) => /^\d+$/.test(part)) || "";
  const footerText = () => document.body.innerText.match(/\b\d+\s*-\s*\d+\s*of\s*\d+\b/)?.[0] || "";
  const waitForRows = async (timeoutMs = 10000) => {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const rows = tableRows();
      if (rows.length) return rows;
      await sleep(200);
    }
    return tableRows();
  };
  const waitForPageChange = async (previousFirst, previousFooter, timeoutMs = 10000) => {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const rows = tableRows();
      const currentFirst = invoiceId(rows[0]);
      const currentFooter = footerText();
      if (rows.length && (currentFirst !== previousFirst || currentFooter !== previousFooter)) return rows;
      await sleep(250);
    }
    return tableRows();
  };
  const scrapeTable = () => {
    const table = historyTable();
    return {
      headers: Array.from(table?.querySelectorAll("th") || []).map(text).filter(Boolean),
      rows: Array.from(table?.querySelectorAll("tbody tr") || [])
        .map((row) => Array.from(row.querySelectorAll("td")).map((cell) => rawText(cell)))
        .filter((row) => row.some((cell) => text({ innerText: cell }))),
    };
  };
  const clickDateRange = () => {
    const input = document.querySelector("input[value='range']");
    if (input) return clickElement(input);
    const label = Array.from(document.querySelectorAll("label")).find((candidate) => text(candidate).toLowerCase().includes("date range"));
    return clickElement(label?.querySelector("input") || label);
  };
  const waitForAllRange = async (timeoutMs = 12000) => {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const footer = footerText();
      const match = footer.match(/(\d+)\s*-\s*(\d+)\s*of\s*(\d+)/);
      const checkedRange = document.querySelector("input[value='range']")?.checked;
      if (checkedRange && match && Number(match[3]) > 5) return true;
      await sleep(250);
    }
    return false;
  };
  const nextButton = () => Array.from(document.querySelectorAll("button")).find((button) => text(button) === "NEXT >" && !button.disabled);

  clickDateRange();
  await waitForAllRange();
  await waitForRows();

  const scrapedTables = [];
  const pageSummaries = [];
  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    const rows = await waitForRows();
    const table = scrapeTable();
    scrapedTables.push([table]);
    pageSummaries.push({
      page: pageIndex + 1,
      rowCount: table.rows.length,
      firstInvoice: invoiceId(rows[0]),
      lastInvoice: invoiceId(rows.at(-1)),
      footer: footerText(),
    });
    const footer = footerText();
    const match = footer.match(/(\d+)\s*-\s*(\d+)\s*of\s*(\d+)/);
    if (match && Number(match[2]) >= Number(match[3])) break;
    const next = nextButton();
    if (!next) break;
    const previousFirst = invoiceId(rows[0]);
    const previousFooter = footerText();
    clickElement(next);
    await waitForPageChange(previousFirst, previousFooter);
  }

  return {
    url: location.href,
    title: document.title,
    text: document.body.innerText.slice(0, 4000),
    pageSummaries,
    scrapedTables,
  };
})()
