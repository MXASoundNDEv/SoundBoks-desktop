let scantimeout;
let scanautostop;
let messageinterval;

let userData;

document.addEventListener('DOMContentLoaded', () => {
    const paramScanTimeOut = document.getElementById('Scan-time-out');
    const paramScanAutoStop = document.getElementById('auto-stop-scan');
    const paramMessageInterval = document.getElementById('message-timeout');
    const parametersbtn = document.getElementById('parram-btn');
    const parramsCloseBtn = document.getElementById('parram-close-btn');
    LoadUserData();

    function LoadUserData() {
        try {
            window.electronAPI.invoke('read-user-data').then(userData => {
                if (userData) {
                    paramScanTimeOut.value = userData.scanTimeout || 10; // Valeur par défaut de 10 secondes
                    paramScanAutoStop.checked = userData.scanAutoStop || false; // Valeur par défaut à false
                    paramMessageInterval.value = userData.messageInterval || 5; // Valeur par défaut de 5 secondes
                } else {
                    console.warn('Aucune donnée utilisateur trouvée, utilisation des valeurs par défaut.');
                }
            }).catch(err => {
                console.error('Erreur lors de la récupération des données utilisateur :', err);
            });
        } catch (err) {
            console.error('Erreur inattendue lors du chargement des paramètres :', err);
        }
    }

    function SaveUserData() {
        try {
            userData = {
                scanTimeout: paramScanTimeOut.value,
                scanAutoStop: paramScanAutoStop.checked,
                messageInterval: paramMessageInterval.value
            };

            window.electronAPI.invoke('write-user-data', userData).then(() => {
                console.log('Paramètres sauvegardés avec succès');
            }).catch(err => {
                console.error('Erreur lors de la sauvegarde des paramètres :', err);
            });
        } catch (err) {
            console.error('Erreur inattendue lors de la sauvegarde des paramètres :', err);
        }
    }

    // Charger les paramètres existants
    parametersbtn.addEventListener('click', () => {
        console.log('Paramètres ouverts');
    });

    // Enregistrer les paramètres
    paramScanTimeOut.addEventListener('change', () => {
        scantimeout = paramScanTimeOut.value;
        console.log('Scan Timeout:', scantimeout);
        SaveUserData();
    });
    paramScanAutoStop.addEventListener('change', () => {
        scanautostop = paramScanAutoStop.checked;
        console.log('Auto Stop Scan:', scanautostop);
        SaveUserData();
    });
    paramMessageInterval.addEventListener('change', () => {
        messageinterval = paramMessageInterval.value;
        console.log('Message Interval:', messageinterval);
        SaveUserData();
    });

    parramsCloseBtn.addEventListener('click', () => {
        console.log('Paramètres fermés');
    });
});