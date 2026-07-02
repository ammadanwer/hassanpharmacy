(async () => {
  const config = __CDP_CAPTURE_CONFIG__;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  localStorage.setItem("hassanPharmacyToken", config.token);
  localStorage.setItem("hassanPharmacyUser", JSON.stringify(config.user));
  if (sessionStorage.getItem("staffPermissionProbeLoaded") !== config.email) {
    sessionStorage.setItem("staffPermissionProbeLoaded", config.email);
    location.href = "/pms/dashboard/supplier";
    return { reloading: true, target: "/pms/dashboard/supplier" };
  }
  await wait(2200);
  return {
    url: location.href,
    text: document.body.innerText,
    buttons: Array.from(document.querySelectorAll("button"))
      .map((button) => (button.innerText || button.getAttribute("aria-label") || "").trim())
      .filter(Boolean),
  };
})()
