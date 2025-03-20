document.addEventListener("DOMContentLoaded", function () {
  const toggleBtn = document.getElementById("toggleBtn");
  const debugBtn = document.createElement("button");

  debugBtn.textContent = "Toggle Debug Mode";
  debugBtn.style.marginTop = "10px";
  debugBtn.style.backgroundColor = "#f5f5f5";
  debugBtn.style.color = "#172b4d";
  debugBtn.style.border = "1px solid #ddd";

  toggleBtn.parentNode.appendChild(debugBtn);

  // 檢查當前調試模式狀態
  chrome.storage.local.get(["debugMode"], function (result) {
    if (result.debugMode) {
      debugBtn.textContent = "Disable Debug Mode";
      debugBtn.style.backgroundColor = "#e3f2fd";
    } else {
      debugBtn.textContent = "Enable Debug Mode";
    }
  });

  toggleBtn.addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "toggleSidebar" });
      window.close();
    });
  });

  debugBtn.addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "toggleDebug" },
        function (response) {
          if (response && response.debugMode !== undefined) {
            if (response.debugMode) {
              debugBtn.textContent = "Disable Debug Mode";
              debugBtn.style.backgroundColor = "#e3f2fd";
            } else {
              debugBtn.textContent = "Enable Debug Mode";
              debugBtn.style.backgroundColor = "#f5f5f5";
            }
          }
        }
      );
    });
  });
});
