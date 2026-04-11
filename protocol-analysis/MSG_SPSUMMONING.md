# MSG_SPSUMMONING (0x3e) / MSG_SPSUMMONED (0x3f)

## Description
Funciona exactamente igual que `MSG_SUMMONING` y `MSG_SUMMONED`, pero se difiere en que se trata estrictamente de **Invocaciones Especiales** (Special Summons) en todo su abanico de posibilidades (Synchro, XYZ, Link, Pendulum, mecánicas inherentes, o efectos de monstruos/magias/trampas).

## Payload / Buffer Structure (SPSUMMONING)
- `uint32_t` code
- `loc_info` info (`controler`, `location`, `sequence`, `position`)

## Payload / Buffer Structure (SPSUMMONED)
- Ninguno. Confirmación de éxito.
