# Instrucciones para agentes de IA

## Contexto del repositorio

Este repositorio contiene el backend de Proyecto-Software-I.

Tecnologías principales:

* Node.js 24 LTS.
* NestJS.
* TypeScript estricto.
* npm.
* Swagger/OpenAPI.
* class-validator y class-transformer.
* Configuración mediante variables de entorno.

El frontend está en un repositorio separado:

* `Proyecto-Software-I/frontend`

## Fuente de verdad

Antes de modificar código:

1. Lee la issue asignada.
2. Lee `.github/CONTRIBUTING.md`.
3. Revisa el código existente relacionado con la tarea.
4. Identifica los criterios de aceptación.
5. Comprueba la rama actual con `git branch --show-current`.
6. Comprueba los cambios existentes con `git status`.

La issue asignada define el alcance del trabajo.

No inventes requisitos que no aparezcan en la issue o en el código existente.

Cuando exista ambigüedad que pueda cambiar el comportamiento, el contrato de la API, la base de datos o la seguridad, detén la implementación y solicita una decisión.

## Alcance obligatorio

Trabaja únicamente en la issue asignada.

No debes:

* Crear issues o tareas nuevas.
* Cambiar responsables, labels, prioridades o estados del Project.
* Ampliar el alcance de la issue por iniciativa propia.
* Resolver problemas no relacionados dentro del mismo Pull Request.
* Reescribir módulos completos cuando basta con un cambio localizado.
* Cambiar código de otras tareas sin una razón necesaria y documentada.
* Modificar directamente la rama `main`.

Cada rama y Pull Request debe corresponder a una sola issue.

## Git

El nombre de la rama debe seguir este formato:

```text
tipo/numero-issue-descripcion-corta
```

Ejemplos:

```text
feat/15-create-login-endpoint
fix/22-token-expiration
test/31-auth-service-tests
refactor/40-user-validation
chore/45-update-eslint
```

Nunca ejecutes sin autorización explícita:

```text
git push origin main
git push --force
git reset --hard
git clean -fd
git rebase sobre una rama de otra persona
git checkout descartando cambios no confirmados
```

`git push --force-with-lease` solo puede utilizarse sobre la rama propia después de un rebase consciente.

No modifiques ni elimines trabajo local que no hayas creado.

## Dependencias

No agregues, elimines ni actualices dependencias sin que la issue lo requiera.

Antes de agregar una dependencia:

1. Comprueba si el proyecto ya ofrece una solución equivalente.
2. Explica por qué es necesaria.
3. Prefiere paquetes mantenidos y con tipado adecuado.
4. Espera aprobación si es una dependencia de producción.

No cambies el administrador de paquetes.

Este proyecto utiliza npm.

No edites manualmente `package-lock.json`. Debe actualizarse mediante npm.

## Arquitectura NestJS

Mantén las responsabilidades separadas:

* Los controllers reciben solicitudes y devuelven respuestas.
* Los services contienen la lógica de negocio.
* Los DTOs definen y validan los datos de entrada.
* Los modules organizan dependencias.
* Los guards controlan autorización.
* Los interceptors y filters deben utilizarse para responsabilidades transversales.

Evita colocar lógica de negocio dentro de los controllers.

No accedas directamente a variables de entorno con `process.env` desde módulos de negocio. Utiliza `ConfigService`.

Todos los endpoints de la aplicación deben respetar el prefijo global:

```text
/api
```

Los endpoints nuevos o modificados deben documentarse con Swagger cuando corresponda.

## TypeScript

El proyecto utiliza TypeScript estricto.

No introduzcas:

```typescript
any
// @ts-ignore
// @ts-nocheck
```

No desactives reglas de ESLint para ocultar un problema.

Una excepción solo es aceptable cuando:

* Sea técnicamente necesaria.
* Tenga el alcance mínimo posible.
* Incluya una explicación clara.
* Sea mencionada en el Pull Request.

Prefiere tipos explícitos en límites del sistema:

* DTOs.
* Respuestas públicas.
* Servicios externos.
* Repositorios.
* Configuración.
* Funciones exportadas.

## DTOs y validación

Toda entrada externa debe validarse.

Utiliza:

* `class-validator`.
* `class-transformer`.
* DTOs específicos.
* El `ValidationPipe` global existente.

No aceptes objetos sin validar.

No reutilices entidades de base de datos como DTOs públicos.

No cambies nombres, tipos o campos de una respuesta existente sin revisar su impacto en el frontend.

## Contratos con el frontend

No modifiques unilateralmente:

* Rutas.
* Métodos HTTP.
* Nombres de propiedades.
* Tipos de datos.
* Códigos de respuesta.
* Estructura de errores.
* Reglas de autenticación.
* Formato de fechas.
* Campos opcionales u obligatorios.

Los cambios de contrato deben estar descritos en la issue.

