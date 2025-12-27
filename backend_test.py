#!/usr/bin/env python3
"""
Backend API Testing for MindoraMap Registration and Google OAuth Authentication
Testing authentication endpoints and user registration functionality
"""

import requests
import json
import sys
import uuid
from datetime import datetime
from typing import Dict, List, Optional

# Test Configuration
BASE_URL = "https://mindflow-89.preview.emergentagent.com/api"
TEST_CREDENTIALS = {
    "username": "spencer3009",
    "password": "Socios3009"
}

class AuthenticationTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.auth_token = None
        self.test_results = []
        self.test_user_data = None
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: dict = None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        result = {
            "timestamp": timestamp,
            "test": test_name,
            "status": status,
            "success": success,
            "details": details,
            "response_data": response_data
        }
        
        self.test_results.append(result)
        print(f"[{timestamp}] {status} - {test_name}")
        if details:
            print(f"    Details: {details}")
        if not success and response_data:
            print(f"    Response: {response_data}")
        print()

    def test_existing_user_login(self) -> bool:
        """Test login with existing user credentials"""
        try:
            url = f"{self.base_url}/auth/login"
            response = self.session.post(url, json=TEST_CREDENTIALS)
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                
                if self.auth_token:
                    # Set authorization header for future requests
                    self.session.headers.update({
                        "Authorization": f"Bearer {self.auth_token}"
                    })
                    
                    user_info = data.get("user", {})
                    token_type = data.get("token_type")
                    
                    # Verify response structure
                    has_required_fields = all([
                        self.auth_token,
                        token_type == "bearer",
                        user_info.get("username"),
                        user_info.get("full_name")
                    ])
                    
                    self.log_test(
                        "Existing User Login", 
                        has_required_fields, 
                        f"Successfully logged in as {user_info.get('username')} ({user_info.get('full_name')})",
                        {
                            "token_received": bool(self.auth_token),
                            "token_type": token_type,
                            "user": user_info,
                            "has_required_fields": has_required_fields
                        }
                    )
                    return has_required_fields
                else:
                    self.log_test("Existing User Login", False, "No access token received", data)
                    return False
            else:
                self.log_test("Existing User Login", False, f"HTTP {response.status_code}", response.json())
                return False
                
        except Exception as e:
            self.log_test("Existing User Login", False, f"Exception: {str(e)}")
            return False

    def test_user_registration(self) -> bool:
        """Test user registration with new user data"""
        try:
            # Generate unique test user data
            unique_id = str(uuid.uuid4())[:8]
            test_user = {
                "nombre": "Test",
                "apellidos": "User",
                "email": f"newuser{unique_id}@test.com",
                "username": f"newuser{unique_id}",
                "password": "test123456"
            }
            
            self.test_user_data = test_user
            
            url = f"{self.base_url}/auth/register"
            response = self.session.post(url, json=test_user)
            
            if response.status_code == 200:
                data = response.json()
                access_token = data.get("access_token")
                token_type = data.get("token_type")
                user_info = data.get("user", {})
                
                # Verify response structure
                registration_success = all([
                    access_token,
                    token_type == "bearer",
                    user_info.get("username") == test_user["username"],
                    user_info.get("full_name") == f"{test_user['nombre']} {test_user['apellidos']}"
                ])
                
                self.log_test(
                    "User Registration", 
                    registration_success, 
                    f"Successfully registered user {test_user['username']}",
                    {
                        "username": test_user["username"],
                        "email": test_user["email"],
                        "token_received": bool(access_token),
                        "token_type": token_type,
                        "user_info": user_info,
                        "registration_success": registration_success
                    }
                )
                return registration_success
            else:
                error_data = response.json() if response.content else {}
                self.log_test("User Registration", False, f"HTTP {response.status_code}", error_data)
                return False
                
        except Exception as e:
            self.log_test("User Registration", False, f"Exception: {str(e)}")
            return False

    def test_duplicate_username_registration(self) -> bool:
        """Test registration with existing username - should fail"""
        try:
            if not self.test_user_data:
                self.log_test("Duplicate Username Registration", False, "No test user data available")
                return False
            
            # Try to register with same username but different email
            duplicate_user = {
                "nombre": "Another",
                "apellidos": "User",
                "email": f"different{uuid.uuid4().hex[:8]}@test.com",
                "username": self.test_user_data["username"],  # Same username
                "password": "different123"
            }
            
            url = f"{self.base_url}/auth/register"
            response = self.session.post(url, json=duplicate_user)
            
            # Should fail with 400 status code
            if response.status_code == 400:
                error_data = response.json()
                error_message = error_data.get("detail", "")
                
                username_error_detected = "nombre de usuario" in error_message.lower() or "username" in error_message.lower()
                
                self.log_test(
                    "Duplicate Username Registration", 
                    username_error_detected, 
                    f"Correctly rejected duplicate username with error: {error_message}",
                    {
                        "status_code": response.status_code,
                        "error_message": error_message,
                        "username_error_detected": username_error_detected
                    }
                )
                return username_error_detected
            else:
                self.log_test("Duplicate Username Registration", False, f"Expected 400, got HTTP {response.status_code}", response.json())
                return False
                
        except Exception as e:
            self.log_test("Duplicate Username Registration", False, f"Exception: {str(e)}")
            return False

    def test_duplicate_email_registration(self) -> bool:
        """Test registration with existing email - should fail"""
        try:
            if not self.test_user_data:
                self.log_test("Duplicate Email Registration", False, "No test user data available")
                return False
            
            # Try to register with same email but different username
            duplicate_user = {
                "nombre": "Another",
                "apellidos": "User",
                "email": self.test_user_data["email"],  # Same email
                "username": f"differentuser{uuid.uuid4().hex[:8]}",
                "password": "different123"
            }
            
            url = f"{self.base_url}/auth/register"
            response = self.session.post(url, json=duplicate_user)
            
            # Should fail with 400 status code
            if response.status_code == 400:
                error_data = response.json()
                error_message = error_data.get("detail", "")
                
                email_error_detected = "correo" in error_message.lower() or "email" in error_message.lower()
                
                self.log_test(
                    "Duplicate Email Registration", 
                    email_error_detected, 
                    f"Correctly rejected duplicate email with error: {error_message}",
                    {
                        "status_code": response.status_code,
                        "error_message": error_message,
                        "email_error_detected": email_error_detected
                    }
                )
                return email_error_detected
            else:
                self.log_test("Duplicate Email Registration", False, f"Expected 400, got HTTP {response.status_code}", response.json())
                return False
                
        except Exception as e:
            self.log_test("Duplicate Email Registration", False, f"Exception: {str(e)}")
            return False

    def test_new_user_login(self) -> bool:
        """Test login with newly registered user"""
        try:
            if not self.test_user_data:
                self.log_test("New User Login", False, "No test user data available")
                return False
            
            login_data = {
                "username": self.test_user_data["username"],
                "password": self.test_user_data["password"]
            }
            
            url = f"{self.base_url}/auth/login"
            response = self.session.post(url, json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                access_token = data.get("access_token")
                token_type = data.get("token_type")
                user_info = data.get("user", {})
                
                # Verify login success
                login_success = all([
                    access_token,
                    token_type == "bearer",
                    user_info.get("username") == self.test_user_data["username"]
                ])
                
                self.log_test(
                    "New User Login", 
                    login_success, 
                    f"Successfully logged in new user {self.test_user_data['username']}",
                    {
                        "username": self.test_user_data["username"],
                        "token_received": bool(access_token),
                        "token_type": token_type,
                        "user_info": user_info,
                        "login_success": login_success
                    }
                )
                return login_success
            else:
                error_data = response.json() if response.content else {}
                self.log_test("New User Login", False, f"HTTP {response.status_code}", error_data)
                return False
                
        except Exception as e:
            self.log_test("New User Login", False, f"Exception: {str(e)}")
            return False

    def test_jwt_authentication(self) -> bool:
        """Test JWT authentication with protected endpoint"""
        try:
            if not self.auth_token:
                self.log_test("JWT Authentication", False, "No auth token available")
                return False
            
            url = f"{self.base_url}/auth/me"
            response = self.session.get(url)
            
            if response.status_code == 200:
                data = response.json()
                username = data.get("username")
                full_name = data.get("full_name")
                
                # Verify response structure
                auth_success = all([
                    username,
                    full_name,
                    username == TEST_CREDENTIALS["username"]
                ])
                
                self.log_test(
                    "JWT Authentication", 
                    auth_success, 
                    f"Successfully accessed protected endpoint as {username}",
                    {
                        "username": username,
                        "full_name": full_name,
                        "auth_success": auth_success
                    }
                )
                return auth_success
            else:
                error_data = response.json() if response.content else {}
                self.log_test("JWT Authentication", False, f"HTTP {response.status_code}", error_data)
                return False
                
        except Exception as e:
            self.log_test("JWT Authentication", False, f"Exception: {str(e)}")
            return False

    def test_google_oauth_session_endpoint(self) -> bool:
        """Test Google OAuth session endpoint (should return proper error for invalid session)"""
        try:
            url = f"{self.base_url}/auth/google/session"
            
            # Test with invalid session_id
            invalid_session_data = {
                "session_id": "invalid_session_id_12345"
            }
            
            response = self.session.post(url, json=invalid_session_data)
            
            # Should return 401 or 503 for invalid session
            if response.status_code in [401, 503]:
                error_data = response.json() if response.content else {}
                error_message = error_data.get("detail", "")
                
                proper_error = any([
                    "sesión" in error_message.lower(),
                    "session" in error_message.lower(),
                    "inválida" in error_message.lower(),
                    "invalid" in error_message.lower(),
                    "expirada" in error_message.lower(),
                    "expired" in error_message.lower(),
                    "conectando" in error_message.lower(),
                    "connecting" in error_message.lower()
                ])
                
                self.log_test(
                    "Google OAuth Session Endpoint", 
                    proper_error, 
                    f"Correctly handled invalid session with status {response.status_code}: {error_message}",
                    {
                        "status_code": response.status_code,
                        "error_message": error_message,
                        "proper_error": proper_error
                    }
                )
                return proper_error
            else:
                self.log_test("Google OAuth Session Endpoint", False, f"Expected 401/503, got HTTP {response.status_code}", response.json())
                return False
                
        except Exception as e:
            self.log_test("Google OAuth Session Endpoint", False, f"Exception: {str(e)}")
            return False

    def test_google_oauth_me_endpoint(self) -> bool:
        """Test Google OAuth me endpoint (should return proper error for no session)"""
        try:
            url = f"{self.base_url}/auth/google/me"
            
            # Test without session token
            response = self.session.get(url)
            
            # Should return 401 for no authentication
            if response.status_code == 401:
                error_data = response.json() if response.content else {}
                error_message = error_data.get("detail", "")
                
                proper_error = any([
                    "autenticado" in error_message.lower(),
                    "authenticated" in error_message.lower(),
                    "sesión" in error_message.lower(),
                    "session" in error_message.lower()
                ])
                
                self.log_test(
                    "Google OAuth Me Endpoint", 
                    proper_error, 
                    f"Correctly handled no session with status {response.status_code}: {error_message}",
                    {
                        "status_code": response.status_code,
                        "error_message": error_message,
                        "proper_error": proper_error
                    }
                )
                return proper_error
            else:
                self.log_test("Google OAuth Me Endpoint", False, f"Expected 401, got HTTP {response.status_code}", response.json())
                return False
                
        except Exception as e:
            self.log_test("Google OAuth Me Endpoint", False, f"Exception: {str(e)}")
            return False

    def run_comprehensive_test(self):
        """Run all authentication tests in sequence"""
        print("=" * 80)
        print("🔐 MINDORAMAP REGISTRATION & GOOGLE OAUTH AUTHENTICATION TESTING")
        print("=" * 80)
        print(f"Base URL: {self.base_url}")
        print(f"Test User: {TEST_CREDENTIALS['username']}")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Step 1: Test existing user login
        print("🔍 Testing Existing User Login...")
        self.test_existing_user_login()
        
        # Step 2: Test JWT authentication with existing user
        print("🔍 Testing JWT Authentication...")
        self.test_jwt_authentication()
        
        # Step 3: Test user registration
        print("🔍 Testing User Registration...")
        self.test_user_registration()
        
        # Step 4: Test duplicate username registration (should fail)
        print("🔍 Testing Duplicate Username Registration...")
        self.test_duplicate_username_registration()
        
        # Step 5: Test duplicate email registration (should fail)
        print("🔍 Testing Duplicate Email Registration...")
        self.test_duplicate_email_registration()
        
        # Step 6: Test login with newly registered user
        print("🔍 Testing New User Login...")
        self.test_new_user_login()
        
        # Step 7: Test Google OAuth endpoints
        print("🔍 Testing Google OAuth Session Endpoint...")
        self.test_google_oauth_session_endpoint()
        
        print("🔍 Testing Google OAuth Me Endpoint...")
        self.test_google_oauth_me_endpoint()
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("📊 AUTHENTICATION TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "0%")
        print()
        
        if failed_tests > 0:
            print("❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
            print()
        
        print("✅ PASSED TESTS:")
        for result in self.test_results:
            if result["success"]:
                print(f"  - {result['test']}")
        
        print("\n" + "=" * 80)
        print(f"Testing completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)

if __name__ == "__main__":
    tester = AuthenticationTester()
    tester.run_comprehensive_test()