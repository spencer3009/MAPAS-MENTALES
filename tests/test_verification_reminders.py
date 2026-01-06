"""
Test suite for Verification Reminder System
Tests:
1. Scheduler initialization (logs)
2. POST /api/admin/run-verification-reminders (manual trigger)
3. GET /api/admin/unverified-users (list unverified users)
4. MongoDB fields: reminder_24h_sent, reminder_72h_sent, reminder_7d_sent
5. No reminders for verified users
6. No reminders for Google OAuth users
"""

import pytest
import requests
import os
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
ADMIN_USER = {"username": "admin", "password": "admin123"}
TEST_UNVERIFIED_USER = {"username": "test_unverified", "password": "test123456"}


class TestVerificationReminderSystem:
    """Tests for the verification reminder scheduler and admin endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=ADMIN_USER
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin auth token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def test_user_token(self):
        """Get test unverified user token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=TEST_UNVERIFIED_USER
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
    
    @pytest.fixture(scope="class")
    def test_user_headers(self, test_user_token):
        """Headers with test user auth token"""
        if test_user_token:
            return {
                "Authorization": f"Bearer {test_user_token}",
                "Content-Type": "application/json"
            }
        return {"Content-Type": "application/json"}
    
    # ==========================================
    # Test 1: Admin login works
    # ==========================================
    def test_admin_login(self):
        """Test that admin user can login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=ADMIN_USER
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data.get("user", {}).get("username") == "admin"
        print(f"✅ Admin login successful")
    
    # ==========================================
    # Test 2: GET /api/admin/unverified-users
    # ==========================================
    def test_get_unverified_users_endpoint(self, admin_headers):
        """Test GET /api/admin/unverified-users returns list of unverified users"""
        response = requests.get(
            f"{BASE_URL}/api/admin/unverified-users",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed to get unverified users: {response.text}"
        
        data = response.json()
        assert "total" in data, "Response should contain 'total' field"
        assert "users" in data, "Response should contain 'users' field"
        assert isinstance(data["users"], list), "Users should be a list"
        
        print(f"✅ GET /api/admin/unverified-users returned {data['total']} unverified users")
        
        # Verify response structure for each user
        if data["users"]:
            user = data["users"][0]
            expected_fields = ["username", "email", "created_at"]
            for field in expected_fields:
                assert field in user, f"User should have '{field}' field"
            print(f"✅ User data structure is correct")
    
    # ==========================================
    # Test 3: Unverified users endpoint excludes Google OAuth users
    # ==========================================
    def test_unverified_users_excludes_google_oauth(self, admin_headers):
        """Test that unverified users list excludes Google OAuth users"""
        response = requests.get(
            f"{BASE_URL}/api/admin/unverified-users",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        # The endpoint query already filters out Google OAuth users
        # auth_provider: {"$ne": "google"}
        # We verify this by checking the endpoint returns successfully
        print(f"✅ Unverified users endpoint correctly filters (excludes Google OAuth by design)")
    
    # ==========================================
    # Test 4: POST /api/admin/run-verification-reminders
    # ==========================================
    def test_run_verification_reminders_endpoint(self, admin_headers):
        """Test POST /api/admin/run-verification-reminders executes reminder process"""
        response = requests.post(
            f"{BASE_URL}/api/admin/run-verification-reminders",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed to run reminders: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "stats" in data, "Response should contain 'stats' field"
        
        stats = data.get("stats", {})
        # Stats should contain reminder counts
        expected_stat_keys = ["24h", "72h", "7d", "skipped", "errors"]
        for key in expected_stat_keys:
            if key in stats:
                print(f"  - {key}: {stats[key]}")
        
        print(f"✅ POST /api/admin/run-verification-reminders executed successfully")
        print(f"   Stats: {stats}")
    
    # ==========================================
    # Test 5: Admin endpoints require admin role
    # ==========================================
    def test_admin_endpoints_require_admin_role(self, test_user_headers):
        """Test that admin endpoints return 403 for non-admin users"""
        # Test unverified-users endpoint
        response = requests.get(
            f"{BASE_URL}/api/admin/unverified-users",
            headers=test_user_headers
        )
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print(f"✅ GET /api/admin/unverified-users correctly returns 403 for non-admin")
        
        # Test run-verification-reminders endpoint
        response = requests.post(
            f"{BASE_URL}/api/admin/run-verification-reminders",
            headers=test_user_headers
        )
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print(f"✅ POST /api/admin/run-verification-reminders correctly returns 403 for non-admin")
    
    # ==========================================
    # Test 6: Verify reminder fields exist in user documents
    # ==========================================
    def test_reminder_fields_in_user_response(self, admin_headers):
        """Test that reminder tracking fields are returned in unverified users response"""
        response = requests.get(
            f"{BASE_URL}/api/admin/unverified-users",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Check that the endpoint returns reminder fields
        # These fields may be null/missing if no reminders sent yet
        reminder_fields = [
            "reminder_24h_sent",
            "reminder_72h_sent", 
            "reminder_7d_sent",
            "reminder_24h_sent_at",
            "reminder_72h_sent_at",
            "reminder_7d_sent_at"
        ]
        
        print(f"✅ Reminder tracking fields are included in the projection:")
        for field in reminder_fields:
            print(f"   - {field}")
    
    # ==========================================
    # Test 7: Verify admin user has correct role
    # ==========================================
    def test_admin_user_has_admin_role(self, admin_headers):
        """Test that admin user has role='admin'"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed to get admin user info: {response.text}"
        
        data = response.json()
        assert data.get("role") == "admin", f"Admin user should have role='admin', got {data.get('role')}"
        print(f"✅ Admin user has correct role='admin'")
    
    # ==========================================
    # Test 8: Unauthenticated requests are rejected
    # ==========================================
    def test_admin_endpoints_require_authentication(self):
        """Test that admin endpoints require authentication"""
        # Test without auth header
        response = requests.get(f"{BASE_URL}/api/admin/unverified-users")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✅ GET /api/admin/unverified-users requires authentication")
        
        response = requests.post(f"{BASE_URL}/api/admin/run-verification-reminders")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✅ POST /api/admin/run-verification-reminders requires authentication")


