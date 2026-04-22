(function() {
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        const url = args[0] ? args[0].toString() : '';
        
        if (url.includes('/application/api/candidate-application/update-application')) {
            const clone = response.clone();
            try {
                const data = await clone.json();
                if (data && data.currentState === "JOB_SELECTED") {
                    window.dispatchEvent(new CustomEvent('SNIPER_SUCCESS', { detail: data }));
                }
            } catch (e) {
                // Not JSON or error
            }
        }
        return response;
    };
})();
