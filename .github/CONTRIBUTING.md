# Guía de contribución

Este documento define el flujo de trabajo de los repositorios de `Proyecto-Software-I`.

El objetivo es que cada cambio:

* Parta de una issue asignada.
* Sea planificado antes de implementarse cuando corresponda.
* Se realice en una rama independiente.
* Sea revisado mediante un Pull Request.
* Pase las validaciones del repositorio.
* Se integre en `main` únicamente con autorización.

## Organización del proyecto

El proyecto se divide en dos repositorios independientes:

* `frontend`: interfaz de usuario y lógica del cliente.
* `backend`: API, base de datos y lógica del servidor.

El trabajo se organiza mediante el Project de la organización `Proyecto-Software-I`.

El responsable del proyecto se encarga de:

* Crear las issues.
* Agregar las issues al Project.
* Definir alcance y criterios de aceptación.
* Asignar cada issue.
* Establecer prioridad y estado.
* Relacionar tareas dependientes.
* Decidir cuándo OpenSpec es obligatorio.
* Revisar y aprobar los planes OpenSpec.
* Revisar los Pull Requests.
* Integrar los cambios en `main`.

Los demás integrantes no deben crear issues, tareas o items del Project por su cuenta, salvo autorización expresa.

Cuando una funcionalidad requiera cambios en ambos repositorios, se crearán dos issues:

* Una issue en `frontend`.
* Una issue en `backend`.

Ejemplo:

```text
Proyecto-Software-I/frontend#15 — Crear formulario de inicio de sesión
Proyecto-Software-I/backend#22 — Crear endpoint de inicio de sesión
```

Las issues deben relacionarse mediante su referencia completa:

```markdown
Relacionado con Proyecto-Software-I/backend#22
```

```markdown
Relacionado con Proyecto-Software-I/frontend#15
```

Cada issue tendrá su propia rama y su propio Pull Request.

## Fuentes de verdad

Cada fuente tiene una responsabilidad diferente:

1. **GitHub Project**

   * Estado.
   * Prioridad.
   * Responsable.
   * Dependencias.
   * Seguimiento.

2. **GitHub Issue**

   * Objetivo.
   * Alcance.
   * Criterios de aceptación.
   * Trabajo relacionado.
   * Decisión sobre el uso de OpenSpec.

3. **OpenSpec**

   * Requisitos detallados.
   * Escenarios verificables.
   * Diseño técnico.
   * Tareas de implementación.
   * Historial de decisiones.

4. **`AGENTS.md`**

   * Arquitectura.
   * Restricciones técnicas.
   * Prácticas obligatorias.
   * Archivos protegidos.
   * Reglas para agentes de IA.

5. **Código, pruebas y documentación existente**

   * Comportamiento actualmente implementado.
   * Patrones técnicos vigentes.

Cuando exista una contradicción entre estas fuentes, no elijas una interpretación por tu cuenta. Coméntalo en la issue y solicita una decisión.

## Regla principal

No se deben realizar cambios directamente sobre `main`.

Todo cambio debe:

1. Partir de una issue asignada.
2. Realizarse en una rama independiente.
3. Integrarse mediante un Pull Request.
4. Ser aprobado por el responsable.

Únicamente el responsable del proyecto, o una persona expresamente autorizada, puede integrar cambios en `main`.

# Uso de OpenSpec

## Cuándo es obligatorio

OpenSpec es obligatorio para:

* Nuevas funcionalidades.
* Correcciones que cambien comportamiento observable.
* Cambios en contratos públicos.
* Cambios que afecten frontend y backend.
* Autenticación o autorización.
* Cambios de base de datos.
* Dependencias nuevas.
* Cambios de arquitectura.
* Refactorizaciones importantes.
* Cambios al sistema de diseño.
* Nuevos flujos de navegación.
* Cambios relevantes de configuración.
* Cambios de seguridad.
* Issues marcadas expresamente como OpenSpec obligatorio.

OpenSpec puede omitirse cuando la issue lo indique expresamente, por ejemplo:

* Correcciones tipográficas.
* Cambios pequeños de documentación.
* Ajustes visuales locales sin cambio de comportamiento.
* Renombrados mecánicos.
* Mantenimiento claramente acotado.

