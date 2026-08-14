# Contribuir a LegacyLift AI

Esta guía define el flujo de trabajo humano del backend de LegacyLift AI. Las reglas técnicas permanentes del repositorio están en [`AGENTS.md`](../AGENTS.md).

## Principios

- `main` siempre debe permanecer desplegable.
- Todo cambio parte de una GitHub Issue asignada y se desarrolla en una rama propia.
- Las funcionalidades y cambios de comportamiento se planifican con OpenSpec antes de implementarse.
- Un Pull Request debe ser pequeño, revisable y resolver una sola issue.
- No se agregan dependencias, cambios de base de datos o cambios de contratos públicos sin estar contemplados en el alcance aprobado.

## Fuentes de verdad

1. **GitHub Issue:** objetivo, alcance y criterios de aceptación.
2. **OpenSpec:** requisitos, decisiones de diseño y tareas para cambios que lo requieran.
3. **`AGENTS.md`:** arquitectura y restricciones permanentes del backend.
4. **Código, pruebas y migraciones:** comportamiento actualmente implementado.

Si dos fuentes se contradicen, no se debe adivinar. La contradicción se resuelve en la issue antes de continuar.

## Cuándo usar OpenSpec

OpenSpec es obligatorio para:

- nuevas funcionalidades;
- cambios de comportamiento observable;
- autenticación, autorización o multi-tenancy;
- cambios de base de datos o migraciones;
- nuevos endpoints o cambios de contratos REST;
- nuevas dependencias;
- cambios de arquitectura;
- seguridad;
- integraciones externas;
- billing/entitlements;
- IA, análisis, migración o validación;
- cambios que afecten simultáneamente frontend y backend.

Puede omitirse únicamente cuando la issue lo indique o cuando el cambio sea inequívocamente mecánico, por ejemplo un typo o una corrección documental sin impacto funcional.

## Flujo de trabajo

### 1. Tomar una issue asignada

No se comienza trabajo sin una issue asignada. El alcance de la issue no se amplía unilateralmente.

### 2. Actualizar `main`

```bash
git checkout main
git pull --rebase origin main
```

### 3. Crear una rama

Formato recomendado:

```text
feat/<issue>-descripcion
fix/<issue>-descripcion
refactor/<issue>-descripcion
chore/<issue>-descripcion
```

Ejemplo:

```bash
git checkout -b feat/22-add-login-endpoint
```

### 4. Crear el cambio OpenSpec cuando corresponda

El identificador debe comenzar con el número de issue:

```text
22-add-login-endpoint
```

El plan debe describir solamente lo necesario para satisfacer la issue. No se implementa código de aplicación hasta que el plan requerido haya sido revisado conforme al flujo del equipo.

### 5. Implementar

Durante la implementación:

- seguir `AGENTS.md`;
- mantener controllers delgados y lógica en services;
- utilizar DTOs y validación para datos de entrada;
- documentar endpoints con Swagger;
- agregar o actualizar pruebas;
- no introducir dependencias o cambios de alcance no aprobados;
- no editar migraciones que ya hayan sido compartidas/aplicadas.

### 6. Verificar localmente

Para cambios de código:

```bash
npm run check:code
```

Para cambios que también incluyen OpenSpec:

```bash
npm run check
```

Cuando haya pruebas e2e que accedan a PostgreSQL local:

```bash
npm run db:ensure
npm run db:deploy
npm run db:seed
npm run test:e2e
```

Cada integrante usa su instalación local de PostgreSQL en Windows y su propio `.env`. Docker no forma parte del flujo de desarrollo local.

### 7. Abrir Pull Request

El PR debe:

- enlazar la issue (`Closes #<numero>` cuando corresponda);
- resumir qué cambió y por qué;
- indicar pruebas realizadas;
- señalar migraciones, cambios de configuración o contratos;
- incluir el cambio OpenSpec cuando sea obligatorio;
- mantener fuera cambios no relacionados.

No se hace merge mientras los checks obligatorios fallen.

## Cambios de Prisma y base de datos

La fuente de verdad del schema es exclusivamente:

```text
prisma/schema/*.prisma
```

El Prisma Client generado en `src/generated/prisma/` **no se versiona**.

Flujo para cambiar el modelo:

```bash
npm run prisma:format
npm run prisma:validate
npm run db:migrate -- --name nombre-del-cambio
npm run prisma:generate
```

Antes de subir una migración:

1. revisar el SQL generado;
2. confirmar que no elimina datos accidentalmente;
3. agregar/actualizar el seed si cambió un catálogo del sistema;
4. ejecutar las pruebas afectadas.

Una migración ya compartida no se modifica ni se elimina. Se crea una migración nueva.

`prisma migrate dev` y `npm run db:fresh` se ejecutan únicamente contra la BD local del desarrollador. En una BD compartida/hosteada se aplican migraciones existentes con `npm run db:deploy`.

## Seed

`prisma/seed.ts` contiene únicamente datos de sistema reproducibles: permisos, planes, features, metodologías, tecnologías, reglas base y Migration Packs.

No deben agregarse usuarios reales, contraseñas, tokens ni datos personales al seed.

## Convenciones de commits

Mensajes breves y orientados al cambio. Ejemplos:

```text
feat(auth): add organization login context
fix(projects): enforce tenant ownership
refactor(prisma): normalize storage relations
chore(ci): validate prisma schema
```

## Dependencias

Antes de agregar un paquete:

1. debe estar justificado en la issue/OpenSpec;
2. verificar que el stack existente no resuelva ya el problema;
3. preferir dependencias mantenidas y con alcance pequeño;
4. actualizar `package-lock.json` junto con `package.json`.

## Configuración y secretos

- Nunca subir `.env`.
- Toda variable necesaria debe documentarse en `.env.example`.
- Nunca guardar credenciales, tokens o secretos directamente en tablas de negocio; se usa `SecretReference` para referencias a un gestor de secretos.
- Nunca escribir secretos en logs, issues, PRs o fixtures.

## Dudas de alcance

Si para completar una tarea parece necesario cambiar una decisión arquitectónica, agregar una dependencia, modificar el schema fuera de lo previsto o tocar otro dominio, se detiene ese punto y se actualiza la issue/OpenSpec antes de continuar.
