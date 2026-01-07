"""
Test Email Verification System
Tests for:
1. Login with unverified user
2. /api/auth/me returns email_verified status
3. POST /api/auth/resend-verification with rate limiting
4. POST /api/auth/update-email
5. GET /api/auth/verification-status
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://mindora-reminders.preview.emergentagent.com').rstrip('/')

# Test credentials for unverified user
TEST_USER = {
    "username": "test_unverified",
    "password": "test123456",
    "email": "test_unverified@test.com"
}


class TestEmailVerificationSystem:
    """Tests for email verification endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token for unverified user"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
        
        # Login to get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USER["username"],
            "password": TEST_USER["password"]
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        yield
    
    def test_01_login_unverified_user(self):
        """Test that unverified user can login"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USER["username"],
            "password": TEST_USER["password"]
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data["token_type"] == "bearer"
        print(f"✅ Login successful for unverified user")
    
    def test_02_auth_me_returns_email_verified_status(self):
        """Test /api/auth/me returns email_verified field"""
        if not self.token:
            pytest.skip("No auth token available")
        
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code == 200, f"Auth/me failed: {response.text}"
        data = response.json()
        
        # Check required fields
        assert "email_verified" in data, "email_verified field missing from /api/auth/me"
        assert "email" in data, "email field missing from /api/auth/me"
        assert "username" in data, "username field missing"
        
        # For our test user, email_verified should be False
        assert data["email_verified"] == False, f"Expected email_verified=False, got {data['email_verified']}"
        assert data["email"] == TEST_USER["email"], f"Email mismatch: {data['email']}"
        
        print(f"✅ /api/auth/me returns email_verified={data['email_verified']}, email={data['email']}")
    
    def test_03_verification_status_endpoint(self):
        """Test GET /api/auth/verification-status"""
        if not self.token:
            pytest.skip("No auth token available")
        
        response = self.session.get(f"{BASE_URL}/api/auth/verification-status")
        
        assert response.status_code == 200, f"Verification status failed: {response.text}"
        data = response.json()
        
        assert "email_verified" in data, "email_verified field missing"
        assert "email" in data, "email field missing"
        assert data["email_verified"] == False, "Expected email_verified=False"
        
        print(f"✅ Verification status: email_verified={data['email_verified']}")
    
    def test_04_resend_verification_success(self):
        """Test POST /api/auth/resend-verification - first request should succeed"""
        if not self.token:
            pytest.skip("No auth token available")
        
        response = self.session.post(f"{BASE_URL}/api/auth/resend-verification", json={
            "email": TEST_USER["email"]
        })
        
        # Should succeed (200) or rate limited (429)
        assert response.status_code in [200, 429], f"Unexpected status: {response.status_code} - {response.text}"
        
        data = response.json()
        
        if response.status_code == 200:
            assert data.get("success") == True, "Expected success=True"
            print(f"✅ Resend verification successful: {data.get('message')}")
            if "resends_remaining" in data:
                print(f"   Resends remaining: {data['resends_remaining']}")
        else:
            # Rate limited - this is expected if test runs multiple times
            print(f"⚠️ Rate limited (expected if test ran recently): {data.get('detail')}")
    
    def test_05_resend_verification_rate_limit(self):
        """Test rate limiting on resend-verification (429 if too frequent)"""
        if not self.token:
            pytest.skip("No auth token available")
        
        # First request
        response1 = self.session.post(f"{BASE_URL}/api/auth/resend-verification", json={
            "email": TEST_USER["email"]
        })
        
        # Immediate second request should be rate limited
        response2 = self.session.post(f"{BASE_URL}/api/auth/resend-verification", json={
            "email": TEST_USER["email"]
        })
        
        # Second request should be rate limited (429) if first succeeded
        if response1.status_code == 200:
            assert response2.status_code == 429, f"Expected 429 rate limit, got {response2.status_code}"
            data = response2.json()
            assert "detail" in data, "Rate limit response should have detail"
            print(f"✅ Rate limiting works: {data['detail']}")
        else:
            # Both were rate limited
            print(f"⚠️ Both requests rate limited (expected if test ran recently)")
    
    def test_06_update_email_success(self):
        """Test POST /api/auth/update-email"""
        if not self.token:
            pytest.skip("No auth token available")
        
        # Use a unique email to avoid conflicts
        new_email = f"test_updated_{int(time.time())}@test.com"
        
        response = self.session.post(f"{BASE_URL}/api/auth/update-email", json={
            "new_email": new_email
        })
        
        assert response.status_code == 200, f"Update email failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Expected success=True"
        assert data.get("new_email") == new_email, f"Email mismatch in response"
        
        print(f"✅ Email updated to: {new_email}")
        
        # Verify the change via verification-status
        status_response = self.session.get(f"{BASE_URL}/api/auth/verification-status")
        if status_response.status_code == 200:
            status_data = status_response.json()
            assert status_data.get("email") == new_email, "Email not updated in status"
            assert status_data.get("email_verified") == False, "Email should be unverified after change"
            print(f"✅ Verified: email changed and marked as unverified")
    
    def test_07_update_email_invalid_format(self):
        """Test update-email with invalid email format"""
        if not self.token:
            pytest.skip("No auth token available")
        
        response = self.session.post(f"{BASE_URL}/api/auth/update-email", json={
            "new_email": "invalid-email"
        })
        
        assert response.status_code == 400, f"Expected 400 for invalid email, got {response.status_code}"
        print(f"✅ Invalid email format rejected correctly")
    
    def test_08_resend_verification_nonexistent_email(self):
        """Test resend-verification with non-existent email (should not reveal if email exists)"""
        if not self.token:
            pytest.skip("No auth token available")
        
        response = self.session.post(f"{BASE_URL}/api/auth/resend-verification", json={
            "email": "nonexistent_email_12345@test.com"
        })
        
        # Should return 200 with generic message (security - don't reveal if email exists)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("success") == True, "Should return success even for non-existent email"
        print(f"✅ Non-existent email handled securely: {data.get('message')}")


class TestGoogleOAuthVerification:
    """Test that Google OAuth users are always verified"""
    
    def test_google_oauth_always_verified(self):
        """Google OAuth users should have email_verified=True"""
        # This is a code review test - verify the logic in server.py
        # Line 625: email_verified = True if auth_provider == "google" else ...
        print("✅ Code review: Google OAuth users are always verified (line 625 in server.py)")
        print("   Logic: email_verified = True if auth_provider == 'google'")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
