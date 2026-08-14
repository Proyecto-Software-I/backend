<div align="center">

<img src="https://nestjs.com/img/logo-small.svg" width="110" alt="Logo de NestJS" />

# Proyecto Software I — Backend

API REST de **Proyecto-Software-I**, desarrollada con NestJS, TypeScript, Prisma y PostgreSQL.

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24_LTS-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Estado](https://img.shields.io/badge/estado-en_desarrollo-yellow)](#estado-del-proyecto)

</div>

---

## Descripción

La aplicación está construida con [NestJS](https://nestjs.com/) y se encarga de proporcionar:

* La API utilizada por el frontend.
* La lógica de negocio.
* La validación de datos.
* La autenticación y autorización.
* El acceso a PostgreSQL mediante Prisma.
* La documentación de los endpoints.

El frontend se mantiene en un repositorio separado:

* [`Proyecto-Software-I/frontend`](https://github.com/Proyecto-Software-I/frontend)

## Tecnologías

* [Node.js](https://nodejs.org/)
* [NestJS](https://nestjs.com/)
* [TypeScript](https://www.typescriptlang.org/)
* [PostgreSQL](https://www.postgresql.org/)
* [Prisma ORM](https://www.prisma.io/)
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
* PostgreSQL.
* OpenSpec CLI.

Puedes comprobar las versiones instaladas con:

```bash
node --version
npm --version
git --version
psql --version
openspec --version
````

> El proyecto incluye un archivo `.nvmrc` con la versión de Node.js utilizada por el equipo.

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

## Configuración inicial

El proyecto utiliza PostgreSQL instalado localmente durante el desarrollo.

Asegúrate de que el servicio de PostgreSQL esté iniciado y ejecuta:

```bash
npm run setup
```

La primera vez, este comando:

1. Crea `.env` desde `.env.example` si todavía no existe.
2. Genera Prisma Client.
3. Crea la base de datos si es necesario.
4. Aplica las migraciones.
5. Ejecuta el seed inicial.

Si tu usuario o contraseña de PostgreSQL son diferentes, ajusta `DATABASE_URL` dentro de `.env`.

## Variables de entorno

El archivo `.env` contiene configuración local y **no debe subirse al repositorio**.

Las variables principales son:

| Variable       | Descripción                    | Valor predeterminado    |
| -------------- | ------------------------------ | ----------------------- |
| `NODE_ENV`     | Entorno de ejecución           | `development`           |
| `PORT`         | Puerto del backend             | `3001`                  |
| `FRONTEND_URL` | Origen permitido mediante CORS | `http://localhost:3000` |
| `DATABASE_URL` | Conexión a PostgreSQL          | Ver `.env.example`      |

Las nuevas variables necesarias para ejecutar el proyecto deben agregarse también a `.env.example`, sin incluir valores sensibles.

## Ejecutar el proyecto

### Desarrollo con recarga automática

```bash
npm run start:dev
```

### Desarrollo

```bash
npm run start
```

### Depuración

```bash
npm run start:debug
```

### Producción

```bash
npm run build
npm run start:prod
```

## API

Con la configuración predeterminada, el backend estará disponible en:

```text
http://localhost:3001
```

Todos los endpoints utilizan el prefijo:

```text
/api
```

### Comprobar el estado

```http
GET /api/health
```

Dirección completa:

```text
http://localhost:3001/api/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "legacylift-backend"
}
```

## Swagger

La documentación interactiva de la API está disponible en:

```text
http://localhost:3001/docs
```

## Base de datos

### Abrir Prisma Studio

```bash
npm run db:studio
```

### Aplicar migraciones existentes

```bash
npm run db:deploy
```

### Crear una nueva migración

Después de modificar el schema de Prisma:

```bash
npm run db:migrate -- --name nombre_del_cambio
```

### Reiniciar la base local

> Este comando elimina todos los datos de la base configurada en `DATABASE_URL`.

```bash
npm run db:fresh
```

## Scripts principales

| Comando              | Descripción                                   |
| -------------------- | --------------------------------------------- |
| `npm run setup`      | Configura el entorno local y la base de datos |
| `npm run start:dev`  | Inicia NestJS con recarga automática          |
| `npm run build`      | Compila el proyecto                           |
| `npm run lint`       | Analiza el código                             |
| `npm run format`     | Formatea el código                            |
| `npm run test`       | Ejecuta pruebas unitarias                     |
| `npm run test:e2e`   | Ejecuta pruebas E2E                           |
| `npm run db:studio`  | Abre Prisma Studio                            |
| `npm run db:migrate` | Crea una migración de desarrollo              |
| `npm run db:deploy`  | Aplica migraciones existentes                 |
| `npm run db:fresh`   | Reconstruye la base local                     |
| `npm run check`      | Ejecuta las verificaciones del proyecto       |

## Verificación del proyecto

Antes de subir cambios importantes:

```bash
npm run check
```

## Contribución

Las reglas de trabajo del repositorio, incluyendo ramas, commits, Issues, OpenSpec, Pull Requests y revisiones, se encuentran en:

* [Guía de contribución](.github/CONTRIBUTING.md)