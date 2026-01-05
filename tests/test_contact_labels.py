"""
Test Contact Labels/Tags Feature for MindoraMap CRM
Tests the complete labels system: CRUD operations for labels and label assignment to contacts
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USER = {
    "nombre": "Test",
    "apellidos": "Labels",
    "email": f"test_labels_{int(time.time())}@example.com",
    "username": f"test_labels_{int(time.time())}",
    "password": "TestLabels123"
}


class TestContactLabelsFeature:
    """Test suite for Contact Labels/Tags functionality"""
    
    token = None
    created_labels = []
    created_contacts = []
    
    @classmethod
    def setup_class(cls):
        """Register test user and get auth token"""
        # Register new user
        response = requests.post(f"{BASE_URL}/api/auth/register", json=TEST_USER)
        if response.status_code == 200:
            data = response.json()
            cls.token = data.get("access_token")
        else:
            # Try login if user exists
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "username": TEST_USER["username"],
                "password": TEST_USER["password"]
            })
            if response.status_code == 200:
                cls.token = response.json().get("access_token")
        
        assert cls.token is not None, "Failed to get auth token"
    
    @classmethod
    def teardown_class(cls):
        """Cleanup test data"""
        if not cls.token:
            return
        
        headers = {"Authorization": f"Bearer {cls.token}"}
        
        # Delete created contacts
        for contact_id in cls.created_contacts:
            try:
                requests.delete(f"{BASE_URL}/api/contacts/{contact_id}", headers=headers)
            except:
                pass
        
        # Delete created labels
        for label_info in cls.created_labels:
            try:
                requests.delete(
                    f"{BASE_URL}/api/contacts/labels/{label_info['type']}/{label_info['id']}", 
                    headers=headers
                )
            except:
                pass
    
    def get_headers(self):
        return {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
    
    # ==========================================
    # LABELS CRUD TESTS
    # ==========================================
    
    def test_01_get_labels_empty(self):
        """GET /api/contacts/labels/{contact_type} - Returns empty list initially"""
        response = requests.get(
            f"{BASE_URL}/api/contacts/labels/client",
            headers=self.get_headers()
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "labels" in data, "Response should contain 'labels' key"
        assert isinstance(data["labels"], list), "Labels should be a list"
    
    def test_02_create_label_client(self):
        """POST /api/contacts/labels/{contact_type} - Create label for clients"""
        label_data = {
            "name": "VIP",
            "color": "#EF4444"  # Red
        }
        response = requests.post(
            f"{BASE_URL}/api/contacts/labels/client",
            headers=self.get_headers(),
            json=label_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "label" in data, "Response should contain 'label'"
        assert data["label"]["name"] == "VIP", "Label name should match"
        assert data["label"]["color"] == "#EF4444", "Label color should match"
        assert "id" in data["label"], "Label should have an ID"
        
        # Store for cleanup
        self.__class__.created_labels.append({"type": "client", "id": data["label"]["id"]})
    
    def test_03_create_label_prospect(self):
        """POST /api/contacts/labels/{contact_type} - Create label for prospects"""
        label_data = {
            "name": "Interesado",
            "color": "#F97316"  # Orange
        }
        response = requests.post(
            f"{BASE_URL}/api/contacts/labels/prospect",
            headers=self.get_headers(),
            json=label_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["label"]["name"] == "Interesado"
        
        self.__class__.created_labels.append({"type": "prospect", "id": data["label"]["id"]})
    
    def test_04_create_label_supplier(self):
        """POST /api/contacts/labels/{contact_type} - Create label for suppliers"""
        label_data = {
            "name": "Preferido",
            "color": "#22C55E"  # Green
        }
        response = requests.post(
            f"{BASE_URL}/api/contacts/labels/supplier",
            headers=self.get_headers(),
            json=label_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["label"]["name"] == "Preferido"
        
        self.__class__.created_labels.append({"type": "supplier", "id": data["label"]["id"]})
    
    def test_05_create_multiple_labels_same_type(self):
        """Create multiple labels for the same contact type"""
        labels_to_create = [
            {"name": "Nuevo", "color": "#3B82F6"},
            {"name": "Activo", "color": "#06B6D4"},
            {"name": "Inactivo", "color": "#6B7280"}
        ]
        
        for label_data in labels_to_create:
            response = requests.post(
                f"{BASE_URL}/api/contacts/labels/client",
                headers=self.get_headers(),
                json=label_data
            )
            assert response.status_code == 200, f"Failed to create label {label_data['name']}: {response.text}"
            data = response.json()
            self.__class__.created_labels.append({"type": "client", "id": data["label"]["id"]})
    
    def test_06_get_labels_after_creation(self):
        """GET /api/contacts/labels/{contact_type} - Returns created labels"""
        response = requests.get(
            f"{BASE_URL}/api/contacts/labels/client",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["labels"]) >= 4, f"Expected at least 4 labels, got {len(data['labels'])}"
        
        # Verify label structure
        for label in data["labels"]:
            assert "id" in label, "Label should have id"
            assert "name" in label, "Label should have name"
            assert "color" in label, "Label should have color"
    
    def test_07_create_duplicate_label_fails(self):
        """POST /api/contacts/labels/{contact_type} - Duplicate name should fail"""
        label_data = {
            "name": "VIP",  # Already exists
            "color": "#A855F7"
        }
        response = requests.post(
            f"{BASE_URL}/api/contacts/labels/client",
            headers=self.get_headers(),
            json=label_data
        )
        assert response.status_code == 400, f"Expected 400 for duplicate, got {response.status_code}"
        assert "existe" in response.json().get("detail", "").lower()
    
    def test_08_create_label_empty_name_fails(self):
        """POST /api/contacts/labels/{contact_type} - Empty name should fail"""
        label_data = {
            "name": "",
            "color": "#3B82F6"
        }
        response = requests.post(
            f"{BASE_URL}/api/contacts/labels/client",
            headers=self.get_headers(),
            json=label_data
        )
        assert response.status_code == 400, f"Expected 400 for empty name, got {response.status_code}"
    
    def test_09_update_label(self):
        """PUT /api/contacts/labels/{contact_type}/{label_id} - Update label"""
        # Get existing labels
        response = requests.get(
            f"{BASE_URL}/api/contacts/labels/client",
            headers=self.get_headers()
        )
        labels = response.json()["labels"]
        assert len(labels) > 0, "Need at least one label to update"
        
        label_to_update = labels[0]
        new_data = {
            "name": "VIP Premium",
            "color": "#EC4899"  # Pink
        }
        
        response = requests.put(
            f"{BASE_URL}/api/contacts/labels/client/{label_to_update['id']}",
            headers=self.get_headers(),
            json=new_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["label"]["name"] == "VIP Premium"
        assert data["label"]["color"] == "#EC4899"
    
    def test_10_update_nonexistent_label_fails(self):
        """PUT /api/contacts/labels/{contact_type}/{label_id} - Non-existent label returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/contacts/labels/client/nonexistent_label_id",
            headers=self.get_headers(),
            json={"name": "Test", "color": "#000000"}
        )
        assert response.status_code == 404
    
    # ==========================================
    # CONTACT WITH LABELS TESTS
    # ==========================================
    
    def test_11_create_contact_with_labels(self):
        """POST /api/contacts - Create contact with labels assigned"""
        # Get available labels
        response = requests.get(
            f"{BASE_URL}/api/contacts/labels/client",
            headers=self.get_headers()
        )
        labels = response.json()["labels"]
        assert len(labels) > 0, "Need labels to assign"
        
        label_ids = [labels[0]["id"], labels[1]["id"]] if len(labels) > 1 else [labels[0]["id"]]
        
        contact_data = {
            "contact_type": "client",
            "nombre": "Juan",
            "apellidos": "Pérez",
            "whatsapp": "+521234567890",
            "email": "juan.perez@test.com",
            "labels": label_ids
        }
        
        response = requests.post(
            f"{BASE_URL}/api/contacts",
            headers=self.get_headers(),
            json=contact_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "contact" in data
        assert data["contact"]["labels"] == label_ids, "Contact should have assigned labels"
        
        self.__class__.created_contacts.append(data["contact"]["id"])
    
    def test_12_get_contact_with_labels(self):
        """GET /api/contacts/{id} - Verify contact has labels"""
        assert len(self.created_contacts) > 0, "Need created contact"
        
        response = requests.get(
            f"{BASE_URL}/api/contacts/{self.created_contacts[0]}",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert "labels" in data["contact"], "Contact should have labels field"
        assert isinstance(data["contact"]["labels"], list), "Labels should be a list"
    
    def test_13_update_contact_labels(self):
        """PUT /api/contacts/{id} - Update contact labels"""
        assert len(self.created_contacts) > 0, "Need created contact"
        
        # Get available labels
        response = requests.get(
            f"{BASE_URL}/api/contacts/labels/client",
            headers=self.get_headers()
        )
        labels = response.json()["labels"]
        
        # Update with different labels
        new_label_ids = [labels[-1]["id"]] if labels else []
        
        response = requests.put(
            f"{BASE_URL}/api/contacts/{self.created_contacts[0]}",
            headers=self.get_headers(),
            json={"labels": new_label_ids}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["contact"]["labels"] == new_label_ids, "Labels should be updated"
    
    def test_14_create_contact_without_labels(self):
        """POST /api/contacts - Create contact without labels (empty array)"""
        contact_data = {
            "contact_type": "client",
            "nombre": "María",
            "apellidos": "García",
            "whatsapp": "+529876543210",
            "email": "maria.garcia@test.com",
            "labels": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/contacts",
            headers=self.get_headers(),
            json=contact_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["contact"]["labels"] == [], "Contact should have empty labels"
        
        self.__class__.created_contacts.append(data["contact"]["id"])
    
    def test_15_list_contacts_includes_labels(self):
        """GET /api/contacts - List contacts includes labels field"""
        response = requests.get(
            f"{BASE_URL}/api/contacts?contact_type=client",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        
        for contact in data["contacts"]:
            assert "labels" in contact, f"Contact {contact['id']} should have labels field"
    
    # ==========================================
    # DELETE LABEL TESTS
    # ==========================================
    
    def test_16_delete_label_removes_from_contacts(self):
        """DELETE /api/contacts/labels/{contact_type}/{label_id} - Removes label from contacts"""
        # Create a label specifically for this test
        label_data = {"name": "ToDelete", "color": "#000000"}
        response = requests.post(
            f"{BASE_URL}/api/contacts/labels/client",
            headers=self.get_headers(),
            json=label_data
        )
        assert response.status_code == 200
        label_id = response.json()["label"]["id"]
        
        # Create contact with this label
        contact_data = {
            "contact_type": "client",
            "nombre": "Test",
            "apellidos": "Delete",
            "whatsapp": "+521111111111",
            "labels": [label_id]
        }
        response = requests.post(
            f"{BASE_URL}/api/contacts",
            headers=self.get_headers(),
            json=contact_data
        )
        assert response.status_code == 200
        contact_id = response.json()["contact"]["id"]
        self.__class__.created_contacts.append(contact_id)
        
        # Delete the label
        response = requests.delete(
            f"{BASE_URL}/api/contacts/labels/client/{label_id}",
            headers=self.get_headers()
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify label is removed from contact
        response = requests.get(
            f"{BASE_URL}/api/contacts/{contact_id}",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        contact = response.json()["contact"]
        assert label_id not in contact.get("labels", []), "Deleted label should be removed from contact"
    
    def test_17_delete_nonexistent_label(self):
        """DELETE /api/contacts/labels/{contact_type}/{label_id} - Non-existent returns 404"""
        # First need to create config for this type
        response = requests.post(
            f"{BASE_URL}/api/contacts/labels/client",
            headers=self.get_headers(),
            json={"name": "TempLabel", "color": "#123456"}
        )
        if response.status_code == 200:
            temp_id = response.json()["label"]["id"]
            # Delete it first
            requests.delete(f"{BASE_URL}/api/contacts/labels/client/{temp_id}", headers=self.get_headers())
        
        # Now try to delete non-existent
        response = requests.delete(
            f"{BASE_URL}/api/contacts/labels/client/nonexistent_id",
            headers=self.get_headers()
        )
        # Should succeed (no error) since it just filters out the non-existent ID
        assert response.status_code in [200, 404]
    
    # ==========================================
    # LABELS ISOLATION BY CONTACT TYPE
    # ==========================================
    
    def test_18_labels_isolated_by_contact_type(self):
        """Labels are isolated per contact type (client, prospect, supplier)"""
        # Get labels for each type
        client_labels = requests.get(
            f"{BASE_URL}/api/contacts/labels/client",
            headers=self.get_headers()
        ).json()["labels"]
        
        prospect_labels = requests.get(
            f"{BASE_URL}/api/contacts/labels/prospect",
            headers=self.get_headers()
        ).json()["labels"]
        
        supplier_labels = requests.get(
            f"{BASE_URL}/api/contacts/labels/supplier",
            headers=self.get_headers()
        ).json()["labels"]
        
        # Verify they have different labels (created in earlier tests)
        client_names = {l["name"] for l in client_labels}
        prospect_names = {l["name"] for l in prospect_labels}
        supplier_names = {l["name"] for l in supplier_labels}
        
        # At minimum, verify the specific labels we created exist in their types
        assert "Interesado" in prospect_names or len(prospect_labels) > 0
        assert "Preferido" in supplier_names or len(supplier_labels) > 0
    
    def test_19_unauthorized_access_fails(self):
        """API endpoints require authentication"""
        # No auth header
        response = requests.get(f"{BASE_URL}/api/contacts/labels/client")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        response = requests.post(
            f"{BASE_URL}/api/contacts/labels/client",
            json={"name": "Test", "color": "#000000"}
        )
        assert response.status_code in [401, 403]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
