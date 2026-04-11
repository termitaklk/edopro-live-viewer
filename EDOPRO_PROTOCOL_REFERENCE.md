# EDOPro Protocol Reference

Base de referencia sacada del cliente `edopro-master` para no seguir adivinando mensajes en el visor.

Fuentes principales:
- `c:\Fix Mobile\edopro-master\gframe\network.h`
- `c:\Fix Mobile\edopro-master\gframe\ocgapi_constants.h`
- `c:\Fix Mobile\edopro-master\gframe\duelclient.cpp`
- `c:\Fix Mobile\edopro-master\gframe\core_utils.cpp`
- `c:\Fix Mobile\edopro-master\gframe\core_utils.h`
- `c:\Fix Mobile\edopro-master\gframe\bufferio.h`

## 0. Nombres base

- `CTOS` = `Client To Server`
- `STOC` = `Server To Client`

Y dentro de `STOC_GAME_MSG`, el payload real del duelo usa mensajes `MSG_*`.

## 1. Framing

En EDOPro LAN/TCP, cada paquete viene así:

1. `uint16 packet_len`
2. `packet_len` bytes de payload

Dentro del payload:

1. `uint8 pktType`
2. cuerpo del paquete

En `STOC_GAME_MSG (0x01)`, el cuerpo es otro stream:

1. `uint8 message`
2. payload específico del `MSG_*`

Referencia:
- `duelclient.cpp`: lectura de `packet_len`
- `netserver.cpp`: mismo framing del lado server

## 2. Compat vs non-compat

Hay dos formatos de duelo:

- `compat_mode = false`
  - formato EDOPro moderno
  - este es el que nos interesa como base sólida
- `compat_mode = true`
  - formato legacy
  - varios tamaños cambian

Punto clave:
- `loc_info` en non-compat usa `sequence` y `position` como `uint32`
- `loc_info` en compat usa `sequence` y `position` como `uint8`

Referencia:
- `core_utils.cpp`, `ReadLocInfo(...)`

## 3. Struct base importante

### `loc_info`

Non-compat:
- offset `+0`: `uint8 controller`
- offset `+1`: `uint8 location`
- offset `+2`: `uint32 sequence`
- offset `+6`: `uint32 position`
- tamaño lógico: `10 bytes`

Compat:
- offset `+0`: `uint8 controller`
- offset `+1`: `uint8 location`
- offset `+2`: `uint8 sequence`
- offset `+3`: `uint8 position`
- tamaño lógico: `4 bytes`

## 4. CTOS / STOC fijos

### CTOS ids

- `0x01` `CTOS_RESPONSE`
- `0x02` `CTOS_UPDATE_DECK`
- `0x03` `CTOS_HAND_RESULT`
- `0x04` `CTOS_TP_RESULT`
- `0x10` `CTOS_PLAYER_INFO`
- `0x11` `CTOS_CREATE_GAME`
- `0x12` `CTOS_JOIN_GAME`
- `0x13` `CTOS_LEAVE_GAME`
- `0x14` `CTOS_SURRENDER`
- `0x15` `CTOS_TIME_CONFIRM`
- `0x16` `CTOS_CHAT`
- `0x20` `CTOS_HS_TODUELIST`
- `0x21` `CTOS_HS_TOOBSERVER`
- `0x22` `CTOS_HS_READY`
- `0x23` `CTOS_HS_NOTREADY`
- `0x24` `CTOS_HS_KICK`
- `0x25` `CTOS_HS_START`
- `0xf0` `CTOS_REMATCH_RESPONSE`

### STOC ids

- `0x01` `STOC_GAME_MSG`
- `0x02` `STOC_ERROR_MSG`
- `0x03` `STOC_SELECT_HAND`
- `0x04` `STOC_SELECT_TP`
- `0x05` `STOC_HAND_RESULT`
- `0x06` `STOC_TP_RESULT`
- `0x07` `STOC_CHANGE_SIDE`
- `0x08` `STOC_WAITING_SIDE`
- `0x11` `STOC_CREATE_GAME`
- `0x12` `STOC_JOIN_GAME`
- `0x13` `STOC_TYPE_CHANGE`
- `0x14` `STOC_LEAVE_GAME`
- `0x15` `STOC_DUEL_START`
- `0x16` `STOC_DUEL_END`
- `0x17` `STOC_REPLAY`
- `0x18` `STOC_TIME_LIMIT`
- `0x19` `STOC_CHAT`
- `0x20` `STOC_HS_PLAYER_ENTER`
- `0x21` `STOC_HS_PLAYER_CHANGE`
- `0x22` `STOC_HS_WATCH_CHANGE`
- `0x30` `STOC_NEW_REPLAY`
- `0xf0` `STOC_CATCHUP`
- `0xf1` `STOC_REMATCH`
- `0xf2` `STOC_WAITING_REMATCH`
- `0xf3` `STOC_CHAT_2`

