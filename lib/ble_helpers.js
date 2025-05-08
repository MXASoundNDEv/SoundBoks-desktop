// lib/ble_helpers.js
const noble = require('@abandonware/noble');


noble.on('stateChange', (state) => {
    if (state === 'poweredOn') {
        console.log('Bluetooth activé, démarrage du scan...');
        noble.startScanning([], false);
    } else {
        console.log('Bluetooth désactivé :', state);
        noble.stopScanning();
    }
});

// noble.on('discover', (peripheral) => {
//     console.log(`Périphérique détecté : ${peripheral.advertisement.localName || 'Inconnu'} [${peripheral.address}]`);
//     noble.stopScanning(); // Arrête le scan après la détection d'un périphérique
// });

async function connectToDeviceByAddress(address) {
    return new Promise((resolve, reject) => {
        noble.on('discover', async (peripheral) => {
            if (peripheral.address === address) {
                noble.stopScanning();
                try {
                    await peripheral.connectAsync();
                    const server = await peripheral.discoverAllServicesAndCharacteristicsAsync();
                    resolve({ device: peripheral, server });
                } catch (err) {
                    reject(err);
                }
            }
        });

        noble.startScanning([], false);
    });
}

async function readCharacteristic(peripheral, serviceUUID, characteristicUUID) {
    try {
        const { characteristics } = await peripheral.discoverSomeServicesAndCharacteristicsAsync(
            [serviceUUID],
            [characteristicUUID]
        );
        const characteristic = characteristics[0];
        const value = await characteristic.readAsync();
        return value;
    } catch (err) {
        console.error(`Erreur lecture ${characteristicUUID} :`, err);
        throw err;
    }
}

async function authenticateWithPin(characteristic, pinCodeBytes) {
    try {
        await characteristic.writeAsync(pinCodeBytes, false);
        console.log('Authentification réussie avec le code PIN.');
        return true;
    } catch (err) {
        console.error('Erreur pendant l\'authentification avec le code PIN :', err);
        throw err;
    }
}

async function readValue(characteristic) {
    try {
        const value = await characteristic.readAsync();
        return value;
    } catch (err) {
        console.error('Erreur pendant la lecture de la caractéristique :', err);
        throw err;
    }
}

async function writeValue(characteristic, value) {
    try {
        await characteristic.writeAsync(value, false);
        console.log('Valeur écrite avec succès.');
    } catch (err) {
        console.error('Erreur pendant l\'écriture de la caractéristique :', err);
        throw err;
    }
}

async function getDeviceInfo(peripheral, uuidMap) {
    try {
        const info = {};
        for (const [key, uuid] of Object.entries(uuidMap)) {
            const { characteristics } = await peripheral.discoverSomeServicesAndCharacteristicsAsync([uuid], []);
            if (characteristics.length > 0) {
                const value = await characteristics[0].readAsync();
                info[key] = value.toString('utf-8');
            }
        }
        return info;
    } catch (err) {
        console.error('Erreur pendant la récupération des informations du périphérique :', err);
        throw err;
    }
}

module.exports = {
    connectToDeviceByAddress,
    readCharacteristic,
    authenticateWithPin,
    readValue,
    writeValue,
    getDeviceInfo,
};