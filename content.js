// Global variables
let sidebarVisible = false;
let sidebar = null;
let tocItems = [];

// Initialize when the page is fully loaded
window.addEventListener("load", () => {
  console.log("Confluence TOC Extension loaded");
  // Wait a bit longer for Confluence to fully render its content
  setTimeout(initTOC, 2500);
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleSidebar") {
    console.log("Toggle sidebar message received");
    toggleSidebar();
  }
  return true;
});

// Check if current page is a Confluence page - more flexible detection
function isConfluencePage() {
  return (
    window.location.hostname.includes("atlassian.net") &&
    (document.querySelector(".confluence-page") ||
      document.querySelector("#main-content") ||
      document.querySelector(".wiki-content") ||
      document.querySelector(
        "[data-testid='confluence-ui-kit.common.page-layout.page-container']"
      ))
  );
}

// Check if current page is in edit mode
function isEditMode() {
  return (
    window.location.href.includes("/edit/") ||
    window.location.href.includes("editpage.action") ||
    document.querySelector(".editor-container") ||
    document.querySelector(".confluence-editor") ||
    document.querySelector("[data-testid='editor-container']") ||
    document.querySelector("[data-testid='confluence-editor']") ||
    document.querySelector(".fabric-editor-container") ||
    document.querySelector(".ProseMirror") ||
    document.body.classList.contains("page-edit") ||
    document.body.classList.contains("contenteditor")
  );
}

// Initialize the TOC
function initTOC() {
  console.log("Initializing TOC");

  // Check if we're on a Confluence page - use more flexible detection
  if (!isConfluencePage()) {
    console.log("Not a Confluence page, extension will not run");
    return;
  }

  // 檢查是否處於編輯模式
  const editMode = isEditMode();
  if (editMode) {
    console.log("Edit mode detected, using special initialization");
  }

  console.log("Confluence page detected");

  // Create sidebar if it doesn't exist
  if (!sidebar) {
    createSidebar();
  }

  // Generate TOC
  generateTOC();

  // Setup scroll highlight
  setupScrollHighlight();

  // Get saved sidebar state
  chrome.storage.local.get(["sidebarVisible"], function (result) {
    console.log("Retrieved sidebar state:", result.sidebarVisible);

    // If we have a saved state, use it; otherwise default to hidden (false)
    if (result.sidebarVisible === true) {
      if (!sidebarVisible) {
        toggleSidebar();
      }
    } else {
      // Make sure sidebar is hidden
      if (sidebarVisible) {
        toggleSidebar();
      }
    }
  });
}

// Create the sidebar
function createSidebar() {
  sidebar = document.createElement("div");
  sidebar.id = "confluence-toc-sidebar";
  sidebar.className = "confluence-toc-sidebar";

  // Create header
  const header = document.createElement("div");
  header.className = "toc-header";

  const title = document.createElement("h3");
  title.textContent = "Table of Contents";

  const closeBtn = document.createElement("button");
  closeBtn.className = "toc-close-btn";
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", toggleSidebar);

  header.appendChild(title);
  header.appendChild(closeBtn);

  // Create content container
  const content = document.createElement("div");
  content.className = "toc-content";

  // Create debug button (hidden by default)
  const debugContainer = document.createElement("div");
  debugContainer.style.padding = "10px 15px";
  debugContainer.style.borderTop = "1px solid #ddd";
  debugContainer.style.display = "none"; // Hide the debug container
  debugContainer.id = "toc-debug-container";

  const debugBtn = document.createElement("button");
  debugBtn.textContent = "Refresh Highlight";
  debugBtn.style.padding = "5px 10px";
  debugBtn.style.backgroundColor = "#f5f5f5";
  debugBtn.style.border = "1px solid #ddd";
  debugBtn.style.borderRadius = "3px";
  debugBtn.style.cursor = "pointer";
  debugBtn.style.fontSize = "12px";
  debugBtn.style.width = "100%";
  debugBtn.id = "toc-debug-button";

  debugBtn.addEventListener("click", () => {
    console.log("Manual highlight refresh triggered");
    const highlightFn = window.confluenceTocHighlightFn;
    if (typeof highlightFn === "function") {
      highlightFn();
    } else {
      console.log("Highlight function not found, re-initializing");
      setupScrollHighlight();
    }
  });

  debugContainer.appendChild(debugBtn);

  // Append elements to sidebar
  sidebar.appendChild(header);
  sidebar.appendChild(content);
  sidebar.appendChild(debugContainer); // Still append it, but it's hidden

  // Create toggle button
  const toggleBtn = document.createElement("button");
  toggleBtn.id = "toc-toggle-btn";
  toggleBtn.className = "toc-toggle-btn";
  toggleBtn.textContent = "≡";
  toggleBtn.title = "Toggle Table of Contents";
  toggleBtn.addEventListener("click", toggleSidebar);

  // Append sidebar and toggle button to body
  document.body.appendChild(sidebar);
  document.body.appendChild(toggleBtn);
}