El integrante asignado no debe decidir por su cuenta que OpenSpec no es necesario.

## Nombre del cambio

El nombre del cambio OpenSpec debe seguir este formato:

```text
numero-issue-descripcion-corta
```

Ejemplos:

```text
15-add-login-form
22-add-login-endpoint
31-fix-token-expiration
```

Debe escribirse en minúsculas, utilizando números y guiones.

La rama debe conservar el mismo número y una descripción equivalente:

```text
feat/15-add-login-form
feat/22-add-login-endpoint
fix/31-fix-token-expiration
```

## Cambios sin modificación funcional

Una refactorización, cambio de tooling o modificación documental puede requerir planificación sin producir requisitos funcionales nuevos.

Cuando OpenSpec requiera indicar que el cambio no tiene delta specs, debe configurarse en los metadatos del cambio según las instrucciones generadas por OpenSpec.

No omitas la validación ni utilices opciones para saltarla solamente para conseguir que el cambio pase.

# Flujo completo de trabajo

## 1. El responsable crea la issue

La issue debe incluir, cuando corresponda:

* Objetivo.
* Descripción.
* Criterios de aceptación.
* Fuera de alcance.
* Repositorio afectado.
* Dependencias.
* Contrato frontend/backend.
* Riesgos o restricciones.
* Decisión sobre OpenSpec.
* Slug sugerido para el cambio OpenSpec.

Ejemplo:

```markdown
## Objetivo

Permitir que el usuario inicie sesión mediante correo y contraseña.

## Criterios de aceptación

- Validar los datos de entrada.
- Rechazar credenciales incorrectas.
- Mostrar los estados de carga y error.
- Documentar el endpoint.
- Agregar pruebas.

## Fuera de alcance

- Registro de usuarios.
- Recuperación de contraseña.
- Inicio de sesión con proveedores externos.

## OpenSpec

- [x] OpenSpec obligatorio
- [ ] OpenSpec no necesario

Slug de OpenSpec:

`add-login-endpoint`

Después de crear la issue, el nombre completo del cambio se obtiene combinando
el número asignado por GitHub y el slug:

`22-add-login-endpoint`

## Trabajo relacionado

Relacionado con Proyecto-Software-I/frontend#15
```

## 2. El responsable asigna la issue

No comiences una issue que no te haya sido asignada.

Tampoco debes:

* Crear otra issue para reemplazarla.
* Duplicarla en el Project.
* Cambiar su responsable.
* Cambiar labels, prioridad o estado.
* Cerrar la issue manualmente.
* Modificar su alcance sin autorización.
* Trabajar en una tarea asignada a otra persona sin coordinación.

Si existe un bloqueo o falta información, coméntalo en la issue.

## 3. El integrante actualiza `main`

Antes de crear una rama:

```bash
git switch main
git pull origin main
```

Comprueba que no existan cambios locales pendientes:

```bash
git status
```

No descartes ni sobrescribas cambios locales que no hayas creado.

## 4. El integrante crea la rama

Formato obligatorio:

```text
tipo/numero-issue-descripcion-corta
```

Tipos habituales:

* `feat`: nueva funcionalidad.
* `fix`: corrección.
* `docs`: documentación.
* `refactor`: reorganización sin cambio funcional.
* `test`: pruebas.
* `chore`: configuración o mantenimiento.

Ejemplos:

```bash
git switch -c feat/15-add-login-form
```

```bash
git switch -c feat/22-add-login-endpoint
```

```bash
git switch -c fix/31-fix-token-expiration
```

Evita:

```text
mi-rama
cambios
prueba
rama-final
feature/login
```

No utilices espacios, mayúsculas, tildes o caracteres especiales.

## 5. El agente genera la planificación OpenSpec

Este paso se realiza antes de modificar código.

Los comandos `/opsx:*` se escriben en el chat del agente de IA, no en PowerShell, Bash o CMD.

Cuando sea necesario investigar primero:

```text
/opsx:explore
```

Prompt sugerido:

```text
Analiza la issue #NUMERO y el código relacionado.

No modifiques archivos.
No escribas implementación.
Identifica el comportamiento actual, contratos, riesgos, dependencias y dudas.
Respeta AGENTS.md, CONTRIBUTING.md y openspec/config.yaml.
```

