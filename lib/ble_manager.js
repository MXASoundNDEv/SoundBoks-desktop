// lib/ble_manager.js
const { readFileSync } = require('fs');
const { join } = require('path');
const noble = require('@abandonware/noble');
const { connectToDeviceByAddress, readValue, writeValue, getDeviceInfo, authenticateWithPin } = require('./ble_helpers.js');

let uuids;
const uuidFile = join(__dirname, '../data/uuid.json');
// Chargement des UUIDs depuis le fichier uuid.json
try {
    const fileContent = readFileSync(uuidFile, 'utf-8');
    uuids = JSON.parse(fileContent);
} catch (err) {
    console.error('Erreur lors de la lecture ou du parsing de uuid.json :', err);
    uuids = {}; // Valeur par défaut si le fichier est introuvable ou invalide
}

class BLEManager {
    constructor(scanTimeout, messageDelay, autostopscan) {
        this.device = null;
        this.server = null;
        this.services = null;
        this.characteristics = {};
        this.connected = false;
        this.uuidMap = uuids;
        this.connectedDevices = []; // Liste des périphériques connectés

        this.messageQueue = []; // File d'attente des messages
        this.isProcessingQueue = false; // Indique si la file d'attente est en cours de traitement
        this.messageDelay = messageDelay; // Délai entre les messages en millisecondes (modifiable)
        this.scanTimeout = scanTimeout; // Durée maximale du scan BLE en millisecondes (modifiable)
        this.autostopscan = autostopscan; // Indique si le scan doit s'arrêter automatiquement après la découverte d'un périphérique
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
            this.connectedDevices.push(device);
            console.log('Connexion réussie au périphérique BLE.');
            return true;
        } catch (err) {
            console.error("Échec de la connexion BLE :", err);
            this.connected = false;
            return false;
        }
    }

    async scan() {
        return new Promise((resolve, reject) => {
            const devices = [];
            const seen = new Set(); // Pour éviter les doublons
            const regex = /^#[0-9]+$/; // Filtrer les noms des périphériques

            console.log("Démarrage du scan BLE...");

            // Gestionnaire pour l'événement `discover`
            function onDiscover(peripheral) {
                const name = peripheral.advertisement.localName || 'Inconnu';
                const address = peripheral.address;

                // Vérifier si le périphérique a déjà été vu ou ne correspond pas au regex
                if (!seen.has(address) && regex.test(name)) {
                    seen.add(address);
                    console.log(`Appareil détecté : ${name} [${address}]`);
                    devices.push({ name, address });
                    if (true) {
                        console.log('Arrêt automatique du scan après la découverte d\'un périphérique.');
                        noble.stopScanning(); // Arrêter le scan si autostopscan est activé
                    }
                }
            }

            // Gestionnaire pour l'événement `scanStop`
            function onStop() {
                console.log('Scan terminé.');
                noble.removeListener('discover', onDiscover); // Supprimer les écouteurs
                noble.removeListener('scanStop', onStop);
                noble.removeListener('error', onError);
                resolve(devices); // Retourner les périphériques détectés
            }

            // Gestionnaire pour l'événement `error`
            function onError(err) {
                console.error('Erreur pendant le scan BLE :', err);
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

                // Arrêter le scan après scanTimeout/ms
                setTimeout(() => {
                    noble.stopScanning();
                }, this.scanTimeout);
            } catch (err) {
                onError(err);
            }
        });
    }

    async disconnectAll() {
        for (const device of this.connectedDevices) {
            try {
                await device.disconnect(); // Méthode de déconnexion propre pour chaque périphérique
                console.log(`Périphérique ${device.id} déconnecté.`);
            } catch (err) {
                console.error(`Erreur lors de la déconnexion du périphérique ${device.id} :`, err);
            }
        }
        this.connectedDevices = []; // Réinitialiser la liste
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
        console.log(`Volume actuel : ${volume}`);
        return volume;
    }

    async read(uuidName) {
        const char = this.getCharacteristic(uuidName);
        if (!char) throw new Error(`Caractéristique ${uuidName} non trouvée`);
        return await readValue(char);
    }

    async enqueueMessage(uuidName, value) {
        // Vérifier si un message identique existe déjà dans la file d'attente
        const isDuplicate = this.messageQueue.some(
            (msg) => msg.uuidName === uuidName && Buffer.from(msg.value).equals(Buffer.from(value))
        );

        if (isDuplicate) {
            console.log(`Message en doublon ignoré : ${uuidName} - ${value}`);
            return Promise.resolve(); // Ignorer le message en doublon
        }

        console.log(`Message ajouté à la file d'attente : ${uuidName} - ${value}`);
        return new Promise((resolve, reject) => {
            this.messageQueue.push({ uuidName, value, resolve, reject });
            if (!this.isProcessingQueue) {
                this._processQueue();
            }
        });
    }

    async _processQueue() {
        if (this.isProcessingQueue) return;
        this.isProcessingQueue = true;

        console.log('Démarrage du traitement de la file d\'attente...');
        while (this.messageQueue.length > 0) {
            const { uuidName, value, resolve, reject } = this.messageQueue.shift();
            try {
                console.log(`Traitement du message : ${uuidName} - ${value}`);
                await this._writeImmediate(uuidName, value);
                resolve(); // Résoudre la promesse si l'écriture réussit
            } catch (err) {
                console.error(`Erreur lors du traitement du message : ${uuidName} - ${value}`, err);
                reject(err); // Rejeter la promesse en cas d'erreur
            }
            await new Promise((r) => setTimeout(r, this.messageDelay)); // Attendre avant de traiter le prochain message
        }

        console.log('File d\'attente terminée.');
        this.isProcessingQueue = false;
    }

    async _writeImmediate(uuidName, value) {
        const char = this.getCharacteristic(uuidName);
        if (!char) throw new Error(`Caractéristique ${uuidName} non trouvée`);
        const buffer = Buffer.from(value);
        console.log(`📤 Écriture immédiate sur ${uuidName} :`, buffer);
        await char.writeAsync(buffer, true);
        console.log(`✅ Écriture réussie sur ${uuidName}`);
    }

    async write(uuidName, value) {
        // Utilisation de la file d'attente pour gérer l'écriture
        return await this.enqueueMessage(uuidName, value);
    }

    async authenticate(pinCodeBytes) {
        const char = this.getCharacteristic('write_control');
        if (!char) throw new Error('Caractéristique de contrôle non trouvée');
        // Utilisation de la file d'attente pour écrire le code PIN
        return await this.enqueueMessage('write_control', pinCodeBytes);
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

    async setVolume(value) {
        const volumeChar = this.characteristics[uuids.VOLUME_CHAR_UUID];
        if (!volumeChar) throw new Error('Caractéristique de volume non trouvée');
        const buffer = Buffer.from([value]);
        // Utilisation de la file d'attente pour définir le volume
        return await this.enqueueMessage('VOLUME_CHAR_UUID', buffer);
    }
}

module.exports = BLEManager;
