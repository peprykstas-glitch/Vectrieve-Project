import pytest
from httpx import AsyncClient
from sqlmodel import select
from models.sql_models import Space, SpaceMember, SpaceRole
from models.document import Document


@pytest.mark.anyio
async def test_spacemember_alembic_migration_exists():
    """Verifies that the Alembic migration for SpaceMember exists and has
    both upgrade() and downgrade() functions."""
    import importlib.util
    from pathlib import Path

    migration_path = (
        Path(__file__).resolve().parent.parent
        / "alembic" / "versions" / "a1b2c3d4e5f6_add_spacemember_table.py"
    )
    assert migration_path.exists(), f"Migration file not found: {migration_path}"

    spec = importlib.util.spec_from_file_location("migration_mod", migration_path)
    migration_mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration_mod)

    assert hasattr(migration_mod, 'upgrade')
    assert hasattr(migration_mod, 'downgrade')
    assert migration_mod.down_revision == '31dcc69db8de'


@pytest.mark.anyio
async def test_spacemember_orm_creation(test_session, test_user):
    """Verifies SpaceMember can be created via ORM (the unit-level check
    that init_db scan-and-seed was replaced with Alembic data migration)."""
    space = Space(id="orm-creation-test", name="ORM Test Space", user_id=test_user.id)
    test_session.add(space)
    await test_session.commit()

    member = SpaceMember(
        space_id=space.id,
        user_id=test_user.id,
        role=SpaceRole.OWNER,
    )
    test_session.add(member)
    await test_session.commit()

    stmt = select(SpaceMember).where(SpaceMember.space_id == space.id)
    res = await test_session.execute(stmt)
    loaded = res.scalar_one()
    assert loaded.user_id == test_user.id
    assert loaded.role == SpaceRole.OWNER


@pytest.mark.anyio
async def test_spaces_endpoints_rbac(client: AsyncClient, test_session, test_user, test_user_2):
    """Tests CRUD operations and role-based access control for spaces endpoints."""
    # Setup: Create a space and users
    space = Space(id="shared-space", name="Shared Space", user_id=test_user.id)
    test_session.add(space)
    
    # User 1 is OWNER
    owner = SpaceMember(space_id=space.id, user_id=test_user.id, role=SpaceRole.OWNER)
    # User 2 is VIEWER
    viewer = SpaceMember(space_id=space.id, user_id=test_user_2.id, role=SpaceRole.VIEWER)
    
    test_session.add(owner)
    test_session.add(viewer)
    await test_session.commit()

    # Auth headers
    headers_owner = {"Authorization": f"Bearer {test_user.username}"} # assumed token is username for test auth
    headers_viewer = {"Authorization": f"Bearer {test_user_2.username}"}

    # 1. Test listing spaces (both must see it)
    r1 = await client.get("/spaces", headers=headers_owner)
    assert r1.status_code == 200
    assert any(s["id"] == space.id for s in r1.json())

    r2 = await client.get("/spaces", headers=headers_viewer)
    assert r2.status_code == 200
    assert any(s["id"] == space.id for s in r2.json())

    # 2. Test updating space settings (Viewer should be rejected with 403)
    r_up_viewer = await client.patch(
        f"/spaces/{space.id}", 
        json={"name": "New Name By Viewer"},
        headers=headers_viewer
    )
    assert r_up_viewer.status_code == 403

    r_up_owner = await client.patch(
        f"/spaces/{space.id}",
        json={"name": "New Name By Owner"},
        headers=headers_owner
    )
    assert r_up_owner.status_code == 200
    assert r_up_owner.json()["name"] == "New Name By Owner"

    # 3. Test deleting space (Viewer should be rejected with 403)
    r_del_viewer = await client.delete(f"/spaces/{space.id}", headers=headers_viewer)
    assert r_del_viewer.status_code == 403

    # Add an EDITOR to test role updates
    editor_user = test_user_2 # temporarily promote User 2 to Editor for deletion tests
    viewer.role = SpaceRole.EDITOR
    test_session.add(viewer)
    await test_session.commit()

    # Editor should also be rejected from deleting the space (Owner-only)
    r_del_editor = await client.delete(f"/spaces/{space.id}", headers=headers_viewer)
    assert r_del_editor.status_code == 403

    # Owner deletes successfully
    r_del_owner = await client.delete(f"/spaces/{space.id}", headers=headers_owner)
    assert r_del_owner.status_code == 204


