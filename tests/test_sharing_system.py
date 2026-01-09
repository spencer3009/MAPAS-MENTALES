"""
Test Suite for Sharing & Collaboration System
Tests: Workspaces, Invites, Share Links, Collaborators
"""

import pytest
import requests
import os
import uuid

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USER = "spencer3009"
TEST_PASSWORD = "Socios3009"


class TestSharingSystem:
    """Test suite for the sharing and collaboration system"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USER, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            self.user = data.get("user", {})
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    # ==========================================
    # WORKSPACES TESTS
    # ==========================================
    
    def test_get_workspaces(self):
        """GET /api/workspaces - Get user workspaces"""
        response = self.session.get(f"{BASE_URL}/api/workspaces")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "workspaces" in data, "Response should contain 'workspaces' key"
        assert isinstance(data["workspaces"], list), "Workspaces should be a list"
        
        # If user has workspaces, verify structure
        if len(data["workspaces"]) > 0:
            ws = data["workspaces"][0]
            assert "id" in ws, "Workspace should have 'id'"
            assert "name" in ws, "Workspace should have 'name'"
            assert "type" in ws, "Workspace should have 'type'"
            print(f"✅ Found {len(data['workspaces'])} workspace(s)")
        else:
            print("⚠️ No workspaces found for user")
    
    # ==========================================
    # COLLABORATORS TESTS
    # ==========================================
    
    def test_get_board_collaborators(self):
        """GET /api/board/{board_id}/collaborators - Get collaborators for a board"""
        # First, get a board to test with
        boards_response = self.session.get(f"{BASE_URL}/api/boards")
        
        if boards_response.status_code != 200:
            pytest.skip("Could not fetch boards")
        
        boards = boards_response.json().get("boards", [])
        if not boards:
            pytest.skip("No boards available for testing")
        
        board_id = boards[0]["id"]
        
        # Get collaborators
        response = self.session.get(f"{BASE_URL}/api/board/{board_id}/collaborators")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "owner" in data, "Response should contain 'owner'"
        assert "collaborators" in data, "Response should contain 'collaborators'"
        assert "current_user_is_owner" in data, "Response should contain 'current_user_is_owner'"
        
        # Verify owner structure if present
        if data["owner"]:
            assert "username" in data["owner"], "Owner should have 'username'"
            assert "email" in data["owner"], "Owner should have 'email'"
            print(f"✅ Board owner: {data['owner'].get('full_name', data['owner'].get('username'))}")
        
        print(f"✅ Found {len(data['collaborators'])} collaborator(s)")
        print(f"✅ Current user is owner: {data['current_user_is_owner']}")
    
    def test_get_mindmap_collaborators(self):
        """GET /api/mindmap/{project_id}/collaborators - Get collaborators for a mindmap"""
        # First, get a project to test with
        projects_response = self.session.get(f"{BASE_URL}/api/projects")
        
        if projects_response.status_code != 200:
            pytest.skip("Could not fetch projects")
        
        projects = projects_response.json().get("projects", [])
        if not projects:
            pytest.skip("No projects available for testing")
        
        project_id = projects[0]["project_id"]
        
        # Get collaborators
        response = self.session.get(f"{BASE_URL}/api/mindmap/{project_id}/collaborators")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "owner" in data, "Response should contain 'owner'"
        assert "collaborators" in data, "Response should contain 'collaborators'"
        assert "current_user_is_owner" in data, "Response should contain 'current_user_is_owner'"
        
        print(f"✅ Mindmap collaborators endpoint working")
    
    def test_get_collaborators_invalid_resource_type(self):
        """GET /api/{invalid_type}/{id}/collaborators - Should return 400"""
        response = self.session.get(f"{BASE_URL}/api/invalid_type/some_id/collaborators")
        
        assert response.status_code == 400, f"Expected 400 for invalid resource type, got {response.status_code}"
        print("✅ Invalid resource type correctly rejected")
    
    # ==========================================
    # INVITES TESTS
    # ==========================================
    
    def test_create_invite_for_board(self):
        """POST /api/invites - Create invitation for a board"""
        # Get a board first
        boards_response = self.session.get(f"{BASE_URL}/api/boards")
        
        if boards_response.status_code != 200:
            pytest.skip("Could not fetch boards")
        
        boards = boards_response.json().get("boards", [])
        if not boards:
            pytest.skip("No boards available for testing")
        
        board_id = boards[0]["id"]
        test_email = f"test_invite_{uuid.uuid4().hex[:8]}@example.com"
        
        # Create invite
        response = self.session.post(
            f"{BASE_URL}/api/invites",
            json={
                "email": test_email,
                "resource_type": "board",
                "resource_id": board_id,
                "role": "editor"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data, "Response should contain 'success'"
        assert data["success"] == True, "Invite creation should succeed"
        assert "invite_id" in data, "Response should contain 'invite_id'"
        
        print(f"✅ Invite created: {data.get('invite_id')}")
        print(f"✅ Message: {data.get('message')}")
        
        # Store invite_id for cleanup
        self.created_invite_id = data.get("invite_id")
    
    def test_create_invite_for_mindmap(self):
        """POST /api/invites - Create invitation for a mindmap"""
        # Get a project first
        projects_response = self.session.get(f"{BASE_URL}/api/projects")
        
        if projects_response.status_code != 200:
            pytest.skip("Could not fetch projects")
        
        projects = projects_response.json().get("projects", [])
        if not projects:
            pytest.skip("No projects available for testing")
        
        project_id = projects[0]["project_id"]
        test_email = f"test_mindmap_invite_{uuid.uuid4().hex[:8]}@example.com"
        
        # Create invite
        response = self.session.post(
            f"{BASE_URL}/api/invites",
            json={
                "email": test_email,
                "resource_type": "mindmap",
                "resource_id": project_id,
                "role": "viewer"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Invite creation should succeed"
        print(f"✅ Mindmap invite created successfully")
    
    def test_create_invite_invalid_role(self):
        """POST /api/invites - Should reject invalid role"""
        boards_response = self.session.get(f"{BASE_URL}/api/boards")
        
        if boards_response.status_code != 200:
            pytest.skip("Could not fetch boards")
        
        boards = boards_response.json().get("boards", [])
        if not boards:
            pytest.skip("No boards available for testing")
        
        board_id = boards[0]["id"]
        
        response = self.session.post(
            f"{BASE_URL}/api/invites",
            json={
                "email": "test@example.com",
                "resource_type": "board",
                "resource_id": board_id,
                "role": "invalid_role"
            }
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid role, got {response.status_code}"
        print("✅ Invalid role correctly rejected")
    
    def test_cancel_invite(self):
        """DELETE /api/invites/{invite_id} - Cancel an invitation"""
        # First create an invite
        boards_response = self.session.get(f"{BASE_URL}/api/boards")
        
        if boards_response.status_code != 200:
            pytest.skip("Could not fetch boards")
        
        boards = boards_response.json().get("boards", [])
        if not boards:
            pytest.skip("No boards available for testing")
        
        board_id = boards[0]["id"]
        test_email = f"test_cancel_{uuid.uuid4().hex[:8]}@example.com"
        
        # Create invite
        create_response = self.session.post(
            f"{BASE_URL}/api/invites",
            json={
                "email": test_email,
                "resource_type": "board",
                "resource_id": board_id,
                "role": "viewer"
            }
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create invite for cancellation test")
        
        invite_id = create_response.json().get("invite_id")
        
        # Cancel the invite
        response = self.session.delete(f"{BASE_URL}/api/invites/{invite_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Invite cancellation should succeed"
        print(f"✅ Invite {invite_id} cancelled successfully")
    
    def test_cancel_nonexistent_invite(self):
        """DELETE /api/invites/{invalid_id} - Should return 404"""
        response = self.session.delete(f"{BASE_URL}/api/invites/inv_nonexistent123")
        
        assert response.status_code == 404, f"Expected 404 for nonexistent invite, got {response.status_code}"
        print("✅ Nonexistent invite correctly returns 404")
    
    # ==========================================
    # SHARE LINK TESTS
    # ==========================================
    
    def test_create_share_link_for_board(self):
        """POST /api/board/{board_id}/share-link - Create share link"""
        boards_response = self.session.get(f"{BASE_URL}/api/boards")
        
        if boards_response.status_code != 200:
            pytest.skip("Could not fetch boards")
        
        boards = boards_response.json().get("boards", [])
        if not boards:
            pytest.skip("No boards available for testing")
        
        board_id = boards[0]["id"]
        
        # Create share link
        response = self.session.post(
            f"{BASE_URL}/api/board/{board_id}/share-link",
            json={
                "resource_type": "board",
                "resource_id": board_id,
                "role": "viewer"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "share_link" in data, "Response should contain 'share_link'"
        
        share_link = data["share_link"]
        assert "token" in share_link, "Share link should have 'token'"
        assert "is_active" in share_link, "Share link should have 'is_active'"
        assert "role" in share_link, "Share link should have 'role'"
        
        print(f"✅ Share link created with token: {share_link['token'][:20]}...")
        print(f"✅ Link is active: {share_link['is_active']}")
        
        # Store for later tests
        self.share_link_token = share_link["token"]
        self.share_link_board_id = board_id
    
    def test_toggle_share_link(self):
        """PUT /api/board/{board_id}/share-link - Toggle share link active status"""
        boards_response = self.session.get(f"{BASE_URL}/api/boards")
        
        if boards_response.status_code != 200:
            pytest.skip("Could not fetch boards")
        
        boards = boards_response.json().get("boards", [])
        if not boards:
            pytest.skip("No boards available for testing")
        
        board_id = boards[0]["id"]
        
        # First ensure a share link exists
        self.session.post(
            f"{BASE_URL}/api/board/{board_id}/share-link",
            json={
                "resource_type": "board",
                "resource_id": board_id,
                "role": "viewer"
            }
        )
        
        # Toggle to inactive
        response = self.session.put(
            f"{BASE_URL}/api/board/{board_id}/share-link",
            json={"is_active": False}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Toggle should succeed"
        assert data.get("is_active") == False, "Link should be inactive"
        
        print("✅ Share link toggled to inactive")
        
        # Toggle back to active
        response = self.session.put(
            f"{BASE_URL}/api/board/{board_id}/share-link",
            json={"is_active": True}
        )
        
        assert response.status_code == 200
        assert response.json().get("is_active") == True
        print("✅ Share link toggled back to active")
    
    def test_access_shared_resource_public(self):
        """GET /api/shared/{token} - Access shared resource (public endpoint)"""
        # First create a share link
        boards_response = self.session.get(f"{BASE_URL}/api/boards")
        
        if boards_response.status_code != 200:
            pytest.skip("Could not fetch boards")
        
        boards = boards_response.json().get("boards", [])
        if not boards:
            pytest.skip("No boards available for testing")
        
        board_id = boards[0]["id"]
        
        # Create share link
        create_response = self.session.post(
            f"{BASE_URL}/api/board/{board_id}/share-link",
            json={
                "resource_type": "board",
                "resource_id": board_id,
                "role": "viewer"
            }
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create share link")
        
        token = create_response.json()["share_link"]["token"]
        
        # Access shared resource WITHOUT auth (public endpoint)
        public_session = requests.Session()
        response = public_session.get(f"{BASE_URL}/api/shared/{token}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "resource" in data, "Response should contain 'resource'"
        assert "role" in data, "Response should contain 'role'"
        assert "access_type" in data, "Response should contain 'access_type'"
        
        resource = data["resource"]
        assert "id" in resource, "Resource should have 'id'"
        assert "name" in resource, "Resource should have 'name'"
        assert "type" in resource, "Resource should have 'type'"
        
        print(f"✅ Public access to shared resource: {resource['name']}")
        print(f"✅ Access type: {data['access_type']}")
        print(f"✅ Role: {data['role']}")
    
    def test_access_invalid_share_token(self):
        """GET /api/shared/{invalid_token} - Should return 404"""
        public_session = requests.Session()
        response = public_session.get(f"{BASE_URL}/api/shared/invalid_token_12345")
        
        assert response.status_code == 404, f"Expected 404 for invalid token, got {response.status_code}"
        print("✅ Invalid share token correctly returns 404")
    
    # ==========================================
    # PENDING INVITES TESTS
    # ==========================================
    
    def test_get_pending_invites(self):
        """GET /api/invites/pending - Get pending invites for current user"""
        response = self.session.get(f"{BASE_URL}/api/invites/pending")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "invites" in data, "Response should contain 'invites'"
        assert isinstance(data["invites"], list), "Invites should be a list"
        
        print(f"✅ Found {len(data['invites'])} pending invite(s)")
    
    # ==========================================
    # SHARED WITH ME TESTS
    # ==========================================
    
    def test_get_shared_with_me(self):
        """GET /api/shared-with-me - Get resources shared with current user"""
        response = self.session.get(f"{BASE_URL}/api/shared-with-me")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "mindmaps" in data, "Response should contain 'mindmaps'"
        assert "boards" in data, "Response should contain 'boards'"
        
        print(f"✅ Shared mindmaps: {len(data['mindmaps'])}")
        print(f"✅ Shared boards: {len(data['boards'])}")


class TestSharingEdgeCases:
    """Edge case tests for sharing system"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USER, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_cannot_invite_self(self):
        """POST /api/invites - Should not allow inviting yourself"""
        # Get user's email
        me_response = self.session.get(f"{BASE_URL}/api/auth/me")
        if me_response.status_code != 200:
            pytest.skip("Could not get user info")
        
        user_email = me_response.json().get("email")
        if not user_email:
            pytest.skip("User has no email")
        
        # Get a board
        boards_response = self.session.get(f"{BASE_URL}/api/boards")
        if boards_response.status_code != 200:
            pytest.skip("Could not fetch boards")
        
        boards = boards_response.json().get("boards", [])
        if not boards:
            pytest.skip("No boards available")
        
        board_id = boards[0]["id"]
        
        # Try to invite self
        response = self.session.post(
            f"{BASE_URL}/api/invites",
            json={
                "email": user_email,
                "resource_type": "board",
                "resource_id": board_id,
                "role": "editor"
            }
        )
        
        assert response.status_code == 400, f"Expected 400 when inviting self, got {response.status_code}"
        print("✅ Cannot invite yourself - correctly rejected")
    
    def test_duplicate_invite_handling(self):
        """POST /api/invites - Should handle duplicate invites gracefully"""
        boards_response = self.session.get(f"{BASE_URL}/api/boards")
        if boards_response.status_code != 200:
            pytest.skip("Could not fetch boards")
        
        boards = boards_response.json().get("boards", [])
        if not boards:
            pytest.skip("No boards available")
        
        board_id = boards[0]["id"]
        test_email = f"duplicate_test_{uuid.uuid4().hex[:8]}@example.com"
        
        # First invite
        response1 = self.session.post(
            f"{BASE_URL}/api/invites",
            json={
                "email": test_email,
                "resource_type": "board",
                "resource_id": board_id,
                "role": "editor"
            }
        )
        
        assert response1.status_code == 200, "First invite should succeed"
        
        # Second invite (duplicate)
        response2 = self.session.post(
            f"{BASE_URL}/api/invites",
            json={
                "email": test_email,
                "resource_type": "board",
                "resource_id": board_id,
                "role": "viewer"
            }
        )
        
        # Should either succeed (update) or return 400 (already invited)
        assert response2.status_code in [200, 400], f"Duplicate invite should be handled, got {response2.status_code}"
        print(f"✅ Duplicate invite handled with status {response2.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