Después genera la propuesta:

```text
/opsx:propose NUMERO-descripcion-corta
```

Prompt sugerido:

```text
Genera la planificación OpenSpec para la issue #NUMERO.

Incluye la referencia completa a la issue.
No implementes código.
No agregues dependencias.
No amplíes el alcance.
Respeta AGENTS.md, CONTRIBUTING.md y openspec/config.yaml.

Genera:
- proposal.md
- delta specs
- design.md
- tasks.md
```

La carpeta resultante será similar a:

```text
openspec/changes/NUMERO-descripcion-corta/
├── proposal.md
├── design.md
├── tasks.md
└── specs/
    └── dominio/
        └── spec.md
```

## 6. El integrante revisa y valida la planificación

El integrante es responsable de revisar lo generado por la IA antes de subirlo.

Debe comprobar que:

* El alcance coincide con la issue.
* No existen requisitos inventados.
* Está definido qué queda fuera.
* Los escenarios son verificables.
* Los contratos coinciden con lo acordado.
* El diseño respeta la arquitectura existente.
* No aparecen dependencias no solicitadas.
* Las tareas incluyen pruebas y validaciones.
* No se ha modificado código de aplicación.

Consulta el estado del cambio:

```bash
openspec status --change NUMERO-descripcion-corta
```

Valida la planificación:

```bash
openspec validate NUMERO-descripcion-corta --strict --no-interactive
```

La validación debe terminar correctamente antes de abrir el Draft Pull Request.

## 7. El integrante confirma únicamente la planificación

Revisa los cambios:

```bash
git status --short
git diff --check
git diff --stat
```

Agrega únicamente la carpeta del cambio:

```bash
git add openspec/changes/NUMERO-descripcion-corta
```

Comprueba el contenido preparado:

```bash
git diff --cached --stat
git diff --cached
```

Crea el commit:

```bash
git commit -m "docs: proponer descripcion del cambio"
```

Ejemplo:

```bash
git commit -m "docs: proponer formulario de inicio de sesion"
```

Sube la rama:

```bash
git push -u origin nombre-de-la-rama
```

## 8. El integrante abre un Draft Pull Request de planificación

Configura:

```text
base: main
compare: nombre-de-la-rama
```

El Pull Request debe abrirse como:

```text
Draft
```

Debe utilizar la plantilla OpenSpec cuando esté disponible.

En esta etapa solo debe contener:

* `proposal.md`.
* Delta specs.
* `design.md`.
* `tasks.md`.
* Metadatos propios del cambio OpenSpec.

No debe contener:

* Código dentro de `src/`.
* Componentes.
* Endpoints.
* Migraciones.
* Pruebas de implementación.
* Dependencias nuevas.
* Cambios en `package.json`.
* Cambios visuales.
* Refactorizaciones.

El Draft Pull Request debe enlazar la issue:

```markdown
Closes #NUMERO
```

Aunque utilice `Closes`, la issue no se cerrará hasta que el PR sea integrado.

## 9. El responsable revisa el plan

El responsable revisará los artefactos antes de que comience la implementación.

### Revisión de `proposal.md`

Debe comprobarse:

* Que el objetivo coincida con la issue.
* Que el alcance sea correcto.
* Que exista una sección fuera de alcance.
* Que no se inventen funcionalidades.
* Que se identifiquen repositorios y áreas afectadas.
* Que se documenten riesgos relevantes.

### Revisión de las delta specs

Debe comprobarse:

* Que describan comportamiento observable.
* Que incluyan escenarios de éxito.
* Que incluyan validaciones.
* Que incluyan errores relevantes.
* Que los escenarios sean verificables.
* Que el contrato frontend/backend sea consistente.
* Que se contemple accesibilidad y estados de interfaz cuando corresponda.

### Revisión de `design.md`

Debe comprobarse:

* Que respete la arquitectura existente.
* Que la solución sea proporcional al problema.
* Que las dependencias nuevas estén justificadas.
* Que se consideren seguridad y datos.
* Que se contemple migración y rollback cuando corresponda.
* Que se identifiquen pruebas y documentación afectadas.