@pytest.mark.anyio
async def test_document_ingestion_and_deletion_rbac(client: AsyncClient, test_session, test_user, test_user_2):
    """Tests file upload, listing, retrieval, and deletion RBAC policies."""
    # Setup Space
    space = Space(id="doc-space", name="Doc Space", user_id=test_user.id)
    test_session.add(space)
    
    # User 1: OWNER, User 2: VIEWER
    owner = SpaceMember(space_id=space.id, user_id=test_user.id, role=SpaceRole.OWNER)
    viewer = SpaceMember(space_id=space.id, user_id=test_user_2.id, role=SpaceRole.VIEWER)
    
    test_session.add(owner)
    test_session.add(viewer)
    await test_session.commit()

    headers_owner = {"Authorization": f"Bearer {test_user.username}"}
    headers_viewer = {"Authorization": f"Bearer {test_user_2.username}"}

    # 1. Test Upload (Viewer must get 403)
    r_up_viewer = await client.post(
        "/upload",
        data={"space_id": space.id},
        files={"file": ("test.txt", b"hello world")},
        headers=headers_viewer
    )
    assert r_up_viewer.status_code == 403

    # Create dummy document manually to test list/retrieve/delete
    doc = Document(
        id=1234,
        filename="shared_file.txt",
        user_id=test_user.id,
        space_id=space.id,
        status="COMPLETED"
    )
    test_session.add(doc)
    await test_session.commit()

    # 2. Test Listing files (Viewer must see document)
    r_list_viewer = await client.get(f"/upload?space_id={space.id}", headers=headers_viewer)
    assert r_list_viewer.status_code == 200
    assert len(r_list_viewer.json()) == 1
    assert r_list_viewer.json()[0]["filename"] == "shared_file.txt"

    # 3. Test Retrieval (Viewer is allowed to view space document details)
    r_get_viewer = await client.get(f"/upload/1234", headers=headers_viewer)
    assert r_get_viewer.status_code == 200
    assert r_get_viewer.json()["filename"] == "shared_file.txt"

    # 4. Test Deletion (Viewer must get 403)
    r_del_viewer = await client.delete("/upload/1234", headers=headers_viewer)
    assert r_del_viewer.status_code == 403

    # Promote Viewer to Editor
    viewer.role = SpaceRole.EDITOR
    test_session.add(viewer)
    await test_session.commit()

    # Editor is authorized to delete
    r_del_editor = await client.delete("/upload/1234", headers=headers_viewer)
    assert r_del_editor.status_code == 204


@pytest.mark.anyio
async def test_space_member_management_api(client: AsyncClient, test_session, test_user, test_user_2):
    """Verifies list, invite, update role, and delete member endpoints on space."""
    # 1. Setup space with test_user as OWNER
    space = Space(id="member-api-space", name="Member API Space", user_id=test_user.id)
    test_session.add(space)
    owner_mem = SpaceMember(space_id=space.id, user_id=test_user.id, role=SpaceRole.OWNER)
    test_session.add(owner_mem)
    await test_session.commit()

    headers_owner = {"Authorization": f"Bearer {test_user.username}"}
    headers_user2 = {"Authorization": f"Bearer {test_user_2.username}"}

    # 2. List Members (Owner sees 1 member)
    r_list = await client.get(f"/spaces/{space.id}/members", headers=headers_owner)
    assert r_list.status_code == 200
    members = r_list.json()
    assert len(members) == 1
    assert members[0]["user_id"] == test_user.id
    assert members[0]["role"] == "OWNER"

    # 2.1 GUARD TEST: Sole Owner attempting to demote self to VIEWER must be REJECTED (400)
    r_self_demote = await client.put(
        f"/spaces/{space.id}/members/{test_user.id}",
        json={"role": "VIEWER"},
        headers=headers_owner
    )
    assert r_self_demote.status_code == 400
    assert "sole Owner" in r_self_demote.json()["detail"]

    # User 2 cannot list members before joining (403)
    r_unauth = await client.get(f"/spaces/{space.id}/members", headers=headers_user2)
    assert r_unauth.status_code == 403

    # 3. Invite User 2 as VIEWER with case-insensitive & trimmed username ("  VIEWER@example.com  ")
    r_invite = await client.post(
        f"/spaces/{space.id}/members",
        json={"username_or_email": f"  {test_user_2.username.upper()}  ", "role": "VIEWER"},
        headers=headers_owner
    )
    assert r_invite.status_code == 201
    invited = r_invite.json()
    assert invited["user_id"] == test_user_2.id
    assert invited["role"] == "VIEWER"

    # 4. User 2 can now list members
    r_list_u2 = await client.get(f"/spaces/{space.id}/members", headers=headers_user2)
    assert r_list_u2.status_code == 200
    assert len(r_list_u2.json()) == 2

    # User 2 (VIEWER) cannot invite members (403)
    r_u2_invite = await client.post(
        f"/spaces/{space.id}/members",
        json={"username_or_email": "nonexistent@example.com", "role": "VIEWER"},
        headers=headers_user2
    )
    assert r_u2_invite.status_code == 403

    # 5. Update User 2 role to EDITOR
    r_update = await client.put(
        f"/spaces/{space.id}/members/{test_user_2.id}",
        json={"role": "EDITOR"},
        headers=headers_owner
    )
    assert r_update.status_code == 200
    assert r_update.json()["role"] == "EDITOR"

    # 6. Remove User 2 from space
    r_del = await client.delete(f"/spaces/{space.id}/members/{test_user_2.id}", headers=headers_owner)
    assert r_del.status_code == 204

    # Verify User 2 is removed
    r_list_final = await client.get(f"/spaces/{space.id}/members", headers=headers_owner)
    assert len(r_list_final.json()) == 1


