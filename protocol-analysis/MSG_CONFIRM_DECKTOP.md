# MSG_CONFIRM_DECKTOP

## Identidad

- Nombre: `MSG_CONFIRM_DECKTOP`
- Codigo: `0x1E` (`30`)
- Direccion: `STOC_GAME_MSG`
- Rol: revelar una o varias cartas de la parte superior del deck

## Estado actual en el proyecto

Actualmente no existe parser dedicado ni consumo especifico para `MSG_CONFIRM_DECKTOP` en:

- [messageHandlers.js](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js)
- [viewer.html](/c:/Fix%20Mobile/visor/front-end/viewer.html)

Hoy cae en `UNHANDLED`.

## Evidencia observada

Las trazas muestran longitudes variables, por ejemplo:

- `0b00011e0101339e1100010134`
- `1200011e0102f1d4740001013681076404010135`

Eso encaja muy bien con:

- `uint8 player`
- `uint8 count`
- por cada carta:
  - `uint32LE code`
  - `uint8 controller`
  - `uint8 location`
  - `uint8 sequence`

## Ejemplos reales

### Una carta

Traza real en [message-trace-0a3ab068-2bd0-48d9-9d1e-225237a70741.txt:1266](/c:/Fix%20Mobile/visor/logs/message-trace-0a3ab068-2bd0-48d9-9d1e-225237a70741.txt:1266)

```text
SEG_HEX: 0b00011e0101339e1100010134
```

Interpretacion probable:

- `player = 1`
- `count = 1`
- carta revelada:
  - `code = 0x00119E33`
  - `controller = 0`
  - `location = 1`
  - `sequence = 0x34`

### Dos cartas

Traza real en [message-trace-443e3028-accf-43d9-8e95-6bffa586e81f.txt:645](/c:/Fix%20Mobile/visor/logs/message-trace-443e3028-accf-43d9-8e95-6bffa586e81f.txt:645)

```text
SEG_HEX: 1200011e0102f1d4740001013681076404010135
```

Interpretacion probable:

- `player = 1`
- `count = 2`
- cartas reveladas:
  - `code = 0x0074D4F1`, `controller = 0`, `location = 1`, `sequence = 0x36`
  - `code = 0x04640781`, `controller = 0`, `location = 1`, `sequence = 0x35`

Inferencia fuerte:

- `location = 0x01` representa deck en estas muestras
- `sequence` parece marcar la profundidad o indice dentro del top del deck

## Relacion con otros mensajes

### `MSG_SHUFFLE_DECK`

- si el deck se baraja, cualquier informacion previa de top-deck queda invalidada

### `MSG_DRAW`

- una carta confirmada en top puede desaparecer del top inmediatamente despues por `MSG_DRAW`

## Regla de implementacion recomendada

- implementar parser minimo con `player`, `count` y lista de cartas
- usarlo para debug, overlays o futuras vistas de top-deck
- invalidar cache de top-deck cuando llegue `MSG_SHUFFLE_DECK`

## Estado de certeza

- inferencia fuerte por trazas: `player + count + entries(code/controller/location/sequence)`
- confirmado: hoy no esta implementado
- abierto: si existe variante compat distinta