### Revisión de `tasks.md`

Debe comprobarse:

* Que las tareas sean pequeñas.
* Que estén ordenadas.
* Que sean verificables.
* Que incluyan pruebas.
* Que incluyan documentación cuando corresponda.
* Que finalicen con lint, pruebas y build.

Cuando el plan sea correcto, el responsable publicará un comentario que comience exactamente con:

```text
PLAN APPROVED
```

Ejemplo:

```text
PLAN APPROVED

La implementación puede comenzar siguiendo los artefactos OpenSpec aprobados.
Cualquier cambio material debe volver a revisión.
```

Los siguientes casos no constituyen aprobación:

* Ausencia de comentarios.
* Una reacción.
* Una pregunta.
* Una sugerencia.
* Una revisión parcial.
* Una aprobación automática de GitHub.
* Un comentario que no contenga `PLAN APPROVED`.

## 10. El integrante implementa el cambio aprobado

Después de recibir `PLAN APPROVED`, utiliza en el chat del agente:

```text
/opsx:apply NUMERO-descripcion-corta
```

Prompt sugerido:

```text
Implementa únicamente las tareas aprobadas del cambio
NUMERO-descripcion-corta.

Respeta AGENTS.md, CONTRIBUTING.md y openspec/config.yaml.
No cambies el alcance.
No agregues dependencias no aprobadas.
No modifiques contratos no aprobados.
Marca una tarea como completada solo después de verificarla.
```

Durante la implementación:

* Trabaja únicamente en la issue asignada.
* Sigue `tasks.md`.
* Realiza cambios pequeños y revisables.
* Agrega o actualiza pruebas.
* Mantén OpenSpec sincronizado con decisiones aprobadas.
* No resuelvas problemas no relacionados.
* No reformatees archivos ajenos al cambio.
* No desactives validaciones para conseguir que el proyecto pase.

## 11. Cambios materiales durante la implementación

La implementación debe detenerse cuando aparezca la necesidad de cambiar:

* El alcance.
* Un endpoint.
* Un método HTTP.
* La estructura de una solicitud o respuesta.
* Un código de estado.
* La autenticación o autorización.
* La base de datos.
* Una migración.
* Una dependencia.
* La arquitectura aprobada.
* El sistema de diseño.
* La navegación.
* El comportamiento responsive.
* Un requisito de accesibilidad.
* La integración con el otro repositorio.

Actualiza la planificación mediante el chat del agente:

```text
/opsx:update NUMERO-descripcion-corta
```

Después:

1. Revisa los artefactos modificados.

2. Valida nuevamente:

   ```bash
   openspec validate NUMERO-descripcion-corta --strict --no-interactive
   ```

3. Crea un commit con la actualización.

4. Sube la rama.

5. Solicita otra revisión.

6. Espera un nuevo `PLAN APPROVED`.

No continúes utilizando la aprobación anterior cuando el plan cambió materialmente.

Los ajustes menores que no alteran alcance, contrato, arquitectura o comportamiento pueden documentarse directamente en los artefactos sin reiniciar toda la revisión.

## 12. El integrante ejecuta las validaciones

Antes de considerar terminada la implementación, ejecuta las validaciones correspondientes.

### Backend

```bash
npm run lint
npm test
npm run build
```

Cuando corresponda:

```bash
npm run test:e2e
```

### Frontend

```bash
npm run lint
npm run build
```

Cuando existan pruebas relacionadas, ejecútalas también.

### OpenSpec

```bash
openspec validate NUMERO-descripcion-corta --strict --no-interactive
```

Cuando exista el script unificado:

```bash
npm run check
```

Además, realiza las pruebas manuales definidas en la issue y en las specs.

No afirmes que un comando pasó si no fue ejecutado.

Cuando no puedas ejecutar una validación:

1. Indica cuál no ejecutaste.
2. Explica la causa.
3. Describe qué queda sin verificar.
4. No marques esa comprobación como completada.

No elimines ni debilites pruebas para conseguir que el pipeline pase.

## 13. El integrante actualiza y archiva OpenSpec

Antes de archivar:

```bash
openspec status --change NUMERO-descripcion-corta
```

