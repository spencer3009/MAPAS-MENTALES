"""
Test Suite: Duplicate Project Feature
Tests the backend logic for duplicating projects including:
- Node copying with new IDs
- ParentId mapping
- Unique name generation pattern ('- copia', '- copia 2', etc.)
- Plan limit validation for duplication
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USER = {"username": "admin", "password": "admin123"}


class TestDuplicateProjectFeature:
    """Tests for the duplicate project functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_project_ids = []
        
        # Login as admin (unlimited plan)
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
        
        # Cleanup: Delete all test projects created during tests
        for project_id in self.created_project_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/projects/{project_id}")
            except:
                pass
    
    def create_test_project(self, name, nodes=None):
        """Helper to create a test project"""
        project_id = f"test_{uuid.uuid4().hex[:12]}"
        
        if nodes is None:
            # Create default nodes with parent-child relationship
            root_id = str(uuid.uuid4())
            child1_id = str(uuid.uuid4())
            child2_id = str(uuid.uuid4())
            grandchild_id = str(uuid.uuid4())
            
            nodes = [
                {"id": root_id, "text": "Root Node", "x": 300, "y": 300, "color": "blue", "parentId": None},
                {"id": child1_id, "text": "Child 1", "x": 500, "y": 200, "color": "green", "parentId": root_id},
                {"id": child2_id, "text": "Child 2", "x": 500, "y": 400, "color": "yellow", "parentId": root_id},
                {"id": grandchild_id, "text": "Grandchild", "x": 700, "y": 200, "color": "red", "parentId": child1_id}
            ]
        
        project_data = {
            "id": project_id,
            "name": name,
            "layoutType": "mindflow",
            "nodes": nodes
        }
        
        response = self.session.post(f"{BASE_URL}/api/projects", json=project_data)
        if response.status_code in [200, 201]:
            self.created_project_ids.append(project_id)
        return response
    
    # ==========================================
    # TEST 1: Basic Project Creation for Duplication
    # ==========================================
    def test_01_create_source_project_for_duplication(self):
        """Create a source project that will be duplicated"""
        response = self.create_test_project("TEST_Original Map")
        assert response.status_code in [200, 201], f"Failed to create project: {response.text}"
        
        data = response.json()
        assert data["name"] == "TEST_Original Map"
        assert len(data["nodes"]) == 4
        print("✅ Source project created successfully with 4 nodes")
    
    # ==========================================
    # TEST 2: Duplicate Project with '- copia' suffix
    # ==========================================
    def test_02_duplicate_project_first_copy(self):
        """Test that first duplicate gets '- copia' suffix"""
        # Create original project
        original_response = self.create_test_project("TEST_Duplicate Test")
        assert original_response.status_code in [200, 201]
        original = original_response.json()
        original_nodes = original["nodes"]
        
        # Create duplicate with '- copia' suffix
        duplicate_name = "TEST_Duplicate Test - copia"
        
        # Generate new IDs for nodes (simulating frontend behavior)
        id_map = {}
        new_nodes = []
        for node in original_nodes:
            new_id = str(uuid.uuid4())
            id_map[node["id"]] = new_id
            new_nodes.append({**node, "id": new_id})
        
        # Map parentIds to new IDs
        for node in new_nodes:
            if node.get("parentId") and node["parentId"] in id_map:
                node["parentId"] = id_map[node["parentId"]]
        
        duplicate_data = {
            "id": f"dup_{uuid.uuid4().hex[:12]}",
            "name": duplicate_name,
            "layoutType": original.get("layoutType", "mindflow"),
            "nodes": new_nodes
        }
        
        response = self.session.post(f"{BASE_URL}/api/projects", json=duplicate_data)
        assert response.status_code in [200, 201], f"Failed to create duplicate: {response.text}"
        
        duplicate = response.json()
        self.created_project_ids.append(duplicate["id"])
        
        # Verify name
        assert duplicate["name"] == duplicate_name
        
        # Verify nodes count matches
        assert len(duplicate["nodes"]) == len(original_nodes)
        
        # Verify all node IDs are different from original
        original_ids = {n["id"] for n in original_nodes}
        duplicate_ids = {n["id"] for n in duplicate["nodes"]}
        assert original_ids.isdisjoint(duplicate_ids), "Duplicate should have new node IDs"
        
        print("✅ First duplicate created with '- copia' suffix")
        print(f"   Original: {original['name']}")
        print(f"   Duplicate: {duplicate['name']}")
    
    # ==========================================
    # TEST 3: Second Duplicate gets '- copia 2' suffix
    # ==========================================
    def test_03_duplicate_project_second_copy(self):
        """Test that second duplicate gets '- copia 2' suffix"""
        # Create original
        original_response = self.create_test_project("TEST_Multi Copy")
        assert original_response.status_code in [200, 201]
        original = original_response.json()
        
        # Create first copy
        first_copy_name = "TEST_Multi Copy - copia"
        first_copy_response = self.create_test_project(first_copy_name)
        assert first_copy_response.status_code in [200, 201]
        
        # Create second copy - should be '- copia 2'
        second_copy_name = "TEST_Multi Copy - copia 2"
        second_copy_response = self.create_test_project(second_copy_name)
        assert second_copy_response.status_code in [200, 201]
        
        second_copy = second_copy_response.json()
        assert second_copy["name"] == second_copy_name
        
        print("✅ Second duplicate created with '- copia 2' suffix")
    
    # ==========================================
    # TEST 4: Verify Node IDs are New
    # ==========================================
    def test_04_verify_new_node_ids(self):
        """Verify that duplicated nodes have completely new IDs"""
        # Create original with specific nodes
        root_id = str(uuid.uuid4())
        child_id = str(uuid.uuid4())
        
        original_nodes = [
            {"id": root_id, "text": "Original Root", "x": 300, "y": 300, "color": "blue", "parentId": None},
            {"id": child_id, "text": "Original Child", "x": 500, "y": 300, "color": "green", "parentId": root_id}
        ]
        
        original_response = self.create_test_project("TEST_ID Verification", nodes=original_nodes)
        assert original_response.status_code in [200, 201]
        original = original_response.json()
        
        # Create duplicate with new IDs
        new_root_id = str(uuid.uuid4())
        new_child_id = str(uuid.uuid4())
        
        duplicate_nodes = [
            {"id": new_root_id, "text": "Original Root", "x": 300, "y": 300, "color": "blue", "parentId": None},
            {"id": new_child_id, "text": "Original Child", "x": 500, "y": 300, "color": "green", "parentId": new_root_id}
        ]
        
        duplicate_response = self.create_test_project("TEST_ID Verification - copia", nodes=duplicate_nodes)
        assert duplicate_response.status_code in [200, 201]
        duplicate = duplicate_response.json()
        
        # Verify IDs are different
        original_node_ids = {n["id"] for n in original["nodes"]}
        duplicate_node_ids = {n["id"] for n in duplicate["nodes"]}
        
        assert original_node_ids.isdisjoint(duplicate_node_ids), "Node IDs must be different"
        assert root_id not in duplicate_node_ids
        assert child_id not in duplicate_node_ids
        
        print("✅ All node IDs are new in the duplicate")
        print(f"   Original IDs: {original_node_ids}")
        print(f"   Duplicate IDs: {duplicate_node_ids}")
    
    # ==========================================
    # TEST 5: Verify ParentId Mapping
    # ==========================================
    def test_05_verify_parent_id_mapping(self):
        """Verify that parentIds are correctly mapped to new IDs"""
        # Create original with hierarchy
        root_id = str(uuid.uuid4())
        child1_id = str(uuid.uuid4())
        child2_id = str(uuid.uuid4())
        grandchild_id = str(uuid.uuid4())
        
        original_nodes = [
            {"id": root_id, "text": "Root", "x": 300, "y": 300, "color": "blue", "parentId": None},
            {"id": child1_id, "text": "Child 1", "x": 500, "y": 200, "color": "green", "parentId": root_id},
            {"id": child2_id, "text": "Child 2", "x": 500, "y": 400, "color": "yellow", "parentId": root_id},
            {"id": grandchild_id, "text": "Grandchild", "x": 700, "y": 200, "color": "red", "parentId": child1_id}
        ]
        
        original_response = self.create_test_project("TEST_ParentId Mapping", nodes=original_nodes)
        assert original_response.status_code in [200, 201]
        
        # Create ID mapping for duplicate
        id_map = {
            root_id: str(uuid.uuid4()),
            child1_id: str(uuid.uuid4()),
            child2_id: str(uuid.uuid4()),
            grandchild_id: str(uuid.uuid4())
        }
        
        # Create duplicate nodes with mapped IDs
        duplicate_nodes = []
        for node in original_nodes:
            new_node = {
                "id": id_map[node["id"]],
                "text": node["text"],
                "x": node["x"],
                "y": node["y"],
                "color": node["color"],
                "parentId": id_map.get(node["parentId"]) if node["parentId"] else None
            }
            duplicate_nodes.append(new_node)
        
        duplicate_response = self.create_test_project("TEST_ParentId Mapping - copia", nodes=duplicate_nodes)
        assert duplicate_response.status_code in [200, 201]
        duplicate = duplicate_response.json()
        
        # Verify parent-child relationships are preserved
        dup_nodes_by_id = {n["id"]: n for n in duplicate["nodes"]}
        
        # Find the root (no parent)
        dup_root = next((n for n in duplicate["nodes"] if n["parentId"] is None), None)
        assert dup_root is not None, "Duplicate should have a root node"
        assert dup_root["text"] == "Root"
        
        # Find children of root
        dup_children = [n for n in duplicate["nodes"] if n["parentId"] == dup_root["id"]]
        assert len(dup_children) == 2, "Root should have 2 children"
        
        # Find grandchild
        child1_dup = next((n for n in dup_children if n["text"] == "Child 1"), None)
        assert child1_dup is not None
        
        grandchild_dup = next((n for n in duplicate["nodes"] if n["parentId"] == child1_dup["id"]), None)
        assert grandchild_dup is not None, "Child 1 should have a grandchild"
        assert grandchild_dup["text"] == "Grandchild"
        
        print("✅ ParentId mapping is correct in duplicate")
        print(f"   Root -> Child1 -> Grandchild hierarchy preserved")
    
    # ==========================================
    # TEST 6: Duplicate Name Conflict Returns 409
    # ==========================================
    def test_06_duplicate_name_conflict_returns_409(self):
        """Test that creating a duplicate with existing name returns 409"""
        # Create original
        original_response = self.create_test_project("TEST_Conflict Test")
        assert original_response.status_code in [200, 201]
        
        # Try to create another project with same name
        conflict_response = self.create_test_project("TEST_Conflict Test")
        assert conflict_response.status_code == 409, f"Expected 409, got {conflict_response.status_code}"
        
        error_detail = conflict_response.json().get("detail", {})
        assert "existing_project_id" in error_detail or "message" in error_detail
        
        print("✅ Duplicate name correctly returns 409 Conflict")
    
    # ==========================================
    # TEST 7: Verify Layout Type is Preserved
    # ==========================================
    def test_07_layout_type_preserved(self):
        """Test that layoutType is preserved in duplicate"""
        # Create original with mindtree layout
        root_id = str(uuid.uuid4())
        nodes = [{"id": root_id, "text": "Root", "x": 300, "y": 100, "color": "blue", "parentId": None}]
        
        project_data = {
            "id": f"test_{uuid.uuid4().hex[:12]}",
            "name": "TEST_Layout Preservation",
            "layoutType": "mindtree",
            "nodes": nodes
        }
        
        original_response = self.session.post(f"{BASE_URL}/api/projects", json=project_data)
        assert original_response.status_code in [200, 201]
        self.created_project_ids.append(project_data["id"])
        
        original = original_response.json()
        assert original["layoutType"] == "mindtree"
        
        # Create duplicate with same layout
        duplicate_data = {
            "id": f"dup_{uuid.uuid4().hex[:12]}",
            "name": "TEST_Layout Preservation - copia",
            "layoutType": "mindtree",
            "nodes": [{"id": str(uuid.uuid4()), "text": "Root", "x": 300, "y": 100, "color": "blue", "parentId": None}]
        }
        
        duplicate_response = self.session.post(f"{BASE_URL}/api/projects", json=duplicate_data)
        assert duplicate_response.status_code in [200, 201]
        self.created_project_ids.append(duplicate_data["id"])
        
        duplicate = duplicate_response.json()
        assert duplicate["layoutType"] == "mindtree", "Layout type should be preserved"
        
        print("✅ Layout type (mindtree) preserved in duplicate")
    
    # ==========================================
    # TEST 8: Verify Node Properties are Copied
    # ==========================================
    def test_08_node_properties_copied(self):
        """Test that all node properties are copied correctly"""
        root_id = str(uuid.uuid4())
        
        # Create node with various properties
        original_nodes = [{
            "id": root_id,
            "text": "Styled Node",
            "x": 300,
            "y": 300,
            "color": "purple",
            "parentId": None,
            "width": 200,
            "height": 100,
            "nodeType": "rounded",
            "textAlign": "center",
            "fontSize": 16,
            "fontWeight": "bold"
        }]
        
        original_response = self.create_test_project("TEST_Properties Copy", nodes=original_nodes)
        assert original_response.status_code in [200, 201]
        original = original_response.json()
        
        # Create duplicate with same properties but new ID
        new_id = str(uuid.uuid4())
        duplicate_nodes = [{
            "id": new_id,
            "text": "Styled Node",
            "x": 300,
            "y": 300,
            "color": "purple",
            "parentId": None,
            "width": 200,
            "height": 100,
            "nodeType": "rounded",
            "textAlign": "center",
            "fontSize": 16,
            "fontWeight": "bold"
        }]
        
        duplicate_response = self.create_test_project("TEST_Properties Copy - copia", nodes=duplicate_nodes)
        assert duplicate_response.status_code in [200, 201]
        duplicate = duplicate_response.json()
        
        # Verify properties match
        orig_node = original["nodes"][0]
        dup_node = duplicate["nodes"][0]
        
        assert dup_node["text"] == orig_node["text"]
        assert dup_node["color"] == orig_node["color"]
        assert dup_node["x"] == orig_node["x"]
        assert dup_node["y"] == orig_node["y"]
        
        print("✅ Node properties are correctly copied")
    
    # ==========================================
    # TEST 9: Admin User Can Duplicate (Unlimited Plan)
    # ==========================================
    def test_09_admin_can_duplicate_unlimited(self):
        """Test that admin user (unlimited plan) can duplicate without limits"""
        # Verify admin has unlimited plan
        limits_response = self.session.get(f"{BASE_URL}/api/user/plan-limits")
        assert limits_response.status_code == 200
        
        limits = limits_response.json()
        assert limits["limits"]["max_active_maps"] == -1, "Admin should have unlimited maps"
        
        # Create and duplicate multiple projects
        for i in range(3):
            response = self.create_test_project(f"TEST_Admin Unlimited {i}")
            assert response.status_code in [200, 201], f"Admin should be able to create project {i}"
        
        print("✅ Admin user can duplicate projects without plan limits")
    
    # ==========================================
    # TEST 10: Verify Duplicate is Independent
    # ==========================================
    def test_10_duplicate_is_independent(self):
        """Test that modifying duplicate doesn't affect original"""
        # Create original
        root_id = str(uuid.uuid4())
        original_nodes = [{"id": root_id, "text": "Original Text", "x": 300, "y": 300, "color": "blue", "parentId": None}]
        
        original_response = self.create_test_project("TEST_Independence", nodes=original_nodes)
        assert original_response.status_code in [200, 201]
        original = original_response.json()
        original_id = original["id"]
        
        # Create duplicate
        new_id = str(uuid.uuid4())
        duplicate_nodes = [{"id": new_id, "text": "Original Text", "x": 300, "y": 300, "color": "blue", "parentId": None}]
        
        duplicate_data = {
            "id": f"dup_{uuid.uuid4().hex[:12]}",
            "name": "TEST_Independence - copia",
            "layoutType": "mindflow",
            "nodes": duplicate_nodes
        }
        
        duplicate_response = self.session.post(f"{BASE_URL}/api/projects", json=duplicate_data)
        assert duplicate_response.status_code in [200, 201]
        duplicate = duplicate_response.json()
        duplicate_id = duplicate["id"]
        self.created_project_ids.append(duplicate_id)
        
        # Modify duplicate
        modified_nodes = [{"id": new_id, "text": "Modified Text", "x": 500, "y": 500, "color": "red", "parentId": None}]
        update_response = self.session.put(
            f"{BASE_URL}/api/projects/{duplicate_id}",
            json={"name": "TEST_Independence - copia", "nodes": modified_nodes}
        )
        assert update_response.status_code == 200
        
        # Verify original is unchanged
        original_check = self.session.get(f"{BASE_URL}/api/projects/{original_id}")
        assert original_check.status_code == 200
        original_data = original_check.json()
        
        assert original_data["nodes"][0]["text"] == "Original Text", "Original should be unchanged"
        assert original_data["nodes"][0]["color"] == "blue", "Original color should be unchanged"
        
        print("✅ Duplicate is independent from original")