// Generate TOC from page headings
function generateTOC() {
  // Clear previous TOC items
  tocItems = [];

  console.log("Generating TOC");

  // 檢查是否處於編輯模式
  const editMode = isEditMode();
  if (editMode) {
    console.log("Edit mode detected, using special TOC generation");
  }

  // 根據是否處於編輯模式選擇不同的內容區域
  let contentArea;

  if (editMode) {
    // 在編輯模式下，嘗試找到編輯器的內容區域
    contentArea =
      document.querySelector(".ProseMirror") ||
      document.querySelector(".fabric-editor-container") ||
      document.querySelector(".editor-container") ||
      document.querySelector("[data-testid='editor-container']");
  } else {
    // 在閱讀模式下，使用正常的內容區域
    contentArea =
      document.querySelector(".confluence-page") ||
      document.querySelector("#main-content") ||
      document.querySelector(".wiki-content") ||
      document.querySelector(
        "[data-testid='confluence-ui-kit.common.page-layout.page-container']"
      );
  }

  if (!contentArea) {
    console.log("Could not find content area");
    return;
  }

  console.log("Content area found:", contentArea);

  // 獲取所有標題
  const headings = contentArea.querySelectorAll("h1, h2, h3, h4, h5, h6");
  console.log("Found headings:", headings.length);

  // 處理標題
  headings.forEach((heading, index) => {
    // 跳過屬於編輯器 UI 元素的標題
    if (
      (!editMode &&
        (heading.closest(".editor") ||
          heading.closest(".aui-dropdown") ||
          heading.closest(".fabric-editor-container") ||
          heading.closest(".ProseMirror"))) ||
      heading.closest(".aui-dropdown")
    )
      return;

    const level = parseInt(heading.tagName.substring(1));
    const text = heading.textContent.trim();

    // 在編輯模式下，我們不能修改 DOM 添加 ID，所以使用索引作為 ID
    let id;
    if (editMode) {
      // 在編輯模式下，使用特殊前綴和索引作為 ID
      id = `edit-heading-${index}`;
    } else {
      // 在閱讀模式下，使用正常的 ID 或生成一個
      id = heading.id || generateHeadingId(text, index);

      // 確保標題有一個 ID 用於鏈接
      if (!heading.id) {
        heading.id = id;
      }
    }

    tocItems.push({ level, text, id, editMode, element: heading });
    console.log(`Added heading: ${level} - ${text} (${id})`);
  });

  // 渲染 TOC
  renderTOC();
}

// Generate an ID for a heading without one
function generateHeadingId(text, index) {
  return (
    "toc-" +
    text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-") +
    "-" +
    index
  );
}

