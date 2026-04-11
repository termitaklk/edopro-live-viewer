# MSG_DRAW

## Identidad

- Nombre: `MSG_DRAW`
- Codigo: `0x5A` (`90`)
- Direccion: `STOC_GAME_MSG`
- Rol: informar que un jugador roba una o varias cartas

## Layout binario

Base:

- `+0`: `uint8 player`
- `+1`: `uint32LE count`

Luego, por cada carta declarada por el parser moderno:

- `uint32LE code`
- `uint32LE position`

## Tamano esperado

- minimo valido para el parser actual: `5 bytes`
- tamano teorico con detalle por carta: `5 + count * 8`

## Ejemplos reales

### Variante minima, sin codigos utiles

Traza real en [message-trace-0a3ab068-2bd0-48d9-9d1e-225237a70741.txt:41](/c:/Fix%20Mobile/visor/logs/message-trace-0a3ab068-2bd0-48d9-9d1e-225237a70741.txt:41)

```text
SEG_HEX: 1800015a00050000000000000000000000000000000000000000
```

Lectura:

- `5a`: `MSG_DRAW`
- `00`: `player = 0`
- `05000000`: `count = 5`
- resto: bloques sin codigo visible util

Interpretacion:

- jugador `0` roba `5`
- el payload no revela cartas concretas

### Variante con entradas repetidas por carta

Traza real en [message-trace-202ee2c5-287f-4158-b60f-26a3c9ca665f.txt:32](/c:/Fix%20Mobile/visor/logs/message-trace-202ee2c5-287f-4158-b60f-26a3c9ca665f.txt:32)

```text
SEG_HEX: 2f00015a0005000000000000000a000000000000000a000000000000000a000000000000000a000000000000000a000000
```

Lectura:

- `5a`: `MSG_DRAW`
- `00`: `player = 0`
- `05000000`: `count = 5`
- luego aparecen `5` parejas:
  - `code = 00000000`
  - `position = 0a000000`

Interpretacion:

- jugador `0` roba `5`
- hay estructura por carta, pero el `code` sigue sin revelar identidad real
- el valor `position = 0x0A` aparece de forma consistente en varias trazas de robo inicial

Tambien existe la misma variante para jugador `1` en [message-trace-202ee2c5-287f-4158-b60f-26a3c9ca665f.txt:38](/c:/Fix%20Mobile/visor/logs/message-trace-202ee2c5-287f-4158-b60f-26a3c9ca665f.txt:38).

## Parser actual

Referencia en [messageHandlers.js:547](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js:547)

Resumen del parser actual:

1. exige al menos `5 bytes`
2. lee `player` como `uint8`
3. lee `count` como `uint32LE`
4. intenta leer hasta `count` entradas de `8 bytes`
5. por cada entrada agrega `{ code, position }`

El handler principal lo publica como:

- `type: 'MSG_DRAW'`
- `player`
- `count`
- `cards`

Referencia en [messageHandlers.js:895](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js:895)

## Uso actual en el viewer

Referencia principal en [viewer.html:3079](/c:/Fix%20Mobile/visor/front-end/viewer.html:3079)

Comportamiento actual:

1. toma `payload.count` como fuente de verdad del robo
2. intenta normalizar los `code` recibidos
3. si no hay cartas reales o faltan entradas, crea placeholders ocultos
4. agrega esas cartas a `state.hands[payload.player]`
5. decrementa `state.pileCounts.deck[payload.player]` por `declaredCount`

Esto es importante: el viewer no depende de que `MSG_DRAW` revele ids reales de carta. Le basta con saber:

- que jugador robo
- cuantas cartas robo

## Relacion con otros mensajes

### `MSG_START`

- fija los conteos iniciales de deck y extra
- no reconstruye por si solo la mano inicial visible del viewer

### `MSG_UPDATE_DATA`

- suele llegar inmediatamente despues
- sincroniza zonas y estado adicional del juego

### `MSG_MOVE`

Referencia contextual en [viewer.html:3191](/c:/Fix%20Mobile/visor/front-end/viewer.html:3191)

El viewer actual ya protege este caso:

- `DECK -> HAND` no debe duplicarse via `MSG_MOVE` si ya fue representado por `MSG_DRAW`

Esa regla es clave para no inflar manos ni descontar deck dos veces.

## Dudas abiertas

- confirmar con mas evidencia si `position = 0x0A` significa explicitamente `LOCATION_HAND` en esta variante o si es solo un valor interno del protocolo moderno
- confirmar si en algun modo no-compat pueden venir `code` reales en robos visibles
- revisar si el protocolo legacy con `CompatRead<uint8_t, uint32_t>` requiere una nota separada si mas adelante damos soporte dual estricto

## Regla de implementacion recomendada

- tratar `MSG_DRAW` como mensaje autoritativo para conteo de mano y descuento de deck
- no asumir que `cards[].code` estara disponible
- cuando falten ids reales, generar placeholders ocultos
- impedir que `MSG_MOVE` replique el mismo `DECK -> HAND`

## Estado de certeza

- confirmado: `player`
- confirmado: `count`
- confirmado: el viewer debe usar `count` como verdad operativa
- bastante probable: la variante moderna usa bloques de `8 bytes` por carta
- abierto: interpretacion exacta del campo `position` en todas las variantes
