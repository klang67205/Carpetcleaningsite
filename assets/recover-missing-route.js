(() => {
  const current = new URL(window.location.href);
  const source = `${current.searchParams.get("utm_source") || ""} ${document.referrer}`.toLowerCase();

  if (current.searchParams.has("fbclid") || /facebook|instagram|\bfb\b/.test(source)) {
    try {
      sessionStorage.setItem("booking-source", "facebook");
    } catch {
      // Recovery must continue even when storage is unavailable.
    }
  }

  const destination = new URL("/", current.origin);
  destination.search = current.search;
  destination.hash = current.hash;
  window.location.replace(destination.href);
})();
