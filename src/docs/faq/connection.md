## Connection

---

### WebRTC not supported.

This message should no longer appear: the game is server-centric and no longer opens
a peer-to-peer (WebRTC) connection between players. All game state, pointers and
asset messages are relayed by the game server, so browser WebRTC support, open UDP
ports and NAT hole punching are not required.

If players cannot see each other's changes, make sure everyone is pointing at the
same server address and that the server itself is reachable.
