"""
Backend API Tests for Boards Module (Trello-style Kanban)
Tests: Authentication, Boards CRUD, Lists CRUD, Cards CRUD, Drag & Drop operations
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://kanban-boards-5.preview.emergentagent.com')

# Test credentials
TEST_USERNAME = "spencer3009"
TEST_PASSWORD = "Socios3009"


class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_login_success(self):
        """Test successful login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        assert "access_token" in data, "Missing access_token in response"
        assert "token_type" in data, "Missing token_type in response"
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["username"] == TEST_USERNAME
        
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "invalid_user",
            "password": "wrong_password"
        })
        
        assert response.status_code == 401


@pytest.fixture(scope="class")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD
    })
    
    if response.status_code != 200:
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    return response.json()["access_token"]


@pytest.fixture(scope="class")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestBoardsCRUD:
    """Test Boards CRUD operations"""
    
    created_board_id = None
    
    def test_01_get_boards_empty_or_list(self, auth_headers):
        """Test getting boards list"""
        response = requests.get(f"{BASE_URL}/api/boards", headers=auth_headers)
        
        assert response.status_code == 200, f"Failed to get boards: {response.text}"
        data = response.json()
        
        assert "boards" in data
        assert isinstance(data["boards"], list)
    
    def test_02_create_board(self, auth_headers):
        """Test creating a new board"""
        board_data = {
            "title": "TEST_Board_Pytest",
            "description": "Test board created by pytest",
            "background_color": "#10B981"
        }
        
        response = requests.post(f"{BASE_URL}/api/boards", headers=auth_headers, json=board_data)
        
        assert response.status_code == 200, f"Failed to create board: {response.text}"
        data = response.json()
        
        assert "board" in data
        board = data["board"]
        assert board["title"] == board_data["title"]
        assert board["background_color"] == board_data["background_color"]
        assert "id" in board
        assert board["lists"] == []
        
        # Store for later tests
        TestBoardsCRUD.created_board_id = board["id"]
    
    def test_03_get_board_by_id(self, auth_headers):
        """Test getting a specific board"""
        board_id = TestBoardsCRUD.created_board_id
        assert board_id is not None, "Board ID not set from previous test"
        
        response = requests.get(f"{BASE_URL}/api/boards/{board_id}", headers=auth_headers)
        
        assert response.status_code == 200, f"Failed to get board: {response.text}"
        data = response.json()
        
        assert "board" in data
        assert data["board"]["id"] == board_id
        assert data["board"]["title"] == "TEST_Board_Pytest"
    
    def test_04_update_board(self, auth_headers):
        """Test updating a board"""
        board_id = TestBoardsCRUD.created_board_id
        assert board_id is not None
        
        update_data = {
            "title": "TEST_Board_Updated",
            "background_color": "#8B5CF6"
        }
        
        response = requests.put(f"{BASE_URL}/api/boards/{board_id}", headers=auth_headers, json=update_data)
        
        assert response.status_code == 200, f"Failed to update board: {response.text}"
        data = response.json()
        
        assert data["board"]["title"] == update_data["title"]
        assert data["board"]["background_color"] == update_data["background_color"]
    
    def test_05_get_board_not_found(self, auth_headers):
        """Test getting non-existent board"""
        response = requests.get(f"{BASE_URL}/api/boards/nonexistent_board_id", headers=auth_headers)
        
        assert response.status_code == 404


