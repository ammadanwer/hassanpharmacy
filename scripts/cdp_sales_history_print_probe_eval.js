(async () => {
  const config = __CDP_CAPTURE_CONFIG__;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const text = (element) => (element?.innerText || element?.textContent || "").replace(/\s+/g, " ").trim();
  const fire = (element) => {
    if (!element) return false;
    ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach((type) => {
      element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    });
    return true;
  };
  const footer = () => document.body.innerText.match(/\b\d+\s*-\s*\d+\s*of\s*\d+\b/)?.[0] || "";
  const waitForAllRange = async (timeoutMs = 12000) => {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const match = footer().match(/(\d+)\s*-\s*(\d+)\s*of\s*(\d+)/);
      if (match && Number(match[3]) > 50) return true;
      await sleep(250);
    }
    return false;
  };
  const clickDateRange = () => {
    const input = document.querySelector("input[value='range']");
    if (input) return fire(input);
    const label = Array.from(document.querySelectorAll("label")).find((candidate) => text(candidate).toLowerCase().includes("date range"));
    return fire(label?.querySelector("input") || label);
  };
  const clickButton = (label) => {
    const wanted = label.toLowerCase();
    const target = Array.from(document.querySelectorAll("button,[role='button']")).find((button) => text(button).toLowerCase() === wanted);
    return fire(target);
  };

  clickDateRange();
  await waitForAllRange();

  const writes = [];
  let printed = false;
  const fakeDocument = {
    write: (html) => writes.push(String(html || "")),
    close: () => {},
  };
  window.open = () => ({
    document: fakeDocument,
    focus: () => {},
    print: () => { printed = true; },
  });

  const opened = clickButton("Print Sales History");
  await sleep(config.modalWait || 600);
  const printedClicked = clickButton("Print");
  await sleep(config.printWait || 900);
  const html = writes.join("");
  const textOutput = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return {
    url: location.href,
    opened,
    printedClicked,
    printed,
    htmlLength: html.length,
    headers: Array.from(html.matchAll(/<th[^>]*>(.*?)<\/th>/g)).map((match) => match[1].replace(/<[^>]+>/g, "").trim()).slice(0, 20),
    text: textOutput.slice(0, 5000),
  };
})()
