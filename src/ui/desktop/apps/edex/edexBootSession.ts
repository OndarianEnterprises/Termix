/** Session flag: eDEX boot splash already completed in this tab. */
export const EDEX_BOOT_SESSION_KEY = "termix-edex-boot-dismissed-v1";

export function readEdexBootDismissedThisSession(): boolean {
  if (typeof sessionStorage === "undefined") {
    return false;
  }
  return sessionStorage.getItem(EDEX_BOOT_SESSION_KEY) === "1";
}

export function writeEdexBootDismissedThisSession(): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  sessionStorage.setItem(EDEX_BOOT_SESSION_KEY, "1");
}
