/* global navigator */
"use strict";

(function registerStatusWorker() {
  if (!("serviceWorker" in navigator) || !/^https?:$/.test(window.location.protocol)) return;

  const register = () => {
    navigator.serviceWorker
      .register("./sw.js", { scope: "./", updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => {
        document.documentElement.dataset.offlineShell = "unavailable";
      });
  };

  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}());
