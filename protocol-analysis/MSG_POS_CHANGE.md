# MSG_POS_CHANGE

## Identidad

- Nombre: `MSG_POS_CHANGE`
- Codigo: `0x35` (`53`)
- Direccion: `STOC_GAME_MSG`
- Rol: cambiar la posicion de una carta ya existente sin moverla de zona

## Layout binario

Segun la referencia local:

- `+0`: `uint32LE code`
- `+4`: `uint8 controller`
- `+5`: `uint8 location`
- `+6`: `uint8 sequence`
- `+7`: `uint8 previousPosition`
- `+8`: `uint8 currentPosition`

Tamano de payload:

- `9 bytes`

Referencia en [EDOPRO_PROTOCOL_REFERENCE.md:457](/c:/Fix%20Mobile/visor/EDOPRO_PROTOCOL_REFERENCE.md:457)

## Ejemplo real

Traza real en [message-trace-0a3ab068-2bd0-48d9-9d1e-225237a70741.txt:1110](/c:/Fix%20Mobile/visor/logs/message-trace-0a3ab068-2bd0-48d9-9d1e-225237a70741.txt:1110)

```text
SEG_HEX: 0b00013580066a020004020401
```

Lectura del payload despues de `35`:

- `80066a02`: `code = 0x026A0680`
- `00`: `controller = 0`
- `04`: `location = 0x04`
- `02`: `sequence = 2`
- `04`: `previousPosition = 0x04`
- `01`: `currentPosition = 0x01`

Interpretacion alta:

- la carta sigue en la misma celda
- solo cambia su orientacion/posicion

## Estado actual en el proyecto

No existe parser dedicado ni consumo especifico para `MSG_POS_CHANGE` en:

- [messageHandlers.js](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js)
- [viewer.html](/c:/Fix%20Mobile/visor/front-end/viewer.html)

Hoy cae en `UNHANDLED`.

## Relacion con otros mensajes

### `MSG_MOVE`

- `MSG_MOVE` cambia zona
- `MSG_POS_CHANGE` cambia postura en la misma zona

### `MSG_UPDATE_CARD`

- `MSG_UPDATE_CARD` tambien puede terminar reflejando posicion
- `MSG_POS_CHANGE` es una señal mas directa y liviana del cambio de postura

## Regla de implementacion recomendada

- agregar parser minimo con el layout fijo de 9 bytes
- usarlo para actualizar `state.field[key].position` sin tocar zona ni secuencia
- si la carta no existe aun en estado local, dejar que `MSG_UPDATE_CARD` o `MSG_UPDATE_DATA` la completen despues

## Estado de certeza

- confirmado por referencia y trazas: layout fijo de `9 bytes`
- confirmado: hoy no esta implementado
