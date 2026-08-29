# Quiz Quest

RPG tour par tour éducatif : pour attaquer, il faut répondre juste à une question posée par l'ennemi. Une bonne réponse = tu attaques. Une mauvaise réponse (ou le temps écoulé) = l'ennemi attaque.

## Lancer le jeu

La scène de combat en 3D (voir plus bas) charge des fichiers `.glb`, ce que les navigateurs bloquent sur une page ouverte en double-clic (`file://`). Il faut donc servir le dossier via un petit serveur local :

```bash
cd rpg
python3 -m http.server 8000
```

Puis ouvre `http://localhost:8000` dans ton navigateur. Si Python n'est pas installé, n'importe quel serveur statique fait l'affaire (`npx serve`, l'extension "Live Server" de VS Code, etc.).

Si le chargement 3D échoue (pas d'internet la première fois pour Three.js si tu n'as pas les fichiers dans `js/vendor/`, navigateur trop ancien, etc.), le jeu bascule automatiquement sur des sprites emoji — il reste jouable dans tous les cas.

## Modifier les questions

Fichier : `js/data/questions.js`

Les questions sont classées par matière. Pour ajouter une question dans une matière existante :

```js
{ question: "Ma question ?", choices: ["Réponse A", "Réponse B", "Réponse C", "Réponse D"], answer: 2 }
```

`answer` est l'index (0 à 3) de la bonne réponse dans `choices`.

Pour ajouter une nouvelle matière, crée une nouvelle clé dans `QUESTION_BANKS` (et son libellé dans `SUBJECT_LABELS`).

## Modifier les ennemis

Fichier : `js/data/enemies.js`

Chaque ennemi pioche ses questions dans la matière indiquée par `subject`. Tu peux changer l'ordre, les PV (`hp`), l'attaque (`atk`), ou ajouter de nouveaux ennemis.

## Réglages de difficulté

Fichier : `js/config.js` — durée du chrono, PV/attaque de départ du héros, bonus de montée de niveau, bonus de série (streak).

## Décor et personnages 3D

Fichier : `js/scene3d.js`. Décor et personnages viennent de trois packs CC0 de [Kenney](https://kenney.nl) (voir le `LICENSE.txt` de chaque dossier) :

- `assets/kenney-mini-arena/` — sol, bannière, trophée, héros (`character-soldier.glb`)
- `assets/kenney-graveyard-kit/` — monstres (squelette, fantôme, vampire, gardien), clôture, pierres tombales, lanternes, piliers
- `assets/kenney-mini-dungeon/` — orc

Tous ces personnages partagent le même jeu d'animations nommées (`idle`, `attack-melee-right`, `die`...), rejouées via `THREE.AnimationMixer`.

Chaque ennemi a un champ `model` dans `js/data/enemies.js` (`pack`, `file`, `color`, `scaleMul`) qui indique quel modèle utiliser, sa teinte et sa taille relative. Pour changer l'apparence d'un ennemi, ou lui donner un modèle différent, il suffit de modifier ces valeurs — regarde dans les dossiers `assets/kenney-*/` pour voir les `.glb` disponibles.

Three.js, son GLTFLoader et SkeletonUtils sont fournis en local dans `js/vendor/` pour que le jeu reste jouable hors-ligne une fois ces fichiers présents.
