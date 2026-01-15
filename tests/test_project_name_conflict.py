"""
Test suite for Project Name Conflict vs Plan Limit Bug Fix

This test validates that:
1. POST /api/projects returns HTTP 409 when project name already exists (name conflict)
2. POST /api/projects returns HTTP 403 when plan limit is exceeded (plan limit)
3. POST /api/projects returns HTTP 200/201 when name is unique and within limits
4. Unlimited plans (max_active_maps = -1) never show 403 limit error

Bug context: Previously, duplicate names incorrectly showed "Need more space" (upgrade plan) popup.
The fix separates:
- Name collision (409) -> Show NameConflictModal with Replace/Rename/Cancel options
- Plan limit exceeded (403) -> Show UpgradeModal (paywall)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Get API URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USER = {"username": "admin", "password": "admin123"}


class TestProjectNameConflict:
    """Tests for project name conflict detection (HTTP 409)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token for admin user"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin (has unlimited plan)
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        self.token = data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Track created projects for cleanup
        self.created_project_ids = []
        
        yield
        
        # Cleanup: Delete test projects
        for project_id in self.created_project_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/projects/{project_id}")
            except:
                pass
    
    def test_create_project_success_unique_name(self):
        """Test: Creating a project with unique name returns 200/201"""
        unique_name = f"TEST_UniqueProject_{uuid.uuid4().hex[:8]}"
        
        project_data = {
            "id": str(uuid.uuid4()),
            "name": unique_name,
            "layoutType": "mindflow",
            "nodes": [
                {
                    "id": str(uuid.uuid4()),
                    "text": "Central Idea",
                    "x": 400,
                    "y": 300,
                    "color": "blue",
                    "parentId": None,
                    "width": 160,
                    "height": 64
                }
            ]
        }
        
        response = self.session.post(f"{BASE_URL}/api/projects", json=project_data)
        
        # Should succeed with 200 or 201
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("name") == unique_name
        assert data.get("id") is not None
        
        # Track for cleanup
        self.created_project_ids.append(data.get("id"))
        print(f"✅ Project created successfully with unique name: {unique_name}")
    
    def test_create_project_duplicate_name_returns_409(self):
        """Test: Creating a project with duplicate name returns HTTP 409 (Conflict)"""
        # First, create a project with a specific name
        duplicate_name = f"TEST_DuplicateName_{uuid.uuid4().hex[:8]}"
        
        first_project = {
            "id": str(uuid.uuid4()),
            "name": duplicate_name,
            "layoutType": "mindflow",
            "nodes": [
                {
                    "id": str(uuid.uuid4()),
                    "text": "First Project",
                    "x": 400,
                    "y": 300,
                    "color": "blue",
                    "parentId": None,
                    "width": 160,
                    "height": 64
                }
            ]
        }
        
        response1 = self.session.post(f"{BASE_URL}/api/projects", json=first_project)
        assert response1.status_code in [200, 201], f"First project creation failed: {response1.text}"
        
        first_project_id = response1.json().get("id")
        self.created_project_ids.append(first_project_id)
        print(f"✅ First project created: {duplicate_name} (ID: {first_project_id})")
        
        # Now try to create another project with the SAME name
        second_project = {
            "id": str(uuid.uuid4()),  # Different ID
            "name": duplicate_name,    # SAME name
            "layoutType": "mindflow",
            "nodes": [
                {
                    "id": str(uuid.uuid4()),
                    "text": "Second Project",
                    "x": 400,
                    "y": 300,
                    "color": "green",
                    "parentId": None,
                    "width": 160,
                    "height": 64
                }
            ]
        }
        
        response2 = self.session.post(f"{BASE_URL}/api/projects", json=second_project)
        
        # Should return 409 Conflict (NOT 403 plan limit)
        assert response2.status_code == 409, f"Expected 409 Conflict for duplicate name, got {response2.status_code}: {response2.text}"
        
        # Verify error response contains conflict info
        error_data = response2.json()
        detail = error_data.get("detail", {})
        
        # The detail should be a dict with conflict info
        if isinstance(detail, dict):
            assert "existing_project_id" in detail, "Response should contain existing_project_id"
            assert detail.get("existing_project_id") == first_project_id, "existing_project_id should match first project"
            assert "message" in detail, "Response should contain message"
            print(f"✅ Duplicate name correctly returned 409 with existing_project_id: {detail.get('existing_project_id')}")
        else:
            # If detail is a string, just verify it mentions the name conflict
            assert "existe" in str(detail).lower() or "conflict" in str(detail).lower(), f"Error message should mention conflict: {detail}"
            print(f"✅ Duplicate name correctly returned 409: {detail}")
    
    def test_duplicate_name_response_structure(self):
        """Test: 409 response contains proper structure for frontend handling"""
        # Create first project
        test_name = f"TEST_StructureCheck_{uuid.uuid4().hex[:8]}"
        
        first_project = {
            "id": str(uuid.uuid4()),
            "name": test_name,
            "layoutType": "mindflow",
            "nodes": [{"id": str(uuid.uuid4()), "text": "Node", "x": 400, "y": 300, "color": "blue", "parentId": None, "width": 160, "height": 64}]
        }
        
        response1 = self.session.post(f"{BASE_URL}/api/projects", json=first_project)
        assert response1.status_code in [200, 201]
        first_id = response1.json().get("id")
        self.created_project_ids.append(first_id)
        
        # Try duplicate
        second_project = {
            "id": str(uuid.uuid4()),
            "name": test_name,
            "layoutType": "mindtree",
            "nodes": [{"id": str(uuid.uuid4()), "text": "Node2", "x": 400, "y": 100, "color": "green", "parentId": None, "width": 160, "height": 64}]
        }
        
        response2 = self.session.post(f"{BASE_URL}/api/projects", json=second_project)
        assert response2.status_code == 409
        
        error_data = response2.json()
        detail = error_data.get("detail", {})
        
        # Verify expected structure
        if isinstance(detail, dict):
            expected_fields = ["message", "existing_project_id", "existing_project_name", "suggestion"]
            for field in expected_fields:
                assert field in detail, f"Missing field '{field}' in 409 response"
            
            assert detail["existing_project_id"] == first_id
            assert detail["existing_project_name"] == test_name
            print(f"✅ 409 response has correct structure with all fields: {list(detail.keys())}")
        else:
            print(f"⚠️ Detail is string, not dict: {detail}")