### STOC payloads fijos útiles

#### `STOC_CREATE_GAME (0x11)`
- offset `+0`: `uint32 gameid`

#### `STOC_TYPE_CHANGE (0x13)`
- offset `+0`: `uint8 type`
- nibble bajo: tipo propio / slot
- nibble alto: host flag

#### `STOC_TIME_LIMIT (0x18)`
- offset `+0`: `uint8 player`
- offset `+1`: `uint16 left_time`

#### `STOC_HS_PLAYER_ENTER (0x20)`
- offset `+0`: `uint16 name[20]`
- offset `+40`: `uint8 pos`

#### `STOC_HS_PLAYER_CHANGE (0x21)`
- offset `+0`: `uint8 status`
- `pos = status >> 4`
- `state = status & 0x0f`

#### `STOC_HS_WATCH_CHANGE (0x22)`
- offset `+0`: `uint16 watch_count`

### STOC payloads grandes

#### `STOC_JOIN_GAME (0x12)`

Lleva `HostInfo info`.

Orden lógico de campos:
- `uint32 lflist`
- `uint8 rule`
- `uint8 mode`
- `uint8 duel_rule`
- `uint8 no_check_deck_content`
- `uint8 no_shuffle_deck`
- `uint32 start_lp`
- `uint8 start_hand`
- `uint8 draw_count`
- `uint16 time_limit`
- `uint32 duel_flag_high`
- `uint32 handshake`
- `ClientVersion version`
- `int32 team1`
- `int32 team2`
- `int32 best_of`
- `uint32 duel_flag_low`
- `uint32 forbiddentypes`
- `uint16 extra_rules`
- `DeckSizes sizes`

Importante:
- `duelclient.cpp` lo parsea con `BufferIO::getStruct<STOC_JoinGame>()`
- eso copia por `memcpy`, no por lectura campo a campo
- para análisis del visor, usa el orden lógico anterior, no `sizeof(struct)` como verdad absoluta entre clientes distintos

## 5. Query stream real de EDOPro

Esto es crítico para `MSG_UPDATE_DATA` y `MSG_UPDATE_CARD`.

Formato non-compat:

Repetición de bloques:
- `uint16 size`
- `uint32 flag`
- `payload según flag`

Termina con:
- `flag == QUERY_END`

Caso especial:
- si `size == 0`, `onfield_skipped = true`

### Flags `QUERY_*`

- `0x00000001` `QUERY_CODE`
- `0x00000002` `QUERY_POSITION`
- `0x00000004` `QUERY_ALIAS`
- `0x00000008` `QUERY_TYPE`
- `0x00000010` `QUERY_LEVEL`
- `0x00000020` `QUERY_RANK`
- `0x00000040` `QUERY_ATTRIBUTE`
- `0x00000080` `QUERY_RACE`
- `0x00000100` `QUERY_ATTACK`
- `0x00000200` `QUERY_DEFENSE`
- `0x00000400` `QUERY_BASE_ATTACK`
- `0x00000800` `QUERY_BASE_DEFENSE`
- `0x00001000` `QUERY_REASON`
- `0x00002000` `QUERY_REASON_CARD`
- `0x00004000` `QUERY_EQUIP_CARD`
- `0x00008000` `QUERY_TARGET_CARD`
- `0x00010000` `QUERY_OVERLAY_CARD`
- `0x00020000` `QUERY_COUNTERS`
- `0x00040000` `QUERY_OWNER`
- `0x00080000` `QUERY_STATUS`
- `0x00100000` `QUERY_IS_PUBLIC`
- `0x00200000` `QUERY_LSCALE`
- `0x00400000` `QUERY_RSCALE`
- `0x00800000` `QUERY_LINK`
- `0x01000000` `QUERY_IS_HIDDEN`
- `0x02000000` `QUERY_COVER`
- `0x80000000` `QUERY_END`

### Tamaños por flag en non-compat