class TestListsCRUD:
    """Test Lists (columns) CRUD operations"""
    
    board_id = None
    list_ids = []
    
    @pytest.fixture(autouse=True, scope="class")
    def setup_board(self, auth_headers):
        """Create a board for list tests"""
        response = requests.post(f"{BASE_URL}/api/boards", headers=auth_headers, json={
            "title": "TEST_Board_For_Lists",
            "background_color": "#06B6D4"
        })
        
        if response.status_code == 200:
            TestListsCRUD.board_id = response.json()["board"]["id"]
        
        yield
        
        # Cleanup: Delete the board
        if TestListsCRUD.board_id:
            requests.delete(f"{BASE_URL}/api/boards/{TestListsCRUD.board_id}", headers=auth_headers)
    
    def test_01_create_list(self, auth_headers):
        """Test creating a list in a board"""
        board_id = TestListsCRUD.board_id
        assert board_id is not None
        
        list_data = {"title": "To Do"}
        
        response = requests.post(f"{BASE_URL}/api/boards/{board_id}/lists", headers=auth_headers, json=list_data)
        
        assert response.status_code == 200, f"Failed to create list: {response.text}"
        data = response.json()
        
        assert "list" in data
        assert data["list"]["title"] == "To Do"
        assert "id" in data["list"]
        
        TestListsCRUD.list_ids.append(data["list"]["id"])
    
    def test_02_create_multiple_lists(self, auth_headers):
        """Test creating multiple lists"""
        board_id = TestListsCRUD.board_id
        
        lists_to_create = ["In Progress", "Done"]
        
        for title in lists_to_create:
            response = requests.post(f"{BASE_URL}/api/boards/{board_id}/lists", headers=auth_headers, json={"title": title})
            
            assert response.status_code == 200, f"Failed to create list '{title}': {response.text}"
            TestListsCRUD.list_ids.append(response.json()["list"]["id"])
        
        # Verify board has all lists
        response = requests.get(f"{BASE_URL}/api/boards/{board_id}", headers=auth_headers)
        assert response.status_code == 200
        
        board = response.json()["board"]
        assert len(board["lists"]) == 3
    
    def test_03_update_list_title(self, auth_headers):
        """Test updating a list title"""
        board_id = TestListsCRUD.board_id
        list_id = TestListsCRUD.list_ids[0]
        
        response = requests.put(
            f"{BASE_URL}/api/boards/{board_id}/lists/{list_id}",
            headers=auth_headers,
            json={"title": "Backlog"}
        )
        
        assert response.status_code == 200, f"Failed to update list: {response.text}"
    
    def test_04_delete_list(self, auth_headers):
        """Test deleting a list"""
        board_id = TestListsCRUD.board_id
        list_id = TestListsCRUD.list_ids[-1]  # Delete last list
        
        response = requests.delete(f"{BASE_URL}/api/boards/{board_id}/lists/{list_id}", headers=auth_headers)
        
        assert response.status_code == 200, f"Failed to delete list: {response.text}"
        
        # Verify list is deleted
        response = requests.get(f"{BASE_URL}/api/boards/{board_id}", headers=auth_headers)
        board = response.json()["board"]
        list_ids_in_board = [l["id"] for l in board["lists"]]
        assert list_id not in list_ids_in_board


