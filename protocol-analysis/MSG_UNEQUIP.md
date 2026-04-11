# MSG_UNEQUIP

## Identidad

- Nombre: `MSG_UNEQUIP`
- Codigo: `0x5F` (`95`)
- Direccion: `STOC_GAME_MSG`
- Rol: eliminar el vinculo de equip existente

## Layout de referencia

Segun la referencia local:

- `+0`: `loc_info source`

Referencia en [EDOPRO_PROTOCOL_REFERENCE.md:504](/c:/Fix%20Mobile/visor/EDOPRO_PROTOCOL_REFERENCE.md:504)

## Evidencia local

En esta pasada no encontre una traza aislada de `MSG_UNEQUIP` dentro de `logs/`.

Por eso esta ficha se apoya en:

- referencia local
- simetria semantica con `MSG_EQUIP`

## Estado actual en el proyecto

No existe parser dedicado ni consumo especifico para `MSG_UNEQUIP` en:

- [messageHandlers.js](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js)
- [viewer.html](/c:/Fix%20Mobile/visor/front-end/viewer.html)

Hoy cae en `UNHANDLED`.

## Regla de implementacion recomendada

- agregar parser minimo para `loc_info source`
- al recibirlo, eliminar cualquier relacion de equip asociada a esa carta
- si el proyecto aun no modela enlaces de equip, al menos dejarlo logueado y probado

## Estado de certeza

- confirmado por referencia: payload basado en `loc_info source`
- abierto: variante compacta o extendida en trazas reales