Cuando una modificación afecte al frontend, indícalo en el Pull Request utilizando la referencia completa de la issue relacionada.

## Base de datos

No realices sin autorización explícita:

* Migraciones destructivas.
* Eliminación de tablas o columnas.
* Renombrado de columnas.
* Cambios de relaciones.
* Cambios de restricciones.
* Modificación de datos reales.
* Reseteo de la base de datos.
* Ejecución de seeds destructivos.

No borres migraciones existentes.

Una migración debe ser revisable, reproducible y coherente con la issue.

## Autenticación y seguridad

No modifiques autenticación, autorización, roles, guards, tokens, cookies o permisos fuera del alcance explícito de la issue.

Nunca escribas ni muestres:

* Contraseñas.
* Tokens.
* Secretos.
* Claves privadas.
* Credenciales de base de datos.
* Contenido real de archivos `.env`.

No agregues secretos a:

* Código fuente.
* Pruebas.
* Logs.
* README.
* Issues.
* Pull Requests.

No registres cuerpos completos de solicitudes que puedan contener información sensible.

## Calidad del código

Realiza el cambio más pequeño que resuelva correctamente la issue.

Prefiere:

* Funciones pequeñas.
* Nombres descriptivos.
* Dependencias explícitas.
* Código consistente con el repositorio.
* Reutilización razonable.
* Errores controlados.
* Pruebas relevantes.

Evita:

* Abstracciones innecesarias.
* Patrones introducidos para una sola línea.
* Duplicación considerable.
* Archivos enormes.
* Comentarios que repiten literalmente el código.
* Código muerto.
* Soluciones temporales sin documentar.
* Refactorizaciones masivas no solicitadas.

No cambies estilo, nombres o formato de archivos no relacionados.

## Pruebas

Todo cambio de comportamiento debe incluir o actualizar pruebas cuando sea razonable.

Como mínimo, antes de considerar terminada una tarea ejecuta:

```bash
npm run lint
npm test
npm run build
```

Si la tarea afecta pruebas de extremo a extremo, ejecuta también:

```bash
npm run test:e2e
```

No afirmes que una prueba pasó si no la ejecutaste.

Si no puedes ejecutar un comando:

1. Indica cuál no pudiste ejecutar.
2. Explica la causa.
3. No presentes el cambio como completamente verificado.

No elimines ni debilites pruebas únicamente para conseguir que el pipeline pase.

## Archivos protegidos conceptualmente

No modifiques estos archivos salvo que la issue lo requiera explícitamente:

```text
.github/**
AGENTS.md
CLAUDE.md
CODEOWNERS
package.json
package-lock.json
nest-cli.json
tsconfig.json
tsconfig.build.json
eslint.config.mjs
.env.example
```

Los cambios en estos archivos deben mencionarse expresamente en el Pull Request.

No modifiques workflows de GitHub Actions para evitar una validación fallida.

## Antes de editar

Antes de realizar cambios, presenta un plan breve que incluya:

* Qué entendiste de la issue.
* Qué archivos esperas modificar.
* Qué comportamiento debe mantenerse.
* Qué pruebas ejecutarás.
* Qué dudas o suposiciones existen.

No comiences una reestructuración amplia sin justificarla.

## Antes de finalizar

Revisa:

```bash
git diff --check
git status
npm run lint
npm test
npm run build
```

Comprueba además que:

* El cambio resuelve los criterios de aceptación.
* No hay archivos sensibles.
* No hay código temporal.
* No hay logs de depuración.
* No hay cambios fuera del alcance.
* Los contratos existentes se mantienen.
* Swagger está actualizado cuando corresponde.
* Las pruebas cubren el comportamiento modificado.

## Pull Request

El Pull Request debe incluir:

* Resumen del cambio.
* Archivos o áreas principales modificadas.
* Cómo probarlo.
* Comandos realmente ejecutados.
* Resultados de las pruebas.
* Riesgos o limitaciones conocidos.
* Issue relacionada mediante `Closes #NUMERO`.
* Issue del frontend relacionada, cuando exista.
* Cualquier cambio de dependencia, configuración o contrato.

No ocultes errores pendientes.

No marques casillas de verificación que no hayan sido comprobadas.

## Uso de IA

El código producido con IA debe ser tratado como una propuesta, no como una verdad.

Antes de finalizar:

* Comprueba cada archivo modificado.
* Verifica que las APIs utilizadas existan realmente.
* Comprueba las versiones instaladas en `package.json`.
* Confirma que los imports sean correctos.
* Elimina funciones o dependencias inventadas.
* Revisa errores, seguridad y casos límite.
* Asegúrate de poder explicar la implementación.

No incluyas texto como “generado por IA” dentro del código fuente.

No atribuyas a la IA decisiones que deben ser justificadas técnicamente por el autor del Pull Request.
