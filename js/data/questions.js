// Banque de questions, organisée par matière.
// Pour ajouter une question : ajoute un objet { question, choices: [4 réponses], answer: index de la bonne réponse (0 à 3) }
// Pour ajouter une matière : crée une nouvelle clé ici, puis utilise-la comme "subject" d'un ennemi dans enemies.js

const SUBJECT_LABELS = {
  maths: 'Mathématiques',
  francais: 'Français',
  sciences: 'Sciences',
  histoire: 'Histoire',
  culture: 'Culture générale',
  prophetes: 'Histoire des prophètes'
};

const QUESTION_BANKS = {
  maths: [
    { question: "Combien font 7 x 8 ?", choices: ["54", "56", "58", "64"], answer: 1 },
    { question: "Quel est le résultat de 15 + 27 ?", choices: ["32", "42", "52", "37"], answer: 1 },
    { question: "Quelle est l'aire d'un carré de côté 5 cm ?", choices: ["10 cm²", "20 cm²", "25 cm²", "15 cm²"], answer: 2 },
    { question: "Combien y a-t-il de degrés dans un triangle ?", choices: ["90°", "180°", "270°", "360°"], answer: 1 },
    { question: "Quel est le résultat de 100 ÷ 4 ?", choices: ["20", "25", "30", "40"], answer: 1 },
    { question: "Quelle fraction est équivalente à 1/2 ?", choices: ["2/4", "3/5", "1/3", "2/3"], answer: 0 },
    { question: "Quel est le carré de 9 ?", choices: ["81", "72", "90", "99"], answer: 0 },
    { question: "Combien font -5 + 8 ?", choices: ["-13", "3", "13", "-3"], answer: 1 },
    { question: "Quel est le périmètre d'un rectangle de 4 cm sur 6 cm ?", choices: ["10 cm", "20 cm", "24 cm", "14 cm"], answer: 1 },
    { question: "Quel de ces nombres est premier ?", choices: ["15", "21", "17", "27"], answer: 2 }
  ],
  francais: [
    { question: "Quel est le pluriel de \"cheval\" ?", choices: ["chevals", "chevaux", "chevaus", "chevales"], answer: 1 },
    { question: "Quel est l'antonyme de \"rapide\" ?", choices: ["lent", "vif", "agile", "prompt"], answer: 0 },
    { question: "Dans la phrase \"Le chat dort\", quel est le verbe ?", choices: ["Le", "chat", "dort", "aucun"], answer: 2 },
    { question: "Quel est le féminin de \"acteur\" ?", choices: ["actrice", "acteure", "actoresse", "actrisse"], answer: 0 },
    { question: "Complète : \"Je ___ au marché.\"", choices: ["vais", "vas", "va", "allons"], answer: 0 },
    { question: "Quel mot est un adjectif ?", choices: ["rapidement", "beauté", "joli", "courir"], answer: 2 },
    { question: "Quel est le synonyme de \"content\" ?", choices: ["triste", "heureux", "fatigué", "énervé"], answer: 1 },
    { question: "\"Ils ___ mangé.\" Complète avec le bon auxiliaire.", choices: ["ont", "sont", "avons", "êtes"], answer: 0 },
    { question: "Quel signe termine une phrase interrogative ?", choices: [".", ",", "!", "?"], answer: 3 },
    { question: "Quel est le contraire de \"monter\" ?", choices: ["descendre", "grimper", "sauter", "tomber"], answer: 0 }
  ],
  sciences: [
    { question: "Quel gaz devons-nous respirer pour vivre ?", choices: ["Oxygène", "Azote", "CO2", "Hydrogène"], answer: 0 },
    { question: "Combien de planètes compte notre système solaire ?", choices: ["7", "8", "9", "10"], answer: 1 },
    { question: "Quel est l'état de l'eau à 0°C ?", choices: ["Liquide", "Solide", "Gazeux", "Plasma"], answer: 1 },
    { question: "Quel organe pompe le sang dans le corps ?", choices: ["Poumon", "Foie", "Cœur", "Rein"], answer: 2 },
    { question: "Quelle est la formule chimique de l'eau ?", choices: ["CO2", "H2O", "O2", "NaCl"], answer: 1 },
    { question: "Que produit la photosynthèse chez les plantes ?", choices: ["Eau", "Oxygène", "Azote", "Sel"], answer: 1 },
    { question: "Quelle force nous maintient au sol ?", choices: ["Le magnétisme", "La gravité", "L'électricité", "Le vent"], answer: 1 },
    { question: "Combien d'os compte environ le corps humain adulte ?", choices: ["106", "206", "306", "406"], answer: 1 },
    { question: "Quel est le plus grand organe du corps humain ?", choices: ["Le cœur", "Le foie", "La peau", "Le cerveau"], answer: 2 },
    { question: "Quelle planète est la plus proche du Soleil ?", choices: ["Vénus", "Mars", "Mercure", "Terre"], answer: 2 }
  ],
  histoire: [
    { question: "En quelle année a eu lieu la Révolution française ?", choices: ["1789", "1815", "1848", "1914"], answer: 0 },
    { question: "Qui était empereur des Français en 1804 ?", choices: ["Louis XIV", "Napoléon Bonaparte", "Charlemagne", "Robespierre"], answer: 1 },
    { question: "En quelle année s'est terminée la Seconde Guerre mondiale ?", choices: ["1918", "1939", "1945", "1950"], answer: 2 },
    { question: "Quel roi est célèbre pour le château de Versailles ?", choices: ["Louis XIV", "Louis XVI", "François Ier", "Henri IV"], answer: 0 },
    { question: "Qu'est-ce que la Préhistoire ?", choices: ["La période avant l'écriture", "La période romaine", "La période médiévale", "La période moderne"], answer: 0 },
    { question: "Qui a atteint l'Amérique en 1492 ?", choices: ["Vasco de Gama", "Christophe Colomb", "Magellan", "Marco Polo"], answer: 1 },
    { question: "Quel mur est tombé en 1989 ?", choices: ["Le mur de Chine", "Le mur de Berlin", "Le mur d'Hadrien", "Le mur des Lamentations"], answer: 1 },
    { question: "Quelle civilisation a construit les pyramides de Gizeh ?", choices: ["Les Romains", "Les Grecs", "Les Égyptiens", "Les Mayas"], answer: 2 },
    { question: "Quel événement a débuté en 1914 ?", choices: ["La Révolution française", "La Première Guerre mondiale", "La Seconde Guerre mondiale", "La guerre froide"], answer: 1 },
    { question: "Qui était Jeanne d'Arc ?", choices: ["Une reine", "Une héroïne française", "Une peintre", "Une scientifique"], answer: 1 }
  ],
  culture: [
    { question: "Quelle est la capitale de la France ?", choices: ["Lyon", "Marseille", "Paris", "Nice"], answer: 2 },
    { question: "Combien de continents y a-t-il sur Terre ?", choices: ["5", "6", "7", "8"], answer: 2 },
    { question: "Quelle langue a le plus de locuteurs natifs au monde ?", choices: ["Anglais", "Mandarin", "Espagnol", "Français"], answer: 1 },
    { question: "Quel est le plus long fleuve du monde ?", choices: ["L'Amazone", "Le Nil", "Le Mississippi", "Le Yangtsé"], answer: 1 },
    { question: "Combien de joueurs par équipe sur un terrain de football ?", choices: ["9", "10", "11", "12"], answer: 2 },
    { question: "Quel est le symbole chimique de l'or ?", choices: ["Ag", "Au", "Fe", "Pb"], answer: 1 },
    { question: "Quelle mer borde la ville de Marseille ?", choices: ["L'océan Atlantique", "La mer Méditerranée", "La mer du Nord", "La mer Noire"], answer: 1 },
    { question: "Combien de couleurs compte traditionnellement l'arc-en-ciel ?", choices: ["5", "6", "7", "8"], answer: 2 },
    { question: "Quel est le plus grand océan du monde ?", choices: ["Atlantique", "Indien", "Arctique", "Pacifique"], answer: 3 },
    { question: "Quelle monnaie est utilisée en France ?", choices: ["Le franc", "L'euro", "Le dollar", "La livre"], answer: 1 }
  ],
  prophetes: [
    { question: "Combien de prophètes sont cités nommément dans le Coran ?", choices: ["25", "15", "30", "40"], answer: 0 },
    { question: "Quel prophète a construit une grande arche pour échapper au déluge ?", choices: ["Ibrahim", "Nouh", "Moussa", "Youssouf"], answer: 1 },
    { question: "Quel prophète a été jeté dans un puits par ses frères ?", choices: ["Youssouf", "Ismaël", "Ayyoub", "Younous"], answer: 0 },
    { question: "Quel prophète a reçu la Torah (Tawrat) ?", choices: ["Moussa", "Aïssa", "Dawoud", "Mohammed ﷺ"], answer: 0 },
    { question: "Quel prophète a reçu l'Évangile (Injil) ?", choices: ["Moussa", "Aïssa", "Dawoud", "Souleiman"], answer: 1 },
    { question: "Quel prophète a reçu le Zabour (les Psaumes) ?", choices: ["Souleiman", "Dawoud", "Moussa", "Ibrahim"], answer: 1 },
    { question: "Quel est le dernier prophète en Islam, le \"sceau des prophètes\" ?", choices: ["Moussa", "Aïssa", "Mohammed ﷺ", "Ibrahim"], answer: 2 },
    { question: "Quel prophète est resté avalé par une grande baleine avant d'être sauvé ?", choices: ["Younous", "Ayyoub", "Ismaël", "Ishaq"], answer: 0 },
    { question: "Quel est le premier prophète et premier être humain selon l'Islam ?", choices: ["Nouh", "Adam", "Ibrahim", "Idriss"], answer: 1 },
    { question: "Avec quel fils le prophète Ibrahim a-t-il construit la Kaaba ?", choices: ["Ishaq", "Ismaël", "Yaqoub", "Youssouf"], answer: 1 }
  ]
};