Valores simples:
- `QUERY_OWNER`, `QUERY_IS_PUBLIC`, `QUERY_IS_HIDDEN`: `1 byte`
- `QUERY_CODE`, `QUERY_POSITION`, `QUERY_ALIAS`, `QUERY_TYPE`, `QUERY_LEVEL`, `QUERY_RANK`, `QUERY_ATTRIBUTE`, `QUERY_ATTACK`, `QUERY_DEFENSE`, `QUERY_BASE_ATTACK`, `QUERY_BASE_DEFENSE`, `QUERY_REASON`, `QUERY_STATUS`, `QUERY_LSCALE`, `QUERY_RSCALE`, `QUERY_COVER`: `4 bytes`
- `QUERY_RACE`: `8 bytes`

Estructuras:
- `QUERY_REASON_CARD`: `loc_info` -> `10 bytes`
- `QUERY_EQUIP_CARD`: `loc_info` -> `10 bytes`
- `QUERY_TARGET_CARD`: `uint32 count` + `count * 10`
- `QUERY_OVERLAY_CARD`: `uint32 count` + `count * 4`
- `QUERY_COUNTERS`: `uint32 count` + `count * 4`
- `QUERY_LINK`: `uint32 link` + `uint32 link_marker`

Referencia:
- `core_utils.cpp`, `Query::Parse()` y `Query::GetFlagSize()`

## 6. GAME_MSG ids

Listado base definido por EDOPro:

- `1` `MSG_RETRY`
- `2` `MSG_HINT`
- `3` `MSG_WAITING`
- `4` `MSG_START`
- `5` `MSG_WIN`
- `6` `MSG_UPDATE_DATA`
- `7` `MSG_UPDATE_CARD`
- `8` `MSG_REQUEST_DECK`
- `10` `MSG_SELECT_BATTLECMD`
- `11` `MSG_SELECT_IDLECMD`
- `12` `MSG_SELECT_EFFECTYN`
- `13` `MSG_SELECT_YESNO`
- `14` `MSG_SELECT_OPTION`
- `15` `MSG_SELECT_CARD`
- `16` `MSG_SELECT_CHAIN`
- `18` `MSG_SELECT_PLACE`
- `19` `MSG_SELECT_POSITION`
- `20` `MSG_SELECT_TRIBUTE`
- `21` `MSG_SORT_CHAIN`
- `22` `MSG_SELECT_COUNTER`
- `23` `MSG_SELECT_SUM`
- `24` `MSG_SELECT_DISFIELD`
- `25` `MSG_SORT_CARD`
- `26` `MSG_SELECT_UNSELECT_CARD`
- `30` `MSG_CONFIRM_DECKTOP`
- `31` `MSG_CONFIRM_CARDS`
- `32` `MSG_SHUFFLE_DECK`
- `33` `MSG_SHUFFLE_HAND`
- `34` `MSG_REFRESH_DECK`
- `35` `MSG_SWAP_GRAVE_DECK`
- `36` `MSG_SHUFFLE_SET_CARD`
- `37` `MSG_REVERSE_DECK`
- `38` `MSG_DECK_TOP`
- `39` `MSG_SHUFFLE_EXTRA`
- `40` `MSG_NEW_TURN`
- `41` `MSG_NEW_PHASE`
- `42` `MSG_CONFIRM_EXTRATOP`
- `50` `MSG_MOVE`
- `53` `MSG_POS_CHANGE`
- `54` `MSG_SET`
- `55` `MSG_SWAP`
- `56` `MSG_FIELD_DISABLED`
- `60` `MSG_SUMMONING`
- `61` `MSG_SUMMONED`
- `62` `MSG_SPSUMMONING`
- `63` `MSG_SPSUMMONED`
- `64` `MSG_FLIPSUMMONING`
- `65` `MSG_FLIPSUMMONED`
- `70` `MSG_CHAINING`
- `71` `MSG_CHAINED`
- `72` `MSG_CHAIN_SOLVING`
- `73` `MSG_CHAIN_SOLVED`
- `74` `MSG_CHAIN_END`
- `75` `MSG_CHAIN_NEGATED`
- `76` `MSG_CHAIN_DISABLED`
- `80` `MSG_CARD_SELECTED`
- `81` `MSG_RANDOM_SELECTED`
- `83` `MSG_BECOME_TARGET`
- `90` `MSG_DRAW`
- `91` `MSG_DAMAGE`
- `92` `MSG_RECOVER`
- `93` `MSG_EQUIP`
- `94` `MSG_LPUPDATE`
- `95` `MSG_UNEQUIP`
- `96` `MSG_CARD_TARGET`
- `97` `MSG_CANCEL_TARGET`
- `100` `MSG_PAY_LPCOST`
- `101` `MSG_ADD_COUNTER`
- `102` `MSG_REMOVE_COUNTER`
- `110` `MSG_ATTACK`
- `111` `MSG_BATTLE`
- `112` `MSG_ATTACK_DISABLED`
- `113` `MSG_DAMAGE_STEP_START`
- `114` `MSG_DAMAGE_STEP_END`
- `120` `MSG_MISSED_EFFECT`
- `121` `MSG_BE_CHAIN_TARGET`
- `122` `MSG_CREATE_RELATION`
- `123` `MSG_RELEASE_RELATION`
- `130` `MSG_TOSS_COIN`
- `131` `MSG_TOSS_DICE`
- `132` `MSG_ROCK_PAPER_SCISSORS`
- `133` `MSG_HAND_RES`
- `140` `MSG_ANNOUNCE_RACE`
- `141` `MSG_ANNOUNCE_ATTRIB`
- `142` `MSG_ANNOUNCE_CARD`
- `143` `MSG_ANNOUNCE_NUMBER`
- `160` `MSG_CARD_HINT`
- `161` `MSG_TAG_SWAP`
- `162` `MSG_RELOAD_FIELD`
- `163` `MSG_AI_NAME`
- `164` `MSG_SHOW_HINT`
- `165` `MSG_PLAYER_HINT`
- `170` `MSG_MATCH_KILL`
- `180` `MSG_CUSTOM_MSG`
- `190` `MSG_REMOVE_CARDS`

