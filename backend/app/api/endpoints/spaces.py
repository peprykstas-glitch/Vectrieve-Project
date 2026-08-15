import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, delete as sql_delete, func

from models.sql_models import Space, ChatSession, ChatHistory, SpaceMember, SpaceRole
from models.document import Document, DocumentChunk
from models.schemas import (
    SpaceCreate, SpaceUpdate, SpaceRead, 
    SpaceMemberRead, SpaceMemberInvite, SpaceMemberRoleUpdate
)
from models.user import User
from core.database import get_session
from api.deps import get_current_user
from services.vector_service import get_vector_service

router = APIRouter()


@router.get("", response_model=List[SpaceRead])
async def list_spaces(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all spaces owned by or shared with the current user."""
    from models.sql_models import SpaceMember
    stmt = (
        select(Space)
        .outerjoin(SpaceMember, SpaceMember.space_id == Space.id)
        .where((SpaceMember.user_id == current_user.id) | (Space.user_id == current_user.id))
        .distinct()
        .order_by(Space.created_at.desc())
    )
    result = await session.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=SpaceRead, status_code=status.HTTP_201_CREATED)
async def create_space(
    body: SpaceCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new space."""
    llm_config_data = {}
    if body.llm_config:
        llm_config_data = body.llm_config.model_dump(exclude_unset=True)

    space = Space(
        id=str(uuid.uuid4()),
        name=body.name,
        system_prompt=body.system_prompt,
        user_id=current_user.id,
        **llm_config_data
    )
    session.add(space)
    
    from models.sql_models import SpaceMember, SpaceRole
    member = SpaceMember(
        space_id=space.id,
        user_id=current_user.id,
        role=SpaceRole.OWNER
    )
    session.add(member)

    await session.commit()
    await session.refresh(space)
    return space


@router.patch("/{space_id}", response_model=SpaceRead)
async def update_space(
    space_id: str,
    body: SpaceUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update space details."""
    from models.sql_models import SpaceMember, SpaceRole
    stmt = (
        select(Space)
        .join(SpaceMember)
        .where(Space.id == space_id)
        .where(SpaceMember.user_id == current_user.id)
        .where(SpaceMember.role.in_([SpaceRole.OWNER, SpaceRole.EDITOR]))
    )
    res = await session.execute(stmt)
    space = res.scalar_one_or_none()
    if not space:
        raise HTTPException(status_code=403, detail="Not authorized to update this space or space not found")

    if body.name is not None:
        space.name = body.name
    if body.system_prompt is not None:
        space.system_prompt = body.system_prompt
    if body.llm_config is not None:
        config_dict = body.llm_config.model_dump(exclude_unset=True)
        for k, v in config_dict.items():
            setattr(space, k, v)

    session.add(space)
    await session.commit()
    await session.refresh(space)
    return space


@router.delete("/{space_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_space(
    space_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a space and all its associated documents, vectors, and chat history."""
    from models.sql_models import SpaceMember, SpaceRole
    stmt = (
        select(Space)
        .join(SpaceMember)
        .where(Space.id == space_id)
        .where(SpaceMember.user_id == current_user.id)
        .where(SpaceMember.role == SpaceRole.OWNER)
    )
    res = await session.execute(stmt)
    space = res.scalar_one_or_none()
    if not space:
        raise HTTPException(status_code=403, detail="Not authorized to delete this space or space not found")

    # 1. Delete all documents, chunks, and vectors in this space
    doc_stmt = select(Document).where(Document.space_id == space_id)
    doc_res = await session.execute(doc_stmt)
    docs = doc_res.scalars().all()

    vs = get_vector_service()
    for doc in docs:
        if vs:
            try:
                vs.delete_file(doc.filename, doc.user_id, space_id=space_id)
            except Exception as e:
                print(f"⚠️ Vector deletion failed for '{doc.filename}' during space deletion: {e}")
        
        # Delete chunks for this document
        await session.execute(
            sql_delete(DocumentChunk).where(DocumentChunk.document_id == doc.id)
        )
        await session.delete(doc)

    # 2. Delete all chat sessions and history in this space
    sess_stmt = select(ChatSession).where(ChatSession.space_id == space_id)
    sess_res = await session.execute(sess_stmt)
    sessions = sess_res.scalars().all()

    for sess in sessions:
        await session.execute(
            sql_delete(ChatHistory).where(ChatHistory.session_id == sess.id)
        )
        await session.delete(sess)

    # 3. Delete SpaceMember records
    await session.execute(
        sql_delete(SpaceMember).where(SpaceMember.space_id == space_id)
    )

    # 4. Delete the Space itself
    await session.delete(space)
    await session.commit()
    return None


# --- Member Management Endpoints ---

def parse_space_role(role_input: str) -> SpaceRole:
    from models.sql_models import SpaceRole
    normalized = role_input.upper()
    if normalized == "OWNER":
        return SpaceRole.OWNER
    elif normalized == "EDITOR":
        return SpaceRole.EDITOR
    elif normalized == "VIEWER":
        return SpaceRole.VIEWER
    try:
        return SpaceRole(role_input)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid space role '{role_input}'")


@router.get("/{space_id}/members", response_model=List[SpaceMemberRead])
async def list_space_members(
    space_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all members of a space (accessible to any space member)."""
    from models.sql_models import SpaceMember
    # 1. Verify current user is a member of this space
    check_stmt = (
        select(SpaceMember)
        .where(SpaceMember.space_id == space_id)
        .where(SpaceMember.user_id == current_user.id)
    )
    c_res = await session.execute(check_stmt)
    if not c_res.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not authorized to view members of this space")

    # 2. Get all members joined with User table for username
    stmt = (
        select(SpaceMember, User.username)
        .join(User, SpaceMember.user_id == User.id)
        .where(SpaceMember.space_id == space_id)
        .order_by(SpaceMember.id.asc())
    )
    result = await session.execute(stmt)
    members_data = []
    for member_rec, username in result.all():
        role_val = member_rec.role.value if hasattr(member_rec.role, 'value') else str(member_rec.role)
        members_data.append(
            SpaceMemberRead(
                id=member_rec.id,
                space_id=member_rec.space_id,
                user_id=member_rec.user_id,
                username=username,
                role=role_val.upper()
            )
        )
    return members_data


@router.post("/{space_id}/members", response_model=SpaceMemberRead, status_code=status.HTTP_201_CREATED)
async def invite_space_member(
    space_id: str,
    body: SpaceMemberInvite,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Invite/add a user to a space with a role. Only space OWNER can invite members."""
    from models.sql_models import SpaceMember, SpaceRole
    # 1. Verify caller is OWNER of space
    owner_stmt = (
        select(SpaceMember)
        .where(SpaceMember.space_id == space_id)
        .where(SpaceMember.user_id == current_user.id)
        .where(SpaceMember.role == SpaceRole.OWNER)
    )
    o_res = await session.execute(owner_stmt)
    if not o_res.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Only space Owners can invite members")

    # 2. Find target user by username or email (case-insensitive & trimmed)
    target_identifier = body.username_or_email.strip().lower()
    user_stmt = select(User).where(func.lower(User.username) == target_identifier)
    u_res = await session.execute(user_stmt)
    target_user = u_res.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail=f"User '{body.username_or_email}' not found")

    # 3. Check if target user is already a member
    exist_stmt = (
        select(SpaceMember)
        .where(SpaceMember.space_id == space_id)
        .where(SpaceMember.user_id == target_user.id)
    )
    e_res = await session.execute(exist_stmt)
    if e_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"User '{target_user.username}' is already a member of this space")

    # 4. Create membership record
    new_role = parse_space_role(body.role)
    new_member = SpaceMember(
        space_id=space_id,
        user_id=target_user.id,
        role=new_role
    )
    session.add(new_member)
    await session.commit()
    await session.refresh(new_member)

    role_val = new_member.role.value if hasattr(new_member.role, 'value') else str(new_member.role)
    return SpaceMemberRead(
        id=new_member.id,
        space_id=new_member.space_id,
        user_id=new_member.user_id,
        username=target_user.username,
        role=role_val.upper()
    )


@router.put("/{space_id}/members/{user_id}", response_model=SpaceMemberRead)
async def update_member_role(
    space_id: str,
    user_id: int,
    body: SpaceMemberRoleUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update role of a space member. Only space OWNER can update roles."""
    from models.sql_models import SpaceMember, SpaceRole
    # 1. Verify caller is OWNER
    owner_stmt = (
        select(SpaceMember)
        .where(SpaceMember.space_id == space_id)
        .where(SpaceMember.user_id == current_user.id)
        .where(SpaceMember.role == SpaceRole.OWNER)
    )
    o_res = await session.execute(owner_stmt)
    if not o_res.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Only space Owners can update member roles")

    # 2. Get target member
    member_stmt = (
        select(SpaceMember, User.username)
        .join(User, SpaceMember.user_id == User.id)
        .where(SpaceMember.space_id == space_id)
        .where(SpaceMember.user_id == user_id)
    )
    m_res = await session.execute(member_stmt)
    row = m_res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Member not found in this space")

    member_rec, username = row
    target_new_role = parse_space_role(body.role)

    # 3. Guard: Prevent an Owner from demoting themselves when they are the sole Owner
    if member_rec.user_id == current_user.id and member_rec.role == SpaceRole.OWNER:
        if target_new_role != SpaceRole.OWNER:
            owners_stmt = (
                select(SpaceMember)
                .where(SpaceMember.space_id == space_id)
                .where(SpaceMember.role == SpaceRole.OWNER)
            )
            all_owners = (await session.execute(owners_stmt)).scalars().all()
            if len(all_owners) <= 1:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot demote yourself when you are the sole Owner of this space"
                )

    member_rec.role = target_new_role
    session.add(member_rec)
    await session.commit()
    await session.refresh(member_rec)

    role_val = member_rec.role.value if hasattr(member_rec.role, 'value') else str(member_rec.role)
    return SpaceMemberRead(
        id=member_rec.id,
        space_id=member_rec.space_id,
        user_id=member_rec.user_id,
        username=username,
        role=role_val.upper()
    )


@router.delete("/{space_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_space_member(
    space_id: str,
    user_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Remove a member from a space. Only space OWNER can remove members."""
    from models.sql_models import SpaceMember, SpaceRole
    # 1. Verify caller is OWNER
    owner_stmt = (
        select(SpaceMember)
        .where(SpaceMember.space_id == space_id)
        .where(SpaceMember.user_id == current_user.id)
        .where(SpaceMember.role == SpaceRole.OWNER)
    )
    o_res = await session.execute(owner_stmt)
    if not o_res.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Only space Owners can remove members")

    # 2. Get target member
    member_stmt = (
        select(SpaceMember)
        .where(SpaceMember.space_id == space_id)
        .where(SpaceMember.user_id == user_id)
    )
    m_res = await session.execute(member_stmt)
    target_member = m_res.scalar_one_or_none()
    if not target_member:
        raise HTTPException(status_code=404, detail="Member not found in this space")

    # Prevent owner from removing themselves if they are the sole owner
    if target_member.user_id == current_user.id:
        owners_stmt = (
            select(SpaceMember)
            .where(SpaceMember.space_id == space_id)
            .where(SpaceMember.role == SpaceRole.OWNER)
        )
        all_owners = (await session.execute(owners_stmt)).scalars().all()
        if len(all_owners) <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove yourself when you are the sole Owner of this space")

    await session.delete(target_member)
    await session.commit()
    return None


