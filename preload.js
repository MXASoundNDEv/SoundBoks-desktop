const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script chargé');

// Vérifiez si l'API Web Bluetooth est disponible
if (!('bluetooth' in navigator)) {
    console.error("L'API Web Bluetooth n'est pas disponible dans cet environnement.");
    alert("Votre navigateur ou environnement ne prend pas en charge l'API Web Bluetooth.");
}

// Exposez les fonctionnalités nécessaires au processus de rendu
contextBridge.exposeInMainWorld('electronAPI', {
    invoke: (channel, ...args) => {
        console.log(`Invoking channel: ${channel} with arguments:`, args);
        return ipcRenderer.invoke(channel, ...args);
    },
    on: (channel, listener) => {
        console.log(`Listening to channel: ${channel}`);
        ipcRenderer.on(channel, listener);
    },
});