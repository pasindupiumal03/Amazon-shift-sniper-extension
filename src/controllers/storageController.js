export const getFromStorage = (keys) => {
    return new Promise((resolve) => {
        chrome.storage.local.get(keys, (result) => {
            resolve(result);
        });
    });
};

export const saveToStorage = (data) => {
    return new Promise((resolve) => {
        chrome.storage.local.set(data, () => {
            resolve();
        });
    });
};