Comprueba que:

* Los artefactos coincidan con la implementación.
* Todas las tareas estén completadas.
* Las validaciones hayan pasado.
* No exista trabajo pendiente.
* Los requisitos representen el resultado final.

Cuando sea necesario revisar previamente cómo se integrarán las delta specs, puede utilizarse en el chat del agente:

```text
/opsx:sync NUMERO-descripcion-corta
```

El archivado final es obligatorio:

```bash
openspec archive NUMERO-descripcion-corta --yes
```

No utilices opciones para omitir la validación sin autorización expresa.

Después del archivado, comprueba:

```bash
openspec validate --all --strict --no-interactive
```

También comprueba que:

* Las especificaciones vigentes estén en `openspec/specs/`.
* El cambio archivado esté en `openspec/changes/archive/`.
* La carpeta activa ya no exista.
* El contenido archivado conserve propuesta, specs, diseño y tareas.

Agrega los cambios resultantes:

```bash
git add openspec
```

Crea un commit separado cuando ayude a mantener un historial claro:

```bash
git commit -m "docs: archivar especificacion del cambio"
```

## 14. El integrante actualiza el Pull Request

Sube todos los commits:

```bash
git push
```

Actualiza la descripción del Pull Request con:

* Cambios realizados.
* Cómo probarlo.
* Comandos ejecutados.
* Resultados.
* Riesgos o limitaciones.
* Referencia al comentario `PLAN APPROVED`.
* Confirmación del archivado OpenSpec.
* Issues relacionadas.
* Contratos modificados.
* Dependencias nuevas.
* Capturas, cuando exista un cambio visual.

Después marca el Pull Request como:

```text
Ready for review
```

No lo marques como listo cuando:

* No compile.
* Tenga pruebas fallidas.
* Tenga errores conocidos sin documentar.
* Contenga código temporal.
* No cumpla los criterios de aceptación.
* Existan tareas OpenSpec pendientes.
* El cambio OpenSpec no esté archivado.
* Dependa de cambios todavía no disponibles.
* El código no coincida con el plan aprobado.

## 15. El responsable revisa el código

La revisión final del código es distinta de la aprobación del plan.

Durante la revisión debe comprobarse:

* Que el cambio resuelva la issue.
* Que cumpla los criterios de aceptación.
* Que coincida con el plan aprobado.
* Que no existan cambios fuera del alcance.
* Que los contratos coincidan con las specs.
* Que las pruebas cubran el comportamiento relevante.
* Que las validaciones estén verdes.
* Que no se hayan desactivado reglas.
* Que no existan secretos.
* Que las dependencias hayan sido aprobadas.
* Que OpenSpec esté archivado.
* Que `openspec/specs/` represente el comportamiento final.
* Que los commits sean adecuados para `Rebase and merge`.

Si se solicitan cambios:

1. Realiza las correcciones en la misma rama.

2. Actualiza OpenSpec cuando sea necesario.

3. Crea los commits correspondientes.

4. Ejecuta nuevamente las validaciones.

5. Sube la rama:

   ```bash
   git push
   ```

6. Responde a los comentarios.

No crees una rama o Pull Request nuevo para responder a la revisión del mismo trabajo.

## 16. El responsable integra el Pull Request

El método preferido es:

```text
Rebase and merge
```

Este método mantiene un historial lineal y conserva los commits coherentes del Pull Request.

La decisión final sobre el método de integración corresponde al responsable.

No se integrará un PR mientras:

* Tenga conflictos.
* Tenga validaciones fallidas.
* Tenga revisiones pendientes.
* No cumpla los criterios.
* Contenga cambios no autorizados.
* OpenSpec esté incompleto cuando sea obligatorio.

# Cambios sin OpenSpec

Cuando la issue indique expresamente que OpenSpec no es necesario, el flujo será:

```text
Issue asignada
→ actualizar main
→ crear rama
→ implementar
→ validar
→ subir rama
→ abrir Pull Request
→ revisión
→ merge
```

Aunque OpenSpec no sea obligatorio, continúan aplicándose:

* La issue como fuente de alcance.
* Las reglas de `AGENTS.md`.
* La rama por issue.
* Las validaciones.
* La revisión mediante Pull Request.
* La prohibición de modificar directamente `main`.

