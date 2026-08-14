# LegacyLift AI — Backend

Backend de LegacyLift AI, una plataforma B2B multi-tenant para descubrir, analizar y modernizar sistemas legados de forma progresiva y verificable.

## Stack actual

- Node.js 24
- NestJS 11
- TypeScript
- PostgreSQL 17
- Prisma ORM 7
- Swagger/OpenAPI
- OpenSpec

El repositorio contiene únicamente la infraestructura necesaria para comenzar el desarrollo. Redis, object storage real, proveedores de IA y otras piezas se incorporarán cuando entren en alcance mediante una issue/OpenSpec.

## Requisitos locales

- Windows
- Node.js 24 (`.nvmrc` incluido)
- npm 10+
- PostgreSQL 17 instalado y ejecutándose como servicio de Windows
- Git

Docker no es necesario para el desarrollo local.

<<<<<<< Updated upstream
La aplicación está construida con [NestJS](https://nestjs.com/) y se encarga de proporcionar:

* La API utilizada por el frontend.
* La lógica de negocio.
* La validación de datos.
* La autenticación y autorización.
* El acceso a la base de datos.
* La documentación de los endpoints.

El frontend se mantiene en un repositorio separado:

* [`Proyecto-Software-I/frontend`](https://github.com/Proyecto-Software-I/frontend)

## Tecnologías

* [Node.js](https://nodejs.org/)
* [NestJS](https://nestjs.com/)
* [TypeScript](https://www.typescriptlang.org/)
* [Joi](https://joi.dev/)
* [class-validator](https://github.com/typestack/class-validator)
* [class-transformer](https://github.com/typestack/class-transformer)
* [Swagger / OpenAPI](https://swagger.io/)
* [Helmet](https://helmetjs.github.io/)

## Requisitos

Antes de instalar el proyecto necesitas:

* Node.js 24 LTS.
* npm.
* Git.
* OpenSpec CLI.

Puedes comprobar las versiones instaladas con:

```bash
node --version
npm --version
git --version
openspec --version
```

## Instalación

Clona el repositorio:

```bash
git clone https://github.com/Proyecto-Software-I/backend.git
cd backend
```

Instala las dependencias:

```bash
npm install
```

Instala OpenSpec globalmente:

```bash
npm install --global @fission-ai/openspec@latest
```

Comprueba la instalación:

```bash
openspec --version
```

## Variables de entorno

Crea un archivo `.env` a partir de `.env.example`.

### Variables disponibles

| Variable       | Descripción                        | Valor predeterminado    |
| -------------- | ---------------------------------- | ----------------------- |
| `NODE_ENV`     | Entorno de ejecución               | `development`           |
| `PORT`         | Puerto utilizado por la aplicación | `3000`                  |
| `FRONTEND_URL` | Origen autorizado mediante CORS    | `http://localhost:5173` |

El archivo `.env` contiene configuración local y no debe subirse al repositorio.

Las nuevas variables necesarias para ejecutar el proyecto deben agregarse también a `.env.example`, sin incluir valores sensibles.

## Ejecutar el proyecto

### Desarrollo

```bash
npm run start
```

### Desarrollo con recarga automática
=======
## Primer arranque
>>>>>>> Stashed changes

```bash
npm ci
npm run setup
npm run start:dev
```

Si `.env` no existe, `npm run setup` solicita en consola las credenciales de PostgreSQL de esa máquina y crea el archivo automáticamente. Si `.env` ya existe, lo conserva.

Después el setup:

1. genera Prisma Client;
2. verifica si la base indicada en `DATABASE_URL` existe y la crea cuando sea necesario;
3. aplica las migraciones versionadas;
4. ejecuta el seed idempotente.

Para crear automáticamente la base, el usuario PostgreSQL usado en `DATABASE_URL` debe tener permiso `CREATEDB`. El usuario local `postgres` normalmente lo tiene.

Servicios locales:

```text
API:      http://localhost:3001/api
Health:   http://localhost:3001/api/health
Swagger:  http://localhost:3001/docs
Frontend: http://localhost:3000
Postgres: localhost:5432
```

## Variables locales

Cada desarrollador tiene su propio `.env` y puede usar una contraseña PostgreSQL distinta. `.env` no se versiona.

Ejemplo:

```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
DATABASE_URL="postgresql://postgres:MI_PASSWORD@localhost:5432/legacylift"
```

`.env.example` sí se versiona únicamente como referencia.

## Reconstruir la BD local

Si la base local contiene una estructura anterior o quieres reconstruirla completamente desde las migraciones:

```bash
npm run db:fresh
```

`db:fresh` ejecuta `prisma migrate reset --force`, por lo que **borra todos los datos de la base indicada en tu `DATABASE_URL`** y vuelve a aplicar migraciones + seed.

Usarlo únicamente contra una base local descartable. Nunca contra la futura BD compartida de desarrollo, staging o producción.

## Comandos útiles

### Aplicación

```bash
npm run start:dev
npm run build
npm run start:prod
```

### Calidad

```bash
npm run lint
npm run lint:fix
npm test
npm run test:e2e
npm run check:code
npm run check
```

### Prisma/PostgreSQL

```bash
npm run db:ensure
npm run db:setup
npm run db:fresh
npm run db:migrate -- --name descripcion
npm run db:deploy
npm run db:seed
npm run db:studio
npm run prisma:format
npm run prisma:validate
npm run prisma:generate
```

Uso recomendado:

- `db:setup`: primer arranque local o preparación de una BD vacía.
- `db:migrate -- --name ...`: crear una migración después de cambiar el schema Prisma; solo en una BD local del desarrollador.
- `db:deploy`: aplicar migraciones que ya existen en el repositorio.
- `db:fresh`: destruir y reconstruir únicamente la BD local.
- `db:studio`: inspeccionar datos visualmente.

Cuando exista una BD de desarrollo hosteada, se cambiará únicamente `DATABASE_URL` y se aplicarán migraciones existentes con `db:deploy`; no se usará `migrate dev` ni `db:fresh` contra esa BD compartida.

### OpenSpec

```bash
npm run spec:list
npm run spec:validate
npm run spec:view
```

## Estructura relevante

```text
src/
├── generated/prisma/       # generado; no se versiona
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── app.controller.ts
├── app.module.ts
└── main.ts

prisma/
├── migrations/
├── schema/
└── seed.ts

scripts/
├── setup.mjs
└── db-ensure.mjs

docs/architecture/
├── database.md
└── multi-tenancy.md
```

## Arquitectura de datos

`Organization` es la frontera de tenant. Las reglas completas están en:

- [`AGENTS.md`](AGENTS.md)
- [`docs/architecture/multi-tenancy.md`](docs/architecture/multi-tenancy.md)
- [`docs/architecture/database.md`](docs/architecture/database.md)

Regla esencial: conocer el UUID de un recurso nunca autoriza acceder a él. Toda consulta tenant-scoped debe verificar la organización activa, directamente o mediante la cadena de ownership.

## Seed inicial

El seed crea únicamente catálogos del sistema:

- permisos;
- planes Developer/Team/Enterprise;
- features y entitlements;
- metodología inicial de assessment;
- reglas base de análisis;
- catálogo tecnológico;
- Migration Packs iniciales;
- prompts base.

No crea usuarios ni contraseñas de prueba.

## Flujo de colaboración

Leer antes de desarrollar:

- [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md): flujo humano de issues, ramas, OpenSpec y PRs.
- [`AGENTS.md`](AGENTS.md): reglas técnicas permanentes y multi-tenancy.

Las features se agregan progresivamente. La existencia de una tabla en Prisma no obliga a crear inmediatamente un módulo NestJS para ella.
