(async () => {
  const config = __CDP_CAPTURE_CONFIG__;
  const origin = config.origin || location.origin;
  const routes = config.routes || [];
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const text = (element) => (element?.innerText || element?.textContent || element?.getAttribute?.("aria-label") || element?.title || "").replace(/\s+/g, " ").trim();
  const routePath = (route) => route.startsWith("http") ? route : `${origin}${route}`;
  const readTables = () => Array.from(document.querySelectorAll("table")).map((table) => ({
    headers: Array.from(table.querySelectorAll("th")).map(text).filter(Boolean),
    rowCount: Array.from(table.querySelectorAll("tbody tr")).filter((row) => text(row)).length,
    firstRow: Array.from(table.querySelectorAll("tbody tr:first-child td")).map(text),
  })).filter((table) => table.headers.length || table.rowCount);
  const readPagination = () => {
    const footer = document.querySelector(".pagination");
    const buttons = Array.from(footer?.querySelectorAll("button") || []).map((button) => ({
      text: text(button),
      disabled: Boolean(button.disabled),
      className: button.className || "",
    }));
    const rowsInput = footer?.querySelector("input[aria-label='Rows per page']");
    return {
      exists: Boolean(footer),
      text: text(footer),
      buttons,
      rowsPerPageValue: rowsInput?.value || "",
      countText: text(footer?.querySelector(".page-count")),
      hasBack: buttons.some((button) => button.text === "< BACK"),
      hasNext: buttons.some((button) => button.text === "NEXT >"),
      activePage: buttons.find((button) => button.className.includes("primary"))?.text || "",
      pageButtons: buttons.filter((button) => /^\d+$/.test(button.text)).map((button) => button.text),
    };
  };
  const readState = (route) => ({
    route,
    url: location.href,
    title: document.title,
    headings: Array.from(document.querySelectorAll("h1,h2,h3")).map(text).filter(Boolean).slice(0, 10),
    selectCount: document.querySelectorAll("select").length,
    pagination: readPagination(),
    tables: readTables().slice(0, 4),
    bodyExcerpt: text(document.body).slice(0, 1800),
  });

  const results = [];
  for (const route of routes) {
    history.pushState({}, "", routePath(route));
    window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
    await wait(config.routeWait || 1600);
    results.push(readState(route));
  }
  return { results };
})()
