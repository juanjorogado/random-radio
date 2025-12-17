# Documentación de APIs de Metadatos

Este documento describe las APIs de metadatos requeridas para cada tipo de estación de radio soportada en la aplicación.

## Estaciones Soportadas

### 1. KEXP (Seattle, USA)

**ID de estación:** `kexp`

**URL de metadatos:** `https://api.kexp.org/v2/plays/?limit=1&ordering=-airdate`

**Formato de respuesta esperado:**
```json
{
  "results": [
    {
      "song": "Nombre de la canción",
      "artist": "Nombre del artista",
      "album": "Nombre del álbum",
      "thumbnail_uri": "URL de la imagen de portada"
    }
  ]
}
```

**Campos utilizados:**
- `results[0].song` → `track.title`
- `results[0].artist` → `track.artist`
- `results[0].album` → `track.album`
- `results[0].thumbnail_uri` → `track.cover`

**Notas:**
- La API devuelve una lista de reproducciones recientes
- Se toma el primer resultado (`results[0]`) que es la canción más reciente
- Si no hay resultados, se muestra "Información no disponible"

---

### 2. Radio Paradise (rp)

**ID de estación:** `rp`

**URL de metadatos:** Requiere configuración en `stations.json` con `metadataUrl`

**Formato de respuesta esperado:**
```json
{
  "title": "Nombre de la canción",
  "artist": "Nombre del artista",
  "album": "Nombre del álbum",
  "cover": "ruta/relativa/de/portada.jpg"
}
```

**Campos utilizados:**
- `title` → `track.title`
- `artist` → `track.artist`
- `album` → `track.album`
- `cover` → Se concatena con `https://img.radioparadise.com/` para formar `track.cover`

**Notas:**
- El campo `cover` es una ruta relativa que se completa con el dominio de Radio Paradise
- Solo se procesa si existe el campo `title` en la respuesta

---

### 3. FIP (France Inter Paris)

**ID de estación:** `fip`

**URL de metadatos:** Requiere configuración en `stations.json` con `metadataUrl`

**Formato de respuesta esperado:**
```json
{
  "now": {
    "firstLine": "Nombre del artista",
    "secondLine": "Nombre de la canción",
    "cover": "URL completa de la imagen de portada"
  }
}
```

**Campos utilizados:**
- `now.secondLine` o `now.firstLine` → `track.title` (prioridad a `secondLine`)
- `now.firstLine` → `track.artist`
- `now.cover` → `track.cover`

**Notas:**
- Si no existe `secondLine`, se usa `firstLine` como título
- El campo `album` siempre queda vacío para esta estación

---

### 4. NTS Radio

**ID de estación:** `nts`

**URL de metadatos:** `https://www.nts.live/api/v2/live`

**Formato de respuesta esperado:**
```json
{
  "results": [
    {
      "now": {
        "broadcast_title": "Título del programa",
        "embeds": {
          "details": {
            "name": "Nombre alternativo",
            "description": "Descripción del programa",
            "media": {
              "picture_large": "URL de la imagen grande"
            }
          }
        }
      }
    }
  ]
}
```

**Campos utilizados:**
- `results[0].now.broadcast_title` o `results[0].now.embeds.details.name` → `track.title`
- `results[0].now.embeds.details.description` → `track.artist`
- `results[0].now.embeds.details.media.picture_large` → `track.cover`

**Notas:**
- Se toma el primer resultado de la lista
- Si no hay `broadcast_title` ni `name`, se muestra "En vivo"
- El campo `album` siempre queda vacío para esta estación

---

## Estaciones sin Metadatos

Las siguientes estaciones no tienen configuración de `metadataUrl` y mostrarán un mensaje genérico:

- **dublab** (Los Angeles, USA)
- **Resonance FM** (London, UK)
- **NTS 2** (London, UK)
- **Radio AlHara** (Bethlehem, Palestina)

Para estas estaciones, se mostrará:
```javascript
{
  title: `Escuchando ${station.name}`,
  artist: '',
  album: '',
  cover: null
}
```

---

## Manejo de Errores

La función `fetchMetadata` maneja los siguientes tipos de errores:

1. **Timeout (10 segundos):** Si la petición tarda más de 10 segundos, se cancela automáticamente
2. **Error HTTP:** Si la respuesta no es exitosa (status !== 200-299)
3. **Error de red:** Si no se puede conectar con el servidor (TypeError en fetch)
4. **Error de parseo JSON:** Si la respuesta no es JSON válido (SyntaxError)
5. **Otros errores:** Cualquier otro error inesperado

En todos los casos, se registra el error en la consola y se muestra un mensaje genérico con el nombre de la estación.

---

## Agregar una Nueva Estación con Metadatos

Para agregar una nueva estación con soporte de metadatos:

1. Agregar la estación a `src/data/stations.json` con un `id` único y `metadataUrl`
2. Agregar un bloque `if` en `fetchMetadata` para procesar la respuesta específica de esa API
3. Mapear los campos de la respuesta JSON a `track.title`, `track.artist`, `track.album`, y `track.cover`
4. Documentar el formato de la API en este archivo

Ejemplo:
```javascript
if (station.id === 'nueva-estacion') {
  // Procesar respuesta específica
  track = {
    title: data.cancion || 'Sin título',
    artist: data.artista || '',
    album: data.album || '',
    cover: data.portada || null
  };
}
```

