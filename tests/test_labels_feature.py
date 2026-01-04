"""
Test suite for Trello-style label system
Tests: Create, assign/unassign, edit, delete labels
Board ID: board_37fa1864a7a4
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USERNAME = "demo"
TEST_PASSWORD = "demo123"

# Test board and list IDs
BOARD_ID = "board_37fa1864a7a4"
LIST_ABIERTAS = "list_74c3d072eda5"
LIST_PROGRESO = "list_6270568ea8e9"
LIST_LISTO = "list_5b1e60096f34"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Shared requests session with auth"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestBoardLabels:
    """Test board-level label CRUD operations"""
    
    def test_get_board_with_labels(self, api_client):
        """GET board should return board_labels array"""
        response = api_client.get(f"{BASE_URL}/api/boards/{BOARD_ID}")
        assert response.status_code == 200
        
        data = response.json()
        board = data.get("board", data)
        
        # Verify board_labels exists and is a list
        assert "board_labels" in board, "board_labels field missing"
        assert isinstance(board["board_labels"], list), "board_labels should be a list"
        
        # Verify existing labels have correct structure
        for label in board["board_labels"]:
            assert "id" in label, "Label missing id"
            assert "name" in label, "Label missing name"
            assert "color" in label, "Label missing color"
        
        print(f"Board has {len(board['board_labels'])} labels")
        return board["board_labels"]
    
    def test_create_new_label(self, api_client):
        """Create a new board label via PUT /boards/{id}"""
        # First get current labels
        response = api_client.get(f"{BASE_URL}/api/boards/{BOARD_ID}")
        assert response.status_code == 200
        current_labels = response.json().get("board", {}).get("board_labels", [])
        
        # Create new label
        new_label = {
            "id": f"blabel_test_{uuid.uuid4().hex[:8]}",
            "name": "TEST_Label_Create",
            "color": "#A855F7"  # Purple
        }
        
        updated_labels = current_labels + [new_label]
        
        # Update board with new labels
        response = api_client.put(f"{BASE_URL}/api/boards/{BOARD_ID}", json={
            "board_labels": updated_labels
        })
        assert response.status_code == 200, f"Failed to create label: {response.text}"
        
        # Verify label was created
        response = api_client.get(f"{BASE_URL}/api/boards/{BOARD_ID}")
        board = response.json().get("board", {})
        labels = board.get("board_labels", [])
        
        created_label = next((l for l in labels if l["id"] == new_label["id"]), None)
        assert created_label is not None, "Created label not found"
        assert created_label["name"] == "TEST_Label_Create"
        assert created_label["color"] == "#A855F7"
        
        print(f"Created label: {new_label['id']}")
        return new_label["id"]
    
    def test_edit_label(self, api_client):
        """Edit an existing board label"""
        # Get current labels
        response = api_client.get(f"{BASE_URL}/api/boards/{BOARD_ID}")
        assert response.status_code == 200
        labels = response.json().get("board", {}).get("board_labels", [])
        
        # Find a test label to edit
        test_label = next((l for l in labels if l["name"].startswith("TEST_")), None)
        if not test_label:
            # Create one first
            test_label = {
                "id": f"blabel_edit_{uuid.uuid4().hex[:8]}",
                "name": "TEST_Label_Edit",
                "color": "#3B82F6"
            }
            labels.append(test_label)
            api_client.put(f"{BASE_URL}/api/boards/{BOARD_ID}", json={"board_labels": labels})
            response = api_client.get(f"{BASE_URL}/api/boards/{BOARD_ID}")
            labels = response.json().get("board", {}).get("board_labels", [])
            test_label = next((l for l in labels if l["id"] == test_label["id"]), None)
        
        # Edit the label
        original_name = test_label["name"]
        test_label["name"] = "TEST_Label_Edited"
        test_label["color"] = "#EC4899"  # Pink
        
        # Update labels
        updated_labels = [l if l["id"] != test_label["id"] else test_label for l in labels]
        response = api_client.put(f"{BASE_URL}/api/boards/{BOARD_ID}", json={
            "board_labels": updated_labels
        })
        assert response.status_code == 200
        
        # Verify edit
        response = api_client.get(f"{BASE_URL}/api/boards/{BOARD_ID}")
        labels = response.json().get("board", {}).get("board_labels", [])
        edited_label = next((l for l in labels if l["id"] == test_label["id"]), None)
        
        assert edited_label is not None
        assert edited_label["name"] == "TEST_Label_Edited"
        assert edited_label["color"] == "#EC4899"
        
        print(f"Edited label: {test_label['id']}")
    
    def test_delete_label(self, api_client):
        """Delete a board label"""
        # Get current labels
        response = api_client.get(f"{BASE_URL}/api/boards/{BOARD_ID}")
        assert response.status_code == 200
        labels = response.json().get("board", {}).get("board_labels", [])
        
        # Find a test label to delete
        test_label = next((l for l in labels if l["name"].startswith("TEST_")), None)
        if not test_label:
            pytest.skip("No test label to delete")
        
        label_id = test_label["id"]
        
        # Remove the label
        updated_labels = [l for l in labels if l["id"] != label_id]
        response = api_client.put(f"{BASE_URL}/api/boards/{BOARD_ID}", json={
            "board_labels": updated_labels
        })
        assert response.status_code == 200
        
        # Verify deletion
        response = api_client.get(f"{BASE_URL}/api/boards/{BOARD_ID}")
        labels = response.json().get("board", {}).get("board_labels", [])
        deleted_label = next((l for l in labels if l["id"] == label_id), None)
        
        assert deleted_label is None, "Label was not deleted"
        print(f"Deleted label: {label_id}")


class TestCardLabelAssignment:
    """Test assigning/unassigning labels to cards"""
    
    def test_get_card_with_labels(self, api_client):
        """GET board should return cards with labels array (IDs)"""
        response = api_client.get(f"{BASE_URL}/api/boards/{BOARD_ID}")
        assert response.status_code == 200
        
        board = response.json().get("board", {})
        lists = board.get("lists", [])
        
        # Find a card with labels
        card_with_labels = None
        for lst in lists:
            for card in lst.get("cards", []):
                if card.get("labels") and len(card["labels"]) > 0:
                    card_with_labels = card
                    break
            if card_with_labels:
                break
        
        assert card_with_labels is not None, "No card with labels found"
        
        # Verify labels are stored as IDs (strings)
        labels = card_with_labels["labels"]
        assert isinstance(labels, list)
        
        # Check if labels are IDs (strings) or old format (objects)
        if labels and isinstance(labels[0], str):
            print(f"Card '{card_with_labels['title']}' has label IDs: {labels}")
        else:
            print(f"Card '{card_with_labels['title']}' has labels in old format")
    
    def test_assign_label_to_card(self, api_client):
        """Assign a board label to a card"""
        # Get board data
        response = api_client.get(f"{BASE_URL}/api/boards/{BOARD_ID}")
        assert response.status_code == 200
        board = response.json().get("board", {})
        
        # Get board labels
        board_labels = board.get("board_labels", [])
        if not board_labels:
            pytest.skip("No board labels available")
        
        # Find a card to assign label to
        lists = board.get("lists", [])
        target_card = None
        target_list_id = None
        
        for lst in lists:
            for card in lst.get("cards", []):
                target_card = card
                target_list_id = lst["id"]
                break
            if target_card:
                break
        
        assert target_card is not None, "No card found"
        
        # Get a label to assign
        label_to_assign = board_labels[0]
        current_labels = target_card.get("labels", [])
        
        # Ensure labels are IDs
        if current_labels and isinstance(current_labels[0], dict):
            current_labels = [l.get("id") for l in current_labels if l.get("id")]
        
        # Add label if not already assigned
        if label_to_assign["id"] not in current_labels:
            new_labels = current_labels + [label_to_assign["id"]]
        else:
            new_labels = current_labels
        
        # Update card
        response = api_client.put(
            f"{BASE_URL}/api/boards/{BOARD_ID}/lists/{target_list_id}/cards/{target_card['id']}",
            json={"labels": new_labels}
        )
        assert response.status_code == 200, f"Failed to assign label: {response.text}"
        
        # Verify assignment
        response = api_client.get(f"{BASE_URL}/api/boards/{BOARD_ID}")
        board = response.json().get("board", {})
        
        # Find the updated card
        updated_card = None
        for lst in board.get("lists", []):
            for card in lst.get("cards", []):
                if card["id"] == target_card["id"]:
                    updated_card = card
                    break
        
        assert updated_card is not None
        assert label_to_assign["id"] in updated_card.get("labels", [])
        
        print(f"Assigned label '{label_to_assign['name']}' to card '{target_card['title']}'")
    
    def test_unassign_label_from_card(self, api_client):
        """Unassign a label from a card"""
        # Get board data
        response = api_client.get(f"{BASE_URL}/api/boards/{BOARD_ID}")
        assert response.status_code == 200
        board = response.json().get("board", {})
        
        # Find a card with labels
        target_card = None
        target_list_id = None
        
        for lst in board.get("lists", []):
            for card in lst.get("cards", []):
                labels = card.get("labels", [])
                if labels and len(labels) > 0:
                    target_card = card
                    target_list_id = lst["id"]
                    break
            if target_card:
                break
        
        if not target_card:
            pytest.skip("No card with labels found")
        
        current_labels = target_card.get("labels", [])
        
        # Ensure labels are IDs
        if current_labels and isinstance(current_labels[0], dict):
            current_labels = [l.get("id") for l in current_labels if l.get("id")]
        
        # Remove first label
        label_to_remove = current_labels[0]
        new_labels = [l for l in current_labels if l != label_to_remove]
        
        # Update card
        response = api_client.put(
            f"{BASE_URL}/api/boards/{BOARD_ID}/lists/{target_list_id}/cards/{target_card['id']}",
            json={"labels": new_labels}
        )
        assert response.status_code == 200
        
        # Verify unassignment
        response = api_client.get(f"{BASE_URL}/api/boards/{BOARD_ID}")
        board = response.json().get("board", {})
        
        updated_card = None
        for lst in board.get("lists", []):
            for card in lst.get("cards", []):
                if card["id"] == target_card["id"]:
                    updated_card = card
                    break
        
        assert updated_card is not None
        assert label_to_remove not in updated_card.get("labels", [])
        
        print(f"Unassigned label '{label_to_remove}' from card '{target_card['title']}'")
        
        # Re-assign the label for other tests
        response = api_client.put(
            f"{BASE_URL}/api/boards/{BOARD_ID}/lists/{target_list_id}/cards/{target_card['id']}",
            json={"labels": current_labels}
        )


class TestLabelPersistence:
    """Test that labels persist after page refresh (via API)"""
    
    def test_labels_persist_after_board_update(self, api_client):
        """Labels should persist when updating other board fields"""
        # Get current board state
        response = api_client.get(f"{BASE_URL}/api/boards/{BOARD_ID}")
        assert response.status_code == 200
        board = response.json().get("board", {})
        
        original_labels = board.get("board_labels", [])
        original_count = len(original_labels)
        
        # Update board title (not labels)
        response = api_client.put(f"{BASE_URL}/api/boards/{BOARD_ID}", json={
            "title": board.get("title", "Test Board")
        })
        assert response.status_code == 200
        
        # Verify labels still exist
        response = api_client.get(f"{BASE_URL}/api/boards/{BOARD_ID}")
        board = response.json().get("board", {})
        
        assert len(board.get("board_labels", [])) == original_count
        print(f"Labels persisted: {original_count} labels")
    
    def test_card_labels_persist_after_card_update(self, api_client):
        """Card labels should persist when updating other card fields"""
        # Get board data
        response = api_client.get(f"{BASE_URL}/api/boards/{BOARD_ID}")
        assert response.status_code == 200
        board = response.json().get("board", {})
        
        # Find a card with labels
        target_card = None
        target_list_id = None
        
        for lst in board.get("lists", []):
            for card in lst.get("cards", []):
                if card.get("labels") and len(card["labels"]) > 0:
                    target_card = card
                    target_list_id = lst["id"]
                    break
            if target_card:
                break
        
        if not target_card:
            pytest.skip("No card with labels found")
        
        original_labels = target_card.get("labels", [])
        
        # Update card description (not labels)
        response = api_client.put(
            f"{BASE_URL}/api/boards/{BOARD_ID}/lists/{target_list_id}/cards/{target_card['id']}",
            json={"description": "Updated description for persistence test"}
        )
        assert response.status_code == 200
        
        # Verify labels still exist
        response = api_client.get(f"{BASE_URL}/api/boards/{BOARD_ID}")
        board = response.json().get("board", {})
        
        updated_card = None
        for lst in board.get("lists", []):
            for card in lst.get("cards", []):
                if card["id"] == target_card["id"]:
                    updated_card = card
                    break
        
        assert updated_card is not None
        assert updated_card.get("labels") == original_labels
        print(f"Card labels persisted: {original_labels}")


class TestLabelReusability:
    """Test that labels can be reused across multiple cards"""
    
    def test_same_label_on_multiple_cards(self, api_client):
        """Same board label can be assigned to multiple cards"""
        # Get board data
        response = api_client.get(f"{BASE_URL}/api/boards/{BOARD_ID}")
        assert response.status_code == 200
        board = response.json().get("board", {})
        
        board_labels = board.get("board_labels", [])
        if not board_labels:
            pytest.skip("No board labels available")
        
        # Get a label to assign
        label_to_share = board_labels[0]
        
        # Find two different cards
        cards_to_update = []
        for lst in board.get("lists", []):
            for card in lst.get("cards", []):
                cards_to_update.append({
                    "card": card,
                    "list_id": lst["id"]
                })
                if len(cards_to_update) >= 2:
                    break
            if len(cards_to_update) >= 2:
                break
        
        if len(cards_to_update) < 2:
            pytest.skip("Not enough cards to test reusability")
        
        # Assign same label to both cards
        for item in cards_to_update:
            card = item["card"]
            list_id = item["list_id"]
            
            current_labels = card.get("labels", [])
            if isinstance(current_labels, list) and current_labels and isinstance(current_labels[0], dict):
                current_labels = [l.get("id") for l in current_labels if l.get("id")]
            
            if label_to_share["id"] not in current_labels:
                new_labels = current_labels + [label_to_share["id"]]
                response = api_client.put(
                    f"{BASE_URL}/api/boards/{BOARD_ID}/lists/{list_id}/cards/{card['id']}",
                    json={"labels": new_labels}
                )
                assert response.status_code == 200
        
        # Verify both cards have the label
        response = api_client.get(f"{BASE_URL}/api/boards/{BOARD_ID}")
        board = response.json().get("board", {})
        
        cards_with_label = 0
        for lst in board.get("lists", []):
            for card in lst.get("cards", []):
                if label_to_share["id"] in card.get("labels", []):
                    cards_with_label += 1
        
        assert cards_with_label >= 2, f"Expected at least 2 cards with label, found {cards_with_label}"
        print(f"Label '{label_to_share['name']}' is assigned to {cards_with_label} cards")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_labels(self, api_client):
        """Remove test labels created during tests"""
        response = api_client.get(f"{BASE_URL}/api/boards/{BOARD_ID}")
        assert response.status_code == 200
        
        labels = response.json().get("board", {}).get("board_labels", [])
        
        # Remove labels starting with TEST_
        cleaned_labels = [l for l in labels if not l.get("name", "").startswith("TEST_")]
        
        if len(cleaned_labels) != len(labels):
            response = api_client.put(f"{BASE_URL}/api/boards/{BOARD_ID}", json={
                "board_labels": cleaned_labels
            })
            assert response.status_code == 200
            print(f"Cleaned up {len(labels) - len(cleaned_labels)} test labels")
        else:
            print("No test labels to clean up")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
