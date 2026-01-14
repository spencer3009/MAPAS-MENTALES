"""
Test Admin Plan Management Feature
- POST /api/admin/users/{username}/change-plan
- GET /api/admin/audit-log
- Verify plan badges and audit log creation
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"


class TestAdminPlanManagement:
    """Test admin plan management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.status_code} - {login_response.text}")
        
        token_data = login_response.json()
        self.token = token_data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Get list of users to find a test user
        users_response = self.session.get(f"{BASE_URL}/api/admin/users")
        if users_response.status_code == 200:
            users = users_response.json()
            # Find a non-admin user to test with
            self.test_user = None
            for user in users:
                if user.get("role") != "admin" and user.get("username") != "admin":
                    self.test_user = user
                    break
            if not self.test_user and len(users) > 0:
                # Use first user if no non-admin found
                self.test_user = users[0]
        else:
            self.test_user = None
    
    def test_admin_login_success(self):
        """Test admin can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data.get("token_type") == "bearer"
        print(f"✅ Admin login successful")
    
    def test_get_admin_users_list(self):
        """Test GET /api/admin/users returns user list"""
        response = self.session.get(f"{BASE_URL}/api/admin/users")
        
        assert response.status_code == 200, f"Failed to get users: {response.text}"
        users = response.json()
        assert isinstance(users, list), "Response should be a list"
        
        if len(users) > 0:
            user = users[0]
            # Verify user has expected fields
            assert "username" in user
            assert "email" in user
            print(f"✅ Got {len(users)} users from admin endpoint")
        else:
            print("⚠️ No users found in the system")
    
    def test_change_plan_to_pro(self):
        """Test changing user plan to Pro"""
        if not self.test_user:
            pytest.skip("No test user available")
        
        username = self.test_user.get("username")
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/users/{username}/change-plan",
            json={
                "plan": "pro",
                "expires_at": None,
                "unlimited_access": False
            }
        )
        
        assert response.status_code == 200, f"Failed to change plan: {response.text}"
        data = response.json()
        assert data.get("new_plan") == "pro"
        print(f"✅ Changed {username} plan to Pro")
    
    def test_change_plan_with_expiration(self):
        """Test changing plan with expiration date"""
        if not self.test_user:
            pytest.skip("No test user available")
        
        username = self.test_user.get("username")
        
        # Set expiration to 30 days from now
        expires_at = (datetime.utcnow() + timedelta(days=30)).isoformat() + "Z"
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/users/{username}/change-plan",
            json={
                "plan": "team",
                "expires_at": expires_at,
                "unlimited_access": False
            }
        )
        
        assert response.status_code == 200, f"Failed to change plan: {response.text}"
        data = response.json()
        assert data.get("new_plan") == "team"
        assert data.get("expires_at") is not None
        print(f"✅ Changed {username} plan to Team with expiration")
    
    def test_change_plan_with_unlimited_access(self):
        """Test changing plan with unlimited access flag"""
        if not self.test_user:
            pytest.skip("No test user available")
        
        username = self.test_user.get("username")
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/users/{username}/change-plan",
            json={
                "plan": "business",
                "expires_at": None,
                "unlimited_access": True
            }
        )
        
        assert response.status_code == 200, f"Failed to change plan: {response.text}"
        data = response.json()
        assert data.get("new_plan") == "business"
        assert data.get("unlimited_access") == True
        print(f"✅ Changed {username} plan to Business with unlimited access")
    
    def test_change_plan_to_admin(self):
        """Test changing user plan to Admin"""
        if not self.test_user:
            pytest.skip("No test user available")
        
        username = self.test_user.get("username")
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/users/{username}/change-plan",
            json={
                "plan": "admin",
                "expires_at": None,
                "unlimited_access": True
            }
        )
        
        assert response.status_code == 200, f"Failed to change plan: {response.text}"
        data = response.json()
        assert data.get("new_plan") == "admin"
        print(f"✅ Changed {username} plan to Admin")
    
    def test_change_plan_to_free(self):
        """Test changing user plan back to Free"""
        if not self.test_user:
            pytest.skip("No test user available")
        
        username = self.test_user.get("username")
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/users/{username}/change-plan",
            json={
                "plan": "free",
                "expires_at": None,
                "unlimited_access": False
            }
        )
        
        assert response.status_code == 200, f"Failed to change plan: {response.text}"
        data = response.json()
        assert data.get("new_plan") == "free"
        print(f"✅ Changed {username} plan back to Free")
    
    def test_change_plan_invalid_plan(self):
        """Test changing to invalid plan returns error"""
        if not self.test_user:
            pytest.skip("No test user available")
        
        username = self.test_user.get("username")
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/users/{username}/change-plan",
            json={
                "plan": "invalid_plan",
                "expires_at": None,
                "unlimited_access": False
            }
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid plan, got {response.status_code}"
        print(f"✅ Invalid plan correctly rejected with 400")
    
    def test_change_plan_nonexistent_user(self):
        """Test changing plan for non-existent user returns 404"""
        response = self.session.post(
            f"{BASE_URL}/api/admin/users/nonexistent_user_12345/change-plan",
            json={
                "plan": "pro",
                "expires_at": None,
                "unlimited_access": False
            }
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent user, got {response.status_code}"
        print(f"✅ Non-existent user correctly returns 404")
    
    def test_audit_log_created(self):
        """Test that audit log is created after plan change"""
        if not self.test_user:
            pytest.skip("No test user available")
        
        username = self.test_user.get("username")
        
        # First make a plan change
        self.session.post(
            f"{BASE_URL}/api/admin/users/{username}/change-plan",
            json={
                "plan": "pro",
                "expires_at": None,
                "unlimited_access": False
            }
        )
        
        # Then check audit log
        response = self.session.get(f"{BASE_URL}/api/admin/audit-log")
        
        assert response.status_code == 200, f"Failed to get audit log: {response.text}"
        audit_logs = response.json()
        assert isinstance(audit_logs, list), "Audit log should be a list"
        
        # Find the most recent plan_change for our user
        found = False
        for log in audit_logs:
            if log.get("type") == "plan_change" and log.get("target_username") == username:
                found = True
                assert "admin_username" in log
                assert "previous_plan" in log
                assert "new_plan" in log
                assert "timestamp" in log
                print(f"✅ Audit log entry found for {username}")
                break
        
        assert found, f"No audit log entry found for {username}"
    
    def test_audit_log_filter_by_type(self):
        """Test filtering audit log by type"""
        response = self.session.get(f"{BASE_URL}/api/admin/audit-log?type=plan_change")
        
        assert response.status_code == 200, f"Failed to get filtered audit log: {response.text}"
        audit_logs = response.json()
        
        # All entries should be plan_change type
        for log in audit_logs:
            assert log.get("type") == "plan_change", f"Expected plan_change, got {log.get('type')}"
        
        print(f"✅ Audit log filter by type works correctly ({len(audit_logs)} entries)")
    
    def test_unauthorized_access_without_token(self):
        """Test that endpoints require authentication"""
        # Create a new session without auth
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(
            f"{BASE_URL}/api/admin/users/testuser/change-plan",
            json={"plan": "pro"}
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✅ Unauthorized access correctly rejected")
    
    def test_verify_user_plan_updated_in_database(self):
        """Test that user plan is actually updated in database"""
        if not self.test_user:
            pytest.skip("No test user available")
        
        username = self.test_user.get("username")
        
        # Change plan to team
        self.session.post(
            f"{BASE_URL}/api/admin/users/{username}/change-plan",
            json={
                "plan": "team",
                "expires_at": None,
                "unlimited_access": True
            }
        )
        
        # Verify by getting user details
        response = self.session.get(f"{BASE_URL}/api/admin/users/{username}")
        
        assert response.status_code == 200, f"Failed to get user: {response.text}"
        user = response.json()
        
        assert user.get("plan") == "team", f"Expected plan 'team', got '{user.get('plan')}'"
        assert user.get("plan_override") == True, "Expected plan_override to be True"
        assert user.get("plan_source") == "manual_admin", f"Expected plan_source 'manual_admin', got '{user.get('plan_source')}'"
        print(f"✅ User plan correctly updated in database")
        
        # Reset to free for cleanup
        self.session.post(
            f"{BASE_URL}/api/admin/users/{username}/change-plan",
            json={
                "plan": "free",
                "expires_at": None,
                "unlimited_access": False
            }
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
