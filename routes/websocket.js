const WebSocket = require('ws');

const rooms = {}; // roomId -> [ws1, ws2]

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', function connection(ws) {
    let currentRoomId = null;
    let playerId = null;
    ws.on('message', function incoming(message) {
      let data = {};
      try {
        data = JSON.parse(message);
      } catch (e) {
        return;
      }

      if (data.type === 'join') {
        const roomId = data.roomId;
        currentRoomId = roomId;

        if (!rooms[roomId]) {
          rooms[roomId] = { players: [] };
        }
        const room = rooms[roomId];
        if (!room.players[1]) {
          playerId = 1;
          room.players[1] = ws;
        } else if (!room.players[2]) {
          playerId = 2;
          room.players[2] = ws;
        } else {
          ws.send(JSON.stringify({ type: 'error', message: '房间已满' }));
          return;
        }
        ws.send(JSON.stringify({ type: 'joinSuccess', player: playerId }));

        if (room.players[1] && room.players[2]) {
          room.players.forEach((client) => {
            client.send(
              JSON.stringify({
                type: 'start',
              })
            );
          });
        }
      }

      if (data.type === 'move' && rooms[currentRoomId]) {
        rooms[currentRoomId].players.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: 'move',
                from: data.from,
                to: data.to,
              })
            );
          }
        });
      }
      if (data.type === 'ping' && rooms[currentRoomId]) {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    });

    ws.on('close', () => {
      if (currentRoomId && rooms[currentRoomId]) {
        const room = rooms[currentRoomId];

        if (Object.keys(room.players).length === 0) {
          delete rooms[currentRoomId]; // 清除空房间
        } else {
          rooms[currentRoomId].players.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'opponentDisConnect' }));
            }
          });
        }
        if (playerId) {
          delete room.players[playerId];
        }
      }
    });
  });
}

module.exports = { setupWebSocket };
