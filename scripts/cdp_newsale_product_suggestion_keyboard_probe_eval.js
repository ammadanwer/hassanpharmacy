(async () => {
  const config = __CDP_CAPTURE_CONFIG__;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const setValue = (element, value) => {
    if (!element) return false;
    element.focus();
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value");
    if (descriptor?.set) descriptor.set.call(element, value);
    else element.value = value;
    element.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText", data: value }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  };
  const press = (element, key) => element?.dispatchEvent(new KeyboardEvent("keydown", {
    key,
    code: key,
    bubbles: true,
    cancelable: true,
  }));

  await wait(config.initialWait || 1200);
  const productInput = document.querySelector('input[aria-label="Product Name"]');
  const quantityInput = document.querySelector('input[aria-label="Quantity"]');
  const initialValue = productInput?.value || "";
  if (!productInput || !quantityInput || initialValue) {
    return { passed: false, reason: !productInput || !quantityInput ? "New Sale inputs not found" : "Product input was not empty" };
  }

  setValue(productInput, config.query || "a");
  const minimumSuggestions = Number(config.minimumSuggestions || 7);
  const deadline = Date.now() + Number(config.resultsTimeout || 6000);
  while (Date.now() < deadline && document.querySelectorAll(".suggestions button").length < minimumSuggestions) {
    await wait(100);
  }

  const list = document.querySelector(".suggestions");
  const options = Array.from(list?.querySelectorAll("button") || []);
  const initialScrollTop = list?.scrollTop || 0;
  const moves = Math.min(Number(config.moves || options.length - 1), Math.max(0, options.length - 1));
  for (let index = 0; index < moves; index += 1) {
    press(productInput, "ArrowDown");
    await wait(config.keyWait || 40);
  }

  const activeOption = list?.querySelector('[data-suggestion-active="true"]');
  const listRect = list?.getBoundingClientRect();
  const activeRect = activeOption?.getBoundingClientRect();
  const activeProductName = activeOption?.childNodes?.[0]?.textContent?.trim() || "";
  const activeVisible = Boolean(listRect && activeRect)
    && activeRect.top >= listRect.top - 1
    && activeRect.bottom <= listRect.bottom + 1;
  const keyboardFocusStayedOnProduct = document.activeElement === productInput;
  const finalScrollTop = list?.scrollTop || 0;

  press(productInput, "Enter");
  await wait(config.selectWait || 150);
  const enterSelectedActiveProduct = Boolean(activeProductName) && productInput.value === activeProductName;
  const dropdownClosed = !document.querySelector(".suggestions");
  const quantityFocused = document.activeElement === quantityInput;

  setValue(productInput, "");
  await wait(100);

  const checks = {
    enoughSuggestions: options.length >= minimumSuggestions,
    movedPastVisibleWindow: moves >= 6,
    dropdownScrolled: finalScrollTop > initialScrollTop,
    activeOptionVisible: activeVisible,
    keyboardFocusStayedOnProduct,
    enterSelectedActiveProduct,
    dropdownClosed,
    quantityFocused,
    cleanupComplete: productInput.value === "" && !document.querySelector(".suggestions"),
  };
  return {
    passed: Object.values(checks).every(Boolean),
    query: config.query || "a",
    suggestionCount: options.length,
    moves,
    initialScrollTop,
    finalScrollTop,
    activeProductName,
    checks,
  };
})()