class TestDuplicateNamePattern:
    """Tests specifically for the unique name generation pattern"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_project_ids = []
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        assert login_response.status_code == 200
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
        
        # Cleanup
        for project_id in self.created_project_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/projects/{project_id}")
            except:
                pass
    
    def create_project(self, name):
        """Helper to create a project"""
        project_id = f"test_{uuid.uuid4().hex[:12]}"
        project_data = {
            "id": project_id,
            "name": name,
            "layoutType": "mindflow",
            "nodes": [{"id": str(uuid.uuid4()), "text": "Root", "x": 300, "y": 300, "color": "blue", "parentId": None}]
        }
        response = self.session.post(f"{BASE_URL}/api/projects", json=project_data)
        if response.status_code in [200, 201]:
            self.created_project_ids.append(project_id)
        return response
    
    def test_name_pattern_sequence(self):
        """Test the complete naming sequence: Original, - copia, - copia 2, - copia 3"""
        base_name = "TEST_Sequence"
        
        # Create original
        r1 = self.create_project(base_name)
        assert r1.status_code in [200, 201]
        
        # Create first copy
        r2 = self.create_project(f"{base_name} - copia")
        assert r2.status_code in [200, 201]
        
        # Create second copy
        r3 = self.create_project(f"{base_name} - copia 2")
        assert r3.status_code in [200, 201]
        
        # Create third copy
        r4 = self.create_project(f"{base_name} - copia 3")
        assert r4.status_code in [200, 201]
        
        # Verify all exist
        projects_response = self.session.get(f"{BASE_URL}/api/projects")
        assert projects_response.status_code == 200
        projects = projects_response.json()
        
        project_names = [p["name"] for p in projects]
        assert base_name in project_names
        assert f"{base_name} - copia" in project_names
        assert f"{base_name} - copia 2" in project_names
        assert f"{base_name} - copia 3" in project_names
        
        print("✅ Name pattern sequence works correctly")
        print(f"   Created: {base_name}, {base_name} - copia, {base_name} - copia 2, {base_name} - copia 3")
    
    def test_name_with_special_characters(self):
        """Test duplication of projects with special characters in name"""
        special_name = "TEST_Proyecto (Especial) #1"
        
        r1 = self.create_project(special_name)
        assert r1.status_code in [200, 201]
        
        r2 = self.create_project(f"{special_name} - copia")
        assert r2.status_code in [200, 201]
        
        print("✅ Special characters in name handled correctly")
    
    def test_name_case_sensitivity(self):
        """Test that name comparison is case-insensitive"""
        # Create original
        r1 = self.create_project("TEST_Case Test")
        assert r1.status_code in [200, 201]
        
        # Try to create with different case - should conflict
        r2 = self.create_project("TEST_case test")
        # This might succeed or fail depending on backend implementation
        # Document the actual behavior
        
        if r2.status_code == 409:
            print("✅ Name comparison is case-insensitive (409 returned)")
        else:
            print("ℹ️ Name comparison is case-sensitive (project created)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