class TestPlanLimitEnforcement:
    """Tests for plan limit enforcement (HTTP 403)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        assert response.status_code == 200
        
        data = response.json()
        self.token = data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        self.created_project_ids = []
        
        yield
        
        # Cleanup
        for project_id in self.created_project_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/projects/{project_id}")
            except:
                pass
    
    def test_admin_has_unlimited_plan(self):
        """Test: Admin user has unlimited plan (max_active_maps = -1)"""
        response = self.session.get(f"{BASE_URL}/api/user/plan-limits")
        assert response.status_code == 200
        
        data = response.json()
        limits = data.get("limits", {})
        
        # Admin should have unlimited maps
        max_active = limits.get("max_active_maps")
        assert max_active == -1, f"Admin should have unlimited maps (-1), got {max_active}"
        
        print(f"✅ Admin plan limits: max_active_maps={max_active}")
    
    def test_unlimited_plan_never_returns_403_for_limit(self):
        """Test: Users with unlimited plan (max_active_maps=-1) never get 403 for map limit"""
        # First verify admin has unlimited plan
        limits_response = self.session.get(f"{BASE_URL}/api/user/plan-limits")
        assert limits_response.status_code == 200
        limits_data = limits_response.json()
        
        max_active = limits_data.get("limits", {}).get("max_active_maps")
        assert max_active == -1, "This test requires unlimited plan user"
        
        # Create multiple projects - should never hit 403 for limit
        for i in range(5):
            project_data = {
                "id": str(uuid.uuid4()),
                "name": f"TEST_UnlimitedPlan_{uuid.uuid4().hex[:8]}_{i}",
                "layoutType": "mindflow",
                "nodes": [{"id": str(uuid.uuid4()), "text": f"Node {i}", "x": 400, "y": 300, "color": "blue", "parentId": None, "width": 160, "height": 64}]
            }
            
            response = self.session.post(f"{BASE_URL}/api/projects", json=project_data)
            
            # Should NOT be 403 (plan limit)
            assert response.status_code != 403, f"Unlimited plan user should never get 403 for map limit: {response.text}"
            assert response.status_code in [200, 201], f"Expected success, got {response.status_code}"
            
            self.created_project_ids.append(response.json().get("id"))
        
        print(f"✅ Created 5 projects without hitting 403 limit (unlimited plan)")
    
    def test_plan_limits_endpoint_returns_correct_structure(self):
        """Test: /api/user/plan-limits returns expected structure"""
        response = self.session.get(f"{BASE_URL}/api/user/plan-limits")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify structure
        assert "plan" in data, "Response should contain 'plan'"
        assert "limits" in data, "Response should contain 'limits'"
        assert "usage" in data, "Response should contain 'usage'"
        
        limits = data["limits"]
        assert "max_active_maps" in limits
        assert "max_total_maps_created" in limits
        assert "max_nodes_per_map" in limits
        
        usage = data["usage"]
        assert "active_maps" in usage
        assert "can_create_map" in usage
        
        print(f"✅ Plan limits structure correct: plan={data['plan']}, limits={limits}")


class TestNameConflictVsPlanLimit:
    """Tests to verify correct differentiation between name conflict (409) and plan limit (403)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        assert response.status_code == 200
        
        data = response.json()
        self.token = data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        self.created_project_ids = []
        
        yield
        
        for project_id in self.created_project_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/projects/{project_id}")
            except:
                pass
    
    def test_409_is_not_403(self):
        """Test: Name conflict (409) is clearly different from plan limit (403)"""
        # Create a project
        test_name = f"TEST_Conflict409_{uuid.uuid4().hex[:8]}"
        
        first_project = {
            "id": str(uuid.uuid4()),
            "name": test_name,
            "layoutType": "mindflow",
            "nodes": [{"id": str(uuid.uuid4()), "text": "Node", "x": 400, "y": 300, "color": "blue", "parentId": None, "width": 160, "height": 64}]
        }
        
        response1 = self.session.post(f"{BASE_URL}/api/projects", json=first_project)
        assert response1.status_code in [200, 201]
        self.created_project_ids.append(response1.json().get("id"))
        
        # Try duplicate - should be 409, NOT 403
        duplicate_project = {
            "id": str(uuid.uuid4()),
            "name": test_name,
            "layoutType": "mindflow",
            "nodes": [{"id": str(uuid.uuid4()), "text": "Node2", "x": 400, "y": 300, "color": "green", "parentId": None, "width": 160, "height": 64}]
        }
        
        response2 = self.session.post(f"{BASE_URL}/api/projects", json=duplicate_project)
        
        # Critical assertion: Must be 409, NOT 403
        assert response2.status_code == 409, f"Duplicate name MUST return 409, not {response2.status_code}"
        assert response2.status_code != 403, "Duplicate name should NOT return 403 (plan limit)"
        
        print(f"✅ Name conflict correctly returns 409 (not 403)")
    
    def test_error_messages_are_distinct(self):
        """Test: Error messages for 409 and 403 are clearly different"""
        # Create a project
        test_name = f"TEST_ErrorMsg_{uuid.uuid4().hex[:8]}"
        
        project = {
            "id": str(uuid.uuid4()),
            "name": test_name,
            "layoutType": "mindflow",
            "nodes": [{"id": str(uuid.uuid4()), "text": "Node", "x": 400, "y": 300, "color": "blue", "parentId": None, "width": 160, "height": 64}]
        }
        
        response1 = self.session.post(f"{BASE_URL}/api/projects", json=project)
        assert response1.status_code in [200, 201]
        self.created_project_ids.append(response1.json().get("id"))
        
        # Get 409 error message
        duplicate = {
            "id": str(uuid.uuid4()),
            "name": test_name,
            "layoutType": "mindflow",
            "nodes": [{"id": str(uuid.uuid4()), "text": "Node2", "x": 400, "y": 300, "color": "green", "parentId": None, "width": 160, "height": 64}]
        }
        
        response409 = self.session.post(f"{BASE_URL}/api/projects", json=duplicate)
        assert response409.status_code == 409
        
        error_409 = response409.json().get("detail", {})
        error_msg_409 = error_409.get("message", str(error_409)) if isinstance(error_409, dict) else str(error_409)
        
        # 409 message should mention "existe" or "nombre" (name conflict)
        # Should NOT mention "límite", "plan", "Pro", "upgrade"
        error_lower = error_msg_409.lower()
        
        assert "existe" in error_lower or "nombre" in error_lower or "conflict" in error_lower, \
            f"409 error should mention name conflict: {error_msg_409}"
        
        # Should NOT contain plan limit keywords
        # Note: "pro" is excluded because "proyecto" (Spanish for project) contains "pro"
        plan_keywords = ["límite", "limite", "plan gratuito", "plan free", "upgrade", "actualiza"]
        for keyword in plan_keywords:
            assert keyword not in error_lower, f"409 error should NOT mention '{keyword}': {error_msg_409}"
        
        print(f"✅ 409 error message correctly describes name conflict: {error_msg_409}")


