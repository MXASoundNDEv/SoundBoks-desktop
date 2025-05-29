# 🎛️ Soundboks Controller

Contrôle ta **Soundboks** directement depuis un ordinateur via **Bluetooth Low Energy (BLE)** avec une application **ElectronJS** moderne et réactive.

> 🧪 Projet en cours – expérimental mais déjà fonctionnel pour lire/écrire le volume, scanner, s’authentifier et interagir avec des caractéristiques BLE spécifiques.

---

## ✨ Fonctionnalités
* 🔍 **Scan des appareils Soundboks** : Détection rapide et efficace des appareils à proximité.
* 📶 **Connexion automatique** : Association simplifiée avec une Soundboks détectée.
* 🔐 **Authentification via PIN** *(en cours de développement)* : Sécurisation des connexions Bluetooth.
* 🎚️ **Contrôle de volume visuel** : Ajustez le volume avec une interface intuitive.
* 📡 **Lecture des informations système** : Accédez aux détails comme le firmware et le modèle.
* 💡 **Interface moderne** : Conçue en HTML/CSS/JS pour une expérience utilisateur fluide.
* ⚙️ **Gestionnaire de mode** *(en cours de développement)* : Personnalisez les paramètres audio.
* 🤝 **TeamUp** *(en cours de développement)* : Fonctionnalité collaborative pour connecter plusieurs appareils.
* 📊 **Propanel** *(en cours de développement)* : Tableau de bord avancé pour la gestion des appareils.

## 📁 Structure du projet

```
SoundboksApp/
│
├── index.js                 # Point d’entrée Electron
├── ui.js                    # UI / Renderer frontend Electron
│
├── lib/                     # Logique applicative BLE
│   ├── ble_manager.js       # Gestion connexion BLE / caractéristiques
│   ├── ble_helpers.js       # Fonctions bas niveau (read/write/notify)
│   ├── volume_mapping.js    # Détection & mapping du volume
│   └── scan_soundboks.js    # Scan des Soundboks (nom avec "#xxxx")
│
├── data/
│   └── uuid.json            # Liste des UUIDs utilisés
│
└── public/
    ├── index.html           # UI principale
    ├── style.css            # Style visuel
    └── assets/              # Logos, images (optionnel)

```

## 📸 Aperçu de l'application

### 🔍 Scan des appareils
![Scan](/image/Frame%205.png)

---

### 📋 Liste détectée
![Liste](/image/Frame%203.png)

---

### 🎚️ Contrôle
![Contrôle](/image/Frame%202.png)

---

### ⚙️ Paramètres
![Paramètres](/image/Frame%204.png)

## 📦 Installation

### Prérequis :

* Node.js ≥ 18
* Python (si tu utilises Bleak en parallèle côté test)
* **Bluetooth activé** sur ta machine
* Windows ou Linux compatible avec [noble-winrt](https://www.npmjs.com/package/@abandonware/noble)

### 1. Cloner le projet

```bash
git clone https://github.com/ton_user/SoundboksBLEController.git
cd SoundboksApp
```

### 2. Installer les dépendances

```bash
npm install
```

Les modules clés sont :

```bash
npm install electron @abandonware/noble chalk
```

---

## 🚀 Lancer l’application

```bash
npm start
```

Cela ouvre l’interface utilisateur avec scan + contrôle volume + infos Soundboks.

---

## 🧪 Scripts de test indépendants

Dans le dossier `scripttest/`, tu trouveras des fichiers comme :

* `ble.js` : scan + connexion directe à une Soundboks
* `scan_soundboks_by_name.js` : détection par nom `#xxxx`

```bash
node scripttest/ble.js
```

---

## 🛠️ UUIDs utilisés

Tu peux éditer manuellement `data/uuid.json` pour ajouter ou modifier les caractéristiques BLE.

```json
{
  "device_name": "00002a00-0000-1000-8000-00805f9b34fb",
  "volume": "7649b19f-c605-46e2-98f8-6c1808e0cfb4",
  "lock_status": "11ad501d-fa86-43cc-8d92-5a27ee672f1a",
  "write_control": "49535343-aca3-481c-91ec-d85e28a60318"
}
```

---

## 📬 Demande de support ou contribution

Si tu veux contribuer ou proposer une amélioration :

* Fais un fork
* Crée une **pull request**

---

## ⚠️ Légalité et usage

> Ce projet n'est **pas affilié à Soundboks ApS**.
> Il est fourni à titre éducatif et d’expérimentation.


---

## 📖 Licence

MIT – libre pour usage personnel ou open-source.