const fs = require('fs');
const app = require('electron').app;
const path = require('path');

// Classe pour gérer le stockage des données utilisateur
class DataStorage {
    constructor() {
        this.userDataPath = app.getPath('userData');
        console.log('Chemin du dossier utilisateur :', this.userDataPath);
    }

    async init() {
        try {
            // Vérifiez si le dossier utilisateur existe, sinon créez-le
            await fs.promises.mkdir(this.userDataPath, { recursive: true });
            console.log(`Dossier utilisateur créé ou déjà existant : ${this.userDataPath}`);

            // Vérifiez si le fichier userdata.json existe, sinon créez-le avec un modèle par défaut
            const userDataFile = path.join(this.userDataPath, 'userdata.json');
            const defaultModel = {
                scanTimeout: "10000",
                scanAutoStop: false,
                messageInterval: "200"
            };

            if (!fs.existsSync(userDataFile)) {
                await this.writeData('userdata.json', JSON.stringify(defaultModel, null, 2));
                console.log('Fichier userdata.json créé avec le modèle par défaut.');
            } else {
                console.log('Fichier userdata.json déjà existant.');
            }
        } catch (err) {
            console.error('Erreur lors de l\'initialisation du stockage des données :', err);
            throw err;
        }
    }

    async readData(fileName) {
        try {
            const filePath = path.join(this.userDataPath, fileName);
            const data = await fs.promises.readFile(filePath, 'utf-8');
            console.log(`Données lues depuis ${fileName} :`, data);

            // Parse les données JSON et les retourne
            const userdata = JSON.parse(data);
            return userdata;
        } catch (err) {
            console.error(`Erreur lors de la lecture du fichier ${fileName} :`, err);
            throw err;
        }
    }

    async writeData(fileName, data) {
        try {
            const filePath = path.join(this.userDataPath, fileName);
            await fs.promises.writeFile(filePath, data, 'utf-8');
            console.log(`Données écrites dans ${fileName} :`, data);
        } catch (err) {
            console.error(`Erreur lors de l'écriture dans le fichier ${fileName} :`, err);
            throw err;
        }
    }
}

const dataStorage = new DataStorage();

module.exports = DataStorage;