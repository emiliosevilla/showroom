# Guía de mantenedor (uso personal, no versionado)

Cómo compaginar tu propio desarrollo con la revisión de PRs del colaborador sin
pisarte el trabajo a ti mismo. Idea central: **tu working directory principal
(`mostrador/`) nunca debe tener cambios sin commitear a medias cuando vayas a
revisar un PR** — para eso usamos worktrees, que te dan carpetas separadas
compartiendo el mismo histórico `.git`.

## Regla de oro

Nunca desarrolles ni pruebes código directamente sobre la carpeta que tiene
`dev`/`prod` en checkout si en ese momento vas a hacer otra cosa a la vez
(revisar un PR, probar una rama). Usa una carpeta (worktree) por tarea. Así,
pase lo que pase en una, las demás quedan intactas.

## 1. Tu propio desarrollo

```bash
git worktree add ../mostrador-<feature> -b <feature> dev
cd ../mostrador-<feature>
# trabajas, commits normales
```

Cuando termines, desde el repo principal:
```bash
cd ~/Documents/GitHub/mostrador
git checkout dev
git merge --no-ff <feature>
git push origin dev
git worktree remove ../mostrador-<feature>
git branch -d <feature>
```

Si prefieres dejar rastro con PR incluso siendo tú el autor (recomendable si
quieres historial de revisión propio), sustituye el merge directo por:
```bash
git push origin <feature>
gh pr create --base dev --head <feature> --title "..." --body "..."
gh pr merge --squash   # o --merge
```

## 2. Revisar un PR del colaborador sin arriesgar tu trabajo

El colaborador trabaja desde su fork, así que su rama no existe en tu checkout
hasta que la traes. Nunca hagas esto en tu carpeta principal si tienes cambios
a medias — usa un worktree dedicado:

```bash
git worktree add ../mostrador-pr-<numero> dev
cd ../mostrador-pr-<numero>
gh pr checkout <numero>
```

`gh pr checkout` trae la rama del fork automáticamente (añade el remoto que
haga falta) y la deja en checkout en esa carpeta. Desde ahí:

```bash
npm install        # o el gestor que use el proyecto
npm test
npm run dev         # pruébalo a mano si aplica
```

Revisar el diff sin ni siquiera hacer checkout (rápido, para un vistazo previo):
```bash
gh pr diff <numero>
gh pr view <numero> --comments
```

### Decidir

```bash
gh pr review <numero> --approve
gh pr review <numero> --request-changes -b "explica qué falta"
```

Si pide cambios, el colaborador actualiza su rama y el PR se refresca solo —
no hace falta que vuelvas a hacer nada hasta que avise.

### Integrar

```bash
gh pr merge <numero> --squash    # recomendado: un commit limpio por PR en dev
```

### Limpiar

```bash
cd ~/Documents/GitHub/mostrador
git worktree remove ../mostrador-pr-<numero>
```

## 3. Ver qué tienes abierto en cada momento

```bash
git worktree list
gh pr list
```

Convención de nombres para no perderte: `../mostrador-<feature>` para lo tuyo,
`../mostrador-pr-<numero>` para revisiones. Así `git worktree list` se lee de
un vistazo.

## 4. Promoción dev → prod

Solo tú la haces, y solo cuando `dev` está estable:

```bash
git checkout prod
git merge dev
git push origin prod
git tag vX.Y.Z
git push --tags
```

No mezcles esto con revisión de PRs en la misma carpeta a la vez — si tienes
un worktree de revisión abierto, la promoción no lo afecta (viven en carpetas
distintas), pero evita lanzarla mientras tengas cambios sin commitear en la
carpeta principal.

## Cheatsheet

| Quiero... | Comando |
|---|---|
| Empezar algo mío | `git worktree add ../mostrador-x -b x dev` |
| Revisar un PR | `git worktree add ../mostrador-pr-N dev && cd ../mostrador-pr-N && gh pr checkout N` |
| Ver diff sin checkout | `gh pr diff N` |
| Aprobar / pedir cambios | `gh pr review N --approve` / `--request-changes -b "..."` |
| Mergear | `gh pr merge N --squash` |
| Listar worktrees activos | `git worktree list` |
| Quitar un worktree ya usado | `git worktree remove ../mostrador-x` |