## 7. GAME_MSG relevantes para el visor

Esto está en formato:
- `offset`
- `tipo`
- significado

Offsets contados desde el byte inmediatamente después del `message`.

### `MSG_START (4)`

Layout:
- `+0`: `uint8 playertype`
- `+1`: `uint8 duel_rule` solo en `compat_mode`
- `+1/+2`: `uint32 lp0`
- siguiente: `uint32 lp1`
- siguiente: `uint16 deck_count_p0`
- siguiente: `uint16 extra_count_p0`
- siguiente: `uint16 deck_count_p1`
- siguiente: `uint16 extra_count_p1`

Notas:
- el cliente llama `dField.Initial(player, deckc, extrac)`
- aquí no llegan las manos iniciales; luego se reconstruyen por `MSG_DRAW`

### `MSG_UPDATE_DATA (6)`

Layout:
- `+0`: `uint8 player`
- `+1`: `uint8 location`
- `+2...`: `QueryStream`

No tiene tamaño fijo.

Uso real:
- snapshot/refresh de una zona completa
- el `QueryStream` puede traer múltiples cartas
- para reconstrucción sólida del visor, este mensaje debe tratarse como estado autoritativo de la zona

### `MSG_UPDATE_CARD (7)`

Layout:
- `+0`: `uint8 player`
- `+1`: `uint8 location`
- `+2`: `uint8 sequence`
- `+3...`: `Query`

No tiene tamaño fijo.

Uso real:
- actualiza una sola carta
- ideal para refrescar `code`, `position`, `status`, etc.

### `MSG_SHUFFLE_HAND (33)`

Layout:
- `+0`: `uint8 player`
- `+1`: `count` con `CompatRead<uint8_t, uint32_t>`
- siguiente: `count * uint32 code`

Notas:
- EDOPro sí recibe los `code` de la nueva mano tras el shuffle
- por eso el visor puede y debe usar este mensaje como fuente real del nuevo orden/contenido

### `MSG_NEW_TURN (40)`

Layout:
- `+0`: `uint8 player`

### `MSG_NEW_PHASE (41)`

Layout:
- `+0`: `uint16 phase`

Fases:
- `0x01` `DRAW`
- `0x02` `STANDBY`
- `0x04` `MAIN1`
- `0x08` `BATTLE_START`
- `0x10` `BATTLE_STEP`
- `0x20` `DAMAGE`
- `0x40` `DAMAGE_CAL`
- `0x80` `BATTLE`
- `0x100` `MAIN2`
- `0x200` `END`

### `MSG_MOVE (50)`

Layout non-compat:
- `+0`: `uint32 code`
- `+4`: `loc_info previous` (`10 bytes`)
- `+14`: `loc_info current` (`10 bytes`)
- `+24`: `uint32 reason`

Total payload non-compat:
- `28 bytes` después del byte `message`

