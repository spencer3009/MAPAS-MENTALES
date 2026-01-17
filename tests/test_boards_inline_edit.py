"""
Test suite for Boards Inline Edit and Context Menu functionality
Tests:
- PUT /api/boards/{id} - Rename board
- POST /api/boards/{id}/duplicate - Duplicate board
- Board CRUD operations
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://admin-impersonate.preview.emergentagent.com')

# Test credentials
TEST_USER = "spencer3009"
TEST_PASSWORD = "Socios3009"


class TestBoardsAuth:
    """Authentication tests for boards module"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USER, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USER, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✅ Login successful for user: {data['user']['username']}")


class TestBoardsCRUD:
    """Board CRUD operations tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USER, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_boards_list(self, auth_headers):
        """Test GET /api/boards - List all boards"""
        response = requests.get(f"{BASE_URL}/api/boards", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "boards" in data
        assert isinstance(data["boards"], list)
        print(f"✅ Found {len(data['boards'])} boards")
    
    def test_create_board(self, auth_headers):
        """Test POST /api/boards - Create new board"""
        board_data = {
            "title": "TEST_InlineEdit_Board",
            "background_color": "#3B82F6"
        }
        response = requests.post(
            f"{BASE_URL}/api/boards",
            json=board_data,
            headers=auth_headers
        )
        assert response.status_code == 200 or response.status_code == 201
        data = response.json()
        assert "board" in data
        assert data["board"]["title"] == "TEST_InlineEdit_Board"
        print(f"✅ Board created with ID: {data['board']['id']}")
        return data["board"]["id"]


class TestBoardsInlineEdit:
    """Tests for inline editing functionality - PUT /api/boards/{id}"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USER, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def test_board(self, auth_headers):
        """Create a test board for inline edit tests"""
        board_data = {
            "title": "TEST_InlineEdit_Original",
            "background_color": "#10B981"
        }
        response = requests.post(
            f"{BASE_URL}/api/boards",
            json=board_data,
            headers=auth_headers
        )
        assert response.status_code in [200, 201]
        board = response.json()["board"]
        yield board
        # Cleanup - delete the test board
        requests.delete(f"{BASE_URL}/api/boards/{board['id']}", headers=auth_headers)
    
    def test_rename_board_success(self, auth_headers, test_board):
        """Test PUT /api/boards/{id} - Rename board with valid name"""
        new_title = "TEST_InlineEdit_Renamed"
        response = requests.put(
            f"{BASE_URL}/api/boards/{test_board['id']}",
            json={"title": new_title},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Rename failed: {response.text}"
        data = response.json()
        assert "board" in data
        assert data["board"]["title"] == new_title
        print(f"✅ Board renamed to: {new_title}")
    
    def test_rename_board_empty_title(self, auth_headers, test_board):
        """Test PUT /api/boards/{id} - Rename with empty title (should fail or be handled)"""
        response = requests.put(
            f"{BASE_URL}/api/boards/{test_board['id']}",
            json={"title": ""},
            headers=auth_headers
        )
        # Empty title might be accepted (frontend validates) or rejected
        # Just verify the endpoint doesn't crash
        assert response.status_code in [200, 400, 422]
        print(f"✅ Empty title handled with status: {response.status_code}")
    
    def test_rename_board_long_title(self, auth_headers, test_board):
        """Test PUT /api/boards/{id} - Rename with title > 60 chars"""
        long_title = "A" * 65  # 65 characters
        response = requests.put(
            f"{BASE_URL}/api/boards/{test_board['id']}",
            json={"title": long_title},
            headers=auth_headers
        )
        # Backend might accept or reject - frontend validates at 60 chars
        assert response.status_code in [200, 400, 422]
        print(f"✅ Long title handled with status: {response.status_code}")
    
    def test_rename_nonexistent_board(self, auth_headers):
        """Test PUT /api/boards/{id} - Rename non-existent board"""
        response = requests.put(
            f"{BASE_URL}/api/boards/nonexistent_board_id",
            json={"title": "New Title"},
            headers=auth_headers
        )
        assert response.status_code == 404
        print("✅ Non-existent board returns 404")


class TestBoardsDuplicate:
    """Tests for board duplication - POST /api/boards/{id}/duplicate"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USER, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def test_board_for_duplicate(self, auth_headers):
        """Create a test board for duplication tests"""
        board_data = {
            "title": "TEST_Duplicate_Original",
            "background_color": "#8B5CF6"
        }
        response = requests.post(
            f"{BASE_URL}/api/boards",
            json=board_data,
            headers=auth_headers
        )
        assert response.status_code in [200, 201]
        board = response.json()["board"]
        yield board
        # Cleanup - delete the test board
        requests.delete(f"{BASE_URL}/api/boards/{board['id']}", headers=auth_headers)
    
    def test_duplicate_board_success(self, auth_headers, test_board_for_duplicate):
        """Test POST /api/boards/{id}/duplicate - Duplicate board"""
        response = requests.post(
            f"{BASE_URL}/api/boards/{test_board_for_duplicate['id']}/duplicate",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Duplicate failed: {response.text}"
        data = response.json()
        assert "board" in data
        
        # Verify the duplicated board has "(Copia)" in the title
        assert "(Copia)" in data["board"]["title"], f"Expected '(Copia)' in title, got: {data['board']['title']}"
        
        # Verify it's a new board with different ID
        assert data["board"]["id"] != test_board_for_duplicate["id"]
        
        # Verify same background color
        assert data["board"]["background_color"] == test_board_for_duplicate["background_color"]
        
        print(f"✅ Board duplicated: {data['board']['title']} (ID: {data['board']['id']})")
        
        # Cleanup - delete the duplicated board
        requests.delete(f"{BASE_URL}/api/boards/{data['board']['id']}", headers=auth_headers)
    
    def test_duplicate_nonexistent_board(self, auth_headers):
        """Test POST /api/boards/{id}/duplicate - Duplicate non-existent board"""
        response = requests.post(
            f"{BASE_URL}/api/boards/nonexistent_board_id/duplicate",
            headers=auth_headers
        )
        assert response.status_code == 404
        print("✅ Non-existent board duplicate returns 404")


class TestBoardsDelete:
    """Tests for board deletion (soft delete to trash)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USER, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_delete_board_soft_delete(self, auth_headers):
        """Test DELETE /api/boards/{id} - Soft delete (move to trash)"""
        # Create a board to delete
        board_data = {
            "title": "TEST_Delete_Board",
            "background_color": "#EF4444"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/boards",
            json=board_data,
            headers=auth_headers
        )
        assert create_response.status_code in [200, 201]
        board_id = create_response.json()["board"]["id"]
        
        # Delete the board
        delete_response = requests.delete(
            f"{BASE_URL}/api/boards/{board_id}",
            headers=auth_headers
        )
        assert delete_response.status_code in [200, 204]
        print(f"✅ Board {board_id} moved to trash")
        
        # Verify board is no longer in active boards list
        list_response = requests.get(f"{BASE_URL}/api/boards", headers=auth_headers)
        boards = list_response.json().get("boards", [])
        board_ids = [b["id"] for b in boards]
        assert board_id not in board_ids, "Deleted board should not appear in active boards"
        print("✅ Deleted board not in active boards list")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USER, "password": TEST_PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        return None
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        if auth_token:
            return {
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            }
        return {}
    
    def test_cleanup_test_boards(self, auth_headers):
        """Clean up any TEST_ prefixed boards"""
        if not auth_headers:
            pytest.skip("No auth token available")
        
        response = requests.get(f"{BASE_URL}/api/boards", headers=auth_headers)
        if response.status_code != 200:
            pytest.skip("Could not get boards list")
        
        boards = response.json().get("boards", [])
        test_boards = [b for b in boards if b.get("title", "").startswith("TEST_")]
        
        for board in test_boards:
            requests.delete(f"{BASE_URL}/api/boards/{board['id']}", headers=auth_headers)
            print(f"🧹 Cleaned up test board: {board['title']}")
        
        print(f"✅ Cleaned up {len(test_boards)} test boards")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
