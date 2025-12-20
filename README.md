# onda

Aplicación web que reproduce emisoras de radio online de forma aleatoria a partir de una lista configurable, ideal para descubrir nuevas radios sin tener que elegir manualmente cada vez.

## Demo

- URL de la demo: https://random-radio.vercel.app/
- Requiere navegador moderno con soporte para audio HTML5.

## Características

- Reproducción de streams de radio vía HTML5 Audio.
- Botón de "radio aleatoria" que selecciona una emisora al azar.
- Lista de emisoras visibles con búsqueda por nombre / género.
- Marcado de emisoras favoritas almacenadas en localStorage.
- Diseño responsive para escritorio y móvil.
- Metadata automática desde APIs de radios (KEXP, Radio Paradise, FIP, NTS, etc.).
- Gestos táctiles optimizados para uso en coche (swipe horizontal).
- Prevención de apagado de pantalla durante reproducción.
- Feedback sonoro opcional.

## Tecnologías

- Frontend: HTML5, CSS3, JavaScript (puedes cambiar por React/Vue/etc.)
- Reproducción: elemento `<audio>` de HTML5.
- Estado ligero en el navegador (sin backend obligatorio).
- Opcional: API/JSON externo para cargar la lista de emisoras.

## Empezando

### Requisitos

- Node.js LTS (solo si usas bundler o framework).
- Navegador moderno (Chrome, Firefox, Safari, Edge).

### Instalación