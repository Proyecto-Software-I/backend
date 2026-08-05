# Instrucciones para agentes de IA

## Contexto del repositorio

Este repositorio contiene el backend de `Proyecto-Software-I`.

Tecnologías principales:

* Node.js 24 LTS.
* NestJS.
* TypeScript estricto.
* npm.
* Swagger/OpenAPI.
* `class-validator`.
* `class-transformer`.
* Configuración mediante variables de entorno.

El frontend se encuentra en un repositorio separado:

```text
Proyecto-Software-I/frontend
```

## Jerarquía de fuentes de verdad

Utiliza esta jerarquía para resolver qué debes implementar:

1. La GitHub Issue define la asignación, el alcance y los criterios de aceptación.
2. Los artefactos OpenSpec definen los requisitos detallados, escenarios, diseño y tareas aprobadas.
3. Este archivo define las reglas permanentes del repositorio.
4. `.github/CONTRIBUTING.md` define el flujo general de contribución.
5. El código y las pruebas existentes muestran los patrones técnicos vigentes.
6. Swagger/OpenAPI describe el contrato HTTP actualmente implementado.

No inventes requisitos que no aparezcan en estas fuentes.

Cuando exista una contradicción:

* No elijas una interpretación por tu cuenta.
* Detén la implementación.
* Explica la contradicción.
* Solicita una decisión al responsable del repositorio.

## Preparación obligatoria

Antes de modificar archivos:

1. Lee la issue asignada completa.

2. Lee los artefactos OpenSpec del cambio, cuando sean obligatorios.

3. Lee `.github/CONTRIBUTING.md`.

4. Revisa el código y las pruebas relacionados.

5. Identifica los criterios de aceptación.

6. Comprueba la rama actual:

   ```bash
   git branch --show-current
   ```

7. Comprueba el estado del repositorio:

   ```bash
   git status
   ```

8. Presenta un plan breve que indique:

   * Qué entendiste de la issue.
   * Qué comportamiento debe cambiar.
   * Qué comportamiento debe mantenerse.
   * Qué archivos o áreas esperas modificar.
   * Qué contratos pueden verse afectados.
   * Qué pruebas y validaciones ejecutarás.
   * Qué dudas o suposiciones existen.

No comiences una reestructuración amplia sin justificarla y sin que forme parte del plan aprobado.

# Flujo obligatorio con OpenSpec

## Cuándo es obligatorio

OpenSpec es obligatorio para:

* Funcionalidades nuevas.
* Correcciones que cambien el comportamiento observable.
* Cambios en contratos públicos.
* Cambios que afecten frontend y backend.
* Autenticación o autorización.
* Cambios de base de datos.
* Dependencias nuevas.
* Cambios de arquitectura.
* Refactorizaciones importantes.
* Cambios de configuración con impacto funcional.
* Modificaciones de seguridad.
* Cambios expresamente marcados como OpenSpec en la issue.

OpenSpec puede omitirse únicamente cuando la issue lo indique expresamente, por ejemplo:

* Correcciones tipográficas.
* Cambios pequeños de documentación.
* Ajustes locales sin cambio de comportamiento.
* Mantenimiento mecánico claramente acotado.

No decidas por tu cuenta que OpenSpec no es necesario.

## Convención de nombres

El nombre del cambio OpenSpec debe seguir este formato:

```text
numero-issue-descripcion-corta
```

Ejemplo:

```text
15-add-login-endpoint
```

La rama relacionada debe mantener el mismo número y descripción:

```text
feat/15-add-login-endpoint
```

## Etapa de planificación

Antes de implementar código en un cambio que requiere OpenSpec:

1. Lee la issue.
2. Crea o utiliza la rama correspondiente.
3. Explora el código relacionado sin modificarlo cuando sea necesario.
4. Genera:

   * `proposal.md`.
   * Delta specs dentro de `specs/`.
   * `design.md`.
   * `tasks.md`.
5. Incluye la referencia completa a la issue.
6. Define claramente qué está dentro y fuera del alcance.
7. Identifica riesgos de seguridad, base de datos, compatibilidad y despliegue.
8. Identifica cualquier impacto en el frontend.
9. Valida el cambio en modo estricto.
10. Crea un commit que contenga únicamente la planificación.
11. Abre un Draft Pull Request.

El Draft Pull Request de planificación no debe contener código de aplicación, migraciones ni cambios de dependencias.

No implementes código hasta que el responsable publique un comentario que comience exactamente con:

