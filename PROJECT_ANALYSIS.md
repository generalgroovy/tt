# Hosting fix analysis

The previous compact upload could technically open a socket but did not prove the host-room path in its smoke test and did not clearly show players that hosting succeeded. This caused two usability failures: hosting appeared ambiguous, and clients had nothing useful to do while waiting.

The fix changes the lobby model:

- Creating a room returns an explicit `host-created` state.
- The UI displays `You are hosting`, room code, invite link, all detected links, player count, and room status.
- Non-host players see `Connected to host` and a waiting message.
- While room phase is `lobby`, every client runs a local single-player practice field.
- Host settings remain editable during lobby and broadcast to all players.
- Only the host can start the synchronized multiplayer run.
- The smoke test now covers the actual host-room path, friend join, configuration broadcast, and start transition.
