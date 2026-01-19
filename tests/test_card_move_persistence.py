"""
Test Card Move Persistence - Kanban Board Drag & Drop Bug Fix
Tests the critical bug fix where card moves between columns should persist after page refresh.

Bug Description:
- When dragging a card from one column to another, the move was visible but NOT saved to database
- After page refresh, the card would return to its original position
- Root cause: handleDragOver was mutating active.data.current.listId, causing handleDragEnd 
  to see source and destination as equal

Fix Applied:
- Save originalListId in handleDragStart
- Use originalListId in handleDragEnd instead of active.data.current.listId
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://mindmap-manager-1.preview.emergentagent.com').rstrip('/')

# Test board and list IDs
TEST_BOARD_ID = "board_37fa1864a7a4"
LIST_ABIERTAS = "list_74c3d072eda5"
LIST_EN_PROGRESO = "list_6270568ea8e9"
LIST_LISTO = "list_5b1e60096f34"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for demo user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "demo", "password": "demo123"}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session


class TestCardMovePersistence:
    """Test card move persistence between columns"""
    
    def test_01_get_board_initial_state(self, api_client):
        """Verify board exists and get initial state"""
        response = api_client.get(f"{BASE_URL}/api/boards/{TEST_BOARD_ID}")
        assert response.status_code == 200, f"Failed to get board: {response.text}"
        
        board = response.json()["board"]
        assert board["id"] == TEST_BOARD_ID
        assert len(board["lists"]) >= 3, "Board should have at least 3 lists"
        
        # Store initial state for reference
        print(f"\nBoard: {board['title']}")
        for lst in board["lists"]:
            print(f"  List '{lst['title']}': {len(lst['cards'])} cards")
    
    def test_02_move_card_abiertas_to_progreso(self, api_client):
        """Move a card from 'Abiertas' to 'En Progreso' and verify persistence"""
        # First, get current state
        response = api_client.get(f"{BASE_URL}/api/boards/{TEST_BOARD_ID}")
        assert response.status_code == 200
        board = response.json()["board"]
        
        # Find a card in Abiertas
        abiertas_list = next((l for l in board["lists"] if l["id"] == LIST_ABIERTAS), None)
        assert abiertas_list is not None, "Abiertas list not found"
        
        if len(abiertas_list["cards"]) == 0:
            pytest.skip("No cards in Abiertas to move")
        
        card_to_move = abiertas_list["cards"][0]
        card_id = card_to_move["id"]
        card_title = card_to_move["title"]
        
        print(f"\nMoving card '{card_title[:30]}...' from Abiertas to En Progreso")
        
        # Move the card
        move_response = api_client.post(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}/cards/move",
            json={
                "source_list_id": LIST_ABIERTAS,
                "destination_list_id": LIST_EN_PROGRESO,
                "card_id": card_id,
                "new_position": 0
            }
        )
        
        assert move_response.status_code == 200, f"Move failed: {move_response.text}"
        result = move_response.json()
        assert result["message"] == "Tarjeta movida"
        
        # Verify card is in destination list in response
        dest_list = next((l for l in result["lists"] if l["id"] == LIST_EN_PROGRESO), None)
        assert dest_list is not None
        card_in_dest = next((c for c in dest_list["cards"] if c["id"] == card_id), None)
        assert card_in_dest is not None, "Card not found in destination list after move"
        
        # Verify card is NOT in source list
        source_list = next((l for l in result["lists"] if l["id"] == LIST_ABIERTAS), None)
        card_in_source = next((c for c in source_list["cards"] if c["id"] == card_id), None)
        assert card_in_source is None, "Card still in source list after move"
        
        print(f"  ✓ Card moved successfully in API response")
        
        # CRITICAL: Verify persistence by fetching board again (simulates page refresh)
        time.sleep(0.5)  # Small delay to ensure DB write completes
        
        verify_response = api_client.get(f"{BASE_URL}/api/boards/{TEST_BOARD_ID}")
        assert verify_response.status_code == 200
        
        refreshed_board = verify_response.json()["board"]
        
        # Check card is in En Progreso after "refresh"
        progreso_list = next((l for l in refreshed_board["lists"] if l["id"] == LIST_EN_PROGRESO), None)
        card_after_refresh = next((c for c in progreso_list["cards"] if c["id"] == card_id), None)
        assert card_after_refresh is not None, "CRITICAL BUG: Card not persisted after refresh!"
        
        # Check card is NOT in Abiertas after "refresh"
        abiertas_after = next((l for l in refreshed_board["lists"] if l["id"] == LIST_ABIERTAS), None)
        card_in_abiertas = next((c for c in abiertas_after["cards"] if c["id"] == card_id), None)
        assert card_in_abiertas is None, "CRITICAL BUG: Card still in original list after refresh!"
        
        print(f"  ✓ Card persisted correctly after simulated page refresh")
        
        # Move card back for next test
        api_client.post(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}/cards/move",
            json={
                "source_list_id": LIST_EN_PROGRESO,
                "destination_list_id": LIST_ABIERTAS,
                "card_id": card_id,
                "new_position": 0
            }
        )
    
    def test_03_move_card_progreso_to_listo(self, api_client):
        """Move a card from 'En Progreso' to 'Listo' and verify persistence"""
        response = api_client.get(f"{BASE_URL}/api/boards/{TEST_BOARD_ID}")
        assert response.status_code == 200
        board = response.json()["board"]
        
        progreso_list = next((l for l in board["lists"] if l["id"] == LIST_EN_PROGRESO), None)
        assert progreso_list is not None
        
        if len(progreso_list["cards"]) == 0:
            pytest.skip("No cards in En Progreso to move")
        
        card_to_move = progreso_list["cards"][0]
        card_id = card_to_move["id"]
        
        print(f"\nMoving card from En Progreso to Listo")
        
        # Move the card
        move_response = api_client.post(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}/cards/move",
            json={
                "source_list_id": LIST_EN_PROGRESO,
                "destination_list_id": LIST_LISTO,
                "card_id": card_id,
                "new_position": 0
            }
        )
        
        assert move_response.status_code == 200
        
        # Verify persistence
        time.sleep(0.5)
        verify_response = api_client.get(f"{BASE_URL}/api/boards/{TEST_BOARD_ID}")
        refreshed_board = verify_response.json()["board"]
        
        listo_list = next((l for l in refreshed_board["lists"] if l["id"] == LIST_LISTO), None)
        card_after_refresh = next((c for c in listo_list["cards"] if c["id"] == card_id), None)
        assert card_after_refresh is not None, "Card not persisted in Listo after refresh"
        
        print(f"  ✓ Card persisted correctly in Listo")
        
        # Move card back
        api_client.post(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}/cards/move",
            json={
                "source_list_id": LIST_LISTO,
                "destination_list_id": LIST_EN_PROGRESO,
                "card_id": card_id,
                "new_position": 0
            }
        )
    
    def test_04_move_card_same_list_reorder(self, api_client):
        """Move a card within the same list (reorder) and verify persistence"""
        response = api_client.get(f"{BASE_URL}/api/boards/{TEST_BOARD_ID}")
        assert response.status_code == 200
        board = response.json()["board"]
        
        progreso_list = next((l for l in board["lists"] if l["id"] == LIST_EN_PROGRESO), None)
        
        if len(progreso_list["cards"]) < 2:
            pytest.skip("Need at least 2 cards in En Progreso to test reorder")
        
        card_to_move = progreso_list["cards"][0]
        card_id = card_to_move["id"]
        original_position = 0
        new_position = len(progreso_list["cards"]) - 1
        
        print(f"\nReordering card within En Progreso (position {original_position} -> {new_position})")
        
        # Move within same list
        move_response = api_client.post(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}/cards/move",
            json={
                "source_list_id": LIST_EN_PROGRESO,
                "destination_list_id": LIST_EN_PROGRESO,
                "card_id": card_id,
                "new_position": new_position
            }
        )
        
        assert move_response.status_code == 200
        
        # Verify persistence
        time.sleep(0.5)
        verify_response = api_client.get(f"{BASE_URL}/api/boards/{TEST_BOARD_ID}")
        refreshed_board = verify_response.json()["board"]
        
        progreso_after = next((l for l in refreshed_board["lists"] if l["id"] == LIST_EN_PROGRESO), None)
        card_positions = {c["id"]: i for i, c in enumerate(progreso_after["cards"])}
        
        assert card_id in card_positions, "Card not found after reorder"
        # Position should be at or near the new position
        assert card_positions[card_id] >= original_position, "Card position not updated"
        
        print(f"  ✓ Card reorder persisted correctly")
    
    def test_05_move_card_invalid_source_list(self, api_client):
        """Test error handling for invalid source list"""
        response = api_client.post(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}/cards/move",
            json={
                "source_list_id": "invalid_list_id",
                "destination_list_id": LIST_EN_PROGRESO,
                "card_id": "some_card_id",
                "new_position": 0
            }
        )
        
        assert response.status_code == 404
        assert "no encontrada" in response.json()["detail"].lower()
        print("\n  ✓ Invalid source list returns 404")
    
    def test_06_move_card_invalid_card_id(self, api_client):
        """Test error handling for invalid card ID"""
        response = api_client.post(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}/cards/move",
            json={
                "source_list_id": LIST_ABIERTAS,
                "destination_list_id": LIST_EN_PROGRESO,
                "card_id": "invalid_card_id",
                "new_position": 0
            }
        )
        
        assert response.status_code == 404
        print("\n  ✓ Invalid card ID returns 404")


class TestMoveCardAPIValidation:
    """Test API validation for move card endpoint"""
    
    def test_missing_source_list_id(self, api_client):
        """Test that missing source_list_id returns validation error"""
        response = api_client.post(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}/cards/move",
            json={
                "destination_list_id": LIST_EN_PROGRESO,
                "card_id": "some_card",
                "new_position": 0
            }
        )
        assert response.status_code == 422  # Validation error
    
    def test_missing_destination_list_id(self, api_client):
        """Test that missing destination_list_id returns validation error"""
        response = api_client.post(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}/cards/move",
            json={
                "source_list_id": LIST_ABIERTAS,
                "card_id": "some_card",
                "new_position": 0
            }
        )
        assert response.status_code == 422
    
    def test_missing_card_id(self, api_client):
        """Test that missing card_id returns validation error"""
        response = api_client.post(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}/cards/move",
            json={
                "source_list_id": LIST_ABIERTAS,
                "destination_list_id": LIST_EN_PROGRESO,
                "new_position": 0
            }
        )
        assert response.status_code == 422
    
    def test_missing_new_position(self, api_client):
        """Test that missing new_position returns validation error"""
        response = api_client.post(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}/cards/move",
            json={
                "source_list_id": LIST_ABIERTAS,
                "destination_list_id": LIST_EN_PROGRESO,
                "card_id": "some_card"
            }
        )
        assert response.status_code == 422


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
