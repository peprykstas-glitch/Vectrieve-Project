import json
from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Maps user_id -> list of active websockets
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            # Create a copy of the list to safely iterate in case of disconnections
            connections = self.active_connections[user_id].copy()
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Error sending WS message to {user_id}: {e}")
                    self.disconnect(connection, user_id)

manager = ConnectionManager()
