#!/usr/bin/env python3
"""
Backend API Testing for MindoraMap Email Verification System
Testing email verification endpoints and user registration flow
"""

import requests
import json
import sys
import uuid
import pymongo
from datetime import datetime
from typing import Dict, List, Optional

# Test Configuration
BASE_URL = "https://paypal-subsys.preview.emergentagent.com/api"

class EmailVerificationTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_results = []
        self.test_user_data = None
        self.verification_token = None
        self.auth_token = None
        
        # MongoDB connection for direct database access
        try:
            self.mongo_client = pymongo.MongoClient("mongodb://localhost:27017")
            self.db = self.mongo_client["test_database"]
            self.users_collection = self.db["users"]
        except Exception as e:
            print(f"Warning: Could not connect to MongoDB: {e}")
            self.mongo_client = None
            self.db = None
            self.users_collection = None
        
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

    def test_register_user(self) -> bool:
        """Test POST /api/auth/register - Should create user with email_verified: false"""
        try:
            # Generate unique test user data
            unique_id = str(uuid.uuid4())[:8]
            self.test_user_data = {
                "username": f"emailtest{unique_id}",
                "password": "test123456",
                "email": f"emailtest{unique_id}@example.com",
                "nombre": "Test",
                "apellidos": "User"
            }
            
            url = f"{self.base_url}/auth/register"
            response = self.session.post(url, json=self.test_user_data)
            
            if response.status_code == 200:
                data = response.json()
                user_info = data.get("user", {})
                
                # Check if email_verified is false
                email_verified = user_info.get("email_verified", True)  # Default True to catch if missing
                has_access_token = bool(data.get("access_token"))
                
                # Store auth token for later tests
                self.auth_token = data.get("access_token")
                
                success = (email_verified == False and has_access_token)
                
                details = f"User: {user_info.get('username')}, email_verified: {email_verified}, has_token: {has_access_token}"
                
                self.log_test(
                    "POST /api/auth/register", 
                    success, 
                    details,
                    {"user": user_info, "email_verified": email_verified}
                )
                return success
            else:
                error_data = response.json() if response.content else {}
                self.log_test("POST /api/auth/register", False, f"HTTP {response.status_code}", error_data)
                return False
                
        except Exception as e:
            self.log_test("POST /api/auth/register", False, f"Exception: {str(e)}")
            return False

    def test_get_auth_me(self) -> bool:
        """Test GET /api/auth/me - Should include email_verified field"""
        try:
            if not self.auth_token:
                self.log_test("GET /api/auth/me", False, "No auth token available")
                return False
            
            url = f"{self.base_url}/auth/me"
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.session.get(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if email_verified field is present and false
                has_email_verified_field = "email_verified" in data
                email_verified = data.get("email_verified", True)
                username = data.get("username")
                email = data.get("email")
                
                success = (has_email_verified_field and email_verified == False)
                
                details = f"User: {username}, email: {email}, email_verified: {email_verified}, field_present: {has_email_verified_field}"
                
                self.log_test(
                    "GET /api/auth/me", 
                    success, 
                    details,
                    {"email_verified": email_verified, "has_field": has_email_verified_field}
                )
                return success
            else:
                error_data = response.json() if response.content else {}
                self.log_test("GET /api/auth/me", False, f"HTTP {response.status_code}", error_data)
                return False
                
        except Exception as e:
            self.log_test("GET /api/auth/me", False, f"Exception: {str(e)}")
            return False

    def get_verification_token_from_db(self) -> bool:
        """Get verification token from MongoDB for the test user"""
        try:
            if self.users_collection is None or not self.test_user_data:
                self.log_test("Get Verification Token", False, "No database connection or test user data")
                return False
            
            # Find user in database
            user = self.users_collection.find_one({"username": self.test_user_data["username"]})
            
            if user:
                self.verification_token = user.get("verification_token")
                has_token = bool(self.verification_token)
                has_expiry = bool(user.get("verification_token_expiry"))
                email_verified = user.get("email_verified", True)
                
                success = (has_token and has_expiry and email_verified == False)
                
                details = f"User: {user.get('username')}, has_token: {has_token}, has_expiry: {has_expiry}, email_verified: {email_verified}"
                
                self.log_test(
                    "Get Verification Token from DB", 
                    success, 
                    details,
                    {"has_token": has_token, "token_length": len(self.verification_token) if self.verification_token else 0}
                )
                return success
            else:
                self.log_test("Get Verification Token from DB", False, "User not found in database")
                return False
                
        except Exception as e:
            self.log_test("Get Verification Token from DB", False, f"Exception: {str(e)}")
            return False

    def test_verify_email(self) -> bool:
        """Test POST /api/auth/verify-email - Should verify the email when given valid token"""
        try:
            if not self.verification_token:
                self.log_test("POST /api/auth/verify-email", False, "No verification token available")
                return False
            
            url = f"{self.base_url}/auth/verify-email"
            payload = {"token": self.verification_token}
            response = self.session.post(url, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                
                success_field = data.get("success", False)
                message = data.get("message", "")
                username = data.get("username")
                
                success = (success_field == True and "verificada" in message.lower())
                
                details = f"Success: {success_field}, Message: {message}, Username: {username}"
                
                self.log_test(
                    "POST /api/auth/verify-email", 
                    success, 
                    details,
                    {"success": success_field, "message": message}
                )
                return success
            else:
                error_data = response.json() if response.content else {}
                self.log_test("POST /api/auth/verify-email", False, f"HTTP {response.status_code}", error_data)
                return False
                
        except Exception as e:
            self.log_test("POST /api/auth/verify-email", False, f"Exception: {str(e)}")
            return False

    def test_verification_status(self) -> bool:
        """Test GET /api/auth/verification-status - Should return verification status"""
        try:
            if not self.auth_token:
                self.log_test("GET /api/auth/verification-status", False, "No auth token available")
                return False
            
            url = f"{self.base_url}/auth/verification-status"
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.session.get(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # After verification, email_verified should be true
                email_verified = data.get("email_verified", False)
                email = data.get("email")
                verified_at = data.get("verified_at")
                
                success = (email_verified == True and bool(verified_at))
                
                details = f"Email: {email}, email_verified: {email_verified}, verified_at: {bool(verified_at)}"
                
                self.log_test(
                    "GET /api/auth/verification-status", 
                    success, 
                    details,
                    {"email_verified": email_verified, "has_verified_at": bool(verified_at)}
                )
                return success
            else:
                error_data = response.json() if response.content else {}
                self.log_test("GET /api/auth/verification-status", False, f"HTTP {response.status_code}", error_data)
                return False
                
        except Exception as e:
            self.log_test("GET /api/auth/verification-status", False, f"Exception: {str(e)}")
            return False

    def test_resend_verification(self) -> bool:
        """Test POST /api/auth/resend-verification - Should generate new token and return success message"""
        try:
            # Create a new unverified user for this test
            unique_id = str(uuid.uuid4())[:8]
            new_user_data = {
                "username": f"resendtest{unique_id}",
                "password": "test123456",
                "email": f"resendtest{unique_id}@example.com",
                "nombre": "Resend",
                "apellidos": "Test"
            }
            
            # Register new user
            register_url = f"{self.base_url}/auth/register"
            register_response = self.session.post(register_url, json=new_user_data)
            
            if register_response.status_code != 200:
                self.log_test("POST /api/auth/resend-verification", False, "Could not create test user for resend test")
                return False
            
            # Test resend verification
            url = f"{self.base_url}/auth/resend-verification"
            payload = {"email": new_user_data["email"]}
            response = self.session.post(url, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                
                success_field = data.get("success", False)
                message = data.get("message", "")
                
                # Should return success even if email doesn't exist (security)
                success = (success_field == True and len(message) > 0)
                
                details = f"Success: {success_field}, Message: {message}"
                
                self.log_test(
                    "POST /api/auth/resend-verification", 
                    success, 
                    details,
                    {"success": success_field, "message": message}
                )
                return success
            else:
                error_data = response.json() if response.content else {}
                self.log_test("POST /api/auth/resend-verification", False, f"HTTP {response.status_code}", error_data)
                return False
                
        except Exception as e:
            self.log_test("POST /api/auth/resend-verification", False, f"Exception: {str(e)}")
            return False

    def test_auth_me_after_verification(self) -> bool:
        """Test GET /api/auth/me after verification - Should show email_verified: true"""
        try:
            if not self.auth_token:
                self.log_test("GET /api/auth/me (after verification)", False, "No auth token available")
                return False
            
            url = f"{self.base_url}/auth/me"
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.session.get(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # After verification, email_verified should be true
                email_verified = data.get("email_verified", False)
                username = data.get("username")
                email = data.get("email")
                
                success = (email_verified == True)
                
                details = f"User: {username}, email: {email}, email_verified: {email_verified}"
                
                self.log_test(
                    "GET /api/auth/me (after verification)", 
                    success, 
                    details,
                    {"email_verified": email_verified}
                )
                return success
            else:
                error_data = response.json() if response.content else {}
                self.log_test("GET /api/auth/me (after verification)", False, f"HTTP {response.status_code}", error_data)
                return False
                
        except Exception as e:
            self.log_test("GET /api/auth/me (after verification)", False, f"Exception: {str(e)}")
            return False

    def cleanup_test_users(self):
        """Clean up test users from database"""
        try:
            if self.users_collection is None and self.test_user_data:
                # Remove test users
                self.users_collection.delete_many({
                    "$or": [
                        {"username": {"$regex": "^emailtest"}},
                        {"username": {"$regex": "^resendtest"}},
                        {"email": {"$regex": "@example.com$"}}
                    ]
                })
                print("🧹 Cleaned up test users from database")
        except Exception as e:
            print(f"Warning: Could not clean up test users: {e}")

    def run_comprehensive_test(self):
        """Run all email verification tests in sequence"""
        print("=" * 80)
        print("📧 MINDORAMAP EMAIL VERIFICATION SYSTEM TESTING")
        print("=" * 80)
        print(f"Base URL: {self.base_url}")
        print(f"Database: test_database")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Step 1: Test user registration
        print("🔍 Testing User Registration...")
        if not self.test_register_user():
            print("❌ Cannot proceed without successful registration")
            self.print_summary()
            return
        
        # Step 2: Test /auth/me includes email_verified field
        print("🔍 Testing GET /api/auth/me (before verification)...")
        self.test_get_auth_me()
        
        # Step 3: Get verification token from database
        print("🔍 Getting Verification Token from Database...")
        if not self.get_verification_token_from_db():
            print("❌ Cannot proceed without verification token")
            self.print_summary()
            return
        
        # Step 4: Test email verification
        print("🔍 Testing Email Verification...")
        self.test_verify_email()
        
        # Step 5: Test verification status endpoint
        print("🔍 Testing Verification Status...")
        self.test_verification_status()
        
        # Step 6: Test /auth/me after verification
        print("🔍 Testing GET /api/auth/me (after verification)...")
        self.test_auth_me_after_verification()
        
        # Step 7: Test resend verification
        print("🔍 Testing Resend Verification...")
        self.test_resend_verification()
        
        # Cleanup
        print("🔍 Cleaning up test data...")
        self.cleanup_test_users()
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("📊 EMAIL VERIFICATION SYSTEM TEST SUMMARY")
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
    # Run email verification tests
    print("Starting Email Verification System Tests...")
    email_tester = EmailVerificationTester()
    email_tester.run_comprehensive_test()