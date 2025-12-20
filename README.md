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
- Reconocimiento automático de canciones con ACRCloud (opcional, como fallback).
- Gestos táctiles optimizados para uso en coche (swipe, pull down).
- Prevención de apagado de pantalla durante reproducción.
- Feedback háptico y sonoro.

## Configuración Opcional: ACRCloud

La app incluye soporte para reconocimiento automático de audio usando ACRCloud como fallback cuando las radios no proporcionan metadata.

### Configuración:

1. Regístrate en [ACRCloud](https://www.acrcloud.com/) y obtén tu Bearer Token
2. Crea un archivo `.env` en la raíz del proyecto:

```bash
REACT_APP_ACRCLOUD_BEARER_TOKEN=tu_bearer_token_aqui
```

3. Reinicia el servidor de desarrollo

**Nota:** ACRCloud es completamente opcional. Si no configuras el token, la app funcionará normalmente usando solo la metadata de las APIs de las radios.

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