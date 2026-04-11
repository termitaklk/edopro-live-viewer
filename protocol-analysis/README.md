# Protocol Analysis

Estado del trabajo de documentacion tecnica por mensaje.

## Documentados

- [MSG_START](/c:/Fix%20Mobile/visor/protocol-analysis/MSG_START.md)
- [MSG_NEW_TURN](/c:/Fix%20Mobile/visor/protocol-analysis/MSG_NEW_TURN.md)
- [MSG_NEW_PHASE](/c:/Fix%20Mobile/visor/protocol-analysis/MSG_NEW_PHASE.md)
- [MSG_DRAW](/c:/Fix%20Mobile/visor/protocol-analysis/MSG_DRAW.md)
- [MSG_MOVE](/c:/Fix%20Mobile/visor/protocol-analysis/MSG_MOVE.md)
- [MSG_UPDATE_CARD](/c:/Fix%20Mobile/visor/protocol-analysis/MSG_UPDATE_CARD.md)
- [MSG_UPDATE_DATA](/c:/Fix%20Mobile/visor/protocol-analysis/MSG_UPDATE_DATA.md)
- [MSG_SHUFFLE_HAND](/c:/Fix%20Mobile/visor/protocol-analysis/MSG_SHUFFLE_HAND.md)
- [MSG_SHUFFLE_DECK](/c:/Fix%20Mobile/visor/protocol-analysis/MSG_SHUFFLE_DECK.md)
- [MSG_CONFIRM_CARDS](/c:/Fix%20Mobile/visor/protocol-analysis/MSG_CONFIRM_CARDS.md)
- [MSG_RELOAD_FIELD](/c:/Fix%20Mobile/visor/protocol-analysis/MSG_RELOAD_FIELD.md)
- [MSG_POS_CHANGE](/c:/Fix%20Mobile/visor/protocol-analysis/MSG_POS_CHANGE.md)
- [MSG_EQUIP](/c:/Fix%20Mobile/visor/protocol-analysis/MSG_EQUIP.md)
- [MSG_UNEQUIP](/c:/Fix%20Mobile/visor/protocol-analysis/MSG_UNEQUIP.md)
- [MSG_CARD_TARGET](/c:/Fix%20Mobile/visor/protocol-analysis/MSG_CARD_TARGET.md)
- [MSG_CANCEL_TARGET](/c:/Fix%20Mobile/visor/protocol-analysis/MSG_CANCEL_TARGET.md)
- [MSG_CONFIRM_DECKTOP](/c:/Fix%20Mobile/visor/protocol-analysis/MSG_CONFIRM_DECKTOP.md)
- [MSG_CHAINING](/c:/Fix%20Mobile/visor/protocol-analysis/MSG_CHAINING.md)
- [MSG_CHAINED](/c:/Fix%20Mobile/visor/protocol-analysis/MSG_CHAINED.md)
- [MSG_CHAIN_SOLVING](/c:/Fix%20Mobile/visor/protocol-analysis/MSG_CHAIN_SOLVING.md)
- [MSG_CHAIN_SOLVED](/c:/Fix%20Mobile/visor/protocol-analysis/MSG_CHAIN_SOLVED.md)
- [MSG_CHAIN_END](/c:/Fix%20Mobile/visor/protocol-analysis/MSG_CHAIN_END.md)
- [MSG_ATTACK](/c:/Fix%20Mobile/visor/protocol-analysis/MSG_ATTACK.md)
- [MSG_BATTLE](/c:/Fix%20Mobile/visor/protocol-analysis/MSG_BATTLE.md)
- [MSG_DAMAGE](/c:/Fix%20Mobile/visor/protocol-analysis/MSG_DAMAGE.md)
- [MSG_RECOVER](/c:/Fix%20Mobile/visor/protocol-analysis/MSG_RECOVER.md)
- [MSG_LPUPDATE](/c:/Fix%20Mobile/visor/protocol-analysis/MSG_LPUPDATE.md)

## Orden recomendado para seguir

Bloque de cadena y batalla ya documentado.

Siguientes candidatos naturales si seguimos ampliando cobertura:

1. `MSG_ATTACK_DISABLED`
2. `MSG_SELECT_BATTLECMD`
3. `MSG_SELECT_IDLECMD`
4. `MSG_HINT`
5. `MSG_WIN`
6. `MSG_TAG_SWAP`

## Criterio de cada ficha

Cada mensaje deberia documentar:

- identidad y codigo
- layout binario
- ejemplo real de traza si existe
- parser actual
- uso actual en el viewer
- relacion con otros mensajes
- riesgos y dudas abiertas
- regla de implementacion recomendada
