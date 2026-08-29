// Liste des ennemis rencontrés dans l'ordre. Chaque ennemi pioche ses questions
// dans QUESTION_BANKS[subject] (voir questions.js).
// Pour ajouter un ennemi : ajoute un objet ici avec un "subject" existant (ou nouveau).
//
// "model" décrit son apparence dans la scène 3D (voir js/scene3d.js) :
// - pack : dossier dans assets/ (voir js/scene3d.js -> PACKS)
// - file : nom du .glb dans ce dossier
// - color : teinte hexadécimale appliquée sur le modèle
// - scaleMul : multiplicateur de taille (1 = taille normalisée standard)

const ENEMIES = [
  { id: 'skeleton', name: 'Squelette Calculateur',  emoji: '💀', hp: 40,  atk: 6,  subject: 'maths',    difficulty: 'Facile',
    model: { pack: 'graveyard', file: 'character-skeleton.glb', color: 0xe0e0d8 } },
  { id: 'orc',      name: 'Orc Grammairien',        emoji: '👹', hp: 55,  atk: 9,  subject: 'francais', difficulty: 'Moyen',
    model: { pack: 'dungeon', file: 'character-orc.glb', color: 0x7cb342 } },
  { id: 'ghost',    name: 'Fantôme du Laboratoire',  emoji: '👻', hp: 70,  atk: 11, subject: 'sciences', difficulty: 'Moyen',
    model: { pack: 'graveyard', file: 'character-ghost.glb', color: 0x9fd8ff } },
  { id: 'vampire',  name: "Vampire de l'Histoire",   emoji: '🧛', hp: 85,  atk: 13, subject: 'histoire', difficulty: 'Difficile',
    model: { pack: 'graveyard', file: 'character-vampire.glb', color: 0x7b1fa2 } },
  { id: 'keeper',   name: 'Gardien du Savoir',       emoji: '🧙', hp: 110, atk: 16, subject: 'culture',  difficulty: 'Boss final', boss: true,
    model: { pack: 'graveyard', file: 'character-keeper.glb', color: 0xffc107, scaleMul: 1.3 } },
  { id: 'sage',     name: 'Le Sage des Prophètes',   emoji: '📖', hp: 130, atk: 18, subject: 'prophetes', difficulty: 'Défi bonus', boss: true,
    model: { pack: 'graveyard', file: 'character-keeper.glb', color: 0x2e7d32, scaleMul: 1.15 } }
];
