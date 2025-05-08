// lib/scan.js
const fs = require('fs');
const {
    BLEManager
} = require('./ble_manager');
const bleManager = new BLEManager();

async function scanDevice(deviceAddress) {
    console.log(`🔎 Connexion à ${deviceAddress}...`);
    const scanResults = [];

    try {
        await bleManager.connect(deviceAddress);
        const services = await bleManager.getServices();
        console.log(`🔗 Connecté à ${deviceAddress} !`);

        for (const service of services) {
            for (const char of service.characteristics) {
                const props = char.properties.join(', ');
                const entry = {
                    service_uuid: service.uuid,
                    char_uuid: char.uuid,
                    description: 'Unknown',
                    properties: props,
                    value: null,
                    etat: 'Non lisible',
                };

                try {
                    const value = await bleManager.read(char.uuid);
                    entry.value = value ? Buffer.from(value).toString('utf-8').trim() : 'Vide';
                    entry.etat = 'Lisible';
                } catch {
                    entry.value = 'Non lisible';
                }

                scanResults.push(entry);
            }
        }

        fs.writeFileSync('./data/ble_scan_results.json', JSON.stringify(scanResults, null, 4), 'utf-8');
        console.log(`✅ Scan terminé et sauvegardé dans './data/ble_scan_results.json'.`);
    } catch (err) {
        console.error(`❌ Erreur pendant le scan :`, err);
    }
}

module.exports = {
    scanDevice
};