// Render the TOC in the sidebar
function renderTOC() {
  if (!sidebar) {
    console.log("Cannot render TOC: sidebar not found");
    return;
  }

  const content = sidebar.querySelector(".toc-content");
  if (!content) {
    console.log("Cannot render TOC: content container not found");
    return;
  }

  content.innerHTML = "";
  console.log("Rendering TOC with", tocItems.length, "items");

  if (tocItems.length === 0) {
    const noItems = document.createElement("p");
    noItems.className = "toc-no-items";
    noItems.textContent = "No headings found on this page.";
    content.appendChild(noItems);
    console.log("No TOC items to render");
    return;
  }

  const list = document.createElement("ul");
  list.className = "toc-list";

  tocItems.forEach((item, index) => {
    const listItem = document.createElement("li");
    listItem.className = `toc-item toc-level-${item.level}`;

    const link = document.createElement("a");
    link.href = `#${item.id}`;
    link.textContent = item.text;
    link.setAttribute("data-toc-id", item.id); // Use setAttribute for consistency
    link.setAttribute("data-toc-index", index); // Add index for easier debugging

    link.addEventListener("click", (e) => {
      e.preventDefault();
      console.log(`Clicked TOC item: ${item.text} (${item.id})`);

      // 移除所有鏈接的 active 類
      sidebar
        .querySelectorAll(".toc-item a")
        .forEach((l) => l.classList.remove("active"));

      // 為點擊的鏈接添加 active 類
      link.classList.add("active");
      console.log(`Added active class to ${item.text}`);

      // 滾動到標題
      if (item.editMode) {
        // 在編輯模式下，使用更可靠的方法找到元素
        // 首先嘗試使用保存的元素引用
        let targetElement = item.element;

        // 如果元素引用無效，嘗試通過文本內容和標籤名稱找到元素
        if (!targetElement || !document.body.contains(targetElement)) {
          console.log(
            "Stored element reference is invalid, trying to find element by content"
          );

          // 獲取編輯器內容區域
          const editArea =
            document.querySelector(".ProseMirror") ||
            document.querySelector(".fabric-editor-container") ||
            document.querySelector(".editor-container") ||
            document.querySelector("[data-testid='editor-container']");

          if (editArea) {
            // 獲取所有標題元素
            const allHeadings = editArea.querySelectorAll(
              "h1, h2, h3, h4, h5, h6"
            );

            // 嘗試通過文本內容和級別找到匹配的標題
            for (const heading of allHeadings) {
              if (
                heading.textContent.trim() === item.text &&
                parseInt(heading.tagName.substring(1)) === item.level
              ) {
                targetElement = heading;
                console.log(
                  "Found matching heading by content:",
                  targetElement
                );
                break;
              }
            }

            // 如果仍然找不到，嘗試只通過文本內容匹配
            if (!targetElement) {
              for (const heading of allHeadings) {
                if (heading.textContent.trim() === item.text) {
                  targetElement = heading;
                  console.log(
                    "Found heading by text content only:",
                    targetElement
                  );
                  break;
                }
              }
            }

            // 如果仍然找不到，嘗試通過索引找到
            if (!targetElement && allHeadings.length > 0) {
              // 從 ID 中提取索引（格式為 "edit-heading-X"）
              const indexMatch = item.id.match(/edit-heading-(\d+)/);
              if (indexMatch && indexMatch[1]) {
                const index = parseInt(indexMatch[1]);
                if (index < allHeadings.length) {
                  targetElement = allHeadings[index];
                  console.log("Found heading by index:", index, targetElement);
                }
              }
            }
          }
        }

        // 如果找到了目標元素，滾動到它
        if (targetElement && document.body.contains(targetElement)) {
          // 獲取 Confluence 頭部的高度
          const headerHeight = getConfluenceHeaderHeight();
          console.log(`Estimated header height: ${headerHeight}px`);

          // 增加額外的偏移量，確保標題不會被工具列擋住
          const extraOffset = 40;

          // 計算滾動位置
          const targetPosition =
            targetElement.getBoundingClientRect().top +
            window.scrollY -
            headerHeight -
            extraOffset;

          // 平滑滾動到目標位置
          window.scrollTo({
            top: targetPosition,
            behavior: "smooth",
          });

          // 嘗試聚焦元素（可能有助於編輯器定位）
          try {
            targetElement.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
            setTimeout(() => {
              // 再次調整滾動位置，確保不被頭部擋住
              window.scrollBy(0, -headerHeight - extraOffset);
            }, 100);
          } catch (e) {
            console.error("Error focusing element:", e);
          }

          console.log(
            `Scrolled to heading in edit mode with offset ${
              headerHeight + extraOffset
            }px`
          );
        } else {
          console.log(`Could not find element for heading in edit mode`);

          // 後備方案：嘗試使用編輯器的 API（如果可用）
          try {
            if (
              window.AP &&
              window.AP.confluence &&
              window.AP.confluence.editor
            ) {
              console.log("Trying to use Confluence editor API");
              // 這是一個假設的 API 調用，實際的 API 可能不同
              window.AP.confluence.editor.scrollToText(item.text);
            }
          } catch (e) {
            console.error("Error using editor API:", e);
          }
        }
      } else {
        // 在閱讀模式下，使用 ID 滾動（保持不變）
        const targetElement = document.getElementById(item.id);
        if (targetElement) {
          // 獲取 Confluence 頭部的高度
          const headerHeight = getConfluenceHeaderHeight();
          console.log(`Estimated header height: ${headerHeight}px`);

          // 增加額外的偏移量，確保標題不會被工具列擋住
          const extraOffset = 40;

          // 計算滾動位置
          const targetPosition =
            targetElement.getBoundingClientRect().top +
            window.scrollY -
            headerHeight -
            extraOffset;

          // 平滑滾動到目標位置
          window.scrollTo({
            top: targetPosition,
            behavior: "smooth",
          });

          console.log(
            `Scrolled to ${item.id} with offset ${headerHeight + extraOffset}px`
          );
        } else {
          console.log(`Could not find element with ID ${item.id}`);
        }
      }
    });

    listItem.appendChild(link);
    list.appendChild(listItem);
  });

  content.appendChild(list);
  console.log("TOC rendered successfully");

  // Re-highlight current heading after rendering
  setTimeout(() => {
    try {
      const scrollPosition = window.scrollY + 150; // Increased offset
      console.log("Current scroll position for highlight:", scrollPosition);

      const headingElements = tocItems
        .map((item) => document.getElementById(item.id))
        .filter((el) => el !== null);

      console.log(
        "Found heading elements for highlight:",
        headingElements.length
      );

      if (headingElements.length > 0) {
        let currentHeadingIndex = -1;

        for (let i = 0; i < headingElements.length; i++) {
          const headingTop =
            headingElements[i].getBoundingClientRect().top + window.scrollY;

          console.log(`Heading ${i} position:`, headingTop);

          if (scrollPosition >= headingTop) {
            currentHeadingIndex = i;
          } else {
            break;
          }
        }

        console.log("Current heading index:", currentHeadingIndex);

        if (currentHeadingIndex !== -1) {
          const tocLinks = sidebar.querySelectorAll(".toc-item a");
          console.log("TOC links for highlight:", tocLinks.length);

          if (currentHeadingIndex < tocLinks.length) {
            tocLinks[currentHeadingIndex].classList.add("active");
            console.log(`Highlighted TOC item ${currentHeadingIndex}`);
          }
        }
      }
    } catch (error) {
      console.error("Error in TOC highlight:", error);
    }
  }, 100);
}