Semántica:
- si `previous.location == 0`: la carta nace/aparece
- si `current.location == 0`: la carta se elimina del board
- si `current.location == LOCATION_GRAVE`: va a cementerio
- si `current.location == LOCATION_REMOVED`: va a banished

Este es el mensaje más importante para movimientos.

### `MSG_POS_CHANGE (53)`

Layout:
- `+0`: `uint32 code`
- `+4`: `uint8 controller`
- `+5`: `uint8 location`
- `+6`: `uint8 sequence`
- `+7`: `uint8 previous_position`
- `+8`: `uint8 current_position`

### `MSG_DRAW (90)`

Layout:
- `+0`: `uint8 player`
- `+1`: `count` con `CompatRead<uint8_t, uint32_t>`
- por cada carta:
  - `uint32 code`
  - non-compat además lee `uint32 position`

Notas:
- en non-compat moderno, por carta son `8 bytes`
- el cliente mueve cartas desde deck a hand inmediatamente después

### `MSG_DAMAGE (91)`

Layout:
- `+0`: `uint8 player`
- `+1`: `uint32 amount`

### `MSG_RECOVER (92)`

Layout:
- `+0`: `uint8 player`
- `+1`: `uint32 amount`

### `MSG_LPUPDATE (94)`

Layout:
- `+0`: `uint8 player`
- `+1`: `uint32 new_lp`

### `MSG_EQUIP (93)`

Layout:
- `+0`: `loc_info source`
- siguiente: `loc_info target`

### `MSG_UNEQUIP (95)`

Layout:
- `+0`: `loc_info source`

### `MSG_CARD_TARGET (96)`

Layout:
- `+0`: `loc_info source`
- siguiente: `loc_info target`

### `MSG_CANCEL_TARGET (97)`

Layout:
- `+0`: `loc_info source`
- siguiente: `loc_info target`

## 8. Lobby / waiting flow real

Mensajes de lobby que sí usa EDOPro:

- `STOC_JOIN_GAME`
  - llena datos de sala
- `STOC_TYPE_CHANGE`
  - define si eres duelista, observer, host
- `STOC_HS_PLAYER_ENTER`
  - entra jugador a un slot
- `STOC_HS_PLAYER_CHANGE`
  - `ready`, `not ready`, `leave`, `observe` o mover slot
- `STOC_HS_WATCH_CHANGE`
  - cambia cantidad de espectadores
- `STOC_DUEL_START`
  - cierra lobby y entra al duelo

`status` de `STOC_HS_PLAYER_CHANGE`:
- `pos = status >> 4`
- `state = status & 0x0f`

El cliente distingue:
- `state < 8`: mover jugador a otro slot
- `PLAYERCHANGE_READY`
- `PLAYERCHANGE_NOTREADY`
- `PLAYERCHANGE_LEAVE`
- `PLAYERCHANGE_OBSERVE`

## 9. Conclusión práctica para el visor

Para rehacer el parser del viewer con base sólida:

1. Tratar `STOC_JOIN_GAME`, `TYPE_CHANGE`, `HS_PLAYER_*`, `HS_WATCH_CHANGE`, `DUEL_START`, `TIME_LIMIT` como capa fija de lobby/room.
2. Tratar `STOC_GAME_MSG` como stream de replay/eventos.
3. Dentro de `GAME_MSG`, usar `duelclient.cpp` como autoridad de offsets.
4. Para `UPDATE_DATA` y `UPDATE_CARD`, no asumir offsets fijos de carta:
   - siempre parsear `Query/QueryStream`
   - respetando `flag -> tamaño`
5. Para EDOPro moderno, usar `loc_info non-compat` de `10 bytes`.

## 10. Mensajes prioritarios para reconstrucción estable

Si vamos a rehacer el visor con base robusta, los mensajes prioritarios son:

- `MSG_START`
- `MSG_UPDATE_DATA`
- `MSG_UPDATE_CARD`
- `MSG_MOVE`
- `MSG_POS_CHANGE`
- `MSG_DRAW`
- `MSG_SHUFFLE_HAND`
- `MSG_NEW_TURN`
- `MSG_NEW_PHASE`
- `MSG_DAMAGE`
- `MSG_RECOVER`
- `MSG_LPUPDATE`
- `MSG_EQUIP`
- `MSG_UNEQUIP`
- `MSG_CARD_TARGET`
- `MSG_CANCEL_TARGET`
- `MSG_RELOAD_FIELD`

Con solo esa capa bien implementada, el visor ya debería reconstruir mucho mejor un duelo EDOPro.