# Commits

Los commits deben ser pequeños, claros y relacionados con la issue.

Formato recomendado:

```text
tipo: descripción breve
```

Ejemplos:

```bash
git commit -m "docs: proponer endpoint de inicio de sesion"
```

```bash
git commit -m "feat: implementar endpoint de inicio de sesion"
```

```bash
git commit -m "test: agregar pruebas de autenticacion"
```

```bash
git commit -m "docs: archivar especificacion de autenticacion"
```

Tipos habituales:

* `feat`
* `fix`
* `docs`
* `refactor`
* `test`
* `chore`

Evita:

```text
cambios
arreglo
avance
cosas nuevas
actualizacion
final
ahora si
fix
```

Para cambios OpenSpec es recomendable mantener, cuando corresponda:

1. Un commit de planificación.
2. Uno o varios commits coherentes de implementación.
3. Un commit de archivado.

No es obligatorio dividir artificialmente un cambio pequeño, pero el historial debe permitir entender su evolución.

# Mantener la rama actualizada

Cuando `main` reciba cambios mientras trabajas:

```bash
git fetch origin
git switch nombre-de-tu-rama
git rebase origin/main
```

Si aparecen conflictos:

1. Revisa los archivos.

2. Resuelve cada conflicto.

3. Agrega los archivos corregidos:

   ```bash
   git add archivo-corregido
   ```

4. Continúa:

   ```bash
   git rebase --continue
   ```

Para cancelar:

```bash
git rebase --abort
```

Si la rama ya había sido subida:

```bash
git push --force-with-lease
```

Utiliza `--force-with-lease` únicamente sobre tu propia rama y después de revisar el rebase.

Nunca utilices:

```bash
git push --force
```

No reescribas el historial de:

* `main`.
* Una rama de otra persona.
* Una rama compartida sin coordinación.

# Cambios entre frontend y backend

Cuando una funcionalidad afecte ambos repositorios:

1. El responsable crea dos issues.
2. Cada issue tiene su propio nombre OpenSpec.
3. Cada integrante trabaja en su repositorio.
4. Cada repositorio tiene su propia rama.
5. Cada repositorio tiene su propio Draft Pull Request.
6. Cada plan se revisa de forma independiente.
7. Los contratos deben coincidir.
8. Cada PR cierra únicamente su issue.

Ejemplo:

```text
frontend#15
├── Cambio OpenSpec: 15-add-login-form
├── Rama: feat/15-add-login-form
└── PR: frontend#18

backend#22
├── Cambio OpenSpec: 22-add-login-endpoint
├── Rama: feat/22-add-login-endpoint
└── PR: backend#27
```

La funcionalidad completa se considera terminada cuando ambas issues hayan sido revisadas e integradas.

# Contratos entre frontend y backend

Antes de implementar una integración deben definirse:

* Ruta.
* Método HTTP.
* Datos enviados.
* Datos recibidos.
* Códigos de respuesta.
* Estructura de errores.
* Autenticación.
* Formato de fechas.
* Identificadores.
* Campos opcionales y obligatorios.

El contrato debe aparecer en las issues y en las specs correspondientes.

Ejemplo:

```http
POST /api/auth/login
```

Solicitud:

```json
{
  "email": "usuario@ejemplo.com",
  "password": "contrasena"
}
```

Respuesta exitosa:

```json
{
  "token": "token",
  "user": {
    "id": 1,
    "name": "Usuario"
  }
}
```

Respuesta de error:

```json
{
  "message": "Credenciales incorrectas"
}
```

No modifiques unilateralmente un contrato compartido.

Cuando sea necesario cambiarlo:

1. Detén la implementación.
2. Coméntalo en las issues relacionadas.
3. Actualiza ambos planes OpenSpec cuando corresponda.
4. Explica el motivo.
5. Espera aprobación.
6. Coordina el orden de integración.

# Seguridad

Nunca subas:

* Contraseñas.
* Tokens.
* Claves privadas.
* Credenciales de bases de datos.
* Archivos `.env`.
* Datos personales.
* Datos sensibles.
* Configuraciones locales innecesarias.
* Secretos dentro de OpenSpec.
* Secretos dentro de issues o Pull Requests.

