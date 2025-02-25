// Check if the script is already running and reload WhatsApp Web if necessary
(function() {
    const scriptKey = 'orderRadarScriptLoaded';
    if (sessionStorage.getItem(scriptKey)) {
        console.log('OrderRadar script already running.');
        
        // Reload only if on WhatsApp Web
        if (window.location.hostname === "web.whatsapp.com") {
            console.log('Reloading WhatsApp Web...');
            location.reload();
        }
        return;
    }
    sessionStorage.setItem(scriptKey, 'true');
})();


// Optimized phone number formatting
function formatPhoneNumber(rawNumber) {
    try {
        const cleaned = rawNumber.replace(/\D/g, '');
        return cleaned.startsWith('94') ? `0${cleaned.slice(2)}` :
               cleaned.startsWith('0') ? cleaned : null;
    } catch (error) {
        console.error("Error in formatPhoneNumber:", error);
        return null;
    }
}

// Original success rate calculation with optimized order
function getSuccessRateIcon(successRate) {
    try {
        if (successRate === null || successRate === undefined || isNaN(successRate)) return '🚫';
        if (successRate === 50) return '🟡';
        if (successRate >= 90) return '🟢🟢🟢🟢🟢';
        if (successRate >= 80) return '🟢🟢🟢🟢';
        if (successRate >= 70) return '🟢🟢🟢';
        if (successRate >= 60) return '🟢🟢';
        if (successRate >= 50) return '🟢';
        if (successRate >= 40) return '🔴';
        if (successRate >= 30) return '🔴🔴';
        if (successRate >= 20) return '🔴🔴🔴';
        if (successRate >= 10) return '🔴🔴🔴🔴';
        return '🔴🔴🔴🔴🔴';
    } catch (error) {
        console.error("Error in getSuccessRateIcon:", error);
        return '🚫';
    }
}

function calculateSuccessRate(delivered, returned) {
    try {
        if (delivered === returned) {
            return 50; // Return 50% if delivered and returned are equal
        }
        return (delivered - returned) / delivered * 100;
    } catch (error) {
        console.error("Error in calculateSuccessRate:", error);
        return 0;
    }
}

// Icon creation function remains unchanged
function createIconElement(icon, delivered, returned, title) {
    try {
        const iconElement = document.createElement('span');
        const drText = returned !== 'N/A' ? ` D:${delivered} R:${returned}` : '';
        iconElement.textContent = icon + drText;
        iconElement.classList.add('delivery-icon');
        iconElement.style.marginLeft = '5px';
        iconElement.style.cursor = 'pointer';
        iconElement.title = title;
        return iconElement;
    } catch (error) {
        console.error("Error in createIconElement:", error);
        return null;
    }
}

// Optimized fetch function
async function fetchAndUpdate(phone) {
    try {
        return new Promise(resolve => {
            chrome.runtime.sendMessage(
                { action: 'fetchData', phone },
                response => resolve(response?.data || null)
            );
        });
    } catch (error) {
        console.error("Error in fetchAndUpdate:", error);
        return null;
    }
}

// Optimized UI update function with batch processing
async function addIconToWhatsAppUI(forceUpdate = false) {
    try {
        const cacheKey = 'deliveryDataCache';
        
        const { scraperEnabled, [cacheKey]: cachedData } = await new Promise(resolve => 
            chrome.storage.local.get(["scraperEnabled", cacheKey], resolve)
        );

        if (!forceUpdate && !scraperEnabled) return;

        const cache = JSON.parse(cachedData || '{}');
        const elements = document.querySelectorAll("span[title^='+'], span[title^='0']");
        
        // Group elements by formatted number
        const numberMap = new Map();
        elements.forEach(element => {
            const num = formatPhoneNumber(element.title);
            if (num) numberMap.set(num, [...(numberMap.get(num) || []), element]);
        });

        // Batch process numbers with concurrency control
        const numbers = Array.from(numberMap.keys());
        const CONCURRENCY_LIMIT = 5;
        const batches = [];
        
        while (numbers.length) {
            batches.push(numbers.splice(0, CONCURRENCY_LIMIT));
        }

        for (const batch of batches) {
            await Promise.all(batch.map(async num => {
                let data = cache[num]?.data;

                if (!data || forceUpdate) {
                    data = await fetchAndUpdate(num);
                    if (data) cache[num] = { data, timestamp: Date.now() };
                }

                numberMap.get(num).forEach(element => {
                    const parent = element.parentElement;
                    let icon = parent.querySelector('.delivery-icon') || 
                               createIconElement('🚫', 'N/A', 'N/A', 'No data available');
                    parent.append(icon);

                    if (data) {
                        // Calculate success rate using priority: success > delivered/returned
                        const delivered = parseInt(data.delivered) || 0;
                        const returned = parseInt(data.return) || 0;
                        let successRate = data.success ? 
                            parseFloat(data.success) * 100 : 
                            (delivered + returned === 0) ? 
                                null : 
                                (delivered / (delivered + returned)) * 100;

                        const iconText = getSuccessRateIcon(successRate);
                        icon.textContent = `${iconText} D:${delivered} R:${returned}`;
                        icon.title = `Success Rate: ${successRate !== null ? 
                            successRate.toFixed(2) + '%' : 'N/A'}`;
                    }
                });
            }));

            // Update cache after each batch
            chrome.storage.local.set({ [cacheKey]: JSON.stringify(cache) });
        }
    } catch (error) {
        console.error("Error in addIconToWhatsAppUI:", error);
    }
}

