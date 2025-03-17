// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("Confluence TOC Sidebar extension installed");
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleSidebar") {
    chrome.tabs.sendMessage(sender.tab.id, { action: "toggleSidebar" });
  }
  return true;
});
