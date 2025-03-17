document.addEventListener("DOMContentLoaded", function () {
  const toggleBtn = document.getElementById("toggleBtn");
  const debugBtn = document.createElement("button");

  debugBtn.textContent = "Debug Info";
  debugBtn.style.marginTop = "10px";
  debugBtn.style.backgroundColor = "#f5f5f5";
  debugBtn.style.color = "#172b4d";
  debugBtn.style.border = "1px solid #ddd";

  toggleBtn.parentNode.appendChild(debugBtn);

  toggleBtn.addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "toggleSidebar" });
      window.close();
    });
  });

  debugBtn.addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.executeScript(tabs[0].id, {
        code: `
          console.log("Debug info:");
          console.log("URL:", window.location.href);
          console.log("Is Confluence page:", document.querySelector(".confluence-page") || 
                                           document.querySelector("#main-content") || 
                                           document.querySelector(".wiki-content") ||
                                           document.querySelector("[data-testid='confluence-ui-kit.common.page-layout.page-container']"));
          console.log("Headings:", document.querySelectorAll("h1, h2, h3, h4, h5, h6").length);
          alert("Debug info printed to console. Press F12 to view.");
        `,
      });
    });
  });
});
