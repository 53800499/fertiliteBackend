export enum TypeNotificationEnum {
  RAPPEL_SAISIE = 'rappel_saisie',
  FENETRE_FERTILE = 'fenetre_fertile',
  REGLES_PREVUES = 'regles_prevues',
  MAJ_PREDICTION = 'maj_prediction',
  INFORMATION_GENERALE = 'information_generale',
}

export enum CanalNotificationEnum {
  PUSH = 'push',
  EMAIL = 'email',
  IN_APP = 'in_app',
}

export enum StatutNotificationEnum {
  PLANIFIEE = 'planifiee',
  ENVOYEE = 'envoyee',
  LUE = 'lue',
  ANNULEE = 'annulee',
  ECHEC = 'echec',
}
