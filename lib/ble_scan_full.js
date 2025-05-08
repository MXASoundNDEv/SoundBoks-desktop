const noble = require('@abandonware/noble');
const fs = require('fs');

async function fullBleScan(durationSeconds = 15) {
    return new Promise((resolve) => {
        const results = [];

        noble.on('discover', async (peripheral) => {
            const device = {
                id: peripheral.id,
                address: peripheral.address,
                localName: peripheral.advertisement.localName,
                manufacturerData: peripheral.advertisement.manufacturerData?.toString('hex') || null,
                serviceData: peripheral.advertisement.serviceData || [],
                serviceUuids: peripheral.advertisement.serviceUuids || [],
                rssi: peripheral.rssi
            };

            try {
                await peripheral.connectAsync();
                const { services, characteristics } = await peripheral.discoverAllServicesAndCharacteristicsAsync();
                device.services = services.map(s => ({
                    uuid: s.uuid,
                    characteristics: characteristics
                        .filter(c => c._serviceUuid === s.uuid)
                        .map(c => ({
                            uuid: c.uuid,
                            properties: c.properties,
                            descriptors: c.descriptors?.map(d => d.uuid) || []
                        }))
                }));
                await peripheral.disconnectAsync();
            } catch (err) {
                device.error = err.message;
            }

            results.push(device);
        });

        noble.on('stateChange', async (state) => {
            if (state === 'poweredOn') {
                await noble.startScanningAsync([], false);
                setTimeout(async () => {
                    await noble.stopScanningAsync();
                    fs.writeFileSync('data/full_ble_scan.json', JSON.stringify(results, null, 2));
                    console.log(`✅ Scan terminé. ${results.length} périphériques sauvegardés dans full_ble_scan.json`);
                    resolve(results);
                }, durationSeconds * 1000);
            } else {
                await noble.stopScanningAsync();
                resolve([]);
            }
        });
    });
}

module.exports = { fullBleScan };
