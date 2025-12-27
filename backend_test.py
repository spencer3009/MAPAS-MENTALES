#!/usr/bin/env python3
"""
Backend API Testing for MindoraMap Pricing/Plans System
Testing pricing endpoints, plan limits, and user plan functionality
"""

import requests
import json
import sys
import uuid
from datetime import datetime
from typing import Dict, List, Optional

# Test Configuration
BASE_URL = "https://mindmap-cms.preview.emergentagent.com/api"
ADMIN_CREDENTIALS = {
    "username": "spencer3009",
    "password": "Socios3009"
}
FREE_USER_CREDENTIALS = {
    "username": "freetest2025",
    "password": "Test1234!"
}

class AdminUserManagementTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.admin_token = None
        self.non_admin_token = None
        self.test_results = []
        self.temp_user_data = None
        
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

    def get_admin_token(self) -> bool:
        """Get admin authentication token"""
        try:
            url = f"{self.base_url}/auth/login"
            response = self.session.post(url, json=ADMIN_CREDENTIALS)
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("access_token")
                
                if self.admin_token:
                    self.log_test(
                        "Admin Login", 
                        True, 
                        f"Successfully logged in as admin: {ADMIN_CREDENTIALS['username']}",
                        {"token_received": True}
                    )
                    return True
                else:
                    self.log_test("Admin Login", False, "No access token received", data)
                    return False
            else:
                self.log_test("Admin Login", False, f"HTTP {response.status_code}", response.json())
                return False
                
        except Exception as e:
            self.log_test("Admin Login", False, f"Exception: {str(e)}")
            return False

    def get_non_admin_token(self) -> bool:
        """Get non-admin authentication token"""
        try:
            url = f"{self.base_url}/auth/login"
            response = self.session.post(url, json=NON_ADMIN_CREDENTIALS)
            
            if response.status_code == 200:
                data = response.json()
                self.non_admin_token = data.get("access_token")
                
                if self.non_admin_token:
                    self.log_test(
                        "Non-Admin Login", 
                        True, 
                        f"Successfully logged in as non-admin: {NON_ADMIN_CREDENTIALS['username']}",
                        {"token_received": True}
                    )
                    return True
                else:
                    self.log_test("Non-Admin Login", False, "No access token received", data)
                    return False
            else:
                self.log_test("Non-Admin Login", False, f"HTTP {response.status_code}", response.json())
                return False
                
        except Exception as e:
            self.log_test("Non-Admin Login", False, f"Exception: {str(e)}")
            return False

    def create_temp_user(self) -> bool:
        """Create a temporary user for deletion testing"""
        try:
            # Generate unique test user data
            unique_id = str(uuid.uuid4())[:8]
            temp_user = {
                "nombre": "Temp",
                "apellidos": "User",
                "email": f"tempdelete@test.com",
                "username": "tempdeleteuser",
                "password": "test123456"
            }
            
            self.temp_user_data = temp_user
            
            url = f"{self.base_url}/auth/register"
            response = self.session.post(url, json=temp_user)
            
            if response.status_code == 200:
                data = response.json()
                user_info = data.get("user", {})
                
                self.log_test(
                    "Create Temp User", 
                    True, 
                    f"Successfully created temp user: {temp_user['username']}",
                    {"username": temp_user["username"], "email": temp_user["email"]}
                )
                return True
            else:
                error_data = response.json() if response.content else {}
                self.log_test("Create Temp User", False, f"HTTP {response.status_code}", error_data)
                return False
                
        except Exception as e:
            self.log_test("Create Temp User", False, f"Exception: {str(e)}")
            return False

    def test_block_user(self) -> bool:
        """Test blocking a user (admin only)"""
        try:
            if not self.admin_token:
                self.log_test("Block User", False, "No admin token available")
                return False
            
            # Use testuser123 as specified in the requirements
            username = "testuser123"
            url = f"{self.base_url}/admin/users/{username}/block"
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            response = self.session.post(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                success_message = data.get("message", "")
                
                # Check if response indicates success
                block_success = "bloqueado" in success_message.lower() or "blocked" in success_message.lower()
                
                self.log_test(
                    "Block User", 
                    block_success, 
                    f"Successfully blocked user {username}: {success_message}",
                    {"username": username, "message": success_message}
                )
                return block_success
            else:
                error_data = response.json() if response.content else {}
                self.log_test("Block User", False, f"HTTP {response.status_code}", error_data)
                return False
                
        except Exception as e:
            self.log_test("Block User", False, f"Exception: {str(e)}")
            return False

    def test_verify_user_blocked(self) -> bool:
        """Verify user is blocked by checking admin users list"""
        try:
            if not self.admin_token:
                self.log_test("Verify User Blocked", False, "No admin token available")
                return False
            
            url = f"{self.base_url}/admin/users"
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            response = self.session.get(url, headers=headers)
            
            if response.status_code == 200:
                users = response.json()
                
                # Find testuser123 in the list
                target_user = None
                for user in users:
                    if user.get("username") == "testuser123":
                        target_user = user
                        break
                
                if target_user:
                    is_disabled = target_user.get("disabled", False)
                    
                    self.log_test(
                        "Verify User Blocked", 
                        is_disabled, 
                        f"User testuser123 disabled status: {is_disabled}",
                        {"username": "testuser123", "disabled": is_disabled, "user_data": target_user}
                    )
                    return is_disabled
                else:
                    self.log_test("Verify User Blocked", False, "User testuser123 not found in users list")
                    return False
            else:
                error_data = response.json() if response.content else {}
                self.log_test("Verify User Blocked", False, f"HTTP {response.status_code}", error_data)
                return False
                
        except Exception as e:
            self.log_test("Verify User Blocked", False, f"Exception: {str(e)}")
            return False

    def test_unblock_user(self) -> bool:
        """Test unblocking a user (admin only)"""
        try:
            if not self.admin_token:
                self.log_test("Unblock User", False, "No admin token available")
                return False
            
            username = "testuser123"
            url = f"{self.base_url}/admin/users/{username}/unblock"
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            response = self.session.post(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                success_message = data.get("message", "")
                
                # Check if response indicates success
                unblock_success = "desbloqueado" in success_message.lower() or "unblocked" in success_message.lower()
                
                self.log_test(
                    "Unblock User", 
                    unblock_success, 
                    f"Successfully unblocked user {username}: {success_message}",
                    {"username": username, "message": success_message}
                )
                return unblock_success
            else:
                error_data = response.json() if response.content else {}
                self.log_test("Unblock User", False, f"HTTP {response.status_code}", error_data)
                return False
                
        except Exception as e:
            self.log_test("Unblock User", False, f"Exception: {str(e)}")
            return False

    def test_verify_user_unblocked(self) -> bool:
        """Verify user is unblocked by checking admin users list"""
        try:
            if not self.admin_token:
                self.log_test("Verify User Unblocked", False, "No admin token available")
                return False
            
            url = f"{self.base_url}/admin/users"
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            response = self.session.get(url, headers=headers)
            
            if response.status_code == 200:
                users = response.json()
                
                # Find testuser123 in the list
                target_user = None
                for user in users:
                    if user.get("username") == "testuser123":
                        target_user = user
                        break
                
                if target_user:
                    is_disabled = target_user.get("disabled", False)
                    is_enabled = not is_disabled
                    
                    self.log_test(
                        "Verify User Unblocked", 
                        is_enabled, 
                        f"User testuser123 disabled status: {is_disabled} (should be False)",
                        {"username": "testuser123", "disabled": is_disabled, "user_data": target_user}
                    )
                    return is_enabled
                else:
                    self.log_test("Verify User Unblocked", False, "User testuser123 not found in users list")
                    return False
            else:
                error_data = response.json() if response.content else {}
                self.log_test("Verify User Unblocked", False, f"HTTP {response.status_code}", error_data)
                return False
                
        except Exception as e:
            self.log_test("Verify User Unblocked", False, f"Exception: {str(e)}")
            return False

    def test_delete_temp_user(self) -> bool:
        """Test deleting the temporary user"""
        try:
            if not self.admin_token or not self.temp_user_data:
                self.log_test("Delete Temp User", False, "No admin token or temp user data available")
                return False
            
            username = self.temp_user_data["username"]
            url = f"{self.base_url}/admin/users/{username}"
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            response = self.session.delete(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                success_message = data.get("message", "")
                
                # Check if response indicates success
                delete_success = "eliminado" in success_message.lower() or "deleted" in success_message.lower()
                
                self.log_test(
                    "Delete Temp User", 
                    delete_success, 
                    f"Successfully deleted user {username}: {success_message}",
                    {"username": username, "message": success_message}
                )
                return delete_success
            else:
                error_data = response.json() if response.content else {}
                self.log_test("Delete Temp User", False, f"HTTP {response.status_code}", error_data)
                return False
                
        except Exception as e:
            self.log_test("Delete Temp User", False, f"Exception: {str(e)}")
            return False

    def test_cannot_delete_admin(self) -> bool:
        """Test that admin cannot delete themselves"""
        try:
            if not self.admin_token:
                self.log_test("Cannot Delete Admin", False, "No admin token available")
                return False
            
            # Try to delete the admin user (spencer3009)
            username = ADMIN_CREDENTIALS["username"]
            url = f"{self.base_url}/admin/users/{username}"
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            response = self.session.delete(url, headers=headers)
            
            # Should return 400 error
            if response.status_code == 400:
                data = response.json()
                error_message = data.get("detail", "")
                
                # Check for expected error message
                self_delete_error = any([
                    "eliminarte a ti mismo" in error_message.lower(),
                    "delete yourself" in error_message.lower(),
                    "cannot delete" in error_message.lower()
                ])
                
                self.log_test(
                    "Cannot Delete Admin", 
                    self_delete_error, 
                    f"Correctly prevented admin self-deletion: {error_message}",
                    {"status_code": response.status_code, "error_message": error_message}
                )
                return self_delete_error
            else:
                self.log_test("Cannot Delete Admin", False, f"Expected 400, got HTTP {response.status_code}", response.json())
                return False
                
        except Exception as e:
            self.log_test("Cannot Delete Admin", False, f"Exception: {str(e)}")
            return False

    def test_non_admin_access_denied(self) -> bool:
        """Test that non-admin users cannot access admin endpoints"""
        try:
            if not self.non_admin_token:
                self.log_test("Non-Admin Access Denied", False, "No non-admin token available")
                return False
            
            # Try to block a user with non-admin token
            username = "testuser123"
            url = f"{self.base_url}/admin/users/{username}/block"
            headers = {"Authorization": f"Bearer {self.non_admin_token}"}
            
            response = self.session.post(url, headers=headers)
            
            # Should return 403 error
            if response.status_code == 403:
                data = response.json()
                error_message = data.get("detail", "")
                
                # Check for expected error message
                access_denied = any([
                    "acceso denegado" in error_message.lower(),
                    "access denied" in error_message.lower(),
                    "forbidden" in error_message.lower(),
                    "permisos" in error_message.lower(),
                    "permission" in error_message.lower()
                ])
                
                self.log_test(
                    "Non-Admin Access Denied", 
                    access_denied, 
                    f"Correctly denied non-admin access: {error_message}",
                    {"status_code": response.status_code, "error_message": error_message}
                )
                return access_denied
            else:
                self.log_test("Non-Admin Access Denied", False, f"Expected 403, got HTTP {response.status_code}", response.json())
                return False
                
        except Exception as e:
            self.log_test("Non-Admin Access Denied", False, f"Exception: {str(e)}")
            return False

    def run_comprehensive_test(self):
        """Run all admin user management tests in sequence"""
        print("=" * 80)
        print("🔐 MINDORAMAP ADMIN USER MANAGEMENT TESTING")
        print("=" * 80)
        print(f"Base URL: {self.base_url}")
        print(f"Admin User: {ADMIN_CREDENTIALS['username']}")
        print(f"Non-Admin User: {NON_ADMIN_CREDENTIALS['username']}")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Step 1: Get admin token
        print("🔍 Getting Admin Token...")
        if not self.get_admin_token():
            print("❌ Cannot proceed without admin token")
            return
        
        # Step 2: Get non-admin token
        print("🔍 Getting Non-Admin Token...")
        self.get_non_admin_token()
        
        # Step 3: Create temporary user for deletion testing
        print("🔍 Creating Temporary User...")
        self.create_temp_user()
        
        # Step 4: Test block user endpoint
        print("🔍 Testing Block User Endpoint...")
        self.test_block_user()
        
        # Step 5: Verify user is blocked
        print("🔍 Verifying User is Blocked...")
        self.test_verify_user_blocked()
        
        # Step 6: Test unblock user endpoint
        print("🔍 Testing Unblock User Endpoint...")
        self.test_unblock_user()
        
        # Step 7: Verify user is unblocked
        print("🔍 Verifying User is Unblocked...")
        self.test_verify_user_unblocked()
        
        # Step 8: Test delete temporary user
        print("🔍 Testing Delete User Endpoint...")
        self.test_delete_temp_user()
        
        # Step 9: Test security - cannot delete admin
        print("🔍 Testing Security - Cannot Delete Admin...")
        self.test_cannot_delete_admin()
        
        # Step 10: Test security - non-admin access denied
        print("🔍 Testing Security - Non-Admin Access Denied...")
        self.test_non_admin_access_denied()
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("📊 ADMIN USER MANAGEMENT TEST SUMMARY")
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
    tester = AdminUserManagementTester()
    tester.run_comprehensive_test()