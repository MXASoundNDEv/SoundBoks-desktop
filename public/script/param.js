let scantimeout
let scanautostop
let messageinterval

document.addEventListener('DOMContentLoaded', () => {
    const paramScanTimeOut = document.getElementById('Scan-time-out');
    const paramScanAutoStop = document.getElementById('auto-stop-scan');
    const paramMessageInterval = document.getElementById('message-timeout');


    // Charger les paramètres existants
    ipcRenderer.invoke('read-user-data', 'fileName.txt').then(
        result => doSomething()
    );
});