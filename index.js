// index.js (point d'entrée Electron)
const {
    app,
    BrowserWindow,
    ipcMain,
    webContents,
    WebContentsView,
    Menu,
    Tray,
    screen,
    shell
} = require('electron');
const path = require('path');
const BLEManager = require('./lib/ble_manager.js');
const {
    updateElectronApp
} = require('update-electron-app')
require('process')
fs = require('fs');

//seting up the environment variable
const bleManager = new BLEManager();
let currentDevice; // Variable pour stocker le périphérique actuellement connecté
let currentVolume; // Variable pour stocker le volume actuel


// Mettre à jour l'application Electron si une nouvelle version est disponible depuis git Hub en passent par le repo dans le package.json (a tester)
updateElectronApp()

let win;
let tray;

const TrayIcon = path.join(__dirname, 'public/image', 'speaker_icon-32x32.ico');
const AppIcon = path.join(__dirname, 'public/image', 'speaker_icon-255x255.ico');

console.log('BLEManager instance:', bleManager);
console.log('BLEManager.scan exists:', typeof bleManager.scan === 'function');

function createWindow() {
    win = new BrowserWindow({
        width: 400,
        height: 600,
        autoHideMenuBar: true,
        icon: AppIcon,
        show: isDev() ? true : true, // Afficher la fenêtre en mode développement, sinon la cacher
        frame: isDev() ? true : true, // Afficher la barre de titre en mode développement, sinon la cacher
        resizable: isDev() ? true : true, // Permettre le redimensionnement en mode développement, sinon le désactiver
        skipTaskbar: isDev() ? true : false, // optionnel, ne pas afficher la fenêtre dans la barre des tâches en mode développement
        transparent: isDev() ? true : false, // optionnel, rendre la fenêtre transparente en mode développement
        webPreferences: {
            devTools: isDev() ? true : true, // Activer les outils de développement en mode développement
            preload: path.resolve(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: true,
            enableBlinkFeatures: 'WebBluetooth',
            additionalArguments: ['--enable-experimental-web-platform-features'],
        },
    });

    win.loadFile('public/index.html');
}



function showWindowBottomRight() {
    const display = screen.getPrimaryDisplay();
    const {
        width,
        height
    } = display.workAreaSize;

    const winBounds = win.getBounds();

    const x = width - winBounds.width - 10; // 10px de marge du bord droit
    const y = height - winBounds.height - 10; // 10px du bas

    win.setBounds({
        x,
        y,
        width: winBounds.width,
        height: winBounds.height
    });
    win.show();
}

function isDev() {
    return !app.isPackaged;
}

app.whenReady().then(() => {
    createWindow();



    // Afficher la fenêtre en bas à droite de l'écran
    tray = new Tray(TrayIcon);
    const contextMenu = Menu.buildFromTemplate([{
            label: 'Open',
            click: () => {
                showWindowBottomRight();
            }
        },
        {
            label: 'Close',
            click: () => {
                app.quit();
            }
        }
    ]);

    tray.setToolTip('Soundbok Control App');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        if (win.isVisible()) {
            win.hide();
        } else {
            showWindowBottomRight();
        }
    });

    ipcMain.handle('read-user-data', async (event, fileName) => {
        const path = app.getPath('userData');
        const buf = await fs.promises.readFile(`${path}/${fileName}`);
        console.log(`Lecture du fichier ${fileName} dans le dossier utilisateur :`, buf);
        return buf;
    });

    // Gestion des événements IPC
    ipcMain.handle('github-page', () => {
        shell.openExternal("https://github.com/MXASoundNDEv/SoundBoks-desktop")
    });

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

    ipcMain.handle('ble-set-volume', async (event, {
        deviceId,
        volume
    }) => {
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
        return {
            volume: currentVolume,
            device: currentDevice
        };
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});


// Événement pour déconnecter les périphériques BLE avant la fermeture de l'application(evite le nombre maximal de connection a la sb)
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