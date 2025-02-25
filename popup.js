document.addEventListener("DOMContentLoaded", () => {
  const DOM = {
    singleNumber: document.getElementById('singleNumber'),
    checkSingle: document.getElementById('checkSingle'),
    singleResult: document.getElementById('singleResult'),
    exportData: document.getElementById('exportData'),
    checkLogin: document.getElementById('checkLogin')
  };

  function formatPhoneNumber(number) {
    number = number.replace(/\s+/g, ""); // Remove spaces
    
    if (/^07\d{8}$/.test(number)) {
      return number; // Already in correct format
    }
    
    if (/^\+947\d{8}$/.test(number)) {
      return "07" + number.slice(4); // Convert +947XXXXXXXX to 07XXXXXXXX
    }
    
    return null; // Invalid format
  }

  // Login Check
  DOM.checkLogin.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'checkCookies' }, response => {
      DOM.singleResult.textContent = response.message;
      DOM.singleResult.className = `status ${response.loggedIn ? 'success' : 'error'}`;
    });
  });

  // Single Number Check
  DOM.checkSingle.addEventListener('click', () => {
    let number = DOM.singleNumber.value.trim();
    number = formatPhoneNumber(number);
    if (!number) {
      DOM.singleResult.textContent = "❌ Invalid number format";
      DOM.singleResult.className = "status error";
      return;
    }

    chrome.runtime.sendMessage({ action: 'fetchData', phone: number }, response => {
      let result = '';

      if (response.error) {
        result = `❌ Error: ${response.error}`;
      } else {
        const data = response.data;

        // Extract delivered and returned data
        const delivered = data.delivered || 0;
        const returned = data.return || 0;
        const successRate = data.success_rate || 'N/A';

        // Construct the result message
        result = `✅ Success: ${delivered} , ❌ Failed: ${returned} , Success Rate: ${successRate}%`;

        // Determine the class based on success rate
        let statusClass = 'success'; // Default status

        // Change the background to red if success rate is below 40
        if (parseFloat(successRate) < 40) {
          statusClass = 'error'; // Set to error (red) if success rate is below 40%
        }

        if (response.cached) result += ' (Cached)';

        DOM.singleResult.textContent = result;
        DOM.singleResult.className = `status ${statusClass}`;
      }
    });
  });

  // Data Export
  DOM.exportData.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'exportCache' }, response => {
      if (response.success) {
        const blob = new Blob([response.data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = response.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
      } else {
        alert(`Export failed: ${response.error}`);
      }
    });
  });
});