// Function to get the height of the Confluence header
function getConfluenceHeaderHeight() {
  // Try different selectors for Confluence header
  const headers = [
    document.querySelector("#AkBanner"),
    document.querySelector(".aui-header"),
    document.querySelector(
      "[data-testid='confluence-ui-kit.navigation.global-navigation']"
    ),
    document.querySelector("[role='banner']"),
    document.querySelector("#header"),
    document.querySelector(".atlaskit-portal"),
    document.querySelector(".css-1q9kn66"), // 新的 Confluence UI 可能使用的選擇器
  ].filter((el) => el !== null);

  // 計算所有找到的頭部元素的總高度
  let totalHeight = 0;
  headers.forEach((header) => {
    totalHeight += header.offsetHeight || 0;
    console.log(`Header element found with height: ${header.offsetHeight}px`);
  });

  // 如果找到了頭部元素，返回總高度，否則返回默認值
  if (totalHeight > 0) {
    console.log("Detected header elements with total height:", totalHeight);
    return totalHeight;
  }

  // 默認高度如果沒有找到頭部元素
  console.log("No header elements detected, using default height");
  return 100; // 增加默認高度
}

// Toggle sidebar visibility
function toggleSidebar() {
  sidebarVisible = !sidebarVisible;

  if (sidebar) {
    sidebar.classList.toggle("visible", sidebarVisible);
  }

  const toggleBtn = document.getElementById("toc-toggle-btn");
  if (toggleBtn) {
    toggleBtn.classList.toggle("active", sidebarVisible);
  }

  // Save state to Chrome storage
  chrome.storage.local.set({ sidebarVisible: sidebarVisible }, function () {
    console.log("Saved sidebar state:", sidebarVisible);
  });
}

