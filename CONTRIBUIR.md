# Cómo colaborar en este repositorio

No tienes acceso de escritura directo a este repo. Todo cambio entra a través de un
Pull Request desde tu propio fork, y la decisión de qué se integra y cuándo es de
@emiliosevilla. La rama `prod` es de despliegue y la gestiona
exclusivamente @emiliosevilla.

## Configuración inicial (una sola vez)

1. **Fork del repo**: entra a este repositorio en GitHub y pulsa "Fork" (arriba a la
   derecha). Se crea una copia bajo tu cuenta: `tuusuario/showme`.

2. **Clona tu fork** (no el original):
   ```bash
   git clone https://github.com/tuusuario/showme.git
   cd showme
   ```

3. **Añade el repo original como `upstream`**:
   ```bash
   git remote add upstream https://github.com/emiliosevilla/showme.git
   git remote -v
   ```
   Deberías ver dos remotos: `origin` (tu fork, donde puedes escribir) y `upstream`
   (el original, de solo lectura para ti).

## Antes de empezar cualquier tarea

Actualiza tu copia de `dev` con lo último del original:
```bash
git fetch upstream
git checkout dev
git merge upstream/dev
git push origin dev
```

## Trabajar en una tarea

Nunca trabajes directamente sobre `dev`. Crea una rama por cada funcionalidad o fix:
```bash
git checkout -b feature/nombre-descriptivo upstream/dev
```

Si vas a tener varias tareas abiertas a la vez, en vez de cambiar de rama y perder el
estado de lo que tenías montado (`git stash` de un lado a otro), puedes usar un
**worktree**: una carpeta aparte con su propia rama, pero compartiendo el mismo
histórico `.git`:
```bash
git worktree add ../showme-feature-x -b feature/nombre-descriptivo upstream/dev
```
Así `showme/` se queda en `dev` y `showme-feature-x/` tiene la rama de trabajo,
ambas abiertas a la vez sin interferirse.

Cuando termines esa tarea y quieras liberar la carpeta:
```bash
git worktree remove ../showme-feature-x
```

## Subir cambios y abrir el Pull Request

```bash
git add .
git commit -m "mensaje descriptivo"
git push origin feature/nombre-descriptivo
```

En GitHub, ve a tu fork y pulsa "Compare & pull request". Comprueba que:
- **base repository**: `emiliosevilla/showme`, **base**: `dev`
- **head repository**: `tuusuario/showme`, **compare**: `feature/nombre-descriptivo`

Describe brevemente qué hace el cambio y por qué.

## Revisión e integración

@emiliosevilla revisa el PR, puede pedir cambios (añádelos con más commits en la
misma rama; el PR se actualiza solo) y decide cuándo y cómo se integra en `dev`. La
promoción posterior a `prod` no requiere ninguna acción por tu parte.

## Reglas rápidas

- No hay push directo a `dev` ni `prod` (de hecho, no podrás: no tienes
  permiso de escritura sobre el repo original).
- Un PR = una funcionalidad o fix, lo más acotado posible.
- Ante dudas sobre si algo encaja en el proyecto, pregunta antes de invertir tiempo
  en ello.

## Cheatsheet

| Quiero... | Comando |
|---|---|
| Configurar el remoto original (una vez) | `git remote add upstream https://github.com/emiliosevilla/showme.git` |
| Actualizar mi `dev` con lo último | `git fetch upstream && git checkout dev && git merge upstream/dev && git push origin dev` |
| Empezar una tarea nueva | `git checkout -b feature/x upstream/dev` |
| Empezar una tarea nueva en carpeta aparte (worktree) | `git worktree add ../showme-feature-x -b feature/x upstream/dev` |
| Subir mis cambios a mi fork | `git push origin feature/x` |
| Abrir el PR | En GitHub: fork → "Compare & pull request" (base: `emiliosevilla/showme`/`dev`) |
| Actualizar un PR ya abierto | Nuevos commits en la misma rama + `git push origin feature/x` |
| Quitar un worktree ya usado | `git worktree remove ../showme-feature-x` |