// Rest of the original functionality remains unchanged
function flushAllIcons() {
    try {
        document.querySelectorAll('.delivery-icon').forEach(icon => icon.remove());
    } catch (error) {
        console.error("Error in flushAllIcons:", error);
    }
}

// Toggle button and interval management (original implementation)
function addToggleButton() {
    try {
        const chatsHeaderContainer = document.querySelector('div.x78zum5.x1okw0bk.x6s0dn4.xh8yej3.x14wi4xw.xexx8yu.x4uap5.x18d9i69.xkhd6sd');

        if (!chatsHeaderContainer || document.getElementById("toggle-scraper-btn")) return;

        // Create container for controls
        const controlsContainer = document.createElement("div");
        controlsContainer.style.cssText = `
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
          padding-right: 12px;
        `;

        // Add flush button
        const flushButton = document.createElement("button");
        flushButton.innerHTML = '🔄 Flush';
        flushButton.style.cssText = `
          padding: 4px 8px;
          border-radius: 14px;
          border: 1px solid #e0e0e0;
          background: white;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        `;
        flushButton.title = "Clear all icons";
        flushButton.addEventListener("click", flushAllIcons);

        // Toggle button container
        const toggleContainer = document.createElement("div");
        toggleContainer.style.display = 'flex';
        toggleContainer.style.alignItems = 'center';
        toggleContainer.style.gap = '8px';

        // Toggle switch elements
        const toggleButton = document.createElement("button");
        toggleButton.id = "toggle-scraper-btn";
        toggleButton.style.cssText = `
          position: relative;
          width: 52px;
          height: 28px;
          border: none;
          border-radius: 14px;
          background-color: #e0e0e0;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        `;

        const toggleThumb = document.createElement("div");
        toggleThumb.style.cssText = `
          position: absolute;
          width: 24px;
          height: 24px;
          background: white;
          border-radius: 50%;
          left: 2px;
          top: 2px;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;

        const statusLabel = document.createElement("span");
        statusLabel.style.cssText = `
          font-size: 12px;
          color: #666;
          font-weight: 500;
          white-space: nowrap;
        `;
        statusLabel.innerText = "Automatic process";

        // Assemble elements
        toggleButton.appendChild(toggleThumb);
        toggleContainer.appendChild(statusLabel);
        toggleContainer.appendChild(toggleButton);
        controlsContainer.appendChild(flushButton);
        controlsContainer.appendChild(toggleContainer);
        
        const buttonGroup = chatsHeaderContainer.querySelector('span.x1okw0bk');
        chatsHeaderContainer.insertBefore(controlsContainer, buttonGroup);

        // Toggle functionality
        chrome.storage.local.get(["scraperEnabled"], (result) => {
            const initialEnabled = result.scraperEnabled ?? true;
            toggleButton.style.backgroundColor = initialEnabled ? "#128C7E" : "#e0e0e0";
            toggleThumb.style.transform = initialEnabled ? "translateX(24px)" : "translateX(0)";
            chrome.storage.local.set({ scraperEnabled: initialEnabled });
        });

        toggleButton.addEventListener("click", () => {
            chrome.storage.local.get(["scraperEnabled"], (result) => {
                const newState = !result.scraperEnabled;
                chrome.storage.local.set({ scraperEnabled: newState }, () => {
                    toggleButton.style.backgroundColor = newState ? "#128C7E" : "#e0e0e0";
                    toggleThumb.style.transform = newState ? "translateX(24px)" : "translateX(0)";
                    
                    if (!newState && window.scrapingInterval) {
                        clearInterval(window.scrapingInterval);
                        window.scrapingInterval = null;
                    }
                    
                    if (newState) {
                        addIconToWhatsAppUI();
                        window.scrapingInterval = setInterval(addIconToWhatsAppUI, 5000);
                    }
                });
            });
        });
    } catch (error) {
        console.error("Error in addToggleButton:", error);
    }
}

// Interval management
let scrapingInterval = null;
chrome.storage.local.get(["scraperEnabled"], (result) => {
    if (result.scraperEnabled !== false) {
        scrapingInterval = setInterval(addIconToWhatsAppUI, 5000);
    }
});

// Mutation Observer
const headerObserver = new MutationObserver((mutations) => {
    if (document.querySelector('div.x78zum5.x1okw0bk.x6s0dn4.xh8yej3.x14wi4xw.xexx8yu.x4uap5.x18d9i69.xkhd6sd') && 
       !document.getElementById("toggle-scraper-btn")) {
        addToggleButton();
    }
});

headerObserver.observe(document.body, {
    childList: true,
    subtree: true
});

// Initial setup
addToggleButton();
