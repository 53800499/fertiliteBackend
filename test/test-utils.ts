import { Inject } from '@nestjs/common';

/**
 * Helper de test pour générer le token d'injection TypeORM
 * Évite le chargement ESM de @nestjs/typeorm sous Jest CJS
 */
export function getRepositoryToken(entity: { name: string } | string): string {
  return `${typeof entity === 'string' ? entity : entity.name}Repository`;
}

export function InjectRepository(entity: any) {
  return Inject(getRepositoryToken(entity));
}
