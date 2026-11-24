# Dog's Factory — refonte du site

Quatre propositions du nouveau site de [dogs-factory.be](https://www.dogs-factory.be), chacune dans son dossier :

| Version | Dossier | Idée |
|---|---|---|
| v3 | `site-v3/` | hero bleu, titre centré, chiens au curseur |
| v4 | `site-v4/` | sections type affiche, bande de mots, accordéon |
| v5 | `site-v5/` | mur de typo « DOG'S FACTORY » derrière les chiens |
| v6 | `site-v6/` | inspirée de barkhousenyc.com |

Ce sont des pages statiques (HTML, CSS, JavaScript), sans étape de build.

## Lancer en local

```bash
npm install
npm run v5   # ou v3, v4, v6
```

## Les chiens au curseur

`img/chiens.mp4` est lue image par image selon la position du curseur ; le fond bleu est détouré en direct.
Les moments de la vidéo (gauche, face, droite) se règlent avec `data-start`, `data-front` et `data-end` sur la balise `<video>` de chaque `index.html`.
