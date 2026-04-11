# MSG_CHAIN_DISABLED (0x4c)

## Description
Indica que un eslabón de la cadena (Chain Link) ha sido desactivado/negado (generalmente la activación ha sido negada por cartas como *Solemn Strike* o *Ash Blossom*). 

## Payload / Buffer Structure
- `uint8_t` chain_index (Cuál eslabón del chain fue el que se ha desactivado).

## Notes
A nivel de UI, esto generalmente se acompaña de una animación donde el ícono de la cadena se vuelve gris o rompe un eslabón.
