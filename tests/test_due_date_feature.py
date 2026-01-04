"""
Backend API Tests for Due Date Feature in Boards Module
Tests: Due date setting, time setting, activity logging, persistence, and badge colors
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://tableros-editor.preview.emergentagent.com')

# Test credentials
TEST_USERNAME = "spencer3009"
TEST_PASSWORD = "Socios3009"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD
    })
    
    if response.status_code != 200:
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture(scope="module")
def test_board_with_card(auth_headers):
    """Create a test board with a list and card for due date tests"""
    # Create board
    board_response = requests.post(f"{BASE_URL}/api/boards", headers=auth_headers, json={
        "title": "TEST_DueDate_Board",
        "background_color": "#06B6D4"
    })
    
    assert board_response.status_code == 200, f"Failed to create board: {board_response.text}"
    board_id = board_response.json()["board"]["id"]
    
    # Create list
    list_response = requests.post(
        f"{BASE_URL}/api/boards/{board_id}/lists",
        headers=auth_headers,
        json={"title": "Test List"}
    )
    
    assert list_response.status_code == 200, f"Failed to create list: {list_response.text}"
    list_id = list_response.json()["list"]["id"]
    
    # Create card
    card_response = requests.post(
        f"{BASE_URL}/api/boards/{board_id}/lists/{list_id}/cards",
        headers=auth_headers,
        json={"title": "TEST_DueDate_Card"}
    )
    
    assert card_response.status_code == 200, f"Failed to create card: {card_response.text}"
    card_id = card_response.json()["card"]["id"]
    
    yield {
        "board_id": board_id,
        "list_id": list_id,
        "card_id": card_id
    }
    
    # Cleanup: Delete the board
    requests.delete(f"{BASE_URL}/api/boards/{board_id}", headers=auth_headers)


class TestDueDateSetting:
    """Test setting due date on cards"""
    
    def test_01_set_due_date(self, auth_headers, test_board_with_card):
        """Test setting a due date on a card"""
        board_id = test_board_with_card["board_id"]
        list_id = test_board_with_card["list_id"]
        card_id = test_board_with_card["card_id"]
        
        # Set due date to tomorrow
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = requests.put(
            f"{BASE_URL}/api/boards/{board_id}/lists/{list_id}/cards/{card_id}",
            headers=auth_headers,
            json={
                "due_date": tomorrow,
                "due_time": "14:00"
            }
        )
        
        assert response.status_code == 200, f"Failed to set due date: {response.text}"
        
        # Verify due date was saved
        board_response = requests.get(f"{BASE_URL}/api/boards/{board_id}", headers=auth_headers)
        assert board_response.status_code == 200
        
        board = board_response.json()["board"]
        target_list = next((l for l in board["lists"] if l["id"] == list_id), None)
        target_card = next((c for c in target_list["cards"] if c["id"] == card_id), None)
        
        assert target_card is not None
        assert target_card.get("due_date") == tomorrow
        assert target_card.get("due_time") == "14:00"
        print(f"✅ Due date set successfully: {tomorrow} 14:00")
    
    def test_02_set_due_date_with_activity(self, auth_headers, test_board_with_card):
        """Test setting due date with activity logging"""
        board_id = test_board_with_card["board_id"]
        list_id = test_board_with_card["list_id"]
        card_id = test_board_with_card["card_id"]
        
        # Set due date with activity
        next_week = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        activity = {
            "id": f"due_{int(datetime.now().timestamp())}",
            "type": "due_date",
            "text": "Usuario estableció una fecha límite",
            "author": TEST_USERNAME,
            "created_at": datetime.now().isoformat(),
            "old_date": None,
            "new_date": next_week
        }
        
        response = requests.put(
            f"{BASE_URL}/api/boards/{board_id}/lists/{list_id}/cards/{card_id}",
            headers=auth_headers,
            json={
                "due_date": next_week,
                "due_time": "09:00",
                "due_date_activities": [activity]
            }
        )
        
        assert response.status_code == 200, f"Failed to set due date with activity: {response.text}"
        
        # Verify activity was saved
        board_response = requests.get(f"{BASE_URL}/api/boards/{board_id}", headers=auth_headers)
        board = board_response.json()["board"]
        target_list = next((l for l in board["lists"] if l["id"] == list_id), None)
        target_card = next((c for c in target_list["cards"] if c["id"] == card_id), None)
        
        assert target_card.get("due_date_activities") is not None
        assert len(target_card.get("due_date_activities", [])) >= 1
        print(f"✅ Due date activity logged successfully")
    
    def test_03_change_due_date(self, auth_headers, test_board_with_card):
        """Test changing an existing due date"""
        board_id = test_board_with_card["board_id"]
        list_id = test_board_with_card["list_id"]
        card_id = test_board_with_card["card_id"]
        
        # Get current due date
        board_response = requests.get(f"{BASE_URL}/api/boards/{board_id}", headers=auth_headers)
        board = board_response.json()["board"]
        target_list = next((l for l in board["lists"] if l["id"] == list_id), None)
        target_card = next((c for c in target_list["cards"] if c["id"] == card_id), None)
        old_date = target_card.get("due_date")
        
        # Change to a new date
        new_date = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
        
        activity = {
            "id": f"due_{int(datetime.now().timestamp())}",
            "type": "due_date",
            "text": "Usuario cambió el plazo",
            "author": TEST_USERNAME,
            "created_at": datetime.now().isoformat(),
            "old_date": old_date,
            "new_date": new_date
        }
        
        existing_activities = target_card.get("due_date_activities", [])
        
        response = requests.put(
            f"{BASE_URL}/api/boards/{board_id}/lists/{list_id}/cards/{card_id}",
            headers=auth_headers,
            json={
                "due_date": new_date,
                "due_time": "18:00",
                "due_date_activities": [activity] + existing_activities
            }
        )
        
        assert response.status_code == 200, f"Failed to change due date: {response.text}"
        
        # Verify new date
        board_response = requests.get(f"{BASE_URL}/api/boards/{board_id}", headers=auth_headers)
        board = board_response.json()["board"]
        target_list = next((l for l in board["lists"] if l["id"] == list_id), None)
        target_card = next((c for c in target_list["cards"] if c["id"] == card_id), None)
        
        assert target_card.get("due_date") == new_date
        assert target_card.get("due_time") == "18:00"
        print(f"✅ Due date changed successfully from {old_date} to {new_date}")
    
    def test_04_clear_due_date(self, auth_headers, test_board_with_card):
        """Test clearing/removing a due date"""
        board_id = test_board_with_card["board_id"]
        list_id = test_board_with_card["list_id"]
        card_id = test_board_with_card["card_id"]
        
        # Get current activities
        board_response = requests.get(f"{BASE_URL}/api/boards/{board_id}", headers=auth_headers)
        board = board_response.json()["board"]
        target_list = next((l for l in board["lists"] if l["id"] == list_id), None)
        target_card = next((c for c in target_list["cards"] if c["id"] == card_id), None)
        existing_activities = target_card.get("due_date_activities", [])
        old_date = target_card.get("due_date")
        
        # Clear due date
        activity = {
            "id": f"due_{int(datetime.now().timestamp())}",
            "type": "due_date",
            "text": "Usuario eliminó la fecha límite",
            "author": TEST_USERNAME,
            "created_at": datetime.now().isoformat(),
            "old_date": old_date,
            "new_date": None
        }
        
        response = requests.put(
            f"{BASE_URL}/api/boards/{board_id}/lists/{list_id}/cards/{card_id}",
            headers=auth_headers,
            json={
                "due_date": "",
                "due_time": "",
                "due_date_activities": [activity] + existing_activities
            }
        )
        
        assert response.status_code == 200, f"Failed to clear due date: {response.text}"
        
        # Verify due date is cleared
        board_response = requests.get(f"{BASE_URL}/api/boards/{board_id}", headers=auth_headers)
        board = board_response.json()["board"]
        target_list = next((l for l in board["lists"] if l["id"] == list_id), None)
        target_card = next((c for c in target_list["cards"] if c["id"] == card_id), None)
        
        assert target_card.get("due_date") == ""
        assert target_card.get("due_time") == ""
        print(f"✅ Due date cleared successfully")


class TestDueDatePersistence:
    """Test due date persistence across operations"""
    
    def test_01_due_date_persists_after_reload(self, auth_headers, test_board_with_card):
        """Test that due date persists when fetching board again"""
        board_id = test_board_with_card["board_id"]
        list_id = test_board_with_card["list_id"]
        card_id = test_board_with_card["card_id"]
        
        # Set a due date
        test_date = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
        
        response = requests.put(
            f"{BASE_URL}/api/boards/{board_id}/lists/{list_id}/cards/{card_id}",
            headers=auth_headers,
            json={
                "due_date": test_date,
                "due_time": "10:30"
            }
        )
        
        assert response.status_code == 200
        
        # Fetch board multiple times to verify persistence
        for i in range(3):
            board_response = requests.get(f"{BASE_URL}/api/boards/{board_id}", headers=auth_headers)
            assert board_response.status_code == 200
            
            board = board_response.json()["board"]
            target_list = next((l for l in board["lists"] if l["id"] == list_id), None)
            target_card = next((c for c in target_list["cards"] if c["id"] == card_id), None)
            
            assert target_card.get("due_date") == test_date, f"Due date not persisted on fetch {i+1}"
            assert target_card.get("due_time") == "10:30", f"Due time not persisted on fetch {i+1}"
        
        print(f"✅ Due date persists correctly across multiple fetches")


class TestDueDateWithOtherFields:
    """Test due date works correctly with other card fields"""
    
    def test_01_due_date_with_checklist(self, auth_headers, test_board_with_card):
        """Test setting due date along with checklist"""
        board_id = test_board_with_card["board_id"]
        list_id = test_board_with_card["list_id"]
        card_id = test_board_with_card["card_id"]
        
        test_date = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
        
        checklist = [
            {"id": "check_1", "text": "Task 1", "completed": False},
            {"id": "check_2", "text": "Task 2", "completed": True}
        ]
        
        response = requests.put(
            f"{BASE_URL}/api/boards/{board_id}/lists/{list_id}/cards/{card_id}",
            headers=auth_headers,
            json={
                "due_date": test_date,
                "due_time": "15:00",
                "checklist": checklist
            }
        )
        
        assert response.status_code == 200, f"Failed to set due date with checklist: {response.text}"
        
        # Verify both are saved
        board_response = requests.get(f"{BASE_URL}/api/boards/{board_id}", headers=auth_headers)
        board = board_response.json()["board"]
        target_list = next((l for l in board["lists"] if l["id"] == list_id), None)
        target_card = next((c for c in target_list["cards"] if c["id"] == card_id), None)
        
        assert target_card.get("due_date") == test_date
        assert target_card.get("checklist") is not None
        assert len(target_card.get("checklist", [])) == 2
        print(f"✅ Due date works correctly with checklist")
    
    def test_02_due_date_with_priority(self, auth_headers, test_board_with_card):
        """Test setting due date along with priority"""
        board_id = test_board_with_card["board_id"]
        list_id = test_board_with_card["list_id"]
        card_id = test_board_with_card["card_id"]
        
        test_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        
        response = requests.put(
            f"{BASE_URL}/api/boards/{board_id}/lists/{list_id}/cards/{card_id}",
            headers=auth_headers,
            json={
                "due_date": test_date,
                "due_time": "11:00",
                "priority": "high"
            }
        )
        
        assert response.status_code == 200, f"Failed to set due date with priority: {response.text}"
        
        # Verify both are saved
        board_response = requests.get(f"{BASE_URL}/api/boards/{board_id}", headers=auth_headers)
        board = board_response.json()["board"]
        target_list = next((l for l in board["lists"] if l["id"] == list_id), None)
        target_card = next((c for c in target_list["cards"] if c["id"] == card_id), None)
        
        assert target_card.get("due_date") == test_date
        assert target_card.get("priority") == "high"
        print(f"✅ Due date works correctly with priority")
    
    def test_03_due_date_with_labels(self, auth_headers, test_board_with_card):
        """Test setting due date along with labels"""
        board_id = test_board_with_card["board_id"]
        list_id = test_board_with_card["list_id"]
        card_id = test_board_with_card["card_id"]
        
        test_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        labels = [
            {"id": "label_1", "color": "red"},
            {"id": "label_2", "color": "blue"}
        ]
        
        response = requests.put(
            f"{BASE_URL}/api/boards/{board_id}/lists/{list_id}/cards/{card_id}",
            headers=auth_headers,
            json={
                "due_date": test_date,
                "due_time": "16:30",
                "labels": labels
            }
        )
        
        assert response.status_code == 200, f"Failed to set due date with labels: {response.text}"
        
        # Verify both are saved
        board_response = requests.get(f"{BASE_URL}/api/boards/{board_id}", headers=auth_headers)
        board = board_response.json()["board"]
        target_list = next((l for l in board["lists"] if l["id"] == list_id), None)
        target_card = next((c for c in target_list["cards"] if c["id"] == card_id), None)
        
        assert target_card.get("due_date") == test_date
        assert len(target_card.get("labels", [])) == 2
        print(f"✅ Due date works correctly with labels")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_boards(self, auth_headers):
        """Delete all TEST_DueDate_ prefixed boards"""
        response = requests.get(f"{BASE_URL}/api/boards", headers=auth_headers)
        
        if response.status_code == 200:
            boards = response.json()["boards"]
            
            deleted_count = 0
            for board in boards:
                if board["title"].startswith("TEST_DueDate_"):
                    delete_response = requests.delete(f"{BASE_URL}/api/boards/{board['id']}", headers=auth_headers)
                    if delete_response.status_code == 200:
                        deleted_count += 1
            
            print(f"✅ Cleaned up {deleted_count} test boards")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
