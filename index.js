// index.js (point d'entrée Electron)
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const BLEManager = require('./lib/ble_manager.js');
const bleManager = new BLEManager();
let currentDevice; // Variable pour stocker le périphérique actuellement connecté
let currentVolume; // Variable pour stocker le volume actuel

let win;

console.log('BLEManager instance:', bleManager);
console.log('BLEManager.scan exists:', typeof bleManager.scan === 'function');

function createWindow() {
    win = new BrowserWindow({
        width: 450,
        height: 700,
        icon: path.join(__dirname, 'public/image', 'speaker_icon-255x255.ico'),
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
            currentDevice = deviceId; // Mettre à jour le périphérique actuel
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
            currentVolume = volume; // Mettre à jour le volume actuel
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
            currentVolume = volume; // Mettre à jour le volume actuel
            return volume;
        } catch (err) {
            console.error(`Erreur lors de la lecture du volume pour le périphérique ${deviceId} :`, err);
            throw err;
        }
    });

    ipcMain.handle('status', async () => {
        return { volume: currentVolume, device: currentDevice };
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async (event) => {
    console.log('Déconnexion des périphériques BLE avant la fermeture...');
    try {
        await bleManager.disconnectAll(); // Méthode pour déconnecter tous les périphériques
        currentDevice = null; // Réinitialiser le périphérique actuel
        console.log('Tous les périphériques BLE ont été déconnectés proprement.');
    } catch (err) {
        console.error('Erreur lors de la déconnexion des périphériques BLE :', err);
    }
});
