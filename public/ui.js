//config
const maxLogicalSteps = 11; // Valeurs de 0 à 11 inclus
const maxBluetoothValue = 255;

// This file is part of the SDBAPPJS project.
document.addEventListener('DOMContentLoaded', () => {
    const statusEl = document.getElementById('status');
    const scanBtn = document.getElementById('scan-btn');
    const deviceList = document.getElementById('device-list');
    const maxValue = 11;

    let currentDevice = null;

    // Mock devices for testing
    const mockDevices = [];

    function createDeviceCard(device, index) {
        const card = document.createElement('div');
        card.className = 'device-card';
        card.style.animationDelay = `${index * 150}ms`;

        card.innerHTML = `
            <div class="device-info">
              <div class="speaker-icon"></div>
              <div>
                <strong>${device.name}</strong><br>
                <small>${device.address}</small>
              </div>
            </div>
            <button class="connect-btn">Connect</button>
            <div class="expanded-content">
              <div><strong>Status</strong></div>
              <div class="status-container">
                <div class="status-bar-fill"></div>
                <div class="status-number">0</div>
              </div>
              <div class="actions">
                <button class="action-btn">Turn Off</button>
                <button class="action-btn">Mode</button>
              </div>
            </div>
        `;

        const connectBtn = card.querySelector('.connect-btn');
        const sliderContainer = card.querySelector('.status-container');
        const fill = card.querySelector('.status-bar-fill');
        const valueDisplay = card.querySelector('.status-number');

        connectBtn.addEventListener('click', async () => {
            card.classList.add('expanded');
            setTimeout(() => connectBtn.style.display = 'none', 600);

            try {
                await window.electronAPI.invoke('ble-connect', device.address);
                currentDevice = device.address;
                console.log(`Connected to ${device.address}`);

                // Récupérer et afficher le volume actuel
                const volume = await window.electronAPI.invoke('ble-get-volume', currentDevice);
                console.log(`🔊 Volume brut (Bluetooth): ${volume}`);

                // Conversion en niveau logique (Soundboks)
                const logicalValue = Math.round((volume / maxBluetoothValue) * maxLogicalSteps);

                // Mise à jour de l’UI
                const fillPercent = (volume / maxBluetoothValue) * 100;
                fill.style.width = `${fillPercent}%`;
                valueDisplay.textContent = logicalValue;

                console.log(`🎚️ Niveau logique : ${logicalValue}`);
            } catch (err) {
                console.error('Connection failed:', err);
            }
        });

        // Slider logic
        let dragging = false;

        function updateSlider(clientX) {
            const rect = sliderContainer.getBoundingClientRect();
            let posX = clientX - rect.left;

            // Clamp position
            posX = Math.max(0, Math.min(posX, rect.width));

            const percent = posX / rect.width;

            // Calcul du niveau logique
            const logicalValue = Math.round(percent * maxLogicalSteps);

            // Conversion vers valeur Bluetooth
            const bluetoothValue = Math.round((logicalValue / maxLogicalSteps) * maxBluetoothValue);

            // Mise à jour UI
            const fillPercent = (bluetoothValue / maxBluetoothValue) * 100;
            fill.style.width = `${fillPercent}%`;
            valueDisplay.textContent = logicalValue;

            // Debug
            console.log(`🎚️ Niveau logique: ${logicalValue}`);
            console.log(`📶 Valeur Bluetooth à envoyer : ${bluetoothValue}`);

            if (currentDevice) {
                window.electronAPI.invoke('ble-set-volume', {
                    deviceId: currentDevice,
                    volume: bluetoothValue
                }).catch(err => {
                    console.error('Failed to set volume', err);
                });
            }
        }

        sliderContainer.addEventListener('mousedown', e => {
            dragging = true;
            updateSlider(e.clientX);
        });

        window.addEventListener('mousemove', e => {
            if (dragging) updateSlider(e.clientX);
        });

        window.addEventListener('mouseup', () => dragging = false);

        sliderContainer.addEventListener('touchstart', e => {
            dragging = true;
            updateSlider(e.touches[0].clientX);
        });

        window.addEventListener('touchmove', e => {
            if (dragging) updateSlider(e.touches[0].clientX);
        });

        window.addEventListener('touchend', () => dragging = false);

        return card;
    }

    scanBtn.addEventListener('click', async () => {
        deviceList.innerHTML = '';
        statusEl.textContent = 'Scanning for devices...';

        try {
            const devices = await window.electronAPI.invoke('ble-scan'); // Appel de la méthode `ble-scan`
            statusEl.textContent = `Found ${devices.length} devices.`;

            devices.forEach((device, index) => {
                console.log(`Device found: ${device.name} (${device.address})`);
                const card = createDeviceCard(device, index);
                deviceList.appendChild(card);
            });
        } catch (err) {
            console.error('Erreur pendant le scan BLE :', err);
            statusEl.textContent = 'Scan failed. Please try again.';
        }
    });
});