# Gestion de l'Alimentation Programmable RD6012

## Description

Cette application Electron permet de contrôler et de surveiller une alimentation programmable RD6012 via une connexion USB. Elle offre une interface utilisateur intuitive pour gérer les paramètres de tension et de courant, activer/désactiver la sortie, visualiser l'historique des données sous forme de graphiques et simuler le comportement d'une cellule solaire à partir de fichiers JSON.

L'application est composée de quatre fenêtres principales :
- **Monitoring** : Affiche les valeurs actuelles de tension, courant et état de sortie, avec la possibilité de sélectionner et de se connecter à un port série.
- **Contrôle** : Permet de définir les valeurs de tension (V_SET), de courant (I_SET) et d'activer/désactiver la sortie (OUTPUT).
- **Graphiques** : Affiche l'historique des valeurs configurées de tension et de courant sous forme de graphiques en temps réel.
- **Simulation Photovoltaïque** : Permet de charger un fichier JSON contenant des données de simulation pour reproduire le comportement d'une cellule solaire, avec un suivi visuel de la progression.

## Fonctionnalités

- **Connexion série** : Détection automatique et connexion aux ports série disponibles (par défaut, COM5 est présélectionné si disponible).
- **Contrôle en temps réel** : Réglage précis des valeurs de tension (0-60V) et de courant (0-12A), ainsi que l'activation/désactivation de la sortie.
- **Historique des données** : Visualisation des valeurs configurées de tension et de courant sous forme de graphiques dynamiques (limités à 60 points de données).
- **Simulation photovoltaïque** : Importation de fichiers JSON pour simuler des profils de tension, courant et puissance, avec une mise à jour automatique des paramètres de l'alimentation toutes les secondes.
- **Interface utilisateur moderne** : Design réactif avec des panneaux clairs, des animations subtiles et des indicateurs de statut de connexion.
- **Communication Modbus RTU** : Interaction avec l'alimentation RD6012 via le protocole Modbus RTU pour lire et écrire les registres.

## Prérequis

- **Node.js** : Version compatible avec Electron 35.0.0.
- **Electron** : Version 35.0.0 (installée via npm).
- **Système d'exploitation** : Windows, macOS ou Linux.
- **Alimentation RD6012** : Connectée via USB avec un câble série compatible.
- **Fichier JSON pour simulation** : Doit contenir un tableau de données avec les propriétés `time`, `voltage`, `current` et optionnellement `power`.

## Installation

1. **Installer les dépendances** :
   ```bash
   npm install
   ```

2. **Démarrer l'application** :
   ```bash
   npm start
   ```
   ou installer l'application [ELectron Fiddle](https://www.electronjs.org/fr/fiddle)

## Structure du Projet

- **`main.js`** : Point d'entrée de l'application Electron, gère la fenêtre principale, la communication série et les appels IPC.
- **`preload.js`** : Expose les API sécurisées pour la communication entre le processus principal et le processus de rendu.
- **`renderer.js`** : Gère l'interface utilisateur, les graphiques Chart.js et la logique de simulation.
- **`index.html`** : Structure HTML de l'interface utilisateur avec quatre fenêtres (Monitoring, Contrôle, Graphiques, Simulation).
- **`styles.css`** : Feuille de style pour une interface moderne et réactive.
- **`package.json`** : Configuration du projet et dépendances.

## Utilisation

1. **Connexion à l'alimentation** :
   - Ouvrez la fenêtre "Monitoring".
   - Sélectionnez un port série dans la liste déroulante.
   - Cliquez sur "Connecter" pour établir la connexion avec l'alimentation RD6012.
   - L'indicateur de statut passe au vert en cas de connexion réussie.

2. **Contrôle des paramètres** :
   - Accédez à la fenêtre "Contrôle" en cliquant sur "Ouvrir le contrôle".
   - Définissez la tension (0-60V) et le courant (0-12A) via les champs correspondants.
   - Activez ou désactivez la sortie à l'aide de l'interrupteur.

3. **Visualisation de l'historique** :
   - Accédez à la fenêtre "Graphiques" en cliquant sur "Ouvrir les graphiques".
   - Observez les graphiques de tension et de courant mis à jour en temps réel.

4. **Simulation photovoltaïque** :
   - Accédez à la fenêtre "Simulation PV" en cliquant sur "Simulation PV".
   - Chargez un fichier JSON via le champ de sélection de fichier.
   - Cliquez sur "Démarrer" pour lancer la simulation, qui envoie les données au RD6012 à intervalles d'une seconde.
   - Suivez la progression via les indicateurs de point actuel, pourcentage et temps écoulé.
   - Cliquez sur "Arrêter" pour mettre fin à la simulation.

## Format du Fichier JSON pour la Simulation

Le fichier JSON doit contenir un tableau nommé `data` avec des objets ayant les propriétés suivantes :
- `time` : Temps en secondes (nombre).
- `voltage` : Tension en volts (nombre).
- `current` : Courant en ampères (nombre).
- `power` : Puissance en watts (optionnel, calculé comme `voltage * current` si absent).

Exemple :
```json
{
  "data": [
    { "time": 0, "voltage": 10, "current": 2, "power": 20 },
    { "time": 1, "voltage": 12, "current": 2.5, "power": 30 },
    ...
  ]
}
```

## Dépendances

- **Electron** : Framework pour la création de l'application desktop.
- **SerialPort** : Gestion de la communication série avec l'alimentation RD6012.
- **Chart.js** : Utilisé pour les graphiques dans la fenêtre "Graphiques" et "Simulation".
- **debug** : Outil de débogage pour la communication série.

## Développement et Débogage

- Les journaux de débogage sont affichés dans la console (activés via le module `debug`).
- Les erreurs de communication série (par exemple, CRC invalide, timeout) sont capturées et affichées via des alertes.
- Les ports série sont automatiquement actualisés toutes les 5 secondes.

## Problèmes Connus

- **Timeout de connexion** : Si la connexion au port série échoue, vérifiez que l'alimentation RD6012 est correctement connectée et que le port n'est pas utilisé par une autre application.
- **Fichiers JSON mal formatés** : Assurez-vous que le fichier JSON respecte le format attendu, sinon une erreur sera affichée.
- **Limite des graphiques** : Les graphiques sont limités à 60 points de données pour des raisons de performance.