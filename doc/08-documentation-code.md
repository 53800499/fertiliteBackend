# 08 — Documentation du Code & Conventions NestJS
## Application mobile d'estimation intelligente de la fertilité (FertiliteApp)

---

### Informations documentaires
- **Projet** : FertiliteApp
- **Composant** : Directives de développement NestJS / TypeScript
- **Framework** : NestJS 10+
- **Date** : 24 septembre 2026

---

## 1. Principes de Développement & Architecture Logicielle

1. **Typage strict TypeScript** :
   - `strict: true` dans `tsconfig.json`.
   - Interdiction formelle du type `any` (utilisation de `unknown` avec type guards si nécessaire).
2. **Principe de Responsabilité Unique (SRP)** :
   - Les **Controllers** ne contiennent aucune logique métier : ils valident les DTOs, extraient l'utilisateur courant et délèguent immédiatement aux Services.
   - Les **Services** orchestrent le domaine, gèrent les transactions et émettent les événements.
   - Les **Engines / Calculators** sont de purs services de calcul sans état (stateless), testables sans dépendance de base de données.
3. **DTOs d'Entrée & Sortie Immuables** :
   - Tous les DTOs d'entrée utilisent `class-validator` et `class-transformer`.
   - `whitelist: true` et `forbidNonWhitelisted: true` activés sur le `ValidationPipe` global.

---

## 2. Décorateurs Personnalisés (`src/common/decorators/`)

### 2.1 `@CurrentUser()`
Extrait de manière sûre l'utilisatrice authentifiée injectée par la stratégie Passport JWT :

```typescript
// src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'standard' | 'premium' | 'admin';
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;
    return data ? user?.[data] : user;
  },
);
```

### 2.2 `@RequireConsent(consentType)`
Vérifie avant l'exécution du contrôleur que l'utilisatrice dispose d'un consentement actif pour l'opération :

```typescript
// src/common/decorators/require-consent.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const REQUIRE_CONSENT_KEY = 'require_consent';
export const RequireConsent = (consentType: string) => 
  SetMetadata(REQUIRE_CONSENT_KEY, consentType);
```

---

## 3. Intercepteurs Clés (`src/common/interceptors/`)

### 3.1 `AuditAccessInterceptor`
Enregistre de manière asynchrone tout accès ou manipulation d'une ressource de santé sensible dans `journal_acces` :

```typescript
// src/common/interceptors/audit-access.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../privacy/audit/audit.service';

@Injectable()
export class AuditAccessInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const ip = request.ip || request.connection.remoteAddress;
    const resource = request.route?.path;
    const method = request.method;

    return next.handle().pipe(
      tap({
        next: () => {
          this.auditService.logAccess({
            userId,
            action: this.mapMethodToAction(method),
            resourceType: resource,
            ip,
            status: 'succes',
          });
        },
        error: (err) => {
          this.auditService.logAccess({
            userId,
            action: this.mapMethodToAction(method),
            resourceType: resource,
            ip,
            status: 'echec',
            details: { error: err.message },
          });
        },
      }),
    );
  }

  private mapMethodToAction(method: string) {
    switch (method) {
      case 'GET': return 'lecture';
      case 'POST': return 'creation';
      case 'PUT':
      case 'PATCH': return 'modification';
      case 'DELETE': return 'suppression';
      default: return 'lecture';
    }
  }
}
```

---

## 4. Filtre d'Exceptions Global (`src/common/filters/`)

Capture toutes les exceptions pour garantir l'absence de fuite d'informations sensibles (ex. stack traces ou détails internes de la base de données PostgreSQL) :

```typescript
// src/common/filters/all-exceptions.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException 
      ? exception.getStatus() 
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException 
      ? exception.getResponse() 
      : 'Une erreur interne est survenue';

    // Journalisation structurée côté serveur (sans exposer de données de santé)
    this.logger.error(`HTTP ${status} on ${request.method} ${request.url}`, exception instanceof Error ? exception.stack : undefined);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: typeof message === 'object' ? message : { message },
    });
  }
}
```

---

## 5. Configuration du `main.ts`

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Sécurité des en-têtes HTTP
  app.use(helmet());

  // CORS sécurisé restreint aux domaines autorisés et aux mobiles
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Préfixe d'API v1
  app.setGlobalPrefix('api/v1');

  // Validation globale des DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Filtre d'exceptions unifié
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT || 3000;
  await app.listen(port);
}
bootstrap();
```
