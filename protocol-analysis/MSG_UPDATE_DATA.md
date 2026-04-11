# MSG_UPDATE_DATA

## Identidad

- Nombre: `MSG_UPDATE_DATA`
- Codigo: `0x06` (`6`)
- Direccion: `STOC_GAME_MSG`
- Rol: refrescar el estado de una zona completa

## Layout binario

Base:

- `+0`: `uint8 player`
- `+1`: `uint8 location`
- `+2`: `uint32LE totalSize`
- `+6...`: `QueryStream`

No tiene tamano fijo. El `QueryStream` contiene varias cartas consecutivas.

Referencia del parser en [messageHandlers.js:470](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js:470)

## Como se interpreta `QueryStream`

El parser:

1. lee `player`
2. lee `location`
3. lee `totalSize`
4. usa ese presupuesto de bytes para leer multiples `Query`
5. asigna `sequence` incremental empezando en `0`

Cada carta parseada expone:

- `sequence`
- `flags`
- `code`
- `position`
- `onfieldSkipped`

## Ejemplos reales

### Variante corta

Traza real en [message-trace-04788585-0380-4bc3-9333-c0caff6c2f82.txt:39](/c:/Fix%20Mobile/visor/logs/message-trace-04788585-0380-4bc3-9333-c0caff6c2f82.txt:39)

```text
SEG_HEX: 1200010600040a00000000000000000000000000
```

Lectura de cabecera del payload:

- `00`: `player = 0`
- `04`: `location = 0x04`
- `0a000000`: `totalSize = 10`

### Variante larga

Traza real en [message-trace-04788585-0380-4bc3-9333-c0caff6c2f82.txt:29](/c:/Fix%20Mobile/visor/logs/message-trace-04788585-0380-4bc3-9333-c0caff6c2f82.txt:29)

```text
SEG_HEX: 020101060002fa0000000800020000000a000000080000100000000400020500000010000005000000000100080000000002000000000400000000800800020000000a000000080000100000000400020500000010000005000000000100080000000002000000000400000000800800020000000a000000080000100000000400020500000010000005000000000100080000000002000000000400000000800800020000000a000000080000100000000400020500000010000005000000000100080000000002000000000400000000800800020000000a00000008000010000000040002050000001000000500000000010008000000000200000000040000000080
```

Lectura de cabecera del payload:

- `00`: `player = 0`
- `02`: `location = 0x02`
- `fa000000`: `totalSize = 250`

Interpretacion alta:

- se refresca toda una zona del jugador `0`
- el stream contiene varias cartas consecutivas

## Parser actual

El parser devuelve:

- `player`
- `location`
- `totalSize`
- `cards`

Cada elemento de `cards` incluye solo el subconjunto util hoy para el visor:

- `sequence`
- `flags`
- `code`
- `position`
- `onfieldSkipped`

## Uso actual en el viewer

Bloque principal en [viewer.html:3332](/c:/Fix%20Mobile/visor/front-end/viewer.html:3332)

Comportamiento actual:

1. normaliza `code` de cada carta
2. limpia cartas de `state.field` ausentes cuando la zona es de campo (`0x04` o `0x08`)
3. recorre las cartas y actualiza `state.field` o `state.graves`
4. si alguna carta trae `code`, limpia `state.pendingReveal`

Esto convierte `MSG_UPDATE_DATA` en snapshot autoritativo de la zona consultada.

## Relacion con otros mensajes

### `MSG_UPDATE_CARD`

- `MSG_UPDATE_CARD` refresca una sola carta
- `MSG_UPDATE_DATA` refresca un conjunto entero de cartas de una zona

### `MSG_MOVE`

- `MSG_MOVE` traslada
- `MSG_UPDATE_DATA` consolida el estado visible de la zona despues del movimiento

### `MSG_RELOAD_FIELD`

- `MSG_RELOAD_FIELD` reconstruye una foto mas amplia del estado general
- `MSG_UPDATE_DATA` actua como sincronizacion incremental de zonas

## Dudas abiertas

- todavia no exponemos en el evento todos los campos que `parseQuery()` podria leer
- faltaria documentar formalmente el mapa de `location` para saber que zonas entran por cada `MSG_UPDATE_DATA`

## Regla de implementacion recomendada

- tratar `MSG_UPDATE_DATA` como snapshot autoritativo de la zona
- priorizarlo para corregir divergencias entre animaciones y estado real
- no asumir que siempre traera `code`; a veces solo actualiza `position` o flags parciales

## Estado de certeza

- confirmado: cabecera `player/location/totalSize`
- confirmado: el stream contiene multiples `Query`
- confirmado: el viewer lo usa como sincronizacion autoritativa de zona
- abierto: exposicion completa de todos los subcampos del `Query`
