# MSG_EQUIP

## Identidad

- Nombre: `MSG_EQUIP`
- Codigo: `0x5D` (`93`)
- Direccion: `STOC_GAME_MSG`
- Rol: vincular una carta equipada con su objetivo

## Layout de referencia

Segun la referencia local:

- `+0`: `loc_info source`
- siguiente: `loc_info target`

Referencia en [EDOPRO_PROTOCOL_REFERENCE.md:498](/c:/Fix%20Mobile/visor/EDOPRO_PROTOCOL_REFERENCE.md:498)

## Variantes observadas

### Variante `extended`

Traza real en [message-trace-1cb6d25c-f90c-4a65-962e-f3c9ab4216da.txt:1211](/c:/Fix%20Mobile/visor/logs/message-trace-1cb6d25c-f90c-4a65-962e-f3c9ab4216da.txt:1211)

```text
SEG_HEX: 1600015d0108020000000500000001040200000001000000
```

Lectura despues de `5d`:

- source `loc_info`
  - `01`: controller
  - `08`: location
  - `02000000`: sequence `2`
  - `05000000`: position `5`
- target `loc_info`
  - `01`: controller
  - `04`: location
  - `02000000`: sequence `2`
  - `01000000`: position `1`

### Variante `compact`

Traza real en [message-trace-443e3028-accf-43d9-8e95-6bffa586e81f.txt:1186](/c:/Fix%20Mobile/visor/logs/message-trace-443e3028-accf-43d9-8e95-6bffa586e81f.txt:1186)

```text
SEG_HEX: 0a00015d0108040501040301
```

Lectura probable despues de `5d`:

- source compacto: `01 08 04 05`
- target compacto: `01 04 03 01`

Inferencia fuerte:

- en algunas trazas `MSG_EQUIP` tambien aparece en formato compacto con dos `loc_info` de `4 bytes`

## Estado actual en el proyecto

No existe parser dedicado ni consumo especifico para `MSG_EQUIP` en:

- [messageHandlers.js](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js)
- [viewer.html](/c:/Fix%20Mobile/visor/front-end/viewer.html)

Hoy cae en `UNHANDLED`.

## Relacion con otros mensajes

### `QUERY_EQUIP_CARD`

- la referencia local ya contempla `QUERY_EQUIP_CARD` como `loc_info`
- `MSG_EQUIP` es la señal de enlace inmediato, mientras `MSG_UPDATE_*` puede consolidarlo despues

### `MSG_UNEQUIP`

- `MSG_EQUIP` crea el vinculo
- `MSG_UNEQUIP` lo elimina

## Regla de implementacion recomendada

- soportar primero la variante `extended`
- agregar fallback a variante `compact` si las trazas siguen confirmandola
- modelar el enlace como relacion `source -> target`, sin asumir que ambas cartas cambian de zona

## Estado de certeza

- confirmado por referencia: `source loc_info + target loc_info`
- inferencia fuerte por trazas: existe tambien una variante compacta
- confirmado: hoy no esta implementado
