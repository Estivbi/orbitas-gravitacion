# GRV-06 · Rendimiento y accesibilidad (versión mínima)

Spec: `docs/specs/GRV-06.md`.

## Qué se hizo

- `src/app/robots.ts`: permite todo y apunta al `sitemap.xml` con la URL del sitio (`URL_SITIO`). Test en `tests/unit/galeria/robots.test.ts`.
- Medición con Lighthouse en móvil sobre una compilación de producción; las cifras están en la sección «Mediciones» del README.
- La portada ya heredaba una descripción propia del layout, así que no hizo falta añadir otra.

## Resultado

Accesibilidad, buenas prácticas y SEO: 100 en la portada y en un detalle. Rendimiento: 73 en la portada y 82 en un detalle, por debajo del objetivo de 90. Sin WebGL el rendimiento de la portada sube a 89, así que casi todo el bloqueo (TBT) es la escena 3D dibujada por software en la CPU. LCP y CLS cumplen.

## Cómo medirlo

```
npm run build && npm start -- --port 3400
npx lighthouse http://localhost:3400/ --form-factor=mobile --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags="--headless=new --no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader"
```

## Límites

- Sin GPU real: el rendimiento en un móvil de verdad no se ha medido.
- Lighthouse avisa de «source maps» ausentes en JavaScript propio grande: es un aviso informativo de las compilaciones de producción y no puntúa.
- No se ha consolidado la suite de tests de navegador ni se han añadido imágenes Open Graph.
