import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath("backend/app"))
sys.path.insert(0, os.path.abspath("backend"))

from argon2 import PasswordHasher
from sqlmodel import select
from core.database import get_session
from models.user import User
from models.sql_models import Space, SpaceMember, SpaceRole

ph = PasswordHasher()

async def update_access():
    async for session in get_session():
        # 1. Update password for animafestexperience@gmail.com
        res = await session.execute(select(User).where(User.username == "animafestexperience@gmail.com"))
        user_18 = res.scalar_one_or_none()
        if user_18:
            user_18.hashed_password = ph.hash("Animafest2026!")
            session.add(user_18)
            print("✓ Set direct password 'Animafest2026!' for animafestexperience@gmail.com")

        # 2. Grant Space access to Stas personal accounts (pepryk.stas@gmail.com and pepryks@gmail.com)
        for email in ["pepryk.stas@gmail.com", "pepryks@gmail.com"]:
            u_res = await session.execute(select(User).where(User.username == email))
            u = u_res.scalar_one_or_none()
            if u:
                m_res = await session.execute(select(SpaceMember).where(
                    SpaceMember.space_id == "0312404a-650b-4e4a-af30-a0660872650d",
                    SpaceMember.user_id == u.id
                ))
                existing_member = m_res.scalar_one_or_none()
                if not existing_member:
                    member = SpaceMember(
                        space_id="0312404a-650b-4e4a-af30-a0660872650d",
                        user_id=u.id,
                        role=SpaceRole.OWNER
                    )
                    session.add(member)
                    print(f"✓ Granted Space OWNER access to {email}")
                else:
                    print(f"✓ {email} is already a member of the space")

        await session.commit()
        break
    print("\n🎉 Access setup completed successfully!")

if __name__ == "__main__":
    asyncio.run(update_access())
