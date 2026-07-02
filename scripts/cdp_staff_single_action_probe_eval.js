(async () => {
  const config = __CDP_CAPTURE_CONFIG__;
  const label = config.label || "View";
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const text = (el) => (el?.innerText || el?.textContent || "").trim();
  const fire = (el) => {
    if (!el) return false;
    ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach((type) => {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    });
    return true;
  };
  const actionSelector = (value) => [
    `img[alt="${value}"]`,
    `img[aria-label="${value}"]`,
    `button[aria-label="${value}"]`,
    `[title="${value}"]`,
  ].join(",");
  const scrapeTables = () => Array.from(document.querySelectorAll("table")).map((table) => ({
    headers: Array.from(table.querySelectorAll("th")).map((cell) => text(cell)).filter(Boolean),
    rows: Array.from(table.querySelectorAll("tbody tr"))
      .map((row) => Array.from(row.querySelectorAll("td")).map((cell) => text(cell)))
      .filter((row) => row.some(Boolean))
      .slice(0, 8),
  }));
  const headingContexts = () => Array.from(document.querySelectorAll("h1,h2,h3"))
    .map((heading) => {
      let node = heading;
      for (let depth = 0; depth < 5 && node?.parentElement; depth += 1) node = node.parentElement;
      return {
        heading: text(heading),
        context: text(node).replace(/\s+/g, " ").slice(0, 3000),
      };
    })
    .filter((item) => item.heading);

  await sleep(3500);
  const firstRow = document.querySelector("table tbody tr");
  const actionCell = firstRow ? Array.from(firstRow.querySelectorAll("td")).at(-1) : null;
  const before = {
    bodyText: document.body.innerText.slice(0, 8000),
    tables: scrapeTables(),
    actionCellHtml: actionCell?.outerHTML.slice(0, 2500) || "",
  };
  const clicked = fire(actionCell?.querySelector(actionSelector(label)));
  await sleep(1200);
  return {
    label,
    clicked,
    before,
    after: {
      bodyText: document.body.innerText.slice(0, 14000),
      headings: Array.from(document.querySelectorAll("h1,h2,h3")).map((el) => text(el)).filter(Boolean),
      headingContexts: headingContexts(),
      buttons: Array.from(document.querySelectorAll("button,[role='button'],a"))
        .map((el) => text(el) || el.getAttribute("aria-label") || el.title || "")
        .filter(Boolean)
        .slice(0, 120),
      inputs: Array.from(document.querySelectorAll("input, textarea, select")).map((el) => ({
        tag: el.tagName,
        type: el.type || "",
        placeholder: el.placeholder || "",
        value: el.value || "",
        checked: Boolean(el.checked),
      })).slice(0, 220),
      tables: scrapeTables(),
    },
  };
})()
