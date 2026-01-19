"""
Test Suite for Company Collaborators System
Tests: GET /api/finanzas/companies (with user_role, is_owner)
       GET /api/finanzas/companies/{id}/collaborators
       POST /api/finanzas/companies/{id}/collaborators/invite
       GET /api/invitations/pending
       verify_company_access for owners and collaborators
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USERNAME = "spencer3009"
TEST_PASSWORD = "Socios3009"


class TestCollaboratorsSystem:
    """Test suite for the collaborators system"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def test_company(self, auth_headers):
        """Create a test company for collaborator tests"""
        company_data = {
            "name": f"TEST_Collaborator_Company_{uuid.uuid4().hex[:8]}",
            "description": "Test company for collaborator testing",
            "currency": "PEN"
        }
        response = requests.post(
            f"{BASE_URL}/api/finanzas/companies",
            headers=auth_headers,
            json=company_data
        )
        assert response.status_code == 200, f"Failed to create test company: {response.text}"
        company = response.json()
        yield company
        
        # Cleanup: Delete test company
        try:
            requests.delete(
                f"{BASE_URL}/api/finanzas/companies/{company['id']}?confirmation=ELIMINAR",
                headers=auth_headers
            )
        except:
            pass
    
    # ==========================================
    # TEST 1: GET /api/finanzas/companies - user_role and is_owner fields
    # ==========================================
    
    def test_get_companies_returns_user_role_and_is_owner(self, auth_headers):
        """Test that GET /api/finanzas/companies returns user_role and is_owner fields"""
        response = requests.get(
            f"{BASE_URL}/api/finanzas/companies",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get companies: {response.text}"
        companies = response.json()
        
        # Should return a list
        assert isinstance(companies, list), "Response should be a list"
        
        # If there are companies, check for user_role and is_owner
        if len(companies) > 0:
            company = companies[0]
            assert "user_role" in company, "Company should have 'user_role' field"
            assert "is_owner" in company, "Company should have 'is_owner' field"
            
            # For owned companies, user_role should be 'owner' and is_owner should be True
            if company.get("is_owner"):
                assert company["user_role"] == "owner", "Owner should have user_role='owner'"
            
            print(f"✅ GET /api/finanzas/companies returns user_role={company['user_role']}, is_owner={company['is_owner']}")
        else:
            print("⚠️ No companies found, creating one to test")
    
    def test_owned_company_has_correct_role(self, auth_headers, test_company):
        """Test that owned company has user_role='owner' and is_owner=True"""
        response = requests.get(
            f"{BASE_URL}/api/finanzas/companies",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        companies = response.json()
        
        # Find our test company
        test_comp = next((c for c in companies if c["id"] == test_company["id"]), None)
        assert test_comp is not None, "Test company should be in the list"
        
        assert test_comp.get("user_role") == "owner", f"Owner should have user_role='owner', got {test_comp.get('user_role')}"
        assert test_comp.get("is_owner") == True, f"Owner should have is_owner=True, got {test_comp.get('is_owner')}"
        
        print(f"✅ Owned company has user_role='owner' and is_owner=True")
    
    # ==========================================
    # TEST 2: GET /api/finanzas/companies/{id}/collaborators
    # ==========================================
    
    def test_get_collaborators_includes_owner(self, auth_headers, test_company):
        """Test that GET collaborators includes the owner in the list"""
        response = requests.get(
            f"{BASE_URL}/api/finanzas/companies/{test_company['id']}/collaborators",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get collaborators: {response.text}"
        data = response.json()
        
        # Check response structure
        assert "collaborators" in data, "Response should have 'collaborators' field"
        assert "total" in data, "Response should have 'total' field"
        assert "company_id" in data, "Response should have 'company_id' field"
        assert "company_name" in data, "Response should have 'company_name' field"
        
        collaborators = data["collaborators"]
        assert isinstance(collaborators, list), "Collaborators should be a list"
        assert len(collaborators) >= 1, "Should have at least the owner"
        
        # Find owner in collaborators
        owner = next((c for c in collaborators if c.get("role") == "owner"), None)
        assert owner is not None, "Owner should be in collaborators list"
        assert owner.get("is_owner") == True, "Owner should have is_owner=True"
        assert owner.get("username") == TEST_USERNAME, f"Owner username should be {TEST_USERNAME}"
        
        print(f"✅ GET collaborators includes owner with role='owner', is_owner=True")
        print(f"   Total collaborators: {data['total']}")
    
    def test_get_collaborators_response_structure(self, auth_headers, test_company):
        """Test the structure of collaborator response"""
        response = requests.get(
            f"{BASE_URL}/api/finanzas/companies/{test_company['id']}/collaborators",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        collaborators = data["collaborators"]
        if len(collaborators) > 0:
            collab = collaborators[0]
            
            # Check required fields
            required_fields = ["id", "username", "email", "full_name", "role", "is_owner"]
            for field in required_fields:
                assert field in collab, f"Collaborator should have '{field}' field"
            
            print(f"✅ Collaborator response has all required fields: {required_fields}")
    
    def test_get_collaborators_nonexistent_company(self, auth_headers):
        """Test GET collaborators for non-existent company returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/finanzas/companies/nonexistent_company_id/collaborators",
            headers=auth_headers
        )
        
        # Should return 403 (no access) or 404 (not found)
        assert response.status_code in [403, 404], f"Expected 403 or 404, got {response.status_code}"
        print(f"✅ Non-existent company returns {response.status_code}")
    
    # ==========================================
    # TEST 3: POST /api/finanzas/companies/{id}/collaborators/invite
    # ==========================================
    
    def test_invite_collaborator_plan_limit(self, auth_headers, test_company):
        """Test that invite fails when plan limit is reached (free plan = 0 collaborators)"""
        invite_data = {
            "email": "test_collaborator@example.com",
            "role": "collaborator",
            "message": "Test invitation"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/finanzas/companies/{test_company['id']}/collaborators/invite",
            headers=auth_headers,
            json=invite_data
        )
        
        # Free plan has 0 collaborators limit, so this should fail with 403
        assert response.status_code == 403, f"Expected 403 for plan limit, got {response.status_code}: {response.text}"
        
        error_data = response.json()
        assert "detail" in error_data, "Error response should have 'detail' field"
        
        # Check that error message mentions plan limit or upgrade
        error_msg = error_data["detail"].lower()
        assert "límite" in error_msg or "plan" in error_msg or "actualiza" in error_msg, \
            f"Error should mention plan limit, got: {error_data['detail']}"
        
        print(f"✅ Invite fails with plan limit message: {error_data['detail']}")
    
    def test_invite_self_fails(self, auth_headers, test_company):
        """Test that inviting yourself fails"""
        # First get the user's email
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers=auth_headers
        )
        assert me_response.status_code == 200
        user_email = me_response.json().get("email", "")
        
        if user_email:
            invite_data = {
                "email": user_email,
                "role": "collaborator",
                "message": "Self invite test"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/finanzas/companies/{test_company['id']}/collaborators/invite",
                headers=auth_headers,
                json=invite_data
            )
            
            # Should fail - either 400 (can't invite self) or 403 (plan limit)
            assert response.status_code in [400, 403], f"Expected 400 or 403, got {response.status_code}"
            print(f"✅ Self-invite correctly rejected with status {response.status_code}")
        else:
            print("⚠️ User email not available, skipping self-invite test")
    
    def test_invite_invalid_role(self, auth_headers, test_company):
        """Test that invalid role is rejected"""
        invite_data = {
            "email": "test@example.com",
            "role": "invalid_role",  # Invalid role
            "message": "Test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/finanzas/companies/{test_company['id']}/collaborators/invite",
            headers=auth_headers,
            json=invite_data
        )
        
        # Should fail with 422 (validation error) or 403 (plan limit first)
        assert response.status_code in [422, 403], f"Expected 422 or 403, got {response.status_code}"
        print(f"✅ Invalid role rejected with status {response.status_code}")
    
    # ==========================================
    # TEST 4: GET /api/invitations/pending
    # ==========================================
    
    def test_get_pending_invitations(self, auth_headers):
        """Test GET /api/invitations/pending returns list"""
        response = requests.get(
            f"{BASE_URL}/api/invitations/pending",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get pending invitations: {response.text}"
        data = response.json()
        
        assert "invitations" in data, "Response should have 'invitations' field"
        assert isinstance(data["invitations"], list), "Invitations should be a list"
        
        print(f"✅ GET /api/invitations/pending returns {len(data['invitations'])} invitations")
    
    def test_pending_invitations_structure(self, auth_headers):
        """Test the structure of pending invitations response"""
        response = requests.get(
            f"{BASE_URL}/api/invitations/pending",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # If there are invitations, check structure
        if len(data["invitations"]) > 0:
            invitation = data["invitations"][0]
            expected_fields = ["id", "company_id", "company_name", "email", "role", "status"]
            for field in expected_fields:
                assert field in invitation, f"Invitation should have '{field}' field"
            print(f"✅ Invitation has expected fields: {expected_fields}")
        else:
            print("✅ No pending invitations (expected for this user)")
    
    # ==========================================
    # TEST 5: verify_company_access for owners and collaborators
    # ==========================================
    
    def test_owner_can_access_company_data(self, auth_headers, test_company):
        """Test that owner can access company financial data"""
        # Test accessing incomes (uses verify_company_access)
        response = requests.get(
            f"{BASE_URL}/api/finanzas/incomes?company_id={test_company['id']}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Owner should access incomes: {response.text}"
        print(f"✅ Owner can access company incomes")
        
        # Test accessing expenses
        response = requests.get(
            f"{BASE_URL}/api/finanzas/expenses?company_id={test_company['id']}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Owner should access expenses: {response.text}"
        print(f"✅ Owner can access company expenses")
        
        # Test accessing summary
        response = requests.get(
            f"{BASE_URL}/api/finanzas/summary?company_id={test_company['id']}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Owner should access summary: {response.text}"
        print(f"✅ Owner can access company summary")
    
    def test_non_owner_cannot_access_other_company(self, auth_headers):
        """Test that user cannot access company they don't own or collaborate on"""
        # Try to access a fake company ID
        fake_company_id = "fake_company_12345"
        
        response = requests.get(
            f"{BASE_URL}/api/finanzas/incomes?company_id={fake_company_id}",
            headers=auth_headers
        )
        
        # Should return 403 (no access) or 404 (not found)
        assert response.status_code in [403, 404], f"Expected 403 or 404, got {response.status_code}"
        print(f"✅ Non-owner/collaborator correctly denied access with {response.status_code}")
    
    # ==========================================
    # TEST 6: Additional edge cases
    # ==========================================
    
    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated requests are denied"""
        response = requests.get(f"{BASE_URL}/api/finanzas/companies")
        assert response.status_code == 403, f"Expected 403 for unauthenticated, got {response.status_code}"
        print(f"✅ Unauthenticated access correctly denied")
    
    def test_invite_to_nonexistent_company(self, auth_headers):
        """Test invite to non-existent company fails"""
        invite_data = {
            "email": "test@example.com",
            "role": "collaborator"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/finanzas/companies/nonexistent_id/collaborators/invite",
            headers=auth_headers,
            json=invite_data
        )
        
        # Should return 403 (no access) or 404 (not found)
        assert response.status_code in [403, 404], f"Expected 403 or 404, got {response.status_code}"
        print(f"✅ Invite to non-existent company returns {response.status_code}")


class TestCollaboratorRoles:
    """Test role-based permissions"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_owner_has_all_permissions(self, auth_headers):
        """Test that owner role has all permissions"""
        # Get companies to find one owned by user
        response = requests.get(
            f"{BASE_URL}/api/finanzas/companies",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        companies = response.json()
        
        owned_company = next((c for c in companies if c.get("is_owner") == True), None)
        
        if owned_company:
            # Owner should be able to view collaborators
            response = requests.get(
                f"{BASE_URL}/api/finanzas/companies/{owned_company['id']}/collaborators",
                headers=auth_headers
            )
            assert response.status_code == 200, "Owner should view collaborators"
            print(f"✅ Owner can view collaborators")
            
            # Owner should be able to access financial data
            response = requests.get(
                f"{BASE_URL}/api/finanzas/summary?company_id={owned_company['id']}",
                headers=auth_headers
            )
            assert response.status_code == 200, "Owner should access summary"
            print(f"✅ Owner can access financial summary")
        else:
            print("⚠️ No owned company found for permission test")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
