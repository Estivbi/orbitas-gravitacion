# GRV-06 · Rendimiento y accesibilidad (versión mínima)

**Estado:** aprobada · **Tamaño:** S · **Rama:** `feature/rendimiento-y-accesibilidad` → `develop`

## Alcance

Medir con Lighthouse (móvil) la portada y un detalle, y documentar los números reales. Corregir solo lo que falle de forma clara. Añadir `robots.txt` (la portada ya hereda una descripción propia del layout).

## Fuera de alcance

Optimizaciones profundas, imágenes Open Graph, consolidar los tests de navegador.

## Criterios

1. **`robots.txt`.** Dada la aplicación, cuando se pide `/robots.txt`, entonces permite todo y apunta al `sitemap.xml` con la URL del sitio. _(Vitest sobre `src/app/robots.ts`)_
2. **Medición.** Dada una compilación de producción, cuando se ejecuta Lighthouse en móvil sobre `/` y `/orbitas/butterfly-i`, entonces se anotan Rendimiento, Accesibilidad, Buenas prácticas y SEO en el README, junto con el método y sus límites (WebGL por software).
3. **Accesibilidad.** Dada la medición, cuando Accesibilidad sale por debajo de 95, entonces se corrigen los fallos señalados o se documentan en «Límites».

## Riesgos

El WebGL por software y el emulador de móvil de Lighthouse penalizan el rendimiento de la escena 3D: se documenta, no se oculta.
