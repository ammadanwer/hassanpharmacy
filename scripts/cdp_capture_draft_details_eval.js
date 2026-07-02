(async () => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const text = (element) => (element?.innerText || "").replace(/\s+/g, " ").trim();
  const clickText = async (wanted) => {
    const target = Array.from(document.querySelectorAll("button,a,label,[role='button']")).find((element) => text(element).toLowerCase() === wanted.toLowerCase());
    if (!target) return false;
    target.click();
    await sleep(900);
    return true;
  };
  const tableInfo = (root) => Array.from(root.querySelectorAll("table")).map((table) => ({
    headers: Array.from(table.querySelectorAll("th")).map((cell) => text(cell)).filter(Boolean),
    rows: Array.from(table.querySelectorAll("tbody tr")).map((row) => Array.from(row.querySelectorAll("td")).map((cell) => text(cell))).filter((row) => row.some(Boolean)),
  }));
  const draftRows = () => {
    const table = Array.from(document.querySelectorAll("table")).find((candidate) => {
      const headers = Array.from(candidate.querySelectorAll("th")).map((cell) => text(cell));
      return headers.includes("Draft ID") && headers.includes("Total Items");
    });
    if (!table) return [];
    return Array.from(table.querySelectorAll(":scope > tbody > tr")).filter((row) => {
      const firstCell = row.querySelector(":scope > td");
      return firstCell && /^\d+$/.test(text(firstCell));
    });
  };
  const capturePage = async (page) => {
    const ids = draftRows().map((row) => text(row.querySelector(":scope > td")));
    const captures = [];
    for (const draftId of ids) {
      const row = draftRows().find((candidate) => text(candidate.querySelector(":scope > td")) === draftId);
      if (!row) continue;
      const edit = Array.from(row.querySelectorAll("button")).find((button) => text(button).toLowerCase() === "edit" || button.getAttribute("aria-label")?.toLowerCase() === "edit" || button.title?.toLowerCase() === "edit");
      if (!edit) {
        captures.push({ draftId, page, error: "edit button not found" });
        continue;
      }
      edit.click();
      await sleep(900);
      const refreshed = draftRows().find((candidate) => text(candidate.querySelector(":scope > td")) === draftId);
      const expanded = refreshed?.nextElementSibling || null;
      captures.push({
        draftId,
        page,
        row: Array.from(refreshed?.querySelectorAll(":scope > td") || []).map((cell) => text(cell)),
        expandedText: text(expanded),
        tables: expanded ? tableInfo(expanded) : [],
      });
    }
    return captures;
  };

  await clickText("Draft Sales");
  const pages = [];
  pages.push(...await capturePage(1));
  const next = Array.from(document.querySelectorAll("button")).find((button) => text(button) === "NEXT >" && !button.disabled);
  if (next) {
    next.click();
    await sleep(1000);
    pages.push(...await capturePage(2));
  }
  return {
    url: location.href,
    captured: pages.length,
    pages,
  };
})()