Usa `.env.example` para documentar nombres y valores no sensibles:

```env
DATABASE_URL=
JWT_SECRET=
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Si una credencial se sube accidentalmente:

1. Informa inmediatamente al responsable.
2. Revoca o rota la credencial.
3. No asumas que eliminarla en un commit posterior la quita del historial.

# Operaciones Git prohibidas

No ejecutes sin autorización explícita:

```text
git push origin main
git push --force
git reset --hard
git clean -fd
git checkout descartando cambios no confirmados
git rebase sobre una rama de otra persona
```

No elimines ni sobrescribas trabajo local que no hayas creado.

No modifiques workflows de CI para ocultar una validación fallida.

# Limpieza después del merge

Después de integrar el Pull Request:

```bash
git switch main
git pull origin main
```

Elimina la rama local:

```bash
git branch -d nombre-de-la-rama
```

Si la rama remota continúa existiendo:

```bash
git push origin --delete nombre-de-la-rama
```

No elimines una rama antes de confirmar que el Pull Request fue integrado.

# Lista de verificación del autor

Antes de abrir el Draft Pull Request:

* [ ] Estoy trabajando en la issue asignada.
* [ ] Mi rama parte de una versión actualizada de `main`.
* [ ] La rama utiliza el formato establecido.
* [ ] OpenSpec es obligatorio según la issue.
* [ ] El nombre del cambio coincide con la issue.
* [ ] Se generaron `proposal.md`, specs, `design.md` y `tasks.md`.
* [ ] Revisé todos los artefactos generados.
* [ ] La validación estricta pasó.
* [ ] El commit contiene únicamente planificación.
* [ ] El Draft PR no contiene implementación.

Antes de marcar el PR como Ready for review:

* [ ] Existe un comentario `PLAN APPROVED`.
* [ ] El código coincide con el plan aprobado.
* [ ] No existen cambios fuera del alcance.
* [ ] Todas las tareas están completas.
* [ ] Se ejecutaron las validaciones del repositorio.
* [ ] Se realizaron las pruebas manuales aplicables.
* [ ] No se incluyeron secretos.
* [ ] No existe código temporal.
* [ ] Los commits son claros.
* [ ] OpenSpec fue validado.
* [ ] OpenSpec fue archivado.
* [ ] Las specs vigentes fueron actualizadas.
* [ ] La descripción explica cómo probar el cambio.
* [ ] La issue correcta aparece mediante `Closes #...`.
* [ ] Las issues de otros repositorios están relacionadas.
* [ ] Los contratos compartidos fueron respetados.
* [ ] No existen conflictos con `main`.

Para una issue sin OpenSpec, omite únicamente las casillas específicas de OpenSpec.

# Lista de verificación del revisor

## Revisión del plan

* [ ] La propuesta coincide con la issue.
* [ ] El alcance está claramente definido.
* [ ] Existe una sección fuera de alcance.
* [ ] No se inventaron requisitos.
* [ ] Las specs contienen escenarios verificables.
* [ ] Se contemplan errores y validaciones.
* [ ] El diseño respeta la arquitectura.
* [ ] Las dependencias están justificadas.
* [ ] Las tareas son pequeñas y ordenadas.
* [ ] Se incluyen pruebas y validaciones.
* [ ] Los contratos frontend/backend coinciden.
* [ ] El Draft PR contiene únicamente planificación.

## Revisión final

* [ ] El cambio resuelve la issue.
* [ ] Cumple los criterios de aceptación.
* [ ] Coincide con el plan aprobado.
* [ ] No contiene cambios ajenos.
* [ ] El código es comprensible y mantenible.
* [ ] Las pruebas relevantes existen y pasan.
* [ ] No se desactivaron validaciones.
* [ ] No existe información sensible.
* [ ] La documentación fue actualizada.
* [ ] Los contratos compartidos fueron respetados.
* [ ] OpenSpec fue archivado.
* [ ] Las specs vigentes representan el comportamiento final.
* [ ] El Pull Request no tiene conflictos.
* [ ] Los commits son adecuados para `Rebase and merge`.