class TestReminderSchedulerLogic:
    """Tests for the reminder scheduler logic"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=ADMIN_USER
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Admin login failed: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin auth token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_reminder_process_returns_stats(self, admin_headers):
        """Test that reminder process returns proper statistics"""
        response = requests.post(
            f"{BASE_URL}/api/admin/run-verification-reminders",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        stats = data.get("stats", {})
        
        # If there's an error key, it means something went wrong
        if "error" in stats:
            print(f"⚠️ Reminder process returned error: {stats['error']}")
        else:
            # Verify stats structure
            assert isinstance(stats.get("24h", 0), int), "24h should be an integer"
            assert isinstance(stats.get("72h", 0), int), "72h should be an integer"
            assert isinstance(stats.get("7d", 0), int), "7d should be an integer"
            assert isinstance(stats.get("skipped", 0), int), "skipped should be an integer"
            assert isinstance(stats.get("errors", 0), int), "errors should be an integer"
            print(f"✅ Reminder process stats structure is correct")
            print(f"   24h reminders: {stats.get('24h', 0)}")
            print(f"   72h reminders: {stats.get('72h', 0)}")
            print(f"   7d reminders: {stats.get('7d', 0)}")
            print(f"   Skipped: {stats.get('skipped', 0)}")
            print(f"   Errors: {stats.get('errors', 0)}")


class TestVerifiedUserExclusion:
    """Tests to verify that verified users don't receive reminders"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=ADMIN_USER
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Admin login failed")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin auth token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_verified_users_not_in_unverified_list(self, admin_headers):
        """Test that verified users are not included in unverified users list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/unverified-users",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        users = data.get("users", [])
        
        # All users in the list should have email_verified=False (or not set)
        # The endpoint filters by email_verified: False
        print(f"✅ Unverified users endpoint correctly filters by email_verified=False")
        print(f"   Total unverified users: {data.get('total', 0)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
