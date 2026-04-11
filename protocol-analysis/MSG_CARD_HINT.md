# MSG_CARD_HINT (0xa0)

## Description
Añade indicadores visuales especiales o temporales a una carta en el campo, como contadores u oscurecimientos para señalar que sus efectos están negados.

## Payload / Buffer Structure
- `loc_info` info (estructura estándar de `controler`, `location`, `sequence` y a veces `position/overlay`)
- `uint8_t` chtype (tipo de indicio sobre la carta)
- `uint64_t` value (o `uint32_t`, dependiendo de compat_mode). Usado para valores contables.

## Card Hint Types (según `ocgapi_constants.h`)
- `CHINT_TURN (1)`: Añade un resalte temporal a la carta durante un número de turnos. Envía animación a la carta.
- `CHINT_CARD (2)`
- `CHINT_RACE (3)`
- `CHINT_ATTRIBUTE (4)`
- `CHINT_NUMBER (5)`
- `CHINT_DESC_ADD (6)`: Añade un `desc_hint` específico a la carta, mostrando texto que indica una restricción temporal o un bufo persistente en la hover UI.
- `CHINT_DESC_REMOVE (7)`: Elimina un `desc_hint` previo.
