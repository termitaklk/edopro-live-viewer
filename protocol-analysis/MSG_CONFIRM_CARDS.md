# MSG_CONFIRM_CARDS

## Identidad

- Nombre: `MSG_CONFIRM_CARDS`
- Codigo: `0x1F` (`31`)
- Direccion: `STOC_GAME_MSG`
- Rol: revelar una o varias cartas al cliente

## Estado actual en el proyecto

Actualmente no existe parser dedicado para `MSG_CONFIRM_CARDS` en [messageHandlers.js](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js). Tampoco existe consumo dedicado en [viewer.html](/c:/Fix%20Mobile/visor/front-end/viewer.html).

Hoy cae en la ruta `UNHANDLED`.

## Evidencia observada

Hay varias longitudes reales:

- `12 bytes`
- `17 bytes`
- `19 bytes`
- `26+ bytes`
- `47 bytes`

Eso sugiere que el mensaje contiene:

- un encabezado corto
- una cantidad variable de entradas

## Hipotesis de layout

Con base en muestras reales, la mejor hipotesis actual es:

- primer campo: `player` o `controller objetivo`
- segundo campo: `count` en alguna variante corta
- luego `count` entradas de revelado

Una forma muy plausible para algunas trazas es:

- `uint8 player`
- `uint8 count`
- por cada carta:
  - `uint32LE code`
  - `uint8 controller`
  - `uint8 location`
  - `uint8 sequence`

Pero esto aun no queda confirmado para todas las variantes.

## Ejemplos reales

### Variante de una carta

Traza real en [message-trace-57e97ffb-db0b-468d-8513-26ab2169f316.txt:140](/c:/Fix%20Mobile/visor/logs/message-trace-57e97ffb-db0b-468d-8513-26ab2169f316.txt:140)

```text
SEG_HEX: 0c00011f0100016c980601000204
```

Interpretacion parcial:

- revela una carta
- el codigo visible parece ser `0x0106986C`
- el final `00 02 04` es muy compatible con `controller/location/sequence`

### Variante de multiples cartas

Traza real en [message-trace-57e97ffb-db0b-468d-8513-26ab2169f316.txt:284](/c:/Fix%20Mobile/visor/logs/message-trace-57e97ffb-db0b-468d-8513-26ab2169f316.txt:284)

```text
SEG_HEX: 1a00011f00000353f78a0301020239b1630401020169782d04010200
```

Interpretacion parcial:

- revela varias cartas
- se distinguen grupos repetidos de `code + 3 bytes finales`

## Uso actual en el viewer

No hay uso dedicado hoy.

Eso significa que:

- si una carta se revela solo via `MSG_CONFIRM_CARDS`, el viewer estable actual no la incorpora por si mismo
- depende de otros mensajes como `MSG_MOVE`, `MSG_UPDATE_CARD` o `MSG_UPDATE_DATA` para terminar de reflejar el estado visible

## Relacion con otros mensajes

### `MSG_UPDATE_CARD`

- `MSG_CONFIRM_CARDS` puede revelar identidad
- `MSG_UPDATE_CARD` puede fijar esa identidad en una celda concreta

### `MSG_SHUFFLE_HAND`

- es comun que aparezcan juntos en flujos donde una mano se revela parcial o temporalmente y luego se baraja

## Dudas abiertas

- confirmar layout exacto de encabezado y contador
- confirmar si siempre incluye `controller/location/sequence` por carta
- confirmar si existe una variante compat y otra no-compat

## Regla de implementacion recomendada

- no implementarlo a ciegas
- primero fijar parser con tests sobre trazas reales
- cuando el shape quede estable, usarlo para revelar cartas en mano, grave o decktop sin depender solo de `MSG_UPDATE_*`

## Estado de certeza

- confirmado: es un mensaje de revelado variable
- confirmado: hoy esta sin parsear en el proyecto
- inferencia fuerte: contiene una lista de cartas con `code` y algun identificador compacto de ubicacion
- abierto: layout exacto para todas las variantes
