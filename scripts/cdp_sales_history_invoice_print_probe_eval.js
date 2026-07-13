(async () => {
  const config = __CDP_CAPTURE_CONFIG__;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const fire = (element) => {
    if (!element) return false;
    ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach((type) => {
      element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    });
    return true;
  };

  await wait(config.initialWait || 500);
  const dateRange = document.querySelector("input[value='range']");
  const dateRangeClicked = fire(dateRange);
  await wait(config.resultsWait || 1800);

  const historyTable = Array.from(document.querySelectorAll("table")).find((table) =>
    Array.from(table.querySelectorAll("th")).some((heading) => normalize(heading.textContent) === "Invoice Number")
  );
  const row = historyTable?.querySelector("tbody tr");
  const cells = row ? Array.from(row.querySelectorAll("td")) : [];
  const invoiceNumber = normalize(cells[0]?.textContent).split(" ")[0] || "";
  const actionCell = cells.at(-1);
  const actions = actionCell
    ? Array.from(actionCell.querySelectorAll("button")).map((button) => ({
        ariaLabel: button.getAttribute("aria-label") || "",
        title: button.title || "",
      }))
    : [];
  const printAction = actionCell?.querySelector("button[title='Print Invoice']");
  const printActionClicked = fire(printAction);
  await wait(config.modalWait || 1200);

  const modal = document.querySelector(".invoice-modal");
  const modalHeading = normalize(modal?.querySelector("h2")?.textContent);
  const receiptText = normalize(modal?.querySelector("#invoice-receipt")?.textContent);
  const receiptItemRows = modal?.querySelectorAll("#invoice-receipt tbody tr").length || 0;
  const modalPrintButton = Array.from(modal?.querySelectorAll("button") || []).find(
    (button) => normalize(button.textContent) === "Print Invoice"
  );

  const printOutputs = [];
  const originalOpen = window.open;
  window.open = () => {
    const output = { html: "", printed: false };
    printOutputs.push(output);
    return {
      document: {
        write(value) { output.html += String(value); },
        close() {},
      },
      focus() {},
      print() { output.printed = true; },
    };
  };
  const modalPrintClicked = fire(modalPrintButton);
  await wait(config.printWait || 500);
  const shortcutEvent = new KeyboardEvent("keydown", { key: "p", code: "KeyP", ctrlKey: true, bubbles: true, cancelable: true });
  const shortcutPrevented = !window.dispatchEvent(shortcutEvent);
  await wait(config.printWait || 500);
  window.open = originalOpen;

  const buttonPrint = printOutputs[0] || { html: "", printed: false };
  const shortcutPrint = printOutputs[1] || { html: "", printed: false };
  const previewMarkup = modal?.querySelector("#invoice-receipt")?.outerHTML || "";
  const printedMarkup = new DOMParser().parseFromString(buttonPrint.html, "text/html").querySelector("#invoice-receipt")?.outerHTML || "";

  const checks = {
    dateRangeClicked,
    hasHistoryRow: Boolean(row),
    hasPrintAction: Boolean(printAction),
    printActionClicked,
    invoiceModalOpened: modalHeading === "Invoice Details",
    invoiceMatches: Boolean(invoiceNumber) && receiptText.includes(`Inv. No: ${invoiceNumber}`),
    hasReceiptItems: receiptItemRows > 0 && !receiptText.includes("No items found"),
    receiptOmitsPaymentRows: !receiptText.includes("Payment Received:") && !receiptText.includes("Due Payment:"),
    receiptOmitsFooterText: !receiptText.includes("Software By") && !receiptText.includes("Please check and verify your medicines") && !receiptText.includes("License No.") && !receiptText.includes("C. By:"),
    modalPrintClicked,
    buttonPrintCalled: buttonPrint.printed,
    shortcutPrevented,
    shortcutPrintCalled: shortcutPrint.printed,
    buttonAndShortcutMatch: buttonPrint.html === shortcutPrint.html,
    previewAndPrintMarkupMatch: Boolean(previewMarkup) && previewMarkup === printedMarkup,
    printContainsInvoice: Boolean(invoiceNumber) && buttonPrint.html.includes(`Inv. No: ${invoiceNumber}`),
    printContainsBrand: buttonPrint.html.includes("Hassan Pharmacy"),
    printOmitsPaymentRows: !buttonPrint.html.includes("Payment Received:") && !buttonPrint.html.includes("Due Payment:"),
    printOmitsFooterText: !buttonPrint.html.includes("Software By") && !buttonPrint.html.includes("Please check and verify your medicines") && !buttonPrint.html.includes("License No.") && !buttonPrint.html.includes("C. By:"),
  };

  return {
    passed: Object.values(checks).every(Boolean),
    invoiceNumber,
    actions,
    modalHeading,
    receiptItemRows,
    checks,
  };
})()
