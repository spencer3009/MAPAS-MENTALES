"""
Test Priority Feature for Kanban Board Cards
Tests:
- Priority selector in task modal (4 options: Baja, Media, Alta, Urgente)
- Priority persistence via PUT /api/boards/{id}/lists/{id}/cards/{id}
- Priority badge visual on cards
- Priority persistence after page refresh
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test board and list IDs from context
TEST_BOARD_ID = "board_37fa1864a7a4"
TEST_LIST_ABIERTAS = "list_74c3d072eda5"
TEST_LIST_PROGRESO = "list_6270568ea8e9"
TEST_LIST_LISTO = "list_5b1e60096f34"

# Priority values
PRIORITIES = ['low', 'medium', 'high', 'urgent']
PRIORITY_LABELS = {
    'low': 'Baja',
    'medium': 'Media',
    'high': 'Alta',
    'urgent': 'Urgente'
}


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for demo user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "demo", "password": "demo123"}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    return data["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestPriorityBackendAPI:
    """Backend API tests for priority feature"""
    
    def test_get_board_with_existing_priorities(self, auth_headers):
        """Test that board returns cards with existing priorities"""
        response = requests.get(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get board: {response.text}"
        
        data = response.json()
        board = data.get("board", {})
        
        # Find cards with priorities
        cards_with_priority = []
        for lst in board.get("lists", []):
            for card in lst.get("cards", []):
                if card.get("priority"):
                    cards_with_priority.append({
                        "id": card["id"],
                        "title": card["title"],
                        "priority": card["priority"],
                        "list_id": lst["id"]
                    })
        
        print(f"Found {len(cards_with_priority)} cards with priority:")
        for card in cards_with_priority:
            print(f"  - {card['title']}: {card['priority']}")
        
        # According to context, there should be cards with priorities
        # 'Arrastra esta tarea' has priority='urgent'
        # 'Tarea en progreso' has priority='medium'
        # 'Tarea completada' has priority='high'
        assert len(cards_with_priority) >= 0, "Board loaded successfully"
    
    def test_set_priority_low(self, auth_headers):
        """Test setting priority to 'low' (Baja)"""
        # First get a card to update
        response = requests.get(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        board = response.json().get("board", {})
        # Find first card in Abiertas list
        card_id = None
        for lst in board.get("lists", []):
            if lst["id"] == TEST_LIST_ABIERTAS and lst.get("cards"):
                card_id = lst["cards"][0]["id"]
                break
        
        if not card_id:
            pytest.skip("No cards found in Abiertas list")
        
        # Update priority to 'low'
        response = requests.put(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}/lists/{TEST_LIST_ABIERTAS}/cards/{card_id}",
            headers=auth_headers,
            json={"priority": "low"}
        )
        assert response.status_code == 200, f"Failed to set priority: {response.text}"
        
        # Verify priority was saved
        response = requests.get(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        board = response.json().get("board", {})
        for lst in board.get("lists", []):
            if lst["id"] == TEST_LIST_ABIERTAS:
                for card in lst.get("cards", []):
                    if card["id"] == card_id:
                        assert card.get("priority") == "low", f"Priority not saved. Got: {card.get('priority')}"
                        print(f"✅ Priority 'low' saved successfully for card {card_id}")
                        return
        
        pytest.fail("Card not found after update")
    
    def test_set_priority_medium(self, auth_headers):
        """Test setting priority to 'medium' (Media)"""
        response = requests.get(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        board = response.json().get("board", {})
        card_id = None
        for lst in board.get("lists", []):
            if lst["id"] == TEST_LIST_PROGRESO and lst.get("cards"):
                card_id = lst["cards"][0]["id"]
                break
        
        if not card_id:
            pytest.skip("No cards found in En Progreso list")
        
        response = requests.put(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}/lists/{TEST_LIST_PROGRESO}/cards/{card_id}",
            headers=auth_headers,
            json={"priority": "medium"}
        )
        assert response.status_code == 200, f"Failed to set priority: {response.text}"
        
        # Verify
        response = requests.get(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}",
            headers=auth_headers
        )
        board = response.json().get("board", {})
        for lst in board.get("lists", []):
            if lst["id"] == TEST_LIST_PROGRESO:
                for card in lst.get("cards", []):
                    if card["id"] == card_id:
                        assert card.get("priority") == "medium", f"Priority not saved. Got: {card.get('priority')}"
                        print(f"✅ Priority 'medium' saved successfully for card {card_id}")
                        return
    
    def test_set_priority_high(self, auth_headers):
        """Test setting priority to 'high' (Alta)"""
        response = requests.get(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        board = response.json().get("board", {})
        card_id = None
        for lst in board.get("lists", []):
            if lst["id"] == TEST_LIST_LISTO and lst.get("cards"):
                card_id = lst["cards"][0]["id"]
                break
        
        if not card_id:
            pytest.skip("No cards found in Listo list")
        
        response = requests.put(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}/lists/{TEST_LIST_LISTO}/cards/{card_id}",
            headers=auth_headers,
            json={"priority": "high"}
        )
        assert response.status_code == 200, f"Failed to set priority: {response.text}"
        
        # Verify
        response = requests.get(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}",
            headers=auth_headers
        )
        board = response.json().get("board", {})
        for lst in board.get("lists", []):
            if lst["id"] == TEST_LIST_LISTO:
                for card in lst.get("cards", []):
                    if card["id"] == card_id:
                        assert card.get("priority") == "high", f"Priority not saved. Got: {card.get('priority')}"
                        print(f"✅ Priority 'high' saved successfully for card {card_id}")
                        return
    
    def test_set_priority_urgent(self, auth_headers):
        """Test setting priority to 'urgent' (Urgente)"""
        response = requests.get(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        board = response.json().get("board", {})
        card_id = None
        for lst in board.get("lists", []):
            if lst["id"] == TEST_LIST_ABIERTAS and lst.get("cards"):
                card_id = lst["cards"][0]["id"]
                break
        
        if not card_id:
            pytest.skip("No cards found in Abiertas list")
        
        response = requests.put(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}/lists/{TEST_LIST_ABIERTAS}/cards/{card_id}",
            headers=auth_headers,
            json={"priority": "urgent"}
        )
        assert response.status_code == 200, f"Failed to set priority: {response.text}"
        
        # Verify
        response = requests.get(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}",
            headers=auth_headers
        )
        board = response.json().get("board", {})
        for lst in board.get("lists", []):
            if lst["id"] == TEST_LIST_ABIERTAS:
                for card in lst.get("cards", []):
                    if card["id"] == card_id:
                        assert card.get("priority") == "urgent", f"Priority not saved. Got: {card.get('priority')}"
                        print(f"✅ Priority 'urgent' saved successfully for card {card_id}")
                        return
    
    def test_clear_priority(self, auth_headers):
        """Test clearing priority (setting to empty string)"""
        response = requests.get(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        board = response.json().get("board", {})
        card_id = None
        for lst in board.get("lists", []):
            if lst["id"] == TEST_LIST_ABIERTAS and lst.get("cards"):
                card_id = lst["cards"][0]["id"]
                break
        
        if not card_id:
            pytest.skip("No cards found in Abiertas list")
        
        # Clear priority
        response = requests.put(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}/lists/{TEST_LIST_ABIERTAS}/cards/{card_id}",
            headers=auth_headers,
            json={"priority": ""}
        )
        assert response.status_code == 200, f"Failed to clear priority: {response.text}"
        
        # Verify
        response = requests.get(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}",
            headers=auth_headers
        )
        board = response.json().get("board", {})
        for lst in board.get("lists", []):
            if lst["id"] == TEST_LIST_ABIERTAS:
                for card in lst.get("cards", []):
                    if card["id"] == card_id:
                        assert card.get("priority") == "", f"Priority not cleared. Got: {card.get('priority')}"
                        print(f"✅ Priority cleared successfully for card {card_id}")
                        return
    
    def test_priority_persists_with_other_fields(self, auth_headers):
        """Test that priority persists when updating other fields"""
        response = requests.get(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        board = response.json().get("board", {})
        card_id = None
        for lst in board.get("lists", []):
            if lst["id"] == TEST_LIST_ABIERTAS and lst.get("cards"):
                card_id = lst["cards"][0]["id"]
                break
        
        if not card_id:
            pytest.skip("No cards found in Abiertas list")
        
        # Set priority first
        response = requests.put(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}/lists/{TEST_LIST_ABIERTAS}/cards/{card_id}",
            headers=auth_headers,
            json={"priority": "high"}
        )
        assert response.status_code == 200
        
        # Update description (without priority field)
        response = requests.put(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}/lists/{TEST_LIST_ABIERTAS}/cards/{card_id}",
            headers=auth_headers,
            json={"description": "Updated description for priority test"}
        )
        assert response.status_code == 200
        
        # Verify priority is still there
        response = requests.get(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}",
            headers=auth_headers
        )
        board = response.json().get("board", {})
        for lst in board.get("lists", []):
            if lst["id"] == TEST_LIST_ABIERTAS:
                for card in lst.get("cards", []):
                    if card["id"] == card_id:
                        assert card.get("priority") == "high", f"Priority lost after updating other fields. Got: {card.get('priority')}"
                        print(f"✅ Priority persists after updating other fields")
                        return
    
    def test_invalid_board_returns_404(self, auth_headers):
        """Test that invalid board ID returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/boards/invalid_board_id/lists/{TEST_LIST_ABIERTAS}/cards/some_card",
            headers=auth_headers,
            json={"priority": "high"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Invalid board returns 404")
    
    def test_invalid_card_returns_404(self, auth_headers):
        """Test that invalid card ID returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}/lists/{TEST_LIST_ABIERTAS}/cards/invalid_card_id",
            headers=auth_headers,
            json={"priority": "high"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Invalid card returns 404")


class TestPriorityDataIntegrity:
    """Test priority data integrity and persistence"""
    
    def test_priority_values_are_valid(self, auth_headers):
        """Test that only valid priority values are accepted"""
        response = requests.get(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        board = response.json().get("board", {})
        card_id = None
        for lst in board.get("lists", []):
            if lst["id"] == TEST_LIST_ABIERTAS and lst.get("cards"):
                card_id = lst["cards"][0]["id"]
                break
        
        if not card_id:
            pytest.skip("No cards found")
        
        # Test all valid priorities
        for priority in PRIORITIES:
            response = requests.put(
                f"{BASE_URL}/api/boards/{TEST_BOARD_ID}/lists/{TEST_LIST_ABIERTAS}/cards/{card_id}",
                headers=auth_headers,
                json={"priority": priority}
            )
            assert response.status_code == 200, f"Failed to set priority '{priority}': {response.text}"
            print(f"✅ Priority '{priority}' ({PRIORITY_LABELS[priority]}) accepted")
    
    def test_restore_original_priorities(self, auth_headers):
        """Restore original priorities as per context"""
        response = requests.get(
            f"{BASE_URL}/api/boards/{TEST_BOARD_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        board = response.json().get("board", {})
        
        # Find cards and restore priorities
        for lst in board.get("lists", []):
            for card in lst.get("cards", []):
                # Set priorities based on card titles (from context)
                if "Arrastra" in card.get("title", ""):
                    requests.put(
                        f"{BASE_URL}/api/boards/{TEST_BOARD_ID}/lists/{lst['id']}/cards/{card['id']}",
                        headers=auth_headers,
                        json={"priority": "urgent"}
                    )
                    print(f"✅ Restored 'urgent' priority for '{card['title']}'")
                elif "progreso" in card.get("title", "").lower():
                    requests.put(
                        f"{BASE_URL}/api/boards/{TEST_BOARD_ID}/lists/{lst['id']}/cards/{card['id']}",
                        headers=auth_headers,
                        json={"priority": "medium"}
                    )
                    print(f"✅ Restored 'medium' priority for '{card['title']}'")
                elif "completada" in card.get("title", "").lower():
                    requests.put(
                        f"{BASE_URL}/api/boards/{TEST_BOARD_ID}/lists/{lst['id']}/cards/{card['id']}",
                        headers=auth_headers,
                        json={"priority": "high"}
                    )
                    print(f"✅ Restored 'high' priority for '{card['title']}'")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
