"""
Test Activity Feed & Notification Preferences API
Tests for:
- GET /api/activity/feed - Get user activity feed
- GET /api/activity/unread-count - Get unread activity count
- POST /api/activity/mark-read - Mark activities as read
- GET /api/user/notification-preferences - Get notification preferences
- PUT /api/user/notification-preferences - Update notification preferences
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USERNAME = "spencer3009"
TEST_PASSWORD = "Socios3009"


class TestActivityFeedAPI:
    """Test Activity Feed endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.token = token
    
    def test_01_get_activity_feed(self):
        """Test GET /api/activity/feed - Should return activity feed"""
        response = self.session.get(f"{BASE_URL}/api/activity/feed")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "activities" in data, "Response should contain 'activities' key"
        assert "total" in data, "Response should contain 'total' key"
        assert "has_more" in data, "Response should contain 'has_more' key"
        assert isinstance(data["activities"], list), "Activities should be a list"
        
        print(f"✅ Activity feed returned {data['total']} activities")
    
    def test_02_get_activity_feed_with_limit(self):
        """Test GET /api/activity/feed with limit parameter"""
        response = self.session.get(f"{BASE_URL}/api/activity/feed?limit=5")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert len(data["activities"]) <= 5, "Should respect limit parameter"
        
        print(f"✅ Activity feed with limit=5 returned {len(data['activities'])} activities")
    
    def test_03_get_activity_feed_with_offset(self):
        """Test GET /api/activity/feed with offset parameter"""
        response = self.session.get(f"{BASE_URL}/api/activity/feed?limit=10&offset=0")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data["activities"], list)
        
        print(f"✅ Activity feed with offset returned {len(data['activities'])} activities")
    
    def test_04_get_activity_feed_include_own(self):
        """Test GET /api/activity/feed with include_own parameter"""
        response = self.session.get(f"{BASE_URL}/api/activity/feed?include_own=true")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data["activities"], list)
        
        print(f"✅ Activity feed with include_own=true returned {len(data['activities'])} activities")
    
    def test_05_get_unread_count(self):
        """Test GET /api/activity/unread-count - Should return unread count"""
        response = self.session.get(f"{BASE_URL}/api/activity/unread-count")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "unread_count" in data, "Response should contain 'unread_count' key"
        assert isinstance(data["unread_count"], int), "unread_count should be an integer"
        assert data["unread_count"] >= 0, "unread_count should be non-negative"
        
        print(f"✅ Unread count: {data['unread_count']}")
    
    def test_06_mark_activities_as_read_all(self):
        """Test POST /api/activity/mark-read - Mark all as read"""
        response = self.session.post(
            f"{BASE_URL}/api/activity/mark-read",
            json={"activity_ids": None}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "marked_count" in data, "Response should contain 'marked_count' key"
        assert isinstance(data["marked_count"], int), "marked_count should be an integer"
        
        print(f"✅ Marked {data['marked_count']} activities as read")
    
    def test_07_mark_specific_activities_as_read(self):
        """Test POST /api/activity/mark-read - Mark specific activities as read"""
        # First get some activities
        feed_response = self.session.get(f"{BASE_URL}/api/activity/feed?limit=5")
        
        if feed_response.status_code == 200:
            activities = feed_response.json().get("activities", [])
            if activities:
                activity_ids = [a["id"] for a in activities[:2]]
                
                response = self.session.post(
                    f"{BASE_URL}/api/activity/mark-read",
                    json={"activity_ids": activity_ids}
                )
                
                assert response.status_code == 200, f"Expected 200, got {response.status_code}"
                
                data = response.json()
                assert "marked_count" in data
                
                print(f"✅ Marked {data['marked_count']} specific activities as read")
            else:
                print("⚠️ No activities to mark as read (feed is empty)")
        else:
            pytest.skip("Could not get activity feed")
    
    def test_08_activity_feed_unauthorized(self):
        """Test GET /api/activity/feed without auth - Should return 401/403"""
        # Create new session without auth
        unauth_session = requests.Session()
        unauth_session.headers.update({"Content-Type": "application/json"})
        
        response = unauth_session.get(f"{BASE_URL}/api/activity/feed")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        print(f"✅ Unauthorized request correctly rejected with {response.status_code}")


class TestNotificationPreferencesAPI:
    """Test Notification Preferences endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_01_get_notification_preferences(self):
        """Test GET /api/user/notification-preferences - Should return preferences"""
        response = self.session.get(f"{BASE_URL}/api/user/notification-preferences")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify structure
        assert "email_enabled" in data, "Should have email_enabled field"
        assert "email_digest" in data, "Should have email_digest field"
        assert "notify_on" in data, "Should have notify_on field"
        
        # Verify types
        assert isinstance(data["email_enabled"], bool), "email_enabled should be boolean"
        assert data["email_digest"] in ["instant", "daily", "weekly", "none"], \
            f"email_digest should be one of instant/daily/weekly/none, got {data['email_digest']}"
        assert isinstance(data["notify_on"], dict), "notify_on should be a dict"
        
        # Verify notify_on structure
        notify_on = data["notify_on"]
        expected_keys = ["comments", "mentions", "invitations", "permission_changes", "task_updates", "resource_changes"]
        for key in expected_keys:
            assert key in notify_on, f"notify_on should have '{key}' key"
        
        print(f"✅ Notification preferences retrieved successfully")
        print(f"   - email_enabled: {data['email_enabled']}")
        print(f"   - email_digest: {data['email_digest']}")
        print(f"   - notify_on: {notify_on}")
    
    def test_02_update_email_enabled(self):
        """Test PUT /api/user/notification-preferences - Update email_enabled"""
        # First get current value
        get_response = self.session.get(f"{BASE_URL}/api/user/notification-preferences")
        current_value = get_response.json().get("email_enabled", True)
        
        # Toggle the value
        new_value = not current_value
        
        response = self.session.put(
            f"{BASE_URL}/api/user/notification-preferences",
            json={"email_enabled": new_value}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "preferences" in data, "Response should contain preferences"
        assert data["preferences"]["email_enabled"] == new_value, \
            f"email_enabled should be {new_value}, got {data['preferences']['email_enabled']}"
        
        # Restore original value
        self.session.put(
            f"{BASE_URL}/api/user/notification-preferences",
            json={"email_enabled": current_value}
        )
        
        print(f"✅ email_enabled updated from {current_value} to {new_value} and restored")
    
    def test_03_update_email_digest(self):
        """Test PUT /api/user/notification-preferences - Update email_digest"""
        # Get current value
        get_response = self.session.get(f"{BASE_URL}/api/user/notification-preferences")
        current_digest = get_response.json().get("email_digest", "instant")
        
        # Test different digest values
        test_values = ["instant", "daily", "weekly", "none"]
        new_value = next(v for v in test_values if v != current_digest)
        
        response = self.session.put(
            f"{BASE_URL}/api/user/notification-preferences",
            json={"email_digest": new_value}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data["preferences"]["email_digest"] == new_value, \
            f"email_digest should be {new_value}, got {data['preferences']['email_digest']}"
        
        # Restore original value
        self.session.put(
            f"{BASE_URL}/api/user/notification-preferences",
            json={"email_digest": current_digest}
        )
        
        print(f"✅ email_digest updated from {current_digest} to {new_value} and restored")
    
    def test_04_update_notify_on_options(self):
        """Test PUT /api/user/notification-preferences - Update notify_on options"""
        # Get current values
        get_response = self.session.get(f"{BASE_URL}/api/user/notification-preferences")
        current_notify_on = get_response.json().get("notify_on", {})
        current_comments = current_notify_on.get("comments", True)
        
        # Toggle comments notification
        new_comments = not current_comments
        
        response = self.session.put(
            f"{BASE_URL}/api/user/notification-preferences",
            json={"notify_on": {"comments": new_comments}}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data["preferences"]["notify_on"]["comments"] == new_comments, \
            f"notify_on.comments should be {new_comments}"
        
        # Restore original value
        self.session.put(
            f"{BASE_URL}/api/user/notification-preferences",
            json={"notify_on": {"comments": current_comments}}
        )
        
        print(f"✅ notify_on.comments updated from {current_comments} to {new_comments} and restored")
    
    def test_05_update_multiple_preferences(self):
        """Test PUT /api/user/notification-preferences - Update multiple fields at once"""
        response = self.session.put(
            f"{BASE_URL}/api/user/notification-preferences",
            json={
                "email_enabled": True,
                "email_digest": "daily",
                "notify_on": {
                    "comments": True,
                    "mentions": True,
                    "invitations": True
                }
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        prefs = data["preferences"]
        
        assert prefs["email_enabled"] == True
        assert prefs["email_digest"] == "daily"
        assert prefs["notify_on"]["comments"] == True
        assert prefs["notify_on"]["mentions"] == True
        assert prefs["notify_on"]["invitations"] == True
        
        print(f"✅ Multiple preferences updated successfully")
    
    def test_06_notification_preferences_unauthorized(self):
        """Test GET /api/user/notification-preferences without auth - Should return 401/403"""
        unauth_session = requests.Session()
        unauth_session.headers.update({"Content-Type": "application/json"})
        
        response = unauth_session.get(f"{BASE_URL}/api/user/notification-preferences")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        print(f"✅ Unauthorized request correctly rejected with {response.status_code}")
    
    def test_07_verify_preferences_persistence(self):
        """Test that preferences persist after update"""
        # Set specific values
        test_prefs = {
            "email_enabled": True,
            "email_digest": "weekly",
            "notify_on": {
                "comments": False,
                "mentions": True
            }
        }
        
        # Update
        update_response = self.session.put(
            f"{BASE_URL}/api/user/notification-preferences",
            json=test_prefs
        )
        assert update_response.status_code == 200
        
        # Get and verify persistence
        get_response = self.session.get(f"{BASE_URL}/api/user/notification-preferences")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data["email_enabled"] == True
        assert data["email_digest"] == "weekly"
        assert data["notify_on"]["comments"] == False
        assert data["notify_on"]["mentions"] == True
        
        print(f"✅ Preferences persisted correctly after update")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
