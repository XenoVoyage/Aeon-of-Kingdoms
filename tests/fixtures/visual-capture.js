(function prepareVisualCapture() {
  "use strict";

  const frame = document.getElementById("game-frame");
  const captureRoot = document.body;
  const maximumWaitMilliseconds = 2000;
  const pollMilliseconds = 25;
  let startedAt = 0;
  let freezeScheduled = false;
  let initialized = false;

  function fail(message) {
    captureRoot.dataset.captureState = "error";
    captureRoot.dataset.captureError = message;
    document.title = `Capture error: ${message}`;
  }

  function waitForBattleFrame(frameWindow, frameDocument) {
    const battleTime = frameDocument.getElementById("battle-time");
    const population = frameDocument.getElementById("population");
    const canvas = frameDocument.getElementById("game-canvas");
    const context = canvas?.getContext("2d");
    const pixel = context?.getImageData(
      Math.floor(canvas.width * 0.5),
      Math.floor(canvas.height * 0.5),
      1,
      1,
    ).data;
    const canvasPainted = pixel && pixel[0] + pixel[1] + pixel[2] > 0;
    if (
      !freezeScheduled &&
      frameDocument.body.dataset.gameState === "playing"
      && population?.textContent === "5 / 24"
      && canvasPainted
    ) {
      freezeScheduled = true;
      frameWindow.setTimeout(() => {
        frameDocument.getElementById("pause-button").click();
        frameDocument.getElementById("pause-dialog").close();
        captureRoot.dataset.captureState = "ready";
        captureRoot.dataset.capturePlayers = "6";
        captureRoot.dataset.captureBattleTime = battleTime.textContent;
        document.title = "Aeon of Kingdoms — six-faction capture ready";
      }, 250);
      return;
    }

    if (performance.now() - startedAt >= maximumWaitMilliseconds) {
      fail("six-faction opening did not become ready");
      return;
    }
    frameWindow.setTimeout(() => waitForBattleFrame(frameWindow, frameDocument), pollMilliseconds);
  }

  function startCapture() {
    if (initialized) return;
    try {
      const frameWindow = frame.contentWindow;
      const frameDocument = frame.contentDocument;
      if (!frameWindow.location.pathname.endsWith("/index.html")) return;
      initialized = true;
      const playerCount = frameDocument.querySelector('[name="player-count"][value="6"]');
      const conquest = frameDocument.querySelector('[name="battle-mode"][value="conquest"]');
      const setup = frameDocument.getElementById("skirmish-setup");
      if (!frameWindow || !frameDocument || !playerCount || !conquest || !setup) {
        fail("game setup controls are unavailable");
        return;
      }

      playerCount.checked = true;
      conquest.checked = true;
      setup.requestSubmit();

      for (let index = 0; index < 3; index += 1) {
        frameDocument.getElementById("zoom-out").click();
      }
      startedAt = performance.now();
      waitForBattleFrame(frameWindow, frameDocument);
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error));
    }
  }

  frame.addEventListener("load", startCapture);
  if (frame.contentDocument?.readyState === "complete") startCapture();
})();
