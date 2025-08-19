export function emitAddSection() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent("app:add-section"))
}
