import pytest
from httpx import AsyncClient
from sqlmodel import select
from models.sql_models import Space, SpaceMember, SpaceRole
from models.document import Document
from core.database import init_db


@pytest.mark.anyio
async def test_automatic_space_owner_migration(test_session, test_user):
    """Verifies that init_db() automatically migrates existing spaces by seeding
    SpaceMember records designating their creators as SpaceRole.OWNER."""
    # 1. Create a space manually without a SpaceMember record
    space = Space(
        id="test-migrated-space",
        name="Legacy Space",
        user_id=test_user.id
    )
    test_session.add(space)
    await test_session.commit()

    # Confirm no members exist yet
    stmt_check = select(SpaceMember).where(SpaceMember.space_id == space.id)
    res_check = await test_session.execute(stmt_check)
    assert res_check.scalar_one_or_none() is None

    # 2. Trigger init_db() to run the data migration
    await init_db()

    # 3. Verify owner record was automatically created
    res_after = await test_session.execute(stmt_check)
    member = res_after.scalar_one_or_none()
    assert member is not None
    assert member.user_id == test_user.id
    assert member.role == SpaceRole.OWNER


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
