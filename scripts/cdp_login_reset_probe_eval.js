(async () => {
  const config = __CDP_CAPTURE_CONFIG__;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const text = (element) => (element?.innerText || element?.textContent || element?.getAttribute?.("aria-label") || element?.title || "").replace(/\s+/g, " ").trim();
  const fire = (element) => {
    if (!element) return false;
    ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach((type) => {
      element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    });
    return true;
  };
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
  const buttons = () => Array.from(document.querySelectorAll("button,[role='button'],a"));
  const inputs = () => Array.from(document.querySelectorAll("input, textarea, select"));
  const clickButton = (label) => fire(buttons().find((button) => text(button) === label));
  const inputByLabel = (label) => {
    const wanted = label.toLowerCase();
    return Array.from(document.querySelectorAll("label")).find((candidate) => text(candidate).toLowerCase().includes(wanted))?.querySelector("input");
  };
  const inputByPlaceholder = (placeholder) => inputs().find((input) => input.placeholder === placeholder);
  const readState = (label) => ({
    label,
    url: location.href,
    headings: Array.from(document.querySelectorAll("h1,h2,h3,.forgot-title")).map(text).filter(Boolean),
    buttons: buttons().map(text).filter(Boolean),
    inputs: inputs().map((input) => ({
      type: input.type || "",
      placeholder: input.placeholder || "",
      value: input.type === "password" ? "********" : input.value || "",
      disabled: Boolean(input.disabled),
      invalid: input.getAttribute("aria-invalid") || "",
    })),
    bodyExcerpt: text(document.body).slice(0, 2200),
  });

  await wait(config.initialWait || 1000);
  const states = [readState("login")];
  const forgotClicked = clickButton("Forgot Password ?");
  await wait(500);
  states.push({ ...readState("forgot-empty"), forgotClicked });
  const emptyContinue = clickButton("Continue");
  await wait(500);
  states.push({ ...readState("forgot-empty-validation"), emptyContinue });
  setValue(inputByLabel("Mobile Number or Email"), config.identifier);
  const requestClicked = clickButton("Continue");
  await wait(config.requestWait || 1200);
  const code = text(document.body).match(/Reset code:\s*(\d{6})/)?.[1] || "";
  states.push({ ...readState("reset-code"), requestClicked, codePresent: Boolean(code) });
  setValue(inputByLabel("Reset Code"), code);
  setValue(inputByPlaceholder("New Password"), config.newPassword);
  setValue(inputByPlaceholder("Verify Password"), config.newPassword);
  const resetClicked = clickButton("Reset Password");
  await wait(config.resetWait || 1200);
  states.push({ ...readState("reset-done"), resetClicked });
  return { codePresent: Boolean(code), states };
})()