class TestCardsCRUD:
    """Test Cards (tasks) CRUD operations"""
    
    board_id = None
    list_id = None
    card_ids = []
    
    @pytest.fixture(autouse=True, scope="class")
    def setup_board_and_list(self, auth_headers):
        """Create a board and list for card tests"""
        # Create board
        response = requests.post(f"{BASE_URL}/api/boards", headers=auth_headers, json={
            "title": "TEST_Board_For_Cards",
            "background_color": "#F59E0B"
        })
        
        if response.status_code == 200:
            TestCardsCRUD.board_id = response.json()["board"]["id"]
            
            # Create list
            response = requests.post(
                f"{BASE_URL}/api/boards/{TestCardsCRUD.board_id}/lists",
                headers=auth_headers,
                json={"title": "Tasks"}
            )
            
            if response.status_code == 200:
                TestCardsCRUD.list_id = response.json()["list"]["id"]
        
        yield
        
        # Cleanup
        if TestCardsCRUD.board_id:
            requests.delete(f"{BASE_URL}/api/boards/{TestCardsCRUD.board_id}", headers=auth_headers)
    
    def test_01_create_card(self, auth_headers):
        """Test creating a card in a list"""
        board_id = TestCardsCRUD.board_id
        list_id = TestCardsCRUD.list_id
        
        assert board_id is not None and list_id is not None
        
        card_data = {"title": "First Task", "description": "Test task description"}
        
        response = requests.post(
            f"{BASE_URL}/api/boards/{board_id}/lists/{list_id}/cards",
            headers=auth_headers,
            json=card_data
        )
        
        assert response.status_code == 200, f"Failed to create card: {response.text}"
        data = response.json()
        
        assert "card" in data
        assert data["card"]["title"] == "First Task"
        assert "id" in data["card"]
        
        TestCardsCRUD.card_ids.append(data["card"]["id"])
    
    def test_02_create_multiple_cards(self, auth_headers):
        """Test creating multiple cards"""
        board_id = TestCardsCRUD.board_id
        list_id = TestCardsCRUD.list_id
        
        cards_to_create = ["Second Task", "Third Task"]
        
        for title in cards_to_create:
            response = requests.post(
                f"{BASE_URL}/api/boards/{board_id}/lists/{list_id}/cards",
                headers=auth_headers,
                json={"title": title}
            )
            
            assert response.status_code == 200, f"Failed to create card '{title}': {response.text}"
            TestCardsCRUD.card_ids.append(response.json()["card"]["id"])
        
        # Verify cards in list
        response = requests.get(f"{BASE_URL}/api/boards/{board_id}", headers=auth_headers)
        board = response.json()["board"]
        
        target_list = next((l for l in board["lists"] if l["id"] == list_id), None)
        assert target_list is not None
        assert len(target_list["cards"]) == 3
    
    def test_03_update_card_title(self, auth_headers):
        """Test updating a card title"""
        board_id = TestCardsCRUD.board_id
        list_id = TestCardsCRUD.list_id
        card_id = TestCardsCRUD.card_ids[0]
        
        response = requests.put(
            f"{BASE_URL}/api/boards/{board_id}/lists/{list_id}/cards/{card_id}",
            headers=auth_headers,
            json={"title": "Updated Task Title"}
        )
        
        assert response.status_code == 200, f"Failed to update card: {response.text}"
    
    def test_04_add_labels_to_card(self, auth_headers):
        """Test adding labels to a card"""
        board_id = TestCardsCRUD.board_id
        list_id = TestCardsCRUD.list_id
        card_id = TestCardsCRUD.card_ids[0]
        
        labels = [
            {"id": "label_1", "color": "green"},
            {"id": "label_2", "color": "red"}
        ]
        
        response = requests.put(
            f"{BASE_URL}/api/boards/{board_id}/lists/{list_id}/cards/{card_id}",
            headers=auth_headers,
            json={"labels": labels}
        )
        
        assert response.status_code == 200, f"Failed to add labels: {response.text}"
        
        # Verify labels were added
        response = requests.get(f"{BASE_URL}/api/boards/{board_id}", headers=auth_headers)
        board = response.json()["board"]
        
        target_list = next((l for l in board["lists"] if l["id"] == list_id), None)
        target_card = next((c for c in target_list["cards"] if c["id"] == card_id), None)
        
        assert target_card is not None
        assert len(target_card["labels"]) == 2
    
    def test_05_delete_card(self, auth_headers):
        """Test deleting a card"""
        board_id = TestCardsCRUD.board_id
        list_id = TestCardsCRUD.list_id
        card_id = TestCardsCRUD.card_ids[-1]  # Delete last card
        
        response = requests.delete(
            f"{BASE_URL}/api/boards/{board_id}/lists/{list_id}/cards/{card_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to delete card: {response.text}"


class TestDragAndDrop:
    """Test drag and drop operations (move cards between lists)"""
    
    board_id = None
    list_ids = []
    card_id = None
    
    @pytest.fixture(autouse=True, scope="class")
    def setup_board_lists_cards(self, auth_headers):
        """Create board with multiple lists and cards for drag & drop tests"""
        # Create board
        response = requests.post(f"{BASE_URL}/api/boards", headers=auth_headers, json={
            "title": "TEST_Board_DragDrop",
            "background_color": "#EC4899"
        })
        
        if response.status_code == 200:
            TestDragAndDrop.board_id = response.json()["board"]["id"]
            
            # Create two lists
            for title in ["Source List", "Destination List"]:
                response = requests.post(
                    f"{BASE_URL}/api/boards/{TestDragAndDrop.board_id}/lists",
                    headers=auth_headers,
                    json={"title": title}
                )
                if response.status_code == 200:
                    TestDragAndDrop.list_ids.append(response.json()["list"]["id"])
            
            # Create a card in the first list
            if len(TestDragAndDrop.list_ids) >= 1:
                response = requests.post(
                    f"{BASE_URL}/api/boards/{TestDragAndDrop.board_id}/lists/{TestDragAndDrop.list_ids[0]}/cards",
                    headers=auth_headers,
                    json={"title": "Card to Move"}
                )
                if response.status_code == 200:
                    TestDragAndDrop.card_id = response.json()["card"]["id"]
        
        yield
        
        # Cleanup
        if TestDragAndDrop.board_id:
            requests.delete(f"{BASE_URL}/api/boards/{TestDragAndDrop.board_id}", headers=auth_headers)
    
    def test_01_move_card_between_lists(self, auth_headers):
        """Test moving a card from one list to another"""
        board_id = TestDragAndDrop.board_id
        source_list_id = TestDragAndDrop.list_ids[0]
        dest_list_id = TestDragAndDrop.list_ids[1]
        card_id = TestDragAndDrop.card_id
        
        assert all([board_id, source_list_id, dest_list_id, card_id])
        
        move_data = {
            "source_list_id": source_list_id,
            "destination_list_id": dest_list_id,
            "card_id": card_id,
            "new_position": 0
        }
        
        response = requests.post(
            f"{BASE_URL}/api/boards/{board_id}/cards/move",
            headers=auth_headers,
            json=move_data
        )
        
        assert response.status_code == 200, f"Failed to move card: {response.text}"
        
        # Verify card moved
        response = requests.get(f"{BASE_URL}/api/boards/{board_id}", headers=auth_headers)
        board = response.json()["board"]
        
        source_list = next((l for l in board["lists"] if l["id"] == source_list_id), None)
        dest_list = next((l for l in board["lists"] if l["id"] == dest_list_id), None)
        
        # Card should not be in source list
        source_card_ids = [c["id"] for c in source_list["cards"]]
        assert card_id not in source_card_ids
        
        # Card should be in destination list
        dest_card_ids = [c["id"] for c in dest_list["cards"]]
        assert card_id in dest_card_ids
    
    def test_02_reorder_lists(self, auth_headers):
        """Test reordering lists in a board"""
        board_id = TestDragAndDrop.board_id
        list_ids = TestDragAndDrop.list_ids.copy()
        
        # Reverse the order
        reversed_ids = list(reversed(list_ids))
        
        response = requests.put(
            f"{BASE_URL}/api/boards/{board_id}/lists/reorder",
            headers=auth_headers,
            json={"list_ids": reversed_ids}
        )
        
        assert response.status_code == 200, f"Failed to reorder lists: {response.text}"


class TestBoardDeletion:
    """Test board deletion (cleanup)"""
    
    def test_delete_board(self, auth_headers):
        """Test deleting a board"""
        # Create a board to delete
        response = requests.post(f"{BASE_URL}/api/boards", headers=auth_headers, json={
            "title": "TEST_Board_To_Delete",
            "background_color": "#EF4444"
        })
        
        assert response.status_code == 200
        board_id = response.json()["board"]["id"]
        
        # Delete the board
        response = requests.delete(f"{BASE_URL}/api/boards/{board_id}", headers=auth_headers)
        
        assert response.status_code == 200, f"Failed to delete board: {response.text}"
        
        # Verify board is archived (not in active boards list)
        response = requests.get(f"{BASE_URL}/api/boards", headers=auth_headers)
        boards = response.json()["boards"]
        board_ids = [b["id"] for b in boards]
        
        assert board_id not in board_ids


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_boards(self, auth_headers):
        """Delete all TEST_ prefixed boards"""
        response = requests.get(f"{BASE_URL}/api/boards", headers=auth_headers)
        
        if response.status_code == 200:
            boards = response.json()["boards"]
            
            for board in boards:
                if board["title"].startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/boards/{board['id']}", headers=auth_headers)
            
            print(f"Cleaned up {len([b for b in boards if b['title'].startswith('TEST_')])} test boards")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
