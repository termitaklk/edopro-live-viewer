# MSG_RELOAD_FIELD

## Identidad

- Nombre: `MSG_RELOAD_FIELD`
- Codigo: `0xA2` (`162`)
- Direccion: `STOC_GAME_MSG`
- Rol: reconstruir una foto amplia del estado del duelo

## Importancia

Es uno de los mensajes mas valiosos para recuperar consistencia porque trae:

- LP
- zonas ocupadas
- conteos de deck/mano/grave/banished/extra

En la referencia local aparece como mensaje prioritario para reconstruccion estable.

## Parser actual

Referencia en [messageHandlers.js:697](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js:697)

El parser intenta dos modos:

1. `non-compat`
2. `compat`

Luego elige el candidato sin error con menor `remainingBytes`.

## Estructura emitida

El parser devuelve un objeto con:

- `compatMode`
- `duelOptions` o `duelField`
- `lp`
- `zones`
- `counts`
- `solvingChains`
- `remainingBytes`

### `zones`

Cada zona ocupada queda como:

- `controller`
- `location`
- `sequence`
- `position`
- `xyzCount`

### `counts`

Se emiten conteos por jugador para:

- `deck`
- `hand`
- `grave`
- `banished`
- `extra`
- `extraFaceupPendulum`

## Layout alto nivel

### `non-compat`

- `uint32LE duelOptions`
- por cada jugador:
  - `uint32LE lp`
  - `7` slots de monster zone con flags de uso y posicion
  - `8` slots de spell/trap zone con flags de uso y posicion
  - conteos de piles en `uint32LE`
- `solvingChains`

### `compat`

- `uint8 duelField`
- por cada jugador:
  - `uint32LE lp`
  - zonas con el mismo patron general
  - conteos de piles usando lectura compacta
- `solvingChains`

## Traza real

No encontre en esta pasada una traza `SEG_HEX` limpia y aislada de `MSG_RELOAD_FIELD` dentro de `logs/`. La documentacion de esta ficha se apoya en:

- parser real del proyecto
- consumo real del viewer
- referencia local que lo marca como prioritario

## Uso actual en el viewer

Bloque principal en [viewer.html:2988](/c:/Fix%20Mobile/visor/front-end/viewer.html:2988)

Comportamiento actual:

1. pone `state.phase = 'dueling'`
2. actualiza `state.playerLp`
3. actualiza conteos base de deck
4. reconstruye manos como placeholders ocultos desde `counts.hand`
5. limpia `state.field` y `state.graves`
6. vuelve a sembrar el campo con `payload.zones`
7. recrea cementerios como listas vacias con longitud correcta
8. limpia `state.pendingReveal`
9. renderiza

Esto lo convierte en mecanismo de resincronizacion fuerte.

## Relacion con otros mensajes

### `MSG_UPDATE_DATA`

- `MSG_RELOAD_FIELD` hace una reconstruccion amplia
- `MSG_UPDATE_DATA` mantiene la consistencia incremental de zonas

### `MSG_UPDATE_CARD`

- `MSG_RELOAD_FIELD` puede dejar cartas sin `code`
- `MSG_UPDATE_CARD` ayuda a completar identidad o posicion despues

## Dudas abiertas

- faltan trazas aisladas para validar ejemplos binarios concretos
- no esta cerrado todavia el significado practico de `duelOptions` frente a `duelField`

## Regla de implementacion recomendada

- tratar `MSG_RELOAD_FIELD` como resync autoritativo del snapshot general
- usarlo para salir de estados corruptos sin depender de secuencias previas de mensajes
- complementar con `MSG_UPDATE_DATA` y `MSG_UPDATE_CARD` para rellenar detalles finos

## Estado de certeza

- confirmado: el parser soporta `compat` y `non-compat`
- confirmado: el viewer lo usa como resincronizacion fuerte
- abierto: ejemplos binarios limpios en logs para ambas variantes
