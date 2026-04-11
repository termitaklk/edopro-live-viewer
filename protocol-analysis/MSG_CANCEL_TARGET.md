# MSG_CANCEL_TARGET

## Identidad

- Nombre: `MSG_CANCEL_TARGET`
- Codigo: `0x61` (`97`)
- Direccion: `STOC_GAME_MSG`
- Rol: eliminar un vinculo de target entre dos cartas

## Layout de referencia

Segun la referencia local:

- `+0`: `loc_info source`
- siguiente: `loc_info target`

Referencia en [EDOPRO_PROTOCOL_REFERENCE.md:515](/c:/Fix%20Mobile/visor/EDOPRO_PROTOCOL_REFERENCE.md:515)

## Evidencia local

En esta pasada no encontre una traza aislada de `MSG_CANCEL_TARGET` dentro de `logs/`.

Por eso esta ficha se apoya en:

- referencia local
- simetria semantica con `MSG_CARD_TARGET`

## Estado actual en el proyecto

No existe parser dedicado ni consumo especifico para `MSG_CANCEL_TARGET` en:

- [messageHandlers.js](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js)
- [viewer.html](/c:/Fix%20Mobile/visor/front-end/viewer.html)

Hoy cae en `UNHANDLED`.

## Regla de implementacion recomendada

- parsear `source` y `target`
- eliminar la relacion de target correspondiente
- no alterar `field`, `grave` ni `hands`; solo el grafo de relaciones

## Estado de certeza

- confirmado por referencia: `source loc_info + target loc_info`
- abierto: evidencia de trazas locales