// Add scroll event listener to highlight current heading
function setupScrollHighlight() {
  console.log("Setting up scroll highlight");

  // Function to highlight current heading
  function highlightCurrentHeading() {
    if (!sidebar || !tocItems.length) {
      console.log("Sidebar or TOC items not available for highlighting");
      return;
    }

    try {
      const scrollPosition = window.scrollY + 150; // Increased offset
      console.log("Current scroll position for highlight:", scrollPosition);

      // 檢查是否處於編輯模式
      const editMode = isEditMode();

      let headingElements;

      if (editMode) {
        // 在編輯模式下，使用元素引用
        headingElements = tocItems
          .filter(
            (item) => item.element && document.body.contains(item.element)
          )
          .map((item) => item.element);
      } else {
        // 在閱讀模式下，使用 ID
        headingElements = tocItems
          .map((item) => document.getElementById(item.id))
          .filter((el) => el !== null);
      }

      console.log(
        "Found heading elements for highlight:",
        headingElements.length
      );

      if (headingElements.length > 0) {
        let currentHeadingIndex = -1;

        for (let i = 0; i < headingElements.length; i++) {
          const headingTop =
            headingElements[i].getBoundingClientRect().top + window.scrollY;

          console.log(`Heading ${i} position:`, headingTop);

          if (scrollPosition >= headingTop) {
            currentHeadingIndex = i;
          } else {
            break;
          }
        }

        console.log("Current heading index:", currentHeadingIndex);

        const tocLinks = sidebar.querySelectorAll(".toc-item a");
        if (!tocLinks || tocLinks.length === 0) {
          console.log("No TOC links found in sidebar");
          return;
        }

        // Remove active class from all TOC links
        tocLinks.forEach((link) => {
          link.classList.remove("active");
        });
        console.log("Removed active class from all links");

        // Add active class to current heading's TOC link
        if (
          currentHeadingIndex !== -1 &&
          currentHeadingIndex < tocLinks.length
        ) {
          tocLinks[currentHeadingIndex].classList.add("active");
          console.log(
            `Added active class to link ${currentHeadingIndex} (${tocItems[currentHeadingIndex].text})`
          );

          // Scroll the sidebar to make the active item visible if needed
          const activeLink = tocLinks[currentHeadingIndex];
          const sidebarContent = sidebar.querySelector(".toc-content");

          if (sidebarContent) {
            const linkTop = activeLink.offsetTop;
            const sidebarScrollTop = sidebarContent.scrollTop;
            const sidebarHeight = sidebarContent.clientHeight;

            console.log(
              `Link top: ${linkTop}, Sidebar scroll: ${sidebarScrollTop}, Sidebar height: ${sidebarHeight}`
            );

            if (
              linkTop < sidebarScrollTop ||
              linkTop > sidebarScrollTop + sidebarHeight
            ) {
              sidebarContent.scrollTop = linkTop - sidebarHeight / 2;
              console.log("Scrolled sidebar to show active link");
            }
          } else {
            console.log("Could not find sidebar content element");
          }
        } else {
          console.log(`Invalid current heading index: ${currentHeadingIndex}`);
        }
      }
    } catch (error) {
      console.error("Error in TOC highlight:", error);
    }
  }

  // Save reference to highlight function for debugging
  window.confluenceTocHighlightFn = highlightCurrentHeading;

  // Throttled scroll handler
  const throttledHighlight = throttle(highlightCurrentHeading, 100);

  // Add scroll event listener
  window.addEventListener("scroll", throttledHighlight);
  console.log("Added scroll event listener");

  // Initial highlight
  setTimeout(highlightCurrentHeading, 500);
  console.log("Scheduled initial highlight");

  // Also highlight on window resize
  window.addEventListener("resize", throttledHighlight);
  console.log("Added resize event listener");

  // Force a highlight check every 2 seconds in case of dynamic content changes
  setInterval(highlightCurrentHeading, 2000);
  console.log("Set up periodic highlight check");
}

