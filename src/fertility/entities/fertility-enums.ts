export enum CategorieFertiliteEnum {
  FAIBLE = 'faible',
  MOYENNE = 'moyenne',
  ELEVEE = 'elevee',
}

export enum NiveauConfianceEnum {
  FAIBLE = 'faible',
  MOYEN = 'moyen',
  ELEVE = 'eleve',
}

export enum MethodePredictionEnum {
  CALENDRIER_STATISTIQUE = 'calendrier_statistique',
  INDICATEURS_COMBINES = 'indicateurs_combines',
  MODELE_ML = 'modele_ml',
}

export enum TypeFacteurEnum {
  HISTORIQUE_CYCLES = 'historique_cycles',
  REGULARITE = 'regularite',
  TEMPERATURE_BASALE = 'temperature_basale',
  GLAIRE_CERVICALE = 'glaire_cervicale',
  TEST_OVULATION = 'test_ovulation',
  SYMPTOME = 'symptome',
  POSITION_DANS_CYCLE = 'position_dans_cycle',
}

export enum SensEffetEnum {
  RENFORCE = 'renforce',
  DIMINUE = 'diminue',
  NEUTRE = 'neutre',
}

export enum TypeMoteurEnum {
  REGLES_STATISTIQUES = 'regles_statistiques',
  MACHINE_LEARNING = 'machine_learning',
}
