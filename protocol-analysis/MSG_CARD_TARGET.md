# MSG_CARD_TARGET

## Identidad

- Nombre: `MSG_CARD_TARGET`
- Codigo: `0x60` (`96`)
- Direccion: `STOC_GAME_MSG`
- Rol: registrar que una carta pasa a apuntar a otra carta

## Layout de referencia

Segun la referencia local:

- `+0`: `loc_info source`
- siguiente: `loc_info target`

Referencia en [EDOPRO_PROTOCOL_REFERENCE.md:509](/c:/Fix%20Mobile/visor/EDOPRO_PROTOCOL_REFERENCE.md:509)

## Ejemplo real

Traza real en [message-trace-04788585-0380-4bc3-9333-c0caff6c2f82.txt:4412](/c:/Fix%20Mobile/visor/logs/message-trace-04788585-0380-4bc3-9333-c0caff6c2f82.txt:4412)

```text
SEG_HEX: 160001600108030000000500000001040100000001000000
```

Lectura despues de `60`:

- source `loc_info`
  - `01`: controller
  - `08`: location
  - `03000000`: sequence `3`
  - `05000000`: position `5`
- target `loc_info`
  - `01`: controller
  - `04`: location
  - `01000000`: sequence `1`
  - `01000000`: position `1`

Interpretacion alta:

- una carta en source esta apuntando/seleccionando a la carta target

## Estado actual en el proyecto

No existe parser dedicado ni consumo especifico para `MSG_CARD_TARGET` en:

- [messageHandlers.js](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js)
- [viewer.html](/c:/Fix%20Mobile/visor/front-end/viewer.html)

Hoy cae en `UNHANDLED`.

## Relacion con otros mensajes

### `MSG_CANCEL_TARGET`

- `MSG_CARD_TARGET` crea el vinculo
- `MSG_CANCEL_TARGET` lo remueve

### `QUERY_TARGET_CARD`

- el parser ya conoce `QUERY_TARGET_CARD` dentro de `parseQueryBlockPayload`
- `MSG_CARD_TARGET` es la señal incremental inmediata del mismo concepto

## Regla de implementacion recomendada

- parsear `source` y `target`
- modelar enlaces de target por separado del estado base de las cartas
- permitir overlay visual futuro sin mezclarlo con `field` ni `move`

## Estado de certeza

- confirmado por referencia y trazas: `source loc_info + target loc_info`
- confirmado: hoy no esta implementado
