# Guía de contribución

Este documento define el flujo de trabajo que utilizaremos para mantener organizados los dos repos.

## Organización del trabajo

El proyecto está dividido en dos repositorios independientes:

* `frontend`: interfaz de usuario y lógica del cliente.
* `backend`: API, base de datos y lógica del servidor.

El trabajo se organiza mediante el Project de la organización **Proyecto-Software-I**.

Cada tarea del Project estará vinculada a una issue de alguno de los repositorios. El responsable del proyecto se encargará de:

* Crear las tareas y las issues.
* Agregar las issues al Project.
* Asignar cada issue a la persona correspondiente.
* Definir su prioridad y estado.
* Relacionar tareas que dependan unas de otras.
* Revisar y aprobar los Pull Requests.
* Integrar los cambios en `main`.

Los demás integrantes no deben crear tareas, items o issues por su cuenta, salvo que el responsable del proyecto lo solicite expresamente.

Cuando una funcionalidad requiera cambios en ambos repositorios, se crearán dos issues separadas:

* Una issue en el repositorio `frontend`.
* Una issue en el repositorio `backend`.

Ambas issues aparecerán como tareas separadas dentro del mismo Project.

Ejemplo:

* `frontend#15`: Crear formulario de inicio de sesión.
* `backend#22`: Crear endpoint de inicio de sesión.

Las issues podrán enlazarse entre sí dentro de su descripción:

```markdown
Relacionado con Proyecto-Software-I/backend#22
```

```markdown
Relacionado con Proyecto-Software-I/frontend#15
```

---

## Regla principal

No se deben ni pueden realizar cambios directamente sobre la rama `main`.

Todo cambio debe realizarse en una rama aparte e integrarse mediante un Pull Request.

Solamente el responsable del proyecto, o una persona expresamente autorizada, puede integrar cambios en `main`.

---

## Flujo de trabajo

### 1. Revisar la tarea asignada

Antes de comenzar, revisa el Project de **Proyecto-Software-I** y localiza la tarea que te fue asignada.

La tarea estará asociada a una issue de `frontend` o `backend`. La issue incluirá, cuando corresponda:

* Descripción del problema o funcionalidad.
* Resultado esperado.
* Criterios de aceptación.
* Repositorio afectado.
* Dependencias con otras issues.
* Información técnica necesaria.
* Contrato entre frontend y backend.

No debes comenzar una tarea que no te haya sido asignada.

Tampoco debes:

* Crear una nueva issue para reemplazar la existente.
* Duplicar la tarea en el Project.
* Cambiar al responsable de la issue.
* Cerrar la issue manualmente.
* Modificar su alcance sin consultar.
* Trabajar en una tarea asignada a otra persona sin coordinación.

Si la descripción no es suficiente, existe un bloqueo o necesitas cambiar el alcance, coméntalo en la issue correspondiente.

---

### 2. Actualizar `main`

Antes de crear una rama nueva, asegúrate de tener la versión más reciente de `main`:

```bash
git switch main
git pull origin main
```

Esto evita comenzar el trabajo desde una versión desactualizada.

---

### 3. Crear una rama

Cada issue debe trabajarse en una rama independiente.

El formato recomendado es:

```text
tipo/numero-issue-descripcion-corta
```

Tipos habituales:

* `feat`: nueva funcionalidad.
* `fix`: corrección de errores.
* `docs`: documentación.
* `refactor`: reorganización interna del código.
* `test`: creación o modificación de pruebas.
* `chore`: tareas de mantenimiento o configuración.

Ejemplos:

```bash
git switch -c feat/15-login-form
```

```bash
git switch -c fix/22-token-expiration
```

```bash
git switch -c docs/30-update-readme
```

El número utilizado en la rama debe corresponder a la issue asignada.

Evita usar:

* `feature/`.
* Espacios.
* Mayúsculas.
* Tildes.
* Caracteres especiales.
* Nombres demasiado generales.

Ejemplos que deben evitarse:

```text
mi-rama
cambios
prueba
rama-final
feature/login
```

---

### 4. Realizar los cambios

Procura que cada rama resuelva una sola issue o un objetivo claramente definido.

No agregues cambios que no estén relacionados con la tarea asignada. Si descubres otro problema durante el desarrollo, coméntalo en la issue para que el responsable decida si debe incluirse o convertirse en otra tarea.

Antes de subir los cambios:

* Revisa que el proyecto compile o se ejecute correctamente.
* Ejecuta las pruebas disponibles.
* Agrega pruebas cuando corresponda.
* Elimina código temporal.
* Elimina mensajes y comentarios de depuración.
* Elimina archivos innecesarios.
* Verifica que no hayas incluido contraseñas, tokens o claves privadas.
* Verifica que no hayas incluido archivos `.env`.
* Actualiza la documentación técnica de GitHub cuando corresponda.

Para cambios en la documentación general del proyecto, coordina primero con el encargado de documentación.

---

### 5. Crear commits

Los commits deben ser pequeños, claros y estar relacionados con la issue.

Realiza commits con frecuencia razonable. Tener puntos intermedios permite revisar la evolución del trabajo y regresar a una versión anterior si algo falla.

No es necesario crear un commit por cada línea modificada, pero tampoco se debe concentrar toda una tarea extensa en un único commit sin contexto.

El formato recomendado es:

```text
tipo: descripción breve
```

Ejemplos:

```bash
git commit -m "feat: agregar formulario de inicio de sesión"
```

```bash
git commit -m "fix: corregir validación del correo"
```

```bash
git commit -m "test: agregar pruebas del endpoint de login"
```

```bash
git commit -m "refactor: separar validación de credenciales"
```

Tipos recomendados:

* `feat`: nueva funcionalidad.
* `fix`: corrección de errores.
* `docs`: documentación.
* `refactor`: cambio interno sin alterar el comportamiento esperado.
* `test`: pruebas.
* `chore`: mantenimiento o configuración.

Evita mensajes poco descriptivos como:

```text
cambios
arreglo
avance
cosas nuevas
actualización
final
ahora sí
```

---

### 6. Subir la rama

Sube únicamente tu rama de trabajo:

```bash
git push -u origin nombre-de-la-rama
```

Ejemplo:

```bash
git push -u origin feat/15-login-form
```

Después del primer `push`, puedes actualizarla con:

```bash
git push
```

No hagas `push` directamente a `main`.

No hagas `push` a ramas pertenecientes a otras personas sin coordinación previa.

---

## Pull Requests

### Crear el Pull Request

Cuando el trabajo esté listo para revisión, crea un Pull Request hacia `main`.

Configura:

```text
base: main
compare: nombre-de-tu-rama
```

Antes de abrirlo, verifica que:

* La rama corresponde a la issue asignada.
* El proyecto funciona.
* Las pruebas disponibles pasan correctamente.
* No existen cambios innecesarios.
* No existen archivos sensibles.
* La rama no contiene cambios de otras tareas.

El título debe describir claramente el cambio.

Ejemplo:

```text
Crear formulario de inicio de sesión
```

También puede utilizarse un título basado en Conventional Commits:

```text
feat: crear formulario de inicio de sesión
```

### Plantillas de Pull Request

Los repositorios tendrán plantillas para los tipos de Pull Request más habituales.

Al crear un PR:

1. Selecciona la plantilla que mejor corresponda al cambio.
2. Completa todas las secciones aplicables.
3. Elimina únicamente las instrucciones internas de la plantilla.
4. No elimines secciones relevantes sin explicación.

Si ninguna plantilla corresponde al cambio, utiliza el siguiente formato:

```markdown
## Descripción

Explica brevemente qué se agregó, modificó o corrigió.

## Cambios realizados

- Cambio 1.
- Cambio 2.
- Cambio 3.

## Cómo probarlo

1. Ejecutar el proyecto.
2. Ir a la pantalla, módulo o endpoint correspondiente.
3. Realizar la acción que se desea probar.
4. Confirmar el resultado esperado.

## Issue relacionada

Closes #15

## Trabajo relacionado

Relacionado con Proyecto-Software-I/backend#22

## Consideraciones adicionales

Incluye dependencias, decisiones técnicas, limitaciones conocidas o cualquier
información que pueda ayudar durante la revisión.
```

Usa `Closes #15` únicamente para la issue correspondiente al mismo repositorio.

Cuando el Pull Request sea integrado en `main`, GitHub cerrará la issue relacionada.

Para mencionar una issue de otro repositorio, utiliza la referencia completa:

```markdown
Relacionado con Proyecto-Software-I/backend#22
```

O:

```markdown
Relacionado con Proyecto-Software-I/frontend#15
```

No utilices `Closes` para cerrar una issue de otro repositorio, salvo que el Pull Request realmente complete todo el trabajo descrito en esa issue.

---

## Pull Requests en borrador

Si necesitas mostrar tu progreso o solicitar ayuda antes de terminar, puedes crear un Draft Pull Request.

Un Draft Pull Request puede utilizarse para:

* Mostrar el estado actual del trabajo.
* Solicitar orientación técnica.
* Avisar sobre un bloqueo.
* Validar una decisión antes de continuar.
* Permitir que otra persona revise el enfoque utilizado.

Cuando el trabajo esté terminado y listo para revisión formal, marca el PR como:

```text
Ready for review
```

No marques un PR como listo para revisión si todavía:

* No compila.
* Tiene errores conocidos sin documentar.
* Contiene código temporal.
* No cumple los criterios de aceptación.
* Depende de cambios que todavía no están disponibles.

---

## Revisiones

Todo Pull Request debe ser revisado antes de integrarse en `main`.

Actualmente, la revisión y aprobación corresponde al responsable del proyecto.

Durante una revisión se puede solicitar:

* Corrección de errores.
* Mejora de nombres o estructura.
* Pruebas adicionales.
* Actualización de documentación.
* Resolución de conflictos.
* Eliminación de código innecesario.
* Explicación de decisiones técnicas.
* Ajustes para respetar el contrato entre frontend y backend.

Si se solicitan cambios:

1. Realiza las correcciones en la misma rama.
2. Crea los commits necesarios.
3. Vuelve a subir la rama.

```bash
git push
```

El Pull Request se actualizará automáticamente.

No crees una nueva rama ni un nuevo Pull Request para responder a una revisión del mismo trabajo.

Cuando termines las correcciones, responde a los comentarios correspondientes o informa que el PR está listo para una nueva revisión.

---

## Integración en `main`

Solamente el responsable del proyecto, o una persona autorizada, puede realizar la integración en `main`.

El método preferido es:

```text
Rebase and merge
```

Este método incorpora los commits del Pull Request en `main` manteniendo un historial lineal.

Para que este método produzca un historial comprensible, los commits de la rama deben:

* Tener mensajes descriptivos.
* Representar pasos coherentes.
* Evitar commits temporales innecesarios.
* Evitar mensajes como `fix`, `final` o `ahora sí`.

Cuando el historial del Pull Request no sea adecuado para un rebase, el responsable podrá elegir otro método de integración.

La decisión final sobre el método de merge corresponde al responsable del proyecto.

Mientras el Pull Request no tenga conflictos y cumpla las condiciones de revisión, podrá integrarse normalmente.

Después de integrar el Pull Request, la rama de trabajo debe eliminarse desde GitHub o localmente:

```bash
git branch -d nombre-de-la-rama
git push origin --delete nombre-de-la-rama
```

Antes de eliminar la rama local, actualiza `main`:

```bash
git switch main
git pull origin main
```

---

## Cambios que afectan frontend y backend

Cuando una funcionalidad requiera cambios en ambos repositorios, el responsable del proyecto se encargará de:

1. Crear una issue en `frontend`.
2. Crear otra issue en `backend`.
3. Agregar ambas issues al Project de la organización.
4. Asignar cada issue a la persona correspondiente.
5. Relacionar las issues dentro de sus descripciones.
6. Definir las dependencias y el orden de implementación.

Los integrantes asignados deben limitarse a:

1. Revisar su issue.
2. Crear su rama.
3. Realizar los cambios.
4. Subir su rama.
5. Crear su Pull Request.
6. Responder a las revisiones.

Cada repositorio debe tener su propia rama y su propio Pull Request.

Cada Pull Request debe cerrar únicamente la issue correspondiente a su repositorio.

Ejemplo:

```text
Project: Proyecto-Software-I

├── frontend#15 — Crear formulario de inicio de sesión
│   ├── Rama: feat/15-login-form
│   └── PR: frontend#18
│
└── backend#22 — Crear endpoint de inicio de sesión
    ├── Rama: feat/22-login-endpoint
    └── PR: backend#27
```

La funcionalidad completa se considera terminada cuando las dos tareas hayan sido revisadas e integradas.

Si existe una dependencia, aparecerá indicada en la issue.

Ejemplo en la issue de frontend:

```markdown
## Dependencias

Depende de Proyecto-Software-I/backend#22.

El frontend debe consumir:

POST /auth/login
```

No cambies la dependencia ni comiences a utilizar un contrato diferente sin comunicarlo en la issue.

---

## Contratos entre frontend y backend

Antes de implementar una funcionalidad compartida, se debe definir:

* Ruta del endpoint.
* Método HTTP.
* Datos enviados.
* Datos recibidos.
* Códigos de respuesta.
* Estructura de errores.
* Requisitos de autenticación.
* Formato de fechas, identificadores y valores opcionales.

