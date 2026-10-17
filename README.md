# juanpineda.co

Página personal de Juan Pineda: una sola pantalla, HTML y CSS
planos, sin dependencias, sin analítica. Se sirve con GitHub Pages en
`https://juanpineda.co` (y `www.juanpineda.co` como alias).

## Estructura

- `index.html`: la página completa (estilos y el toggle ES/EN inline).
- `CNAME`: dominio personalizado para GitHub Pages.
- `.nojekyll`: Pages sirve los archivos tal cual, sin Jekyll.

## Desarrollo

No hay build. Para verla en local:

```sh
python3 -m http.server 8000
```

## Idioma

Español por defecto. La primera visita respeta el idioma del navegador; el
idioma elegido con el toggle se guarda en `localStorage` del visitante.

## Licencia

El código (HTML, CSS y JS) está bajo la licencia MIT (ver `LICENSE`). El texto
y el nombre son del autor y no están cubiertos por esa licencia.
