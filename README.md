<div align="center">

<img src="https://nestjs.com/img/logo-small.svg" width="110" alt="Logo de NestJS" />

# Proyecto Software I — Backend

API REST de **Proyecto-Software-I**, desarrollada con NestJS y TypeScript.

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs\&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript\&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24_LTS-339933?logo=node.js\&logoColor=white)](https://nodejs.org/)
[![Estado](https://img.shields.io/badge/estado-en_desarrollo-yellow)](#estado-del-proyecto)

</div>

---

## Descripción

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

Puedes comprobar las versiones instaladas con:

```bash
node --version
npm --version
git --version
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

```bash
npm run start:dev
```

### Depuración

```bash
npm run start:debug
```

### Producción

Compila el proyecto:

```bash
npm run build
```

Ejecuta la compilación:

```bash
npm run start:prod
```

## API

Con la configuración predeterminada, el backend estará disponible en:

```text
http://localhost:3000
```

Todos los endpoints de la aplicación utilizan el prefijo:

```text
/api
```

### Comprobar el estado del backend

```http
GET /api/health
```

Dirección completa:

```text
http://localhost:3000/api/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "Proyecto-Software-I/backend"
}
```

## Documentación con Swagger

La documentación interactiva de la API está disponible en:

```text
http://localhost:3000/docs
```

Swagger permite consultar:

* Endpoints disponibles.
* Métodos HTTP.
* Parámetros.
* Cuerpos de las solicitudes.
* Respuestas esperadas.
* Códigos de estado.
* Esquemas utilizados por la API.

## Scripts disponibles

| Comando               | Descripción                                 |
| --------------------- | ------------------------------------------- |
| `npm run start`       | Inicia la aplicación                        |
| `npm run start:dev`   | Inicia la aplicación con recarga automática |
| `npm run start:debug` | Inicia la aplicación en modo depuración     |
| `npm run start:prod`  | Ejecuta la compilación de producción        |
| `npm run build`       | Compila el proyecto                         |
| `npm run lint`        | Analiza y corrige problemas de estilo       |
| `npm run format`      | Formatea los archivos del proyecto          |
| `npm run test`        | Ejecuta las pruebas unitarias               |
| `npm run test:watch`  | Ejecuta las pruebas en modo observación     |
| `npm run test:cov`    | Genera el reporte de cobertura              |
| `npm run test:e2e`    | Ejecuta las pruebas de extremo a extremo    |

## Verificación del proyecto

Para verificar que el proyecto funciona correctamente:

```bash
npm run format
npm run lint
npm run test
npm run build
```

## Contribución

Las reglas de trabajo del repositorio, incluyendo ramas, commits, issues, Pull Requests y revisiones, se encuentran en:

* [Guía de contribución](.github/CONTRIBUTING.md)
