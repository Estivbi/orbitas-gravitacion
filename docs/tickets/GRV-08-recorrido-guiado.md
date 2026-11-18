# GRV-08 · Recorrido guiado

Spec: `docs/specs/GRV-08.md`.

## Qué se hizo

- `src/lib/recorrido/`: los seis pasos de la visita (`pasos.ts`) y su límite (`limites.ts`), separados para que el almacén no cargue los textos.
- `src/store/almacenInterfaz.ts`: estado `recorrido { abierto, paso }` y acciones `abrirRecorrido`, `cerrarRecorrido`, `siguientePaso` y `pasoAnterior`. Cada acción comprueba que algo cambia antes de notificar.
- `src/components/recorrido/RecorridoGuiado.tsx`: tarjeta no modal con el paso, «Qué hacer», Anterior, Siguiente/Terminar y Saltar. Resalta la sección con `data-recorrido-activo`, la lleva a la vista (sin animación con `prefers-reduced-motion`), cierra con Escape y devuelve el foco a quien la abrió.
- `RecorridoCargado.tsx`: la tarjeta se descarga con `next/dynamic` solo cuando se abre, para no engordar el JS inicial.
- Botón «Guía» en la cabecera (también en el menú móvil) e invitación en el hero. Ambos permanecen invisibles hasta hidratar, porque sin JavaScript no harían nada.
- Las secciones de la portada llevan `data-recorrido="<id>"`.

## Decisiones y cambios que conviene conocer

- El layout raíz ahora envuelve cabecera, contenido, pie y visita en `ProveedorAlmacen` (antes solo `children`). Hizo falta para que la cabecera abra la visita. El test de invariantes (`tests/repo/galeria.test.ts`) exige ahora que `children` quede dentro del proveedor.
- Los botones usaban `transition-all`, que animaba el contorno de foco y hacía fallar el criterio 31 de GRV-04 (el contorno medía 3 px en vez de 2). Pasan a `transition-colors`.
- No se abre sola: el estado no persiste tras recargar y no se puede recordar que ya se vio.

## Cómo probarlo

`npx vitest run tests/unit/recorrido tests/unit/store` y `npx playwright test recorrido.spec`.

## Límites

- Solo recorre la portada: no hay guía propia de la página de cada órbita.
- Sin imágenes ni vídeo en los pasos.
- Nada se recuerda entre visitas.
