from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from core.database import get_session_factory
from core.security import verify_access_token
from services.ws_manager import manager
from sqlmodel import select
from models.user import User

router = APIRouter()

@router.websocket("/")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    user_id = None
    try:
        # Verify token
        payload = verify_access_token(token)
        user_email: str = payload.get("sub")
        if user_email is None:
            await websocket.close(code=1008, reason="Invalid token payload")
            return
            
        session_factory = get_session_factory()
        async with session_factory() as session:
            stmt = select(User).where(User.email == user_email)
            result = await session.execute(stmt)
            user = result.scalar_one_or_none()
            if not user:
                await websocket.close(code=1008, reason="User not found")
                return
            user_id = user.id

        await manager.connect(websocket, user_id)
        
        while True:
            # We don't expect messages from the client right now,
            # but we need to keep the connection open and listen for disconnects
            data = await websocket.receive_text()
            
    except WebSocketDisconnect:
        if user_id:
            manager.disconnect(websocket, user_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        if user_id:
            manager.disconnect(websocket, user_id)
        try:
            await websocket.close(code=1011)
        except:
            pass
