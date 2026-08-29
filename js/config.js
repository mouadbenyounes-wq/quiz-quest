// Réglages généraux du jeu. Modifie ces valeurs pour changer la difficulté / l'équilibrage.
const CONFIG = {
  QUESTION_TIME: 15,        // secondes par question en mode "Normal"
  FAST_QUESTION_TIME: 8,    // secondes par question en mode "Rapide"

  BASE_HERO_HP: 100,        // PV de départ du héros
  BASE_HERO_ATK: 15,        // Attaque de départ du héros

  LEVEL_UP_HP_BONUS: 15,    // PV max gagnés après chaque victoire
  LEVEL_UP_ATK_BONUS: 3,    // Attaque gagnée après chaque victoire

  STREAK_BONUS_PER_HIT: 0.15, // +15% de dégâts par bonne réponse consécutive
  STREAK_BONUS_MAX: 1.0       // bonus de dégâts maximum (+100%)
};