El responsable del proyecto colocará esta información en las issues correspondientes.

Ejemplo:

```http
POST /auth/login
```

Solicitud:

```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña"
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

Tanto frontend como backend deben respetar el contrato definido.

Si el contrato necesita modificarse:

1. Coméntalo en la issue.
2. Explica el motivo.
3. Espera la confirmación del responsable.
4. Coordina el cambio con la persona encargada del otro repositorio.

No modifiques unilateralmente un contrato que afecte a otro integrante.

---

## Mantener la rama actualizada

Si `main` recibió cambios mientras trabajabas, actualiza primero la información del repositorio remoto:

```bash
git fetch origin
```

Después, desde tu rama de trabajo, aplica los cambios recientes de `main` mediante rebase:

```bash
git switch nombre-de-tu-rama
git rebase origin/main
```

Si no existen conflictos, Git completará el proceso automáticamente.

Si aparecen conflictos:

1. Revisa los archivos indicados.
2. Resuelve cada conflicto.
3. Agrega los archivos corregidos.

```bash
git add .
```

4. Continúa el rebase.

```bash
git rebase --continue
```

Repite el proceso hasta finalizar.

Si necesitas cancelar el rebase:

```bash
git rebase --abort
```

Después de un rebase, si la rama ya había sido subida, es posible que sea necesario actualizarla con:

```bash
git push --force-with-lease
```

Utiliza `--force-with-lease` únicamente sobre tu propia rama.

Nunca utilices:

```bash
git push --force
```

No reescribas el historial de:

* `main`.
* Una rama de otra persona.
* Una rama compartida sin coordinación.

Si no estás seguro de cómo resolver los conflictos, solicita ayuda antes de continuar.

---

## Seguridad

Nunca debes subir al repositorio:

* Contraseñas.
* Tokens de acceso.
* Claves privadas.
* Credenciales de bases de datos.
* Archivos `.env`.
* Datos personales o sensibles.
* Configuraciones locales que no correspondan al proyecto.
* Archivos generados que estén excluidos mediante `.gitignore`.

Usa un archivo `.env.example` para documentar las variables necesarias:

```env
DATABASE_URL=
JWT_SECRET=
API_URL=
```

El archivo `.env.example` solamente debe contener los nombres de las variables y valores de ejemplo que no sean sensibles.

Los valores reales deben mantenerse en el entorno local o en los secretos configurados para despliegue.

Si accidentalmente subes una credencial, informa inmediatamente al responsable del proyecto. Eliminarla en un commit posterior no garantiza que desaparezca del historial.

---

## Lista de verificación del autor

Antes de solicitar una revisión, confirma que:

* [ ] Estoy trabajando en la issue que me fue asignada.
* [ ] La rama fue creada desde una versión actualizada de `main`.
* [ ] La rama utiliza el formato `tipo/numero-issue-descripcion`.
* [ ] Los cambios corresponden únicamente a la tarea asignada.
* [ ] El código compila o se ejecuta correctamente.
* [ ] Se ejecutaron las pruebas disponibles.
* [ ] Se agregaron pruebas cuando correspondía.
* [ ] No se incluyeron credenciales ni archivos sensibles.
* [ ] No quedó código temporal o de depuración.
* [ ] Los commits tienen mensajes claros.
* [ ] El Pull Request utiliza una plantilla adecuada o el formato alternativo.
* [ ] La descripción explica cómo probar los cambios.
* [ ] La issue correcta está enlazada con `Closes #...`.
* [ ] Las dependencias con otros repositorios están indicadas.
* [ ] El contrato entre frontend y backend fue respetado.
* [ ] No existen conflictos con `main`.

---

## Lista de verificación del revisor

Antes de aprobar un Pull Request, se debe verificar que:

* [ ] El cambio resuelve la issue asignada.
* [ ] Cumple los criterios de aceptación.
* [ ] El código tiene nombres y una estructura suficientemente claros.
* [ ] El código no dificulta innecesariamente su mantenimiento o comprensión por otros integrantes y sus herramientas.
* [ ] No se agregaron cambios ajenos al objetivo.
* [ ] Las pruebas funcionan.
* [ ] No existen errores evidentes.
* [ ] No se incluyó información sensible.
* [ ] La documentación fue actualizada cuando correspondía.
* [ ] Las integraciones entre frontend y backend respetan el contrato definido.
* [ ] El Pull Request puede integrarse sin conflictos.
* [ ] Los commits tienen mensajes adecuados para utilizar `Rebase and merge`.
