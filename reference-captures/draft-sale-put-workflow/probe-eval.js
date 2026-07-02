(async () => {
  const output = {
    events: [],
    errors: [],
  };
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const request = async (path, options = {}, token = localStorage.getItem("hassanPharmacyToken") || "") => {
    const headers = { ...(options.headers || {}) };
    if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(path, { ...options, headers });
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(body)}`);
    return body;
  };
  const click = (element) => {
    element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
    element.click();
  };
  const setInput = (input, value) => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    descriptor.set.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };
  const tableRows = () => Array.from(document.querySelectorAll(".sale-list-view tbody tr")).filter((row) => row.querySelectorAll("td").length === 8);
  const rowValues = (row) => Array.from(row.querySelectorAll("td")).map((cell) => cell.innerText.trim());
  const fetchEvents = [];
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const requestInfo = args[0];
    const options = args[1] || {};
    const url = typeof requestInfo === "string" ? requestInfo : requestInfo?.url || "";
    const method = (options.method || requestInfo?.method || "GET").toUpperCase();
    if (String(url).includes("/api/draft-sales")) fetchEvents.push({ method, url: String(url) });
    return originalFetch(...args);
  };

  let created = null;
  try {
    const auth = await request("/api/auth/login?username=admin%40hassanpharmacy.test.com&password=admin123", { method: "POST" }, "");
    const me = await request("/api/auth/me", {}, auth.access_token);
    localStorage.setItem("hassanPharmacyToken", auth.access_token);
    localStorage.setItem("hassanPharmacyUser", JSON.stringify(me));
    history.replaceState({ route: "newsale" }, "", "/pms/dashboard/newsale");
    window.dispatchEvent(new PopStateEvent("popstate", { state: { route: "newsale" } }));
    await wait(1200);

    const batches = await request("/api/batches?limit=5000");
    const batchRows = Array.isArray(batches) ? batches : batches.items || [];
    const batch = batchRows.find((item) => Number(item.stock_remaining || 0) >= 3 && item.status !== "reported" && Number(item.sell_price || 0) > 0);
    if (!batch) throw new Error("No suitable batch for draft probe");
    const rate = Number(batch.sell_price || 1);
    const makePayload = (qty, discountAmount, customerName) => {
      const amount = Number((qty * rate).toFixed(2));
      const payable = Number(Math.max(0, amount - discountAmount).toFixed(2));
      return {
        customer_name: customerName,
        customer_phone: null,
        doctor_name: null,
        date: new Date().toISOString().slice(0, 10),
        time: "10:15:00",
        total_amount: amount,
        discount_percent: null,
        discount_amount: discountAmount || null,
        total_payable: payable,
        paid: 0,
        due: payable,
        change_returned: 0,
        payment_method: "cash",
        items: [{
          product_id: Number(batch.product_id),
          batch_id: Number(batch.id),
          qt_in_box: 0,
          qt_in_units: qty,
          total_qty: qty,
          cost_price: Number(batch.cost_price || 0),
          rate,
          amount,
          discount_percent: null,
          discount_amount: discountAmount || null,
        }],
      };
    };

    const before = await request("/api/draft-sales?paged=true&skip=0&limit=100");
    created = await request("/api/draft-sales", {
      method: "POST",
      body: JSON.stringify(makePayload(1, 0, "Browser Draft PUT Create")),
    });
    output.seededDraft = {
      id: created.id,
      invoice_number: created.invoice_number,
      total_payable: created.total_payable,
      item_qty: created.items?.[0]?.total_qty,
    };

    const newTabInput = Array.from(document.querySelectorAll('input[name="sale-tab"]')).find((input) => input.value === "new");
    const draftTabInput = Array.from(document.querySelectorAll('input[name="sale-tab"]')).find((input) => input.value === "draft");
    if (!newTabInput) throw new Error("New Sales tab input not found");
    if (!draftTabInput) throw new Error("Draft Sales tab input not found");
    click(newTabInput);
    await wait(300);
    click(draftTabInput);
    await wait(900);

    const rows = tableRows();
    const displayedDraftId = String(created.invoice_number || created.id || "").replace(/^DRAFT-/, "");
    const targetRow = rows.find((row) => rowValues(row)[0] === displayedDraftId);
    if (!targetRow) throw new Error(`Seed draft row ${displayedDraftId} not visible`);
    output.beforeRow = rowValues(targetRow);
    const editButton = targetRow.querySelector('button[aria-label="edit"]');
    if (!editButton) throw new Error("Draft edit button not found");
    click(editButton);
    await wait(500);

    const editorRow = targetRow.nextElementSibling;
    if (!editorRow?.classList.contains("recent-edit-row")) throw new Error("Inline draft editor did not open");
    const discountInput = editorRow.querySelector('tbody tr input[placeholder="Disc Amt"]');
    if (!discountInput) throw new Error("Discount amount input not found");
    setInput(discountInput, "2");
    await wait(250);
    const saveButton = Array.from(editorRow.querySelectorAll("button")).find((button) => button.innerText.trim() === "Save as a Draft");
    if (!saveButton) throw new Error("Inline Save as a Draft button not found");
    click(saveButton);
    await wait(1300);

    const after = await request("/api/draft-sales?paged=true&skip=0&limit=100");
    const afterItems = after.items || after;
    const updated = afterItems.find((sale) => sale.id === created.id);
    const idMatches = afterItems.filter((sale) => sale.id === created.id);
    const invoiceMatches = afterItems.filter((sale) => sale.invoice_number === created.invoice_number);
    output.afterDraft = updated ? {
      id: updated.id,
      invoice_number: updated.invoice_number,
      total_payable: updated.total_payable,
      item_qty: updated.items?.[0]?.total_qty,
      discount_amount: updated.items?.[0]?.discount_amount,
    } : null;
    output.beforeTotal = before.total ?? (before.items || before).length;
    output.afterTotal = after.total ?? afterItems.length;
    output.idMatchCount = idMatches.length;
    output.invoiceMatchCount = invoiceMatches.length;
    output.fetchEvents = fetchEvents;
    output.putEvents = fetchEvents.filter((event) => event.method === "PUT" && event.url.includes(`/api/draft-sales/${created.id}`));
    output.postEventsAfterSeed = fetchEvents.filter((event) => event.method === "POST");
    output.sameRecordUpdated = Boolean(updated && updated.id === created.id && updated.invoice_number === created.invoice_number && Number(updated.items?.[0]?.discount_amount || 0) === 2);
    output.noDuplicate = output.afterTotal === output.beforeTotal + 1 && output.idMatchCount === 1 && output.invoiceMatchCount === 1;
  } catch (error) {
    output.errors.push(error.message || String(error));
  } finally {
    if (created?.id) {
      try {
        await request(`/api/draft-sales/${created.id}`, { method: "DELETE" });
        output.cleanedUpDraftId = created.id;
      } catch (error) {
        output.errors.push(`cleanup: ${error.message || String(error)}`);
      }
    }
    window.fetch = originalFetch;
  }
  return output;
})()
