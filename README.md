# get-a-room
Application Google Apps Script responsive pour de la réservation de salle

Déployée ici : https://goo.gl/GDwqGD

### Dépendances
L'application est développée en Google Apps Script, déployée en tant que WebApp.

Le script doit se situer dans un fichier Google Sheet, dont la feuille principale contient le référentiel des salles :

| Ligne 1 | Salle |	id agenda |	Nom ressource |	Type |
| ------ | ----------- | ----------- | ----------- | ----------- |
| Lignes suivantes | Libellé de la salle dans l'appli | id de l'agenda | Nom de la ressource agenda dans Google | 'Box' ou 'Salle' |