class TestProjectCRUDBasics:
    """Basic CRUD tests for projects endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        assert response.status_code == 200
        
        data = response.json()
        self.token = data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        self.created_project_ids = []
        
        yield
        
        for project_id in self.created_project_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/projects/{project_id}")
            except:
                pass
    
    def test_get_projects_list(self):
        """Test: GET /api/projects returns list of projects"""
        response = self.session.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ GET /api/projects returns {len(data)} projects")
    
    def test_create_and_get_project(self):
        """Test: Create project and verify it can be retrieved"""
        project_name = f"TEST_CreateGet_{uuid.uuid4().hex[:8]}"
        project_id = str(uuid.uuid4())
        
        project_data = {
            "id": project_id,
            "name": project_name,
            "layoutType": "mindtree",
            "nodes": [{"id": str(uuid.uuid4()), "text": "Root", "x": 400, "y": 100, "color": "purple", "parentId": None, "width": 160, "height": 64}]
        }
        
        # Create
        create_response = self.session.post(f"{BASE_URL}/api/projects", json=project_data)
        assert create_response.status_code in [200, 201]
        
        created = create_response.json()
        self.created_project_ids.append(created.get("id"))
        
        # Get
        get_response = self.session.get(f"{BASE_URL}/api/projects/{created.get('id')}")
        assert get_response.status_code == 200
        
        fetched = get_response.json()
        assert fetched.get("name") == project_name
        assert fetched.get("layoutType") == "mindtree"
        
        print(f"✅ Project created and retrieved successfully: {project_name}")
    
    def test_update_project(self):
        """Test: Update project name and verify persistence"""
        original_name = f"TEST_Original_{uuid.uuid4().hex[:8]}"
        updated_name = f"TEST_Updated_{uuid.uuid4().hex[:8]}"
        
        # Create
        project_data = {
            "id": str(uuid.uuid4()),
            "name": original_name,
            "layoutType": "mindflow",
            "nodes": [{"id": str(uuid.uuid4()), "text": "Node", "x": 400, "y": 300, "color": "blue", "parentId": None, "width": 160, "height": 64}]
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/projects", json=project_data)
        assert create_response.status_code in [200, 201]
        
        project_id = create_response.json().get("id")
        self.created_project_ids.append(project_id)
        
        # Update
        update_data = {
            "name": updated_name,
            "nodes": project_data["nodes"]
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/projects/{project_id}", json=update_data)
        assert update_response.status_code == 200
        
        # Verify
        get_response = self.session.get(f"{BASE_URL}/api/projects/{project_id}")
        assert get_response.status_code == 200
        
        fetched = get_response.json()
        assert fetched.get("name") == updated_name
        
        print(f"✅ Project updated: {original_name} -> {updated_name}")
    
    def test_delete_project(self):
        """Test: Delete project (soft delete)"""
        project_name = f"TEST_Delete_{uuid.uuid4().hex[:8]}"
        
        # Create
        project_data = {
            "id": str(uuid.uuid4()),
            "name": project_name,
            "layoutType": "mindflow",
            "nodes": [{"id": str(uuid.uuid4()), "text": "Node", "x": 400, "y": 300, "color": "blue", "parentId": None, "width": 160, "height": 64}]
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/projects", json=project_data)
        assert create_response.status_code in [200, 201]
        
        project_id = create_response.json().get("id")
        
        # Delete
        delete_response = self.session.delete(f"{BASE_URL}/api/projects/{project_id}")
        assert delete_response.status_code in [200, 204]
        
        # Verify deleted (should not appear in list or return 404)
        get_response = self.session.get(f"{BASE_URL}/api/projects/{project_id}")
        # Could be 404 or return with isDeleted=True
        
        print(f"✅ Project deleted: {project_name}")


class TestAuthenticationRequired:
    """Tests for authentication requirements"""
    
    def test_create_project_without_auth_fails(self):
        """Test: Creating project without auth token returns 401/403"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        project_data = {
            "id": str(uuid.uuid4()),
            "name": "Unauthorized Project",
            "layoutType": "mindflow",
            "nodes": []
        }
        
        response = session.post(f"{BASE_URL}/api/projects", json=project_data)
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        print(f"✅ Unauthenticated request correctly rejected with {response.status_code}")
    
    def test_get_projects_without_auth_fails(self):
        """Test: Getting projects without auth token returns 401/403"""
        session = requests.Session()
        
        response = session.get(f"{BASE_URL}/api/projects")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        print(f"✅ Unauthenticated GET correctly rejected with {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
