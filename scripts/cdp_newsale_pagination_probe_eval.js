(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const text = (element) => (element?.innerText || element?.textContent || element?.getAttribute?.("aria-label") || element?.title || "").replace(/\s+/g, " ").trim();
  const fire = (element) => {
    if (!element) return false;
    ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach((type) => {
      element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    });
    return true;
  };
  const readPagination = () => {
    const footer = document.querySelector(".pagination");
    const buttons = Array.from(footer?.querySelectorAll("button") || []).map((button) => ({
      text: text(button),
      disabled: Boolean(button.disabled),
      className: button.className || "",
    }));
    return {
      exists: Boolean(footer),
      text: text(footer),
      countText: text(footer?.querySelector(".page-count")),
      rowsPerPageValue: footer?.querySelector("input[aria-label='Rows per page']")?.value || "",
      hasBack: buttons.some((button) => button.text === "< BACK"),
      hasNext: buttons.some((button) => button.text === "NEXT >"),
      activePage: buttons.find((button) => button.className.includes("primary"))?.text || "",
      pageButtons: buttons.filter((button) => /^\d+$/.test(button.text)).map((button) => button.text),
    };
  };
  const readState = (label) => ({
    label,
    url: location.href,
    selectCount: document.querySelectorAll("select").length,
    pagination: readPagination(),
    tableHeaders: Array.from(document.querySelectorAll("table")).map((table) => Array.from(table.querySelectorAll("th")).map(text).filter(Boolean)).filter((headers) => headers.length),
    bodyExcerpt: text(document.body).slice(0, 1800),
  });
  const clickLabel = async (label) => {
    const target = Array.from(document.querySelectorAll("label,button,[role='button']")).find((element) => text(element).toLowerCase() === label.toLowerCase());
    const clicked = fire(target?.querySelector("input") || target);
    await wait(1400);
    return clicked;
  };
  const states = [];
  await wait(1200);
  states.push(readState("new-sales"));
  const recentClicked = await clickLabel("Recent Sales");
  states.push({ ...readState("recent-sales"), clicked: recentClicked });
  const draftClicked = await clickLabel("Draft Sales");
  states.push({ ...readState("draft-sales"), clicked: draftClicked });
  return { states };
})()