// Re-generate TOC when page content changes
function observeContentChanges() {
  // 檢查是否處於編輯模式
  const editMode = isEditMode();

  // 根據是否處於編輯模式選擇不同的內容區域
  let contentArea;

  if (editMode) {
    // 在編輯模式下，嘗試找到編輯器的內容區域
    contentArea =
      document.querySelector(".ProseMirror") ||
      document.querySelector(".fabric-editor-container") ||
      document.querySelector(".editor-container") ||
      document.querySelector("[data-testid='editor-container']");
  } else {
    // 在閱讀模式下，使用正常的內容區域
    contentArea =
      document.querySelector(".confluence-page") ||
      document.querySelector("#main-content") ||
      document.querySelector(".wiki-content") ||
      document.querySelector(
        "[data-testid='confluence-ui-kit.common.page-layout.page-container']"
      );
  }

  if (!contentArea) return;

  const observer = new MutationObserver((mutations) => {
    // 檢查變化是否影響標題
    const shouldRegenerate = mutations.some((mutation) => {
      return (
        (mutation.target.tagName &&
          mutation.target.tagName.match(/^H[1-6]$/)) ||
        mutation.addedNodes.length > 0
      );
    });

    if (shouldRegenerate) {
      generateTOC();
    }
  });

  observer.observe(contentArea, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

// Call observer setup after initial TOC generation
setTimeout(observeContentChanges, 2000);

// Listen for URL changes to detect switching between view and edit modes
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log("URL changed to", url);

    // 無論是切換到編輯模式還是閱讀模式，都重新初始化 TOC
    console.log("URL changed, reinitializing TOC");

    // 如果側邊欄已經存在，先移除它
    if (sidebar && sidebar.parentNode) {
      sidebar.parentNode.removeChild(sidebar);
      sidebar = null;
    }

    const toggleBtn = document.getElementById("toc-toggle-btn");
    if (toggleBtn && toggleBtn.parentNode) {
      toggleBtn.parentNode.removeChild(toggleBtn);
    }

    // 重新初始化 TOC
    setTimeout(initTOC, 1000);
  }
}).observe(document, { subtree: true, childList: true });

// 在瀏覽器控制台中執行以顯示 Debug 按鈕
// document.getElementById("toc-debug-container").style.display = "block";
