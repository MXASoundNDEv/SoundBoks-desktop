//config
const maxLogicalSteps = 11; // Valeurs de 0 à 11 inclus
const maxBluetoothValue = 255;
const indexCard = 0; // Index de l'élément à créer
const loadingTime = 100; // Temps de chargement en millisecondes (3 secondes)

// This file is part of the SDBAPPJS project.
document.addEventListener('DOMContentLoaded', () => {
    const statusEl = document.getElementById('status');
    const scanBtn = document.getElementById('scan-btn');
    const deviceList = document.getElementById('device-list');
    const modalOverlay = document.getElementById('modalOverlay');
    const githubLink = document.getElementById('github-link');
    const parametersbtn =document.getElementById('parram-btn');
    const parransModal = document.getElementById('parram-modal');
    const parramsCloseBtn = document.getElementById('parram-close-btn');
    const maxValue = 11;

    let currentDevice = null;
    let currentVolume = null;

    // Vérifier si un périphérique est déjà connecté
    window.electronAPI.invoke('status').then(status => {
        if (status.device) {
            currentDevice = status.device;
            currentVolume = status.volume;
            console.log(`Périphérique déjà connecté : ${currentDevice}`);
            const card = createDeviceCard({
                name: 'Connected Device',
                address: currentDevice
            }, indexCard, true);
            deviceList.appendChild(card);
            indexCard++;
        }
    });

    function createDeviceCard(device, index, connect = false) {
        const card = document.createElement('div');
        card.className = 'device-card';
        card.style.animationDelay = `${index * 150}ms`;
        if (connect) {
            card.classList.add('expanded');
        }

        card.innerHTML = `
            <div class="device-info">
                <div class="speaker-icon"></div>
                <div>
                    <strong>${device.name}</strong><br>
                    <small>${device.address}</small>
                </div>
            </div>
            <button class="connect-btn">Connect ➜</button>
            <div class="expanded-content">
                <div class="top-row">
                    <div class="speaker-image"></div>
                    <div style="height: 150px;" class="divider"></div>
                    <div class="info">
                        <strong>${device.name}</strong><br>
                        <span style="font-size: 0.9em;">${device.address}</span>
                        <div class="status-icons">
                            <div class="bluetooth-icon"></div>
                            <div class="signal-icon"></div>
                        </div>
                    </div>
                    <div class="more-icon"></div>
                </div>
                <div class="volume-bar" id="slider-${index}">
                    <div class="fill" id="fill-${index}"></div>
                    <div class="volume-icon"></div>
                    <div class="volume-number" id="volumeValue-${index}">3</div>
                </div>
                <div class="actions">
                    <button class="action-btn">Turn OFF</button>
                    <div class="divider"></div>
                    <button class="action-btn">Mode</button>
                    <div class="divider"></div>
                    <button class="action-btn">Pro</button>
                </div>
            </div>
        `;

        const connectBtn = card.querySelector('.connect-btn');
        const sliderContainer = card.querySelector(`#slider-${index}`);
        const fill = card.querySelector(`#fill-${index}`);
        const valueDisplay = card.querySelector(`#volumeValue-${index}`);
        const deviceinfo = card.querySelector('.device-info');
        if (connect) {
            deviceinfo.style.display = 'none';
            card.classList.add('expanded');
            setTimeout(() => connectBtn.style.display = 'none', 600);
            try {
                const volume = getVolume();
                const fillPercent = (volume.volume / maxBluetoothValue) * 100;
                fill.style.width = `${fillPercent}%`;
                valueDisplay.textContent = volume.logicalValue;
            } catch (err) {
                console.error('Failed to get volume:', err);
            }
        }

        connectBtn.addEventListener('click', async () => {
            card.classList.add('expanded');
            deviceinfo.style.display = 'none';
            setTimeout(() => connectBtn.style.display = 'none', 600);

            try {
                await window.electronAPI.invoke('ble-connect', device.address);
                currentDevice = device.address;
                console.log(`Connected to ${device.address}`);

                const volume = getVolume();

                const fillPercent = (volume.volume / maxBluetoothValue) * 100;
                fill.style.width = `${fillPercent}%`;
                valueDisplay.textContent = volume.logicalValue;

                console.log(`🎚️ Niveau logique : ${volume.logicalValue}`);
                localStorage.setItem('currentDevice', currentDevice); // Store the current device in localStorage
            } catch (err) {
                console.error('Connection failed:', err);
            }
        });

        async function getVolume() {
            const volume = await window.electronAPI.invoke('ble-get-volume', currentDevice);
            const logicalValue = Math.round((volume / maxBluetoothValue) * maxLogicalSteps);
            return logicalValue, volume;
        }

        let dragging = false;

        function updateSlider(clientX) {
            const rect = sliderContainer.getBoundingClientRect();
            let posX = clientX - rect.left;

            posX = Math.max(0, Math.min(posX, rect.width));
            const percent = posX / rect.width;

            const logicalValue = Math.round(percent * maxLogicalSteps);
            const bluetoothValue = Math.round((logicalValue / maxLogicalSteps) * maxBluetoothValue);

            const fillPercent = (bluetoothValue / maxBluetoothValue) * 100;
            fill.style.width = `${fillPercent}%`;
            valueDisplay.textContent = logicalValue;

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

    // Fonction pour afficher la popup et lancer le chargement
        modalOverlay.classList.add('active');
        simulateLoading();

        try {
            const devices = await window.electronAPI.invoke('ble-scan'); // Appel de la méthode `ble-scan`
            statusEl.textContent = `Found ${devices.length} devices.`;

            devices.forEach((device, index) => {
                console.log(`Device found: ${device.name} (${device.address})`);
                const card = createDeviceCard(device, indexCard);
                deviceList.appendChild(card);
                indexCard++;
            });
        } catch (err) {
            console.error('Erreur pendant le scan BLE :', err);
        }
    });

    const loadingBarFill = document.querySelector('.loading-bar-fill');

    function simulateLoading() {
        let width = 0;
        loadingBarFill.style.width = '0%';

        const interval = setInterval(() => {
            if (width >= 100) {
                clearInterval(interval);
                modalOverlay.classList.remove('active');
            } else {
                width += 1;
                loadingBarFill.style.width = width + '%';
            }
        }, loadingTime); // 30ms * 100 = 3s pour remplir
    }


    // Lien vers GitHub
    githubLink.addEventListener('click', () => {
        try {
            window.electronAPI.invoke('github-page');
        }catch (err) {
            console.error('Failed to open GitHub link:', err);
        }
    });

    // Bouton des paramètres
    parametersbtn.addEventListener('click', () => {
        parransModal.classList.toggle('active');
        if (parransModal.classList.contains('active')) {
            console.log('Parameters modal opened');
        } else {
            console.log('Parameters modal closed');
        }
    });

    // Bouton de fermeture des paramètres
    parramsCloseBtn.addEventListener('click', () => {
        parransModal.classList.remove('active');
        console.log('Parameters modal closed');
    });

});