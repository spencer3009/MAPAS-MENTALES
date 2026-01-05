"""
Test suite for Contacts Module (CRM básico) - MindoraMap
Tests CRUD operations for contacts and custom fields configuration
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USERNAME = "spencer3009"
TEST_PASSWORD = "Socios3009"


class TestContactsModule:
    """Test suite for Contacts CRM module"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("access_token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    # ==========================================
    # CONTACTS CRUD TESTS
    # ==========================================
    
    def test_get_contacts_empty_or_list(self, headers):
        """Test GET /api/contacts - should return contacts list"""
        response = requests.get(f"{BASE_URL}/api/contacts", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "contacts" in data
        assert isinstance(data["contacts"], list)
        print(f"✅ GET /api/contacts - Found {len(data['contacts'])} contacts")
    
    def test_get_contacts_by_type_client(self, headers):
        """Test GET /api/contacts?contact_type=client - filter by type"""
        response = requests.get(f"{BASE_URL}/api/contacts?contact_type=client", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "contacts" in data
        # All returned contacts should be of type 'client'
        for contact in data["contacts"]:
            assert contact.get("contact_type") == "client"
        print(f"✅ GET /api/contacts?contact_type=client - Found {len(data['contacts'])} clients")
    
    def test_get_contacts_by_type_prospect(self, headers):
        """Test GET /api/contacts?contact_type=prospect - filter by type"""
        response = requests.get(f"{BASE_URL}/api/contacts?contact_type=prospect", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "contacts" in data
        for contact in data["contacts"]:
            assert contact.get("contact_type") == "prospect"
        print(f"✅ GET /api/contacts?contact_type=prospect - Found {len(data['contacts'])} prospects")
    
    def test_get_contacts_by_type_supplier(self, headers):
        """Test GET /api/contacts?contact_type=supplier - filter by type"""
        response = requests.get(f"{BASE_URL}/api/contacts?contact_type=supplier", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "contacts" in data
        for contact in data["contacts"]:
            assert contact.get("contact_type") == "supplier"
        print(f"✅ GET /api/contacts?contact_type=supplier - Found {len(data['contacts'])} suppliers")
    
    def test_create_client_contact(self, headers):
        """Test POST /api/contacts - create a client contact"""
        contact_data = {
            "contact_type": "client",
            "nombre": "TEST_Carlos",
            "apellidos": "García López",
            "whatsapp": "+52 555 123 4567",
            "email": "carlos.test@example.com",
            "custom_fields": {}
        }
        
        response = requests.post(f"{BASE_URL}/api/contacts", headers=headers, json=contact_data)
        assert response.status_code == 200, f"Create contact failed: {response.text}"
        data = response.json()
        
        assert "contact" in data
        contact = data["contact"]
        assert contact["nombre"] == "TEST_Carlos"
        assert contact["apellidos"] == "García López"
        assert contact["whatsapp"] == "+52 555 123 4567"
        assert contact["email"] == "carlos.test@example.com"
        assert contact["contact_type"] == "client"
        assert "id" in contact
        assert contact["id"].startswith("contact_")
        
        # Store for later tests
        self.__class__.created_client_id = contact["id"]
        print(f"✅ POST /api/contacts - Created client: {contact['id']}")
        return contact["id"]
    
    def test_create_prospect_contact(self, headers):
        """Test POST /api/contacts - create a prospect contact"""
        contact_data = {
            "contact_type": "prospect",
            "nombre": "TEST_María",
            "apellidos": "Rodríguez Sánchez",
            "whatsapp": "+52 555 987 6543",
            "email": "",  # Optional field
            "custom_fields": {}
        }
        
        response = requests.post(f"{BASE_URL}/api/contacts", headers=headers, json=contact_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "contact" in data
        contact = data["contact"]
        assert contact["contact_type"] == "prospect"
        assert contact["nombre"] == "TEST_María"
        
        self.__class__.created_prospect_id = contact["id"]
        print(f"✅ POST /api/contacts - Created prospect: {contact['id']}")
        return contact["id"]
    
    def test_create_supplier_contact(self, headers):
        """Test POST /api/contacts - create a supplier contact"""
        contact_data = {
            "contact_type": "supplier",
            "nombre": "TEST_Proveedor",
            "apellidos": "Industrial SA",
            "whatsapp": "+52 555 111 2222",
            "email": "proveedor@industrial.com",
            "custom_fields": {}
        }
        
        response = requests.post(f"{BASE_URL}/api/contacts", headers=headers, json=contact_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "contact" in data
        contact = data["contact"]
        assert contact["contact_type"] == "supplier"
        
        self.__class__.created_supplier_id = contact["id"]
        print(f"✅ POST /api/contacts - Created supplier: {contact['id']}")
        return contact["id"]
    
    def test_create_contact_validation_required_fields(self, headers):
        """Test POST /api/contacts - validation for required fields"""
        # Missing nombre
        contact_data = {
            "contact_type": "client",
            "apellidos": "Test",
            "whatsapp": "+52 555 000 0000"
        }
        
        response = requests.post(f"{BASE_URL}/api/contacts", headers=headers, json=contact_data)
        # Should fail validation (422 Unprocessable Entity)
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("✅ POST /api/contacts - Validation works for missing required fields")
    
    def test_get_contact_by_id(self, headers):
        """Test GET /api/contacts/{id} - get specific contact"""
        contact_id = getattr(self.__class__, 'created_client_id', None)
        if not contact_id:
            pytest.skip("No contact created in previous test")
        
        response = requests.get(f"{BASE_URL}/api/contacts/{contact_id}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "contact" in data
        contact = data["contact"]
        assert contact["id"] == contact_id
        assert contact["nombre"] == "TEST_Carlos"
        print(f"✅ GET /api/contacts/{contact_id} - Retrieved contact successfully")
    
    def test_get_contact_not_found(self, headers):
        """Test GET /api/contacts/{id} - non-existent contact"""
        response = requests.get(f"{BASE_URL}/api/contacts/contact_nonexistent123", headers=headers)
        assert response.status_code == 404
        print("✅ GET /api/contacts/nonexistent - Returns 404 correctly")
    
    def test_update_contact(self, headers):
        """Test PUT /api/contacts/{id} - update contact"""
        contact_id = getattr(self.__class__, 'created_client_id', None)
        if not contact_id:
            pytest.skip("No contact created in previous test")
        
        update_data = {
            "nombre": "TEST_Carlos_Updated",
            "email": "carlos.updated@example.com"
        }
        
        response = requests.put(f"{BASE_URL}/api/contacts/{contact_id}", headers=headers, json=update_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "contact" in data
        contact = data["contact"]
        assert contact["nombre"] == "TEST_Carlos_Updated"
        assert contact["email"] == "carlos.updated@example.com"
        # Unchanged fields should remain
        assert contact["apellidos"] == "García López"
        print(f"✅ PUT /api/contacts/{contact_id} - Updated contact successfully")
    
    def test_update_contact_with_custom_fields(self, headers):
        """Test PUT /api/contacts/{id} - update with custom fields"""
        contact_id = getattr(self.__class__, 'created_client_id', None)
        if not contact_id:
            pytest.skip("No contact created in previous test")
        
        update_data = {
            "custom_fields": {
                "ciudad": "Ciudad de México",
                "empresa": "Tech Corp"
            }
        }
        
        response = requests.put(f"{BASE_URL}/api/contacts/{contact_id}", headers=headers, json=update_data)
        assert response.status_code == 200
        data = response.json()
        
        contact = data["contact"]
        assert contact["custom_fields"]["ciudad"] == "Ciudad de México"
        assert contact["custom_fields"]["empresa"] == "Tech Corp"
        print(f"✅ PUT /api/contacts/{contact_id} - Updated custom fields successfully")
    
    def test_contacts_sorted_by_date(self, headers):
        """Test that contacts are sorted by created_at descending (most recent first)"""
        response = requests.get(f"{BASE_URL}/api/contacts", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        contacts = data["contacts"]
        if len(contacts) >= 2:
            # Check that contacts are sorted by created_at descending
            for i in range(len(contacts) - 1):
                date1 = contacts[i].get("created_at", "")
                date2 = contacts[i + 1].get("created_at", "")
                if date1 and date2:
                    assert date1 >= date2, f"Contacts not sorted correctly: {date1} should be >= {date2}"
            print("✅ Contacts are sorted by created_at descending (most recent first)")
        else:
            print("⚠️ Not enough contacts to verify sorting")
    
    # ==========================================
    # CUSTOM FIELDS CONFIGURATION TESTS
    # ==========================================
    
    def test_get_custom_fields_empty(self, headers):
        """Test GET /api/contacts/config/fields/{type} - get empty config"""
        response = requests.get(f"{BASE_URL}/api/contacts/config/fields/client", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "config" in data
        assert "fields" in data["config"]
        print(f"✅ GET /api/contacts/config/fields/client - Found {len(data['config']['fields'])} custom fields")
    
    def test_create_custom_field_text(self, headers):
        """Test POST /api/contacts/config/fields/{type} - create text field"""
        field_data = {
            "name": "TEST_Ciudad",
            "field_type": "text",
            "is_required": False,
            "color": "#3B82F6"
        }
        
        response = requests.post(f"{BASE_URL}/api/contacts/config/fields/client", headers=headers, json=field_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "field" in data
        field = data["field"]
        assert field["name"] == "TEST_Ciudad"
        assert field["field_type"] == "text"
        assert field["is_required"] == False
        assert "id" in field
        
        self.__class__.created_text_field_id = field["id"]
        print(f"✅ POST /api/contacts/config/fields/client - Created text field: {field['id']}")
    
    def test_create_custom_field_select(self, headers):
        """Test POST /api/contacts/config/fields/{type} - create select field with options"""
        field_data = {
            "name": "TEST_Origen",
            "field_type": "select",
            "is_required": True,
            "color": "#22C55E",
            "options": ["Referido", "Publicidad", "Redes Sociales", "Otro"]
        }
        
        response = requests.post(f"{BASE_URL}/api/contacts/config/fields/client", headers=headers, json=field_data)
        assert response.status_code == 200
        data = response.json()
        
        field = data["field"]
        assert field["name"] == "TEST_Origen"
        assert field["field_type"] == "select"
        assert field["is_required"] == True
        assert len(field["options"]) == 4
        assert "Referido" in field["options"]
        
        self.__class__.created_select_field_id = field["id"]
        print(f"✅ POST /api/contacts/config/fields/client - Created select field: {field['id']}")
    
    def test_create_custom_field_multiselect(self, headers):
        """Test POST /api/contacts/config/fields/{type} - create multiselect field"""
        field_data = {
            "name": "TEST_Intereses",
            "field_type": "multiselect",
            "is_required": False,
            "color": "#A855F7",
            "options": ["Producto A", "Producto B", "Servicio X", "Servicio Y"]
        }
        
        response = requests.post(f"{BASE_URL}/api/contacts/config/fields/client", headers=headers, json=field_data)
        assert response.status_code == 200
        data = response.json()
        
        field = data["field"]
        assert field["name"] == "TEST_Intereses"
        assert field["field_type"] == "multiselect"
        assert len(field["options"]) == 4
        
        self.__class__.created_multiselect_field_id = field["id"]
        print(f"✅ POST /api/contacts/config/fields/client - Created multiselect field: {field['id']}")
    
    def test_get_custom_fields_after_creation(self, headers):
        """Test GET /api/contacts/config/fields/{type} - verify fields were created"""
        response = requests.get(f"{BASE_URL}/api/contacts/config/fields/client", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        fields = data["config"]["fields"]
        # Should have at least the 3 fields we created
        test_fields = [f for f in fields if f["name"].startswith("TEST_")]
        assert len(test_fields) >= 3, f"Expected at least 3 TEST_ fields, found {len(test_fields)}"
        print(f"✅ GET /api/contacts/config/fields/client - Found {len(test_fields)} TEST_ custom fields")
    
    def test_custom_fields_appear_in_contact_form(self, headers):
        """Test that custom fields can be used when creating contacts"""
        # First get the custom fields
        response = requests.get(f"{BASE_URL}/api/contacts/config/fields/client", headers=headers)
        assert response.status_code == 200
        fields = response.json()["config"]["fields"]
        
        # Create a contact with custom field values
        custom_field_values = {}
        for field in fields:
            if field["name"] == "TEST_Ciudad":
                custom_field_values[field["id"]] = "Guadalajara"
            elif field["name"] == "TEST_Origen":
                custom_field_values[field["id"]] = "Referido"
            elif field["name"] == "TEST_Intereses":
                custom_field_values[field["id"]] = ["Producto A", "Servicio X"]
        
        contact_data = {
            "contact_type": "client",
            "nombre": "TEST_ContactoConCampos",
            "apellidos": "Personalizado",
            "whatsapp": "+52 555 333 4444",
            "email": "custom@test.com",
            "custom_fields": custom_field_values
        }
        
        response = requests.post(f"{BASE_URL}/api/contacts", headers=headers, json=contact_data)
        assert response.status_code == 200
        data = response.json()
        
        contact = data["contact"]
        assert contact["custom_fields"] == custom_field_values
        
        self.__class__.contact_with_custom_fields_id = contact["id"]
        print("✅ Custom fields can be used when creating contacts")
    
    # ==========================================
    # CLEANUP TESTS (DELETE)
    # ==========================================
    
    def test_delete_custom_field(self, headers):
        """Test DELETE /api/contacts/config/fields/{type}/{field_id}"""
        field_id = getattr(self.__class__, 'created_text_field_id', None)
        if not field_id:
            pytest.skip("No field created in previous test")
        
        response = requests.delete(f"{BASE_URL}/api/contacts/config/fields/client/{field_id}", headers=headers)
        assert response.status_code == 200
        print(f"✅ DELETE /api/contacts/config/fields/client/{field_id} - Deleted field")
    
    def test_delete_contact(self, headers):
        """Test DELETE /api/contacts/{id}"""
        contact_id = getattr(self.__class__, 'created_client_id', None)
        if not contact_id:
            pytest.skip("No contact created in previous test")
        
        response = requests.delete(f"{BASE_URL}/api/contacts/{contact_id}", headers=headers)
        assert response.status_code == 200
        
        # Verify deletion
        response = requests.get(f"{BASE_URL}/api/contacts/{contact_id}", headers=headers)
        assert response.status_code == 404
        print(f"✅ DELETE /api/contacts/{contact_id} - Deleted and verified")
    
    def test_delete_contact_not_found(self, headers):
        """Test DELETE /api/contacts/{id} - non-existent contact"""
        response = requests.delete(f"{BASE_URL}/api/contacts/contact_nonexistent123", headers=headers)
        assert response.status_code == 404
        print("✅ DELETE /api/contacts/nonexistent - Returns 404 correctly")
    
    def test_cleanup_test_data(self, headers):
        """Cleanup all TEST_ prefixed data"""
        # Delete test contacts
        response = requests.get(f"{BASE_URL}/api/contacts", headers=headers)
        if response.status_code == 200:
            contacts = response.json()["contacts"]
            for contact in contacts:
                if contact["nombre"].startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/contacts/{contact['id']}", headers=headers)
                    print(f"  Deleted test contact: {contact['nombre']}")
        
        # Delete test custom fields
        for contact_type in ["client", "prospect", "supplier"]:
            response = requests.get(f"{BASE_URL}/api/contacts/config/fields/{contact_type}", headers=headers)
            if response.status_code == 200:
                fields = response.json()["config"]["fields"]
                for field in fields:
                    if field["name"].startswith("TEST_"):
                        requests.delete(f"{BASE_URL}/api/contacts/config/fields/{contact_type}/{field['id']}", headers=headers)
                        print(f"  Deleted test field: {field['name']}")
        
        print("✅ Cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
