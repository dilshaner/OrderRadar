const CACHE_KEY = 'deliveryDataCache';

// Cache Manager
const cacheManager = {
  get: async () => {
    const result = await chrome.storage.local.get([CACHE_KEY]);
    return JSON.parse(result[CACHE_KEY] || '{}');
  },

  set: async (data) => {
    await chrome.storage.local.set({ [CACHE_KEY]: JSON.stringify(data) });
  },

  update: async (phone, data) => {
    const cache = await cacheManager.get();
    cache[phone] = { data, timestamp: Date.now() };
    await cacheManager.set(cache);
  }
};

// API Client
const apiClient = {
  fetchData: async (phone) => {
    const cookies = await chrome.cookies.getAll({ domain: 'koombiyodelivery.lk' });
    const sessionCookie = cookies.find(c => c.name === 'cisession');
    
    if (!sessionCookie) throw new Error('Not logged in');

    const response = await fetch('https://koombiyodelivery.lk/get_customer_success', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': `cisession=${sessionCookie.value}`
      },
      body: `phone=${encodeURIComponent(phone)}`
    });

    if (!response.ok) throw new Error('API Error');
    return response.json();
  }
};

// Message Handlers
const messageHandlers = {
  checkCookies: async () => {
    const cookies = await chrome.cookies.getAll({ domain: 'koombiyodelivery.lk' });
    return {
      loggedIn: cookies.some(c => c.name === 'cisession'),
      message: cookies.some(c => c.name === 'cisession') 
        ? '✅ Logged in' 
        : '❌ Not logged in'
    };
  },

  fetchData: async ({ phone }) => {
    try {
      const cache = await cacheManager.get();
      if (cache[phone]) return { data: cache[phone].data, cached: true };

      const data = await apiClient.fetchData(phone);

      // Calculate success rate percentage based on delivered and returned
      if (data && data.delivered !== undefined && data.return !== undefined) {
        const delivered = parseInt(data.delivered, 10);
        const returned = parseInt(data.return, 10);

        let successRate = 0;
        
        if (delivered > 0) {
          successRate = ((delivered - returned) / delivered) * 100;
        } else if (delivered === 0 && returned > 0) {
          successRate = 0;
        }

        // Ensure the success rate is a valid number and not negative
        successRate = Math.max(successRate, 0).toFixed(2);

        // Return the formatted data with success rate and counts
        data.success_rate = successRate;
      }

      await cacheManager.update(phone, data);
      return { data, cached: false };
    } catch (error) {
      return { error: error.message };
    }
  },

  exportCache: async () => {
    try {
      const cache = await cacheManager.get();
      return {
        success: true,
        data: JSON.stringify(cache, null, 2),
        filename: `delivery-data-${Date.now()}.json`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Main Listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handler = messageHandlers[request.action];
  if (handler) {
    handler(request).then(sendResponse);
    return true;
  }
});

// WhatsApp Integration
chrome.action.onClicked.addListener((tab) => {
  if (tab.url.startsWith('https://web.whatsapp.com')) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  }
});
