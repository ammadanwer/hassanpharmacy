(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const clean = (value) => (value || "").replace(/\s+/g, " ").trim();

  function tableSnapshot() {
    return Array.from(document.querySelectorAll("table")).map((table) => ({
      headers: Array.from(table.querySelectorAll("th")).map((cell) => clean(cell.innerText)).filter(Boolean),
      rows: Array.from(table.querySelectorAll("tbody tr"))
        .map((row) => Array.from(row.querySelectorAll("td")).map((cell) => clean(cell.innerText)))
        .filter((row) => row.some(Boolean)),
    }));
  }

  function bodyPageText() {
    const text = document.body.innerText || "";
    return text
      .split("\n")
      .map(clean)
      .filter(Boolean)
      .filter((line) => /of\s+\d+|NEXT|PREVIOUS|No Data Found|Rows per page|Product Name/i.test(line))
      .slice(-30);
  }

  function nextButton() {
    return Array.from(document.querySelectorAll("button")).find((button) => clean(button.innerText) === "NEXT >");
  }

  function isDisabled(button) {
    if (!button) return true;
    return button.disabled || button.getAttribute("aria-disabled") === "true" || button.className.toString().toLowerCase().includes("disabled");
  }

  async function waitForTableReady(previousSignature) {
    for (let index = 0; index < 40; index += 1) {
      await wait(150);
      const rows = tableSnapshot()[0]?.rows || [];
      const current = JSON.stringify(rows);
      const hasData = rows.some((row) => row[0] && row[0] !== "No Data Found");
      const hasEmptyState = rows.some((row) => row[0] === "No Data Found");
      if (current !== previousSignature && (hasData || hasEmptyState)) return true;
    }
    return false;
  }

  await wait(1200);
  const pages = [];
  const seenPageSignatures = new Set();

  for (let pageIndex = 0; pageIndex < 12; pageIndex += 1) {
    const tables = tableSnapshot();
    const rows = tables[0]?.rows || [];
    const signature = JSON.stringify(rows);
    pages.push({
      pageIndex: pageIndex + 1,
      url: location.href,
      text: bodyPageText(),
      headers: tables[0]?.headers || [],
      rows,
      rowCount: rows.filter((row) => row[0] && row[0] !== "No Data Found").length,
      nextDisabled: isDisabled(nextButton()),
    });

    if (isDisabled(nextButton())) break;
    if (seenPageSignatures.has(signature)) break;
    seenPageSignatures.add(signature);
    nextButton().click();
    await wait(700);
    const changed = await waitForTableReady(signature);
    if (!changed) {
      await wait(1600);
    }
  }

  const rows = pages.flatMap((page) => page.rows).filter((row) => row[0] && row[0] !== "No Data Found");
  return {
    capturedAt: new Date().toISOString(),
    url: location.href,
    pageCount: pages.length,
    totalRows: rows.length,
    uniqueFirstCells: new Set(rows.map((row) => row[0])).size,
    pages,
  };
})()
