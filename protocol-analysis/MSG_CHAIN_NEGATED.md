# MSG_CHAIN_NEGATED (0x4b / 75)

## Description
Enviado cuando una carta o efecto ha sido completamente negado en su activación (no confundir con `MSG_CHAIN_DISABLED` que sólo 'agrisa' el efecto). Un *Chain Negated* ocurre típicamente por *Counter Traps* como *Solemn Judgment* que niegan la conjuración misma.

## Payload / Buffer Structure
- `uint8_t` chain_index (El número del eslabón dentro del chain block actual que acaba de ser negado).

## Notes
Acompañado en el front-end con un símbolo visual de destrucción explosiva o una gran 'X' roja sobre ese eslabón en específico. Usualmente, a continuación vendrá un `MSG_MOVE` que mande esa carta desde el chain (SZONE/PZONE/MZONE o Mano) hacia el Cementerio.
