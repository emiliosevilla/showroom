# showroom

Organizador de carpetas locales que se ejecuta 100% en el navegador. `showroom`
escanea una carpeta de tu equipo, clasifica sus archivos automáticamente en
categorías ("contenedores") y te deja reorganizarlos con drag & drop antes de
exportarlos a un ZIP o generar una galería HTML autocontenida para compartir.

No hay backend ni IA: todo el procesamiento ocurre en el cliente y ningún
archivo sale de tu equipo salvo que tú lo exportes explícitamente.

## Cómo funciona

1. **Seleccionas una carpeta local** mediante la File System Access API del
   navegador (`showDirectoryPicker`), con un `<input webkitdirectory>` como
   alternativa en navegadores sin soporte.
2. **La app escanea la carpeta** de forma recursiva (`scanDirectory`) y
   clasifica cada archivo por extensión en categorías predefinidas —
   Ejecutables y Herramientas, Recursos Gráficos, Documentación, Archivos
   Comprimidos, Multimedia, Proyectos de Código, Subcarpetas y Varios
   (`src/services/classifier.ts`).
3. **Editas el resultado**: arrastra archivos entre contenedores, renombra o
   cambia el color/icono de cada contenedor, marca favoritos, busca y filtra,
   ordena en vista de lista (nombre, contenedor, extensión, fecha) y deshaces
   o rehaces cambios (Ctrl+Z / Ctrl+Shift+Z).
4. **Decides qué hacer con el resultado**:
   - **Exportar ZIP**: descarga un `.zip` con una carpeta por contenedor
     (vía JSZip).
   - **Exportar como HTML**: genera una galería HTML autocontenida y
     portable (sin dependencias externas en tiempo de ejecución, con modo
     claro/oscuro) que muestra los contenedores y sus archivos — pensada
     para compartir o consultar sin necesidad de la app.

## Características

- Clasificación automática de archivos por extensión.
- Vistas en cuadrícula, columnas y lista.
- Reordenación por drag & drop de archivos y contenedores (`@dnd-kit`).
- Edición de contenedores: nombre, color e icono.
- Papelera con eliminar/restaurar.
- Favoritos persistidos en `localStorage`.
- Estadísticas de la carpeta en un gráfico circular (`recharts`).
- Deshacer / rehacer.
- Modo oscuro / claro.
- Compartir mediante la Web Share API del navegador.
- Exportación a ZIP o a HTML estático autocontenido.
- Persistencia ligera de estado en IndexedDB (`src/utils/idb.ts`).
- Soporte multi-idioma (i18n).
- Límites de escaneo para proteger la memoria (máx. 100 subcarpetas y 1000 archivos por subcarpeta).

## Ejecutar en local

**Requisitos:** Node.js

```bash
npm install
npm run dev
```

Otros scripts disponibles:

```bash
npm run build   # build de producción (Vite)
npm run preview # sirve el build de producción
npm run lint    # comprueba tipos con tsc --noEmit
npm run clean   # borra dist/
```

No hace falta configurar ninguna variable de entorno ni API key para usar la
app: todo el procesamiento es local en el navegador.

## Stack técnico

Vite 6 + React 19 + TypeScript (`strict` habilitado), Tailwind CSS v4,
`@dnd-kit` para drag & drop, `recharts` para estadísticas, `lucide-react`
para iconos, `motion` para animaciones y `jszip` para la exportación en ZIP.

## Contribuir

Este repositorio se gestiona mediante forks y Pull Requests. Consulta
[CONTRIBUTING.md](CONTRIBUTING.md) para el flujo completo.
