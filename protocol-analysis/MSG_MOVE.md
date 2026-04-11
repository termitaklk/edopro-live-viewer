# MSG_MOVE

## Identidad

- Nombre: `MSG_MOVE`
- Codigo: `0x32` (`50`)
- Direccion: `STOC_GAME_MSG`
- Rol: trasladar una carta entre zonas, incluyendo aparicion, salida, envio a cementerio, banish y movimientos entre mano/campo/deck

## Importancia

Este es uno de los mensajes mas importantes del protocolo porque describe cambios fisicos de ubicacion de cartas. En el viewer actual es la base de:

- movimientos al campo
- salidas del campo
- envios al grave
- parte de la sincronizacion de mano

## Variantes de payload

El parser actual soporta dos variantes:

1. `compact`
2. `extended`

La seleccion depende del `clientFlow`:

- `edopro`: intenta `compact` primero
- `mercury`: intenta `extended` primero

Referencia en [messageHandlers.js:683](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js:683)

## Layout `compact`

Referencia en [messageHandlers.js:603](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js:603)

Payload:

- `+0`: `uint32LE code`
- `+4`: `uint8 previousController`
- `+5`: `uint8 previousLocation`
- `+6`: `uint8 previousSequence`
- `+7`: `uint8 previousPosition`
- `+8`: `uint8 currentController`
- `+9`: `uint8 currentLocation`
- `+10`: `uint8 currentSequence`
- `+11`: `uint8 currentPosition`
- `+12`: `uint32LE reason`

Tamano minimo:

- `16 bytes` de payload

## Layout `extended`

Referencia en [messageHandlers.js:654](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js:654)

Usa `loc_info` para origen y destino.

`loc_info` en este proyecto se interpreta como:

- `uint8 controller`
- `uint8 location`
- `uint32LE sequence`
- `uint32LE position`

Referencia en [messageHandlers.js:279](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js:279)

Payload:

- `+0`: `uint32LE code`
- `+4`: `loc_info previous` (`10 bytes`)
- `+14`: `loc_info current` (`10 bytes`)
- `+24`: `uint32LE reason`

Tamano minimo:

- `28 bytes` de payload

Esto coincide con la referencia local en [EDOPRO_PROTOCOL_REFERENCE.md:438](/c:/Fix%20Mobile/visor/EDOPRO_PROTOCOL_REFERENCE.md:438).

## Ejemplos reales

### Ejemplo `compact`

Traza real en [message-trace-0a3ab068-2bd0-48d9-9d1e-225237a70741.txt:96](/c:/Fix%20Mobile/visor/logs/message-trace-0a3ab068-2bd0-48d9-9d1e-225237a70741.txt:96)

```text
SEG_HEX: 1200013273b4bf030002030a0004020100040002
```

Lectura del payload despues de `32`:

- `73b4bf03`: `code = 0x03BFB473`
- origen:
  - `00`: `previousController = 0`
  - `02`: `previousLocation = 0x02`
  - `03`: `previousSequence = 3`
  - `0a`: `previousPosition = 0x0A`
- destino:
  - `00`: `currentController = 0`
  - `04`: `currentLocation = 0x04`
  - `02`: `currentSequence = 2`
  - `01`: `currentPosition = 0x01`
- `00040002`: `reason = 0x02000400`

Interpretacion alta:

- una carta se mueve desde mano a una zona del campo

### Ejemplo `extended`

Traza real en [message-trace-04788585-0380-4bc3-9333-c0caff6c2f82.txt:170](/c:/Fix%20Mobile/visor/logs/message-trace-04788585-0380-4bc3-9333-c0caff6c2f82.txt:170)

```text
SEG_HEX: 1e000132f929be040002030000000a0000000008020000000500000000040002
```

Lectura del payload despues de `32`:

- `f929be04`: `code = 0x04BE29F9`
- origen `loc_info`:
  - `00`: `previousController = 0`
  - `02`: `previousLocation = 0x02`
  - `03000000`: `previousSequence = 3`
  - `0a000000`: `previousPosition = 0x0A`
- destino `loc_info`:
  - `00`: `currentController = 0`
  - `08`: `currentLocation = 0x08`
  - `02000000`: `currentSequence = 2`
  - `05000000`: `currentPosition = 0x05`
- `00040002`: `reason = 0x02000400`

Interpretacion alta:

- el mismo tipo de movimiento puede venir con offsets anchos en `sequence` y `position`

## Parser actual

El parser publica un objeto normalizado con estos campos:

- `code`
- `previousController`
- `previousLocation`
- `previousSequence`
- `previousPosition`
- `currentController`
- `currentLocation`
- `currentSequence`
- `currentPosition`
- `reason`
- `parserVariant`

Referencia del handler en [messageHandlers.js:954](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js:954)

## Uso actual en el viewer

Bloque principal en [viewer.html:3140](/c:/Fix%20Mobile/visor/front-end/viewer.html:3140)

Comportamiento actual del viewer:

1. traduce el movimiento a una accion semantica con `classifyMoveAction`
2. elimina la carta previa del `state.field` si la encuentra
3. si el origen es mano, remueve una carta de `state.hands[previousController]`
4. si el destino es mano, puede agregar placeholder oculto
5. si el destino es grave (`0x10`), actualiza `state.graves`
6. si el destino es una celda visible del campo, coloca la carta en `state.field`
7. si el movimiento es `hand -> field`, dispara animacion

Dos reglas del viewer actual son especialmente importantes:

- `DECK -> HAND` no debe duplicarse si ya fue representado por `MSG_DRAW`
- cuando hay `moveCode`, se usa para resolver revelado y debug visual

La guard explicita contra duplicacion esta en [viewer.html:3191](/c:/Fix%20Mobile/visor/front-end/viewer.html:3191).

## Semantica observada

Segun la referencia local y las trazas:

- `previous.location == 0` suele indicar aparicion o nacimiento de carta
- `current.location == 0` suele indicar retirada o desaparicion
- `current.location == LOCATION_GRAVE` representa envio al cementerio
- `current.location == LOCATION_REMOVED` representa banish

La referencia local lo resume en [EDOPRO_PROTOCOL_REFERENCE.md:446](/c:/Fix%20Mobile/visor/EDOPRO_PROTOCOL_REFERENCE.md:446).

## Riesgos y dudas abiertas

- falta fijar un glosario cerrado de `location` y `position` para todas las zonas
- `reason` se preserva pero todavia no esta interpretado semanticamente en el viewer
- hay que confirmar si algunos flujos mixtos pueden cambiar de `compact` a `extended` dentro del mismo tipo de cliente
- algunas trazas muestran `code = 0`, asi que no siempre se debe asumir identidad real de carta

## Regla de implementacion recomendada

- tratar `MSG_MOVE` como fuente autoritativa para cambios de zona fisica
- normalizar siempre a una estructura unica antes de tocar UI
- no usar `MSG_MOVE` para duplicar robos que ya llegan por `MSG_DRAW`
- conservar `parserVariant` mientras seguimos investigando diferencias entre flujos
- documentar aparte el significado de `reason` cuando tengamos evidencia suficiente

## Estado de certeza

- confirmado: existen variantes `compact` y `extended`
- confirmado: el proyecto ya las normaliza a un mismo shape
- confirmado: `MSG_MOVE` es el mensaje central para movimientos entre zonas
- abierto: interpretacion exacta de `reason`
- abierto: mapa definitivo de todos los valores de `location` y `position`