```text
PLAN APPROVED
```

Preguntas, observaciones, revisiones parciales, ausencia de objeciones o aprobaciones automáticas no constituyen autorización para implementar.

## Revisión del plan

Antes de considerar aprobado un plan, los artefactos deben cumplir:

### `proposal.md`

* Referencia la issue.
* Explica el objetivo.
* Define el alcance.
* Define qué queda fuera.
* Identifica las áreas afectadas.
* No contiene implementación completa.
* No inventa requisitos.

### Delta specs

* Describen comportamiento observable.
* Incluyen escenarios de éxito.
* Incluyen validaciones.
* Incluyen errores relevantes.
* Definen rutas, métodos, datos y códigos HTTP cuando corresponda.
* Identifican contratos que deben coordinarse con el frontend.

### `design.md`

* Respeta la arquitectura NestJS existente.
* Mantiene la lógica de negocio fuera de los controllers.
* Justifica dependencias nuevas.
* Incluye seguridad cuando corresponda.
* Incluye migración y rollback para cambios de base de datos.
* Identifica Swagger y pruebas afectadas.

### `tasks.md`

* Contiene tareas pequeñas y ordenadas.
* Cada tarea es verificable.
* Incluye validación de DTOs cuando corresponda.
* Incluye actualización de Swagger.
* Incluye pruebas.
* Finaliza con lint, pruebas y build.

## Implementación

Después de recibir `PLAN APPROVED`:

1. Implementa únicamente el cambio aprobado.
2. Sigue las tareas en el orden definido.
3. Marca una tarea como completa solo después de verificarla.
4. Mantén los artefactos OpenSpec sincronizados con la implementación.
5. No amplíes el alcance.
6. No agregues dependencias no aprobadas.
7. No cambies contratos no aprobados.
8. Ejecuta pruebas enfocadas durante el desarrollo.
9. Ejecuta las validaciones completas antes de finalizar.

## Cambios materiales durante la implementación

Detén la implementación y actualiza OpenSpec cuando descubras que es necesario cambiar:

* El alcance de la issue.
* Una ruta o método HTTP.
* La estructura de una solicitud o respuesta.
* Los códigos de estado.
* La autenticación o autorización.
* Una dependencia.
* El diseño arquitectónico aprobado.
* El modelo de datos.
* Una migración.
* La integración con el frontend.
* Una decisión relevante de seguridad.

Después de actualizar los artefactos:

1. Valida nuevamente el cambio.
2. Sube la planificación actualizada.
3. Solicita una nueva revisión.
4. Espera otro comentario `PLAN APPROVED`.

No continúes basándote en una aprobación anterior si el plan cambió materialmente.

## Finalización y archivado

Antes de marcar el Pull Request como listo:

1. Confirma que todas las tareas estén realmente terminadas.
2. Comprueba que las specs coincidan con el comportamiento final.
3. Valida el cambio OpenSpec en modo estricto.
4. Ejecuta lint, pruebas y build.
5. Archiva el cambio mediante OpenSpec.
6. Confirma que `openspec/specs/` represente el comportamiento vigente.
7. Confirma que el cambio esté en `openspec/changes/archive/`.
8. Ejecuta nuevamente las validaciones.
9. Actualiza la descripción del Pull Request.
10. Cambia el Draft Pull Request a `Ready for review`.

No archives cambios incompletos.

No elimines cambios archivados.

## Archivos OpenSpec

```text
openspec/specs/
```

Describe el comportamiento vigente del sistema.

```text
openspec/changes/
```

Contiene cambios activos y archivados.

No modifiques directamente una especificación principal para evitar crear un cambio OpenSpec.

No actualices automáticamente los workflows, prompts o skills generados por OpenSpec sin una issue específica.

# Alcance obligatorio

Trabaja únicamente en la issue asignada.

No debes:

* Crear issues o tareas nuevas.
* Cambiar responsables.
* Cambiar labels.
* Cambiar prioridades.
* Cambiar estados del Project.
* Ampliar el alcance por iniciativa propia.
* Resolver problemas no relacionados en el mismo Pull Request.
* Reescribir módulos completos cuando basta un cambio localizado.
* Cambiar código de otras tareas sin una razón necesaria y documentada.
* Modificar directamente `main`.

Cada rama y Pull Request debe corresponder a una sola issue.

# Git

## Ramas

Formato obligatorio:

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

## Operaciones prohibidas

Nunca ejecutes sin autorización explícita:

```text
git push origin main
git push --force
git reset --hard
git clean -fd
git rebase sobre una rama de otra persona
git checkout descartando cambios no confirmados
```

`git push --force-with-lease` solo puede utilizarse sobre la rama propia y después de un rebase consciente.

No modifiques, elimines ni sobrescribas trabajo local que no hayas creado.

No confirmes archivos sensibles.

# Dependencias

No agregues, elimines ni actualices dependencias salvo que la issue y el plan aprobado lo requieran.

Antes de agregar una dependencia:

1. Comprueba si el proyecto ya proporciona una solución equivalente.
2. Explica por qué es necesaria.
3. Evalúa mantenimiento, seguridad y tipado.
4. Identifica si es de producción o desarrollo.
5. Espera aprobación explícita cuando corresponda.

Este proyecto utiliza npm.

No cambies el administrador de paquetes.

No edites manualmente `package-lock.json`. Debe actualizarse mediante npm.

# Arquitectura NestJS

Mantén las responsabilidades separadas:

* Los controllers reciben solicitudes y devuelven respuestas.
* Los services contienen la lógica de negocio.
* Los DTOs definen y validan datos de entrada.
* Los modules organizan dependencias.
* Los guards controlan autenticación y autorización.
* Los interceptors, pipes y filters resuelven responsabilidades transversales.

No coloques lógica de negocio en controllers.

No accedas directamente a `process.env` desde módulos de negocio. Utiliza `ConfigService`.

Todos los endpoints deben respetar el prefijo global:

```text
/api
```

Los endpoints nuevos o modificados deben actualizar Swagger/OpenAPI cuando corresponda.

Respeta los patrones de módulos, servicios, DTOs, excepciones y pruebas existentes antes de introducir una estructura nueva.

# TypeScript

El proyecto utiliza TypeScript estricto.

No introduzcas:

```typescript
any
// @ts-ignore
// @ts-nocheck
```

No utilices afirmaciones de tipo inseguras únicamente para silenciar errores.

No desactives reglas de ESLint para ocultar problemas.

Una excepción solo es aceptable cuando:

* Es técnicamente necesaria.
* Tiene el alcance mínimo posible.
* Incluye una explicación clara.
* Está contemplada por la issue o el plan aprobado.
* Se menciona en el Pull Request.

Prefiere tipos explícitos en los límites del sistema:

* DTOs.
* Respuestas públicas.
* Funciones exportadas.
* Servicios externos.
* Repositorios.
* Adaptadores.
* Configuración.

# DTOs y validación

Toda entrada externa debe validarse.

Utiliza:

* `class-validator`.
* `class-transformer`.
* DTOs específicos.
* El `ValidationPipe` global existente.

No aceptes objetos externos sin validar.

No reutilices entidades de base de datos como DTOs públicos.

No cambies nombres, tipos, campos obligatorios o estructura de respuestas sin evaluar el impacto en consumidores.

# Contratos con el frontend

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

Los cambios de contrato deben estar descritos en la issue y en OpenSpec.

Cuando una modificación afecte al frontend:

* Indícalo en `proposal.md`.
* Documenta el contrato en las delta specs.
* Incluye la referencia completa a la issue del frontend.
* Menciónalo en el Pull Request.
* Coordina la secuencia de integración cuando sea necesaria.

# Base de datos

No realices sin autorización explícita y planificación aprobada:

* Migraciones destructivas.
* Eliminación de tablas o columnas.
* Renombrado de columnas.
* Cambios de relaciones.
* Cambios de restricciones.
* Modificación de datos reales.
* Reseteo de la base de datos.
* Seeds destructivos.

No borres ni reescribas migraciones existentes que ya hayan sido compartidas.

Una migración debe ser:

* Revisable.
* Reproducible.
* Coherente con la issue.
* Coherente con OpenSpec.
* Acompañada por estrategia de rollback cuando corresponda.

# Autenticación y seguridad

No modifiques autenticación, autorización, roles, guards, tokens, cookies o permisos fuera del alcance aprobado.

Nunca escribas, muestres ni confirmes:

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
* OpenSpec.
* Pull Requests.

No registres cuerpos completos de solicitudes que puedan contener información sensible.

No desactives controles de seguridad para hacer funcionar temporalmente una integración.

# Calidad del código

Realiza el cambio más pequeño que resuelva correctamente la issue.

Prefiere:

* Funciones pequeñas.
* Nombres descriptivos.
* Dependencias explícitas.
* Código consistente con el repositorio.
* Reutilización razonable.
* Errores controlados.
* Pruebas relevantes.
* Abstracciones justificadas por una necesidad real.

Evita:

* Abstracciones innecesarias.
* Patrones introducidos para un único uso trivial.
* Duplicación considerable.
* Archivos excesivamente grandes.
* Comentarios que repiten el código.
* Código muerto.
* Soluciones temporales sin documentar.
* Refactorizaciones masivas no solicitadas.
* Cambios de formato en archivos no relacionados.
* Logs de depuración.

# Pruebas y validación

Todo cambio de comportamiento debe incluir o actualizar pruebas cuando sea razonable.

Antes de considerar terminada una tarea ejecuta:

```bash
npm run lint
npm test
npm run build
```

Cuando la tarea afecte pruebas de extremo a extremo:

```bash
npm run test:e2e
```

Cuando el repositorio tenga configurado `npm run check`, utilízalo además como validación completa.

Para cambios OpenSpec, ejecuta también la validación estricta correspondiente.

No afirmes que una validación pasó si no la ejecutaste.

Si no puedes ejecutar un comando:

1. Indica cuál no pudiste ejecutar.
2. Explica la causa.
3. Describe qué parte queda sin verificar.
4. No presentes el cambio como completamente validado.

No elimines, debilites ni omitas pruebas únicamente para conseguir que el pipeline pase.

# Archivos protegidos conceptualmente

No modifiques estos archivos salvo que la issue y el plan aprobado lo requieran:

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
openspec/**
.claude/skills/openspec-*/**
.agents/skills/openspec-*/**
.github/prompts/opsx-*
.github/skills/openspec-*/**
```

La lista de carpetas generadas puede variar según los agentes configurados.

Los cambios en archivos protegidos deben mencionarse expresamente en el Pull Request.

No modifiques GitHub Actions para evitar una validación fallida.

# Revisión antes de finalizar

Ejecuta:

```bash
git diff --check
git status
npm run lint
npm test
npm run build
```

Cuando corresponda, ejecuta también:

```bash
npm run test:e2e
```

Comprueba además que:

* Se cumplen los criterios de aceptación.
* El código coincide con el plan aprobado.
* Los artefactos OpenSpec están actualizados.
* No hay tareas OpenSpec pendientes.
* No hay archivos sensibles.
* No hay código temporal.
* No hay logs de depuración.
* No hay cambios fuera del alcance.
* Los contratos existentes se mantienen o están documentados.
* Swagger está actualizado cuando corresponde.
* Las pruebas cubren el comportamiento modificado.
* Las dependencias nuevas fueron aprobadas.
* El cambio está archivado antes de pasar a revisión final.

# Pull Request

## Draft Pull Request de planificación

Debe incluir:

* Referencia a la issue.
* Nombre del cambio OpenSpec.
* `proposal.md`.
* Delta specs.
* `design.md`.
* `tasks.md`.
* Resultado de la validación OpenSpec.
* Confirmación de que todavía no contiene implementación.

No debe presentarse como listo para revisión final.

## Pull Request listo para revisión

Debe incluir:

* Resumen del cambio.
* Áreas principales modificadas.
* Cómo probarlo.
* Comandos realmente ejecutados.
* Resultados de las pruebas.
* Riesgos o limitaciones conocidos.
* Issue relacionada mediante `Closes #NUMERO`.
* Issue del frontend relacionada cuando exista.
* Enlace al comentario `PLAN APPROVED`.
* Cualquier cambio de dependencia, configuración, base de datos o contrato.
* Confirmación de que el cambio OpenSpec fue archivado.

No ocultes errores pendientes.

No marques casillas que no hayan sido comprobadas.

# Uso de IA

El código y los documentos producidos con IA deben tratarse como propuestas, no como hechos correctos por defecto.

Antes de finalizar:

* Comprueba cada archivo modificado.
* Verifica que las APIs utilizadas existan realmente.
* Comprueba las versiones instaladas en `package.json`.
* Confirma que los imports sean correctos.
* Elimina funciones, clases o dependencias inventadas.
* Revisa seguridad, errores y casos límite.
* Comprueba que el código implemente exactamente el plan aprobado.
* Asegúrate de poder explicar la implementación.

No incluyas texto como “generado por IA” dentro del código fuente.

El autor del Pull Request es responsable de entender y justificar todas las decisiones, independientemente de la herramienta utilizada.
