// index.js (point d'entrée Electron)
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const BLEManager = require('./lib/ble_manager.js');
const bleManager = new BLEManager();

let win;

console.log('BLEManager instance:', bleManager);
console.log('BLEManager.scan exists:', typeof bleManager.scan === 'function');

function createWindow() {
    win = new BrowserWindow({
        width: 450,
        height: 700,
        webPreferences: {
            preload: path.resolve(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: true,
            enableBlinkFeatures: 'WebBluetooth',
            additionalArguments: ['--enable-experimental-web-platform-features'],
        },
    });

    win.loadFile('public/index.html');
}

app.whenReady().then(() => {
    createWindow();

    ipcMain.handle('ble-scan', async () => {
        console.log('Démarrage du scan BLE...');
        try {
            const devices = await bleManager.scan(); // Appel de la méthode `scan`
            console.log('Périphériques détectés :', devices);
            return devices;
        } catch (err) {
            console.error('Erreur pendant le scan BLE :', err);
            throw err;
        }
    });

    ipcMain.handle('ble-connect', async (event, deviceId) => {
        console.log(`Tentative de connexion au périphérique BLE avec l'ID : ${deviceId}`);
        try {
            const result = await bleManager.connect(deviceId); // Appel de la méthode `connect`
            console.log(`Connecté au périphérique : ${deviceId}`);
            return result;
        } catch (err) {
            console.error(`Erreur lors de la connexion au périphérique ${deviceId} :`, err);
            throw err;
        }
    });

    ipcMain.handle('ble-set-volume', async (event, { deviceId, volume }) => {
        console.log(`Réglage du volume pour le périphérique ${deviceId} à ${volume}`);
        try {
            await bleManager.setVolume(volume); // Appel de la méthode `setVolume`
            console.log(`Volume défini sur ${volume} pour le périphérique ${deviceId}`);
            return true;
        } catch (err) {
            console.error(`Erreur lors du réglage du volume pour le périphérique ${deviceId} :`, err);
            throw err;
        }
    });

    ipcMain.handle('ble-get-volume', async (event, deviceId) => {
        console.log(`Lecture du volume pour le périphérique ${deviceId}`);
        try {
            const volume = await bleManager.getVolume(); // Appel de la méthode `getVolume`
            console.log(`Volume actuel : ${volume}`);
            return volume;
        } catch (err) {
            console.error(`Erreur lors de la lecture du volume pour le périphérique ${deviceId} :`, err);
            throw err;
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
