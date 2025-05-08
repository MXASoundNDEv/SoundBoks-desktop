// lib/ble_manager.js
const { readFileSync } = require('fs');
const { join } = require('path');
const noble = require('@abandonware/noble');
const { connectToDeviceByAddress, readValue, writeValue, getDeviceInfo, authenticateWithPin } = require('./ble_helpers.js');

let uuids;
const uuidFile = join(__dirname, '../data/uuid.json');

try {
    const fileContent = readFileSync(uuidFile, 'utf-8');
    uuids = JSON.parse(fileContent);
} catch (err) {
    console.error('Erreur lors de la lecture ou du parsing de uuid.json :', err);
    uuids = {}; // Valeur par défaut si le fichier est introuvable ou invalide
}

class BLEManager {
    constructor() {
        this.device = null;
        this.server = null;
        this.services = null;
        this.characteristics = {};
        this.connected = false;
        this.uuidMap = uuids;
    }

    async connect(address) {
        if (this.connected) {
            console.log('Un périphérique est déjà connecté. Déconnexion en cours...');
            await this.disconnect();
        }

        try {
            const { device, server } = await connectToDeviceByAddress(address);
            this.device = device;
            this.server = server;
            this.connected = true;

            await this._cacheCharacteristics();

            console.log('Connexion réussie au périphérique BLE.');
            return true;
        } catch (err) {
            console.error("❌ Échec de la connexion BLE :", err);
            this.connected = false;
            return false;
        }
    }

    async scan() {
        return new Promise((resolve, reject) => {
            const devices = [];
            const seen = new Set(); // Pour éviter les doublons
            const regex = /^#[0-9]+$/; // Filtrer les noms des périphériques

            console.log("🔎 Démarrage du scan BLE...");

            // Gestionnaire pour l'événement `discover`
            function onDiscover(peripheral) {
                const name = peripheral.advertisement.localName || 'Inconnu';
                const address = peripheral.address;

                // Vérifier si le périphérique a déjà été vu ou ne correspond pas au regex
                if (!seen.has(address) && regex.test(name)) {
                    seen.add(address);
                    console.log(`🎯 Appareil détecté : ${name} [${address}]`);
                    devices.push({ name, address });
                }
            }

            // Gestionnaire pour l'événement `scanStop`
            function onStop() {
                console.log('🔍 Scan terminé.');
                noble.removeListener('discover', onDiscover); // Supprimer les écouteurs
                noble.removeListener('scanStop', onStop);
                noble.removeListener('error', onError);
                resolve(devices); // Retourner les périphériques détectés
            }

            // Gestionnaire pour l'événement `error`
            function onError(err) {
                console.error('❌ Erreur pendant le scan BLE :', err);
                noble.removeListener('discover', onDiscover); // Supprimer les écouteurs
                noble.removeListener('scanStop', onStop);
                noble.removeListener('error', onError);
                reject(err); // Rejeter la promesse
            }

            // Ajouter les écouteurs pour les événements
            noble.on('discover', onDiscover);
            noble.once('scanStop', onStop);
            noble.once('error', onError);

            // Démarrer le scan
            try {
                noble.startScanning([], false); // Scan sans filtrage spécifique

                // Arrêter le scan après 10 secondes
                setTimeout(() => {
                    noble.stopScanning();
                }, 10000);
            } catch (err) {
                onError(err);
            }
        });
    }

    async _cacheCharacteristics() {
        const { services, characteristics } = await this.device.discoverAllServicesAndCharacteristicsAsync();
        this.services = services;
        for (const char of characteristics) {
            this.characteristics[char.uuid] = char;
        }
    }

    getCharacteristic(uuidName) {
        const uuid = this.uuidMap[uuidName];
        return this.characteristics[uuid];
    }

    async getVolume() {
        const volumeChar = this.characteristics[uuids.VOLUME_CHAR_UUID];
        if (!volumeChar) throw new Error('Caractéristique de volume non trouvée');
        const value = await volumeChar.readAsync();
        const volume = value.readUInt8(0); // Supposons que le volume est stocké sur un octet
        console.log(`🔊 Volume actuel : ${volume}`);
        return volume;
    }

    async read(uuidName) {
        const char = this.getCharacteristic(uuidName);
        if (!char) throw new Error(`Caractéristique ${uuidName} non trouvée`);
        return await readValue(char);
    }

    async write(uuidName, value) {
        const char = this.getCharacteristic(uuidName);
        if (!char) throw new Error(`Caractéristique ${uuidName} non trouvée`);
        return await writeValue(char, value);
    }

    async authenticate(pinCodeBytes) {
        const char = this.getCharacteristic('write_control');
        if (!char) throw new Error('Caractéristique de contrôle non trouvée');
        return await authenticateWithPin(char, pinCodeBytes);
    }

    async getDeviceInfo() {
        return await getDeviceInfo(this.device, this.uuidMap);
    }

    async disconnect() {
        try {
            if (this.device) {
                await this.device.disconnectAsync();
                console.log('Déconnexion réussie.');
            }
            this.connected = false;
        } catch (err) {
            console.error('Erreur pendant la déconnexion :', err);
        }
    }

    async getVolume() {
        const volumeChar = this.characteristics[uuids.VOLUME_CHAR_UUID];
        if (!volumeChar) throw new Error('Caractéristique de volume non trouvée');
        const value = await volumeChar.readAsync();
        const volume = value.readUInt8(0); // Supposons que le volume est stocké sur un octet
        console.log(`🔊 Volume actuel : ${volume} Value ${value}`);
        return volume;
    }

    async setVolume(value) {
        const volumeChar = this.characteristics[uuids.VOLUME_CHAR_UUID];
        if (!volumeChar) throw new Error('Caractéristique de volume non trouvée');
        const buffer = Buffer.from([value]);
        await volumeChar.writeAsync(buffer, true);
        console.log(`🔊 Volume défini sur ${value}`);
        return true;
    }
}

module.exports = BLEManager;
