import os
import sys
import asyncio

# Adjust python path to include app-backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app-backend")))

from sqlmodel import select
from core.database import get_session_factory
from models.user import User

async def make_admin(username: str):
    session_factory = get_session_factory()
    async with session_factory() as session:
        statement = select(User).where(User.username == username)
        result = await session.execute(statement)
        user = result.scalar_one_or_none()
        if not user:
            print(f"[FAIL] User '{username}' not found.")
            return False
        
        user.is_admin = True
        session.add(user)
        await session.commit()
        print(f"[OK] User '{username}' successfully promoted to Admin.")
        return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python make_admin.py <username>")
        sys.exit(1)
        
    username_to_promote = sys.argv[1]
    asyncio.run(make_admin(username_to_promote))
