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
BASE_URL = "https://finance-hub-477.preview.emergentagent.com/api"
ADMIN_CREDENTIALS = {
    "username": "spencer3009",
    "password": "Socios3009"
}
FREE_USER_CREDENTIALS = {
    "username": "freetest2025",
    "password": "Test1234!"
}

class PricingPlansTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.admin_token = None
        self.free_user_token = None
        self.test_results = []
        self.created_project_id = None
        
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

    def get_free_user_token(self) -> bool:
        """Get free user authentication token"""
        try:
            url = f"{self.base_url}/auth/login"
            response = self.session.post(url, json=FREE_USER_CREDENTIALS)
            
            if response.status_code == 200:
                data = response.json()
                self.free_user_token = data.get("access_token")
                
                if self.free_user_token:
                    self.log_test(
                        "Free User Login", 
                        True, 
                        f"Successfully logged in as free user: {FREE_USER_CREDENTIALS['username']}",
                        {"token_received": True}
                    )
                    return True
                else:
                    self.log_test("Free User Login", False, "No access token received", data)
                    return False
            else:
                self.log_test("Free User Login", False, f"HTTP {response.status_code}", response.json())
                return False
                
        except Exception as e:
            self.log_test("Free User Login", False, f"Exception: {str(e)}")
            return False

    def test_get_plans_endpoint(self) -> bool:
        """Test GET /api/plans endpoint"""
        try:
            url = f"{self.base_url}/plans"
            response = self.session.get(url)
            
            if response.status_code == 200:
                data = response.json()
                plans = data.get("plans", [])
                upgrade_target = data.get("upgrade_target")
                upgrade_plan = data.get("upgrade_plan", {})
                
                # Check if we have 4 plans
                has_four_plans = len(plans) == 4
                
                # Check plan names
                plan_names = [plan.get("id") for plan in plans]
                expected_plans = ["free", "personal", "team", "business"]
                has_correct_plans = all(plan in plan_names for plan in expected_plans)
                
                # Find personal plan
                personal_plan = None
                for plan in plans:
                    if plan.get("id") == "personal":
                        personal_plan = plan
                        break
                
                # Check personal plan details
                personal_correct = False
                if personal_plan:
                    price_correct = personal_plan.get("price") == 3
                    price_display_correct = personal_plan.get("price_display") == "$3"
                    personal_correct = price_correct and price_display_correct
                
                # Check upgrade target
                upgrade_target_correct = upgrade_target == "personal"
                
                # Check upgrade plan info
                upgrade_plan_correct = (
                    upgrade_plan.get("id") == "personal" and
                    upgrade_plan.get("price") == 3 and
                    upgrade_plan.get("price_display") == "$3" and
                    "/mes" in upgrade_plan.get("period", "")
                )
                
                all_checks_pass = (
                    has_four_plans and 
                    has_correct_plans and 
                    personal_correct and 
                    upgrade_target_correct and 
                    upgrade_plan_correct
                )
                
                details = f"Plans: {len(plans)}, Names: {plan_names}, Personal price: ${personal_plan.get('price') if personal_plan else 'N/A'}, Upgrade target: {upgrade_target}"
                
                self.log_test(
                    "GET /api/plans", 
                    all_checks_pass, 
                    details,
                    {
                        "plans_count": len(plans),
                        "plan_names": plan_names,
                        "personal_plan": personal_plan,
                        "upgrade_target": upgrade_target,
                        "upgrade_plan": upgrade_plan
                    }
                )
                return all_checks_pass
            else:
                self.log_test("GET /api/plans", False, f"HTTP {response.status_code}", response.json())
                return False
                
        except Exception as e:
            self.log_test("GET /api/plans", False, f"Exception: {str(e)}")
            return False

    def test_get_plan_by_id_personal(self) -> bool:
        """Test GET /api/plans/personal endpoint"""
        try:
            url = f"{self.base_url}/plans/personal"
            response = self.session.get(url)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check personal plan details
                id_correct = data.get("id") == "personal"
                name_correct = data.get("name") == "Personal"
                price_correct = data.get("price") == 3
                price_display_correct = data.get("price_display") == "$3"
                
                all_correct = id_correct and name_correct and price_correct and price_display_correct
                
                details = f"ID: {data.get('id')}, Name: {data.get('name')}, Price: {data.get('price')}, Display: {data.get('price_display')}"
                
                self.log_test(
                    "GET /api/plans/personal", 
                    all_correct, 
                    details,
                    data
                )
                return all_correct
            else:
                self.log_test("GET /api/plans/personal", False, f"HTTP {response.status_code}", response.json())
                return False
                
        except Exception as e:
            self.log_test("GET /api/plans/personal", False, f"Exception: {str(e)}")
            return False

    def test_get_plan_by_id_pro_alias(self) -> bool:
        """Test GET /api/plans/pro endpoint (should return personal plan via alias)"""
        try:
            url = f"{self.base_url}/plans/pro"
            response = self.session.get(url)
            
            if response.status_code == 200:
                data = response.json()
                
                # Should return personal plan data due to alias mapping
                id_correct = data.get("id") == "personal"
                name_correct = data.get("name") == "Personal"
                price_correct = data.get("price") == 3
                
                all_correct = id_correct and name_correct and price_correct
                
                details = f"Alias 'pro' -> ID: {data.get('id')}, Name: {data.get('name')}, Price: {data.get('price')}"
                
                self.log_test(
                    "GET /api/plans/pro (alias)", 
                    all_correct, 
                    details,
                    data
                )
                return all_correct
            else:
                self.log_test("GET /api/plans/pro (alias)", False, f"HTTP {response.status_code}", response.json())
                return False
                
        except Exception as e:
            self.log_test("GET /api/plans/pro (alias)", False, f"Exception: {str(e)}")
            return False

    def test_get_plan_by_id_invalid(self) -> bool:
        """Test GET /api/plans/invalid endpoint (should return 404)"""
        try:
            url = f"{self.base_url}/plans/invalid"
            response = self.session.get(url)
            
            # Should return 404
            if response.status_code == 404:
                self.log_test(
                    "GET /api/plans/invalid", 
                    True, 
                    "Correctly returned 404 for invalid plan ID",
                    {"status_code": response.status_code}
                )
                return True
            else:
                self.log_test("GET /api/plans/invalid", False, f"Expected 404, got HTTP {response.status_code}", response.json())
                return False
                
        except Exception as e:
            self.log_test("GET /api/plans/invalid", False, f"Exception: {str(e)}")
            return False

    def test_free_user_plan_limits(self) -> bool:
        """Test free user plan limits via /api/user/plan-limits"""
        try:
            if not self.free_user_token:
                self.log_test("Free User Plan Limits", False, "No free user token available")
                return False
            
            url = f"{self.base_url}/user/plan-limits"
            headers = {"Authorization": f"Bearer {self.free_user_token}"}
            response = self.session.get(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check plan is free
                plan_correct = data.get("plan") == "free"
                
                # Check limits structure
                limits = data.get("limits", {})
                usage = data.get("usage", {})
                
                # Check free plan limits
                max_active_maps = limits.get("max_active_maps")
                max_nodes_per_map = limits.get("max_nodes_per_map")
                can_collaborate = limits.get("can_collaborate")
                
                limits_correct = (
                    max_active_maps == 3 and
                    max_nodes_per_map == 50 and
                    can_collaborate == False
                )
                
                # Check usage data exists
                usage_correct = (
                    "active_maps" in usage and
                    "can_create_map" in usage
                )
                
                all_correct = plan_correct and limits_correct and usage_correct
                
                details = f"Plan: {data.get('plan')}, Max active: {max_active_maps}, Max nodes: {max_nodes_per_map}, Can collaborate: {can_collaborate}"
                
                self.log_test(
                    "Free User Plan Limits", 
                    all_correct, 
                    details,
                    data
                )
                return all_correct
            else:
                self.log_test("Free User Plan Limits", False, f"HTTP {response.status_code}", response.json())
                return False
                
        except Exception as e:
            self.log_test("Free User Plan Limits", False, f"Exception: {str(e)}")
            return False

    def test_create_map_and_verify_limits(self) -> bool:
        """Test creating a map and verify limits update correctly"""
        try:
            if not self.free_user_token:
                self.log_test("Create Map and Verify Limits", False, "No free user token available")
                return False
            
            # First get current limits
            url = f"{self.base_url}/user/plan-limits"
            headers = {"Authorization": f"Bearer {self.free_user_token}"}
            response = self.session.get(url, headers=headers)
            
            if response.status_code != 200:
                self.log_test("Create Map and Verify Limits", False, "Could not get initial limits")
                return False
            
            initial_data = response.json()
            initial_active_maps = initial_data.get("usage", {}).get("active_maps", 0)
            
            # Create a new project
            project_data = {
                "name": "Test Pricing Project",
                "nodes": [
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Test Node",
                        "x": 400,
                        "y": 300,
                        "parentId": None,
                        "color": "blue"
                    }
                ],
                "layoutType": "mindflow"
            }
            
            create_url = f"{self.base_url}/projects"
            create_response = self.session.post(create_url, json=project_data, headers=headers)
            
            if create_response.status_code == 200:
                created_project = create_response.json()
                self.created_project_id = created_project.get("id")
                
                # Get updated limits
                updated_response = self.session.get(url, headers=headers)
                if updated_response.status_code == 200:
                    updated_data = updated_response.json()
                    updated_active_maps = updated_data.get("usage", {}).get("active_maps", 0)
                    
                    # Check if active maps count increased by 1
                    maps_increased = updated_active_maps == (initial_active_maps + 1)
                    
                    details = f"Initial active maps: {initial_active_maps}, Updated active maps: {updated_active_maps}, Project created: {self.created_project_id}"
                    
                    self.log_test(
                        "Create Map and Verify Limits", 
                        maps_increased, 
                        details,
                        {
                            "initial_active_maps": initial_active_maps,
                            "updated_active_maps": updated_active_maps,
                            "project_id": self.created_project_id
                        }
                    )
                    return maps_increased
                else:
                    self.log_test("Create Map and Verify Limits", False, "Could not get updated limits")
                    return False
            else:
                self.log_test("Create Map and Verify Limits", False, f"Could not create project: HTTP {create_response.status_code}", create_response.json())
                return False
                
        except Exception as e:
            self.log_test("Create Map and Verify Limits", False, f"Exception: {str(e)}")
            return False

    def test_exceed_limits_error_message(self) -> bool:
        """Test exceeding limits and verify error message mentions 'Personal' plan"""
        try:
            if not self.free_user_token:
                self.log_test("Exceed Limits Error Message", False, "No free user token available")
                return False
            
            # Try to create multiple projects to exceed the free plan limit (3 active maps)
            headers = {"Authorization": f"Bearer {self.free_user_token}"}
            
            # Create projects until we hit the limit
            created_projects = []
            for i in range(5):  # Try to create 5 projects (should fail after 3)
                project_data = {
                    "name": f"Test Limit Project {i+1}",
                    "nodes": [
                        {
                            "id": str(uuid.uuid4()),
                            "text": f"Test Node {i+1}",
                            "x": 400,
                            "y": 300,
                            "parentId": None,
                            "color": "blue"
                        }
                    ],
                    "layoutType": "mindflow"
                }
                
                create_url = f"{self.base_url}/projects"
                create_response = self.session.post(create_url, json=project_data, headers=headers)
                
                if create_response.status_code == 200:
                    created_project = create_response.json()
                    created_projects.append(created_project.get("id"))
                elif create_response.status_code == 403:
                    # This is expected when hitting the limit
                    error_data = create_response.json()
                    error_message = error_data.get("detail", "")
                    
                    # Check if error message mentions "Personal" plan
                    mentions_personal = "personal" in error_message.lower() or "pro" in error_message.lower()
                    
                    details = f"Hit limit after {len(created_projects)} projects. Error: {error_message}"
                    
                    self.log_test(
                        "Exceed Limits Error Message", 
                        mentions_personal, 
                        details,
                        {
                            "created_projects": len(created_projects),
                            "error_message": error_message,
                            "mentions_personal": mentions_personal
                        }
                    )
                    
                    # Clean up created projects
                    self.cleanup_test_projects(created_projects, headers)
                    
                    return mentions_personal
                else:
                    self.log_test("Exceed Limits Error Message", False, f"Unexpected response: HTTP {create_response.status_code}")
                    return False
            
            # If we got here, we didn't hit the limit (unexpected)
            self.log_test("Exceed Limits Error Message", False, f"Did not hit limit after creating {len(created_projects)} projects")
            
            # Clean up created projects
            self.cleanup_test_projects(created_projects, headers)
            
            return False
                
        except Exception as e:
            self.log_test("Exceed Limits Error Message", False, f"Exception: {str(e)}")
            return False

    def cleanup_test_projects(self, project_ids: List[str], headers: dict):
        """Clean up test projects"""
        for project_id in project_ids:
            try:
                delete_url = f"{self.base_url}/projects/{project_id}"
                self.session.delete(delete_url, headers=headers)
            except:
                pass  # Ignore cleanup errors

    def run_comprehensive_test(self):
        """Run all pricing/plans tests in sequence"""
        print("=" * 80)
        print("💰 MINDORAMAP PRICING/PLANS SYSTEM TESTING")
        print("=" * 80)
        print(f"Base URL: {self.base_url}")
        print(f"Admin User: {ADMIN_CREDENTIALS['username']}")
        print(f"Free User: {FREE_USER_CREDENTIALS['username']}")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Step 1: Test /api/plans endpoint
        print("🔍 Testing GET /api/plans endpoint...")
        self.test_get_plans_endpoint()
        
        # Step 2: Test /api/plans/personal endpoint
        print("🔍 Testing GET /api/plans/personal endpoint...")
        self.test_get_plan_by_id_personal()
        
        # Step 3: Test /api/plans/pro endpoint (alias)
        print("🔍 Testing GET /api/plans/pro endpoint (alias)...")
        self.test_get_plan_by_id_pro_alias()
        
        # Step 4: Test /api/plans/invalid endpoint
        print("🔍 Testing GET /api/plans/invalid endpoint...")
        self.test_get_plan_by_id_invalid()
        
        # Step 5: Get free user token
        print("🔍 Getting Free User Token...")
        if not self.get_free_user_token():
            print("❌ Cannot proceed with user-specific tests without free user token")
            self.print_summary()
            return
        
        # Step 6: Test free user plan limits
        print("🔍 Testing Free User Plan Limits...")
        self.test_free_user_plan_limits()
        
        # Step 7: Test creating map and verify limits update
        print("🔍 Testing Create Map and Verify Limits...")
        self.test_create_map_and_verify_limits()
        
        # Step 8: Test exceeding limits and error message
        print("🔍 Testing Exceed Limits Error Message...")
        self.test_exceed_limits_error_message()
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("📊 PRICING/PLANS SYSTEM TEST SUMMARY")
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


class AdminUserManagementTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.admin_token = None
        NON_ADMIN_CREDENTIALS = {
            "username": "carlos3009",
            "password": "Socios3009"
        }
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
        NON_ADMIN_CREDENTIALS = {
            "username": "carlos3009",
            "password": "Socios3009"
        }
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
        NON_ADMIN_CREDENTIALS = {
            "username": "carlos3009",
            "password": "Socios3009"
        }
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
        NON_ADMIN_CREDENTIALS = {
            "username": "carlos3009",
            "password": "Socios3009"
        }
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
                "username": "emailtest123",
                "password": "test123456",
                "email": "emailtest123@example.com",
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
            if not self.users_collection or not self.test_user_data:
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


class ReminderEmailNotificationTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_results = []
        self.auth_token = None
        self.created_reminders = []
        
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

    def get_auth_token(self) -> bool:
        """Get authentication token"""
        try:
            url = f"{self.base_url}/auth/login"
            response = self.session.post(url, json=ADMIN_CREDENTIALS)
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                
                if self.auth_token:
                    self.log_test(
                        "User Login", 
                        True, 
                        f"Successfully logged in as: {ADMIN_CREDENTIALS['username']}",
                        {"token_received": True}
                    )
                    return True
                else:
                    self.log_test("User Login", False, "No access token received", data)
                    return False
            else:
                self.log_test("User Login", False, f"HTTP {response.status_code}", response.json())
                return False
                
        except Exception as e:
            self.log_test("User Login", False, f"Exception: {str(e)}")
            return False

    def test_create_reminder_with_account_email_15min(self) -> bool:
        """Test creating reminder with email notification ON, account email, 15 min before"""
        try:
            if not self.auth_token:
                self.log_test("Create Reminder - Account Email 15min", False, "No auth token available")
                return False
            
            # Calculate reminder date (1 hour from now for testing)
            from datetime import datetime, timezone, timedelta
            reminder_time = datetime.now(timezone.utc) + timedelta(hours=1)
            reminder_date_str = reminder_time.isoformat()
            
            reminder_data = {
                "title": "Test Reminder - Account Email",
                "description": "Testing email notification to account email 15 minutes before",
                "reminder_date": reminder_date_str,
                "notify_by_email": True,
                "use_account_email": True,
                "notify_before": "15min"
            }
            
            url = f"{self.base_url}/reminders"
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.session.post(url, json=reminder_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                reminder_id = data.get("id")
                self.created_reminders.append(reminder_id)
                
                # Verify response fields
                notify_by_email = data.get("notify_by_email", False)
                use_account_email = data.get("use_account_email", False)
                notify_before = data.get("notify_before", "")
                email_notification_time = data.get("email_notification_time")
                email_sent = data.get("email_sent", True)  # Should be False initially
                
                # Calculate expected notification time (15 min before reminder)
                expected_notification_time = reminder_time - timedelta(minutes=15)
                
                # Parse actual notification time
                actual_notification_time = None
                if email_notification_time:
                    try:
                        actual_notification_time = datetime.fromisoformat(email_notification_time.replace('Z', '+00:00'))
                    except:
                        pass
                
                # Check if notification time is calculated correctly (within 1 minute tolerance)
                time_calculation_correct = False
                if actual_notification_time:
                    time_diff = abs((actual_notification_time - expected_notification_time).total_seconds())
                    time_calculation_correct = time_diff < 60  # Within 1 minute
                
                success = (
                    notify_by_email == True and
                    use_account_email == True and
                    notify_before == "15min" and
                    email_sent == False and
                    time_calculation_correct
                )
                
                details = f"ID: {reminder_id}, notify_by_email: {notify_by_email}, use_account_email: {use_account_email}, notify_before: {notify_before}, email_sent: {email_sent}, time_calc_correct: {time_calculation_correct}"
                
                self.log_test(
                    "Create Reminder - Account Email 15min", 
                    success, 
                    details,
                    {
                        "reminder_id": reminder_id,
                        "notify_by_email": notify_by_email,
                        "use_account_email": use_account_email,
                        "notify_before": notify_before,
                        "email_notification_time": email_notification_time,
                        "email_sent": email_sent
                    }
                )
                return success
            else:
                error_data = response.json() if response.content else {}
                self.log_test("Create Reminder - Account Email 15min", False, f"HTTP {response.status_code}", error_data)
                return False
                
        except Exception as e:
            self.log_test("Create Reminder - Account Email 15min", False, f"Exception: {str(e)}")
            return False

    def test_create_reminder_with_custom_email_1hour(self) -> bool:
        """Test creating reminder with email notification ON, custom email, 1 hour before"""
        try:
            if not self.auth_token:
                self.log_test("Create Reminder - Custom Email 1hour", False, "No auth token available")
                return False
            
            # Calculate reminder date (2 hours from now for testing)
            from datetime import datetime, timezone, timedelta
            reminder_time = datetime.now(timezone.utc) + timedelta(hours=2)
            reminder_date_str = reminder_time.isoformat()
            
            reminder_data = {
                "title": "Test Reminder - Custom Email",
                "description": "Testing email notification to custom email 1 hour before",
                "reminder_date": reminder_date_str,
                "notify_by_email": True,
                "use_account_email": False,
                "custom_email": "custom@test.com",
                "notify_before": "1hour"
            }
            
            url = f"{self.base_url}/reminders"
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.session.post(url, json=reminder_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                reminder_id = data.get("id")
                self.created_reminders.append(reminder_id)
                
                # Verify response fields
                notify_by_email = data.get("notify_by_email", False)
                use_account_email = data.get("use_account_email", True)  # Should be False
                custom_email = data.get("custom_email", "")
                notify_before = data.get("notify_before", "")
                email_notification_time = data.get("email_notification_time")
                email_sent = data.get("email_sent", True)  # Should be False initially
                
                # Calculate expected notification time (1 hour before reminder)
                expected_notification_time = reminder_time - timedelta(hours=1)
                
                # Parse actual notification time
                actual_notification_time = None
                if email_notification_time:
                    try:
                        actual_notification_time = datetime.fromisoformat(email_notification_time.replace('Z', '+00:00'))
                    except:
                        pass
                
                # Check if notification time is calculated correctly (within 1 minute tolerance)
                time_calculation_correct = False
                if actual_notification_time:
                    time_diff = abs((actual_notification_time - expected_notification_time).total_seconds())
                    time_calculation_correct = time_diff < 60  # Within 1 minute
                
                success = (
                    notify_by_email == True and
                    use_account_email == False and
                    custom_email == "custom@test.com" and
                    notify_before == "1hour" and
                    email_sent == False and
                    time_calculation_correct
                )
                
                details = f"ID: {reminder_id}, notify_by_email: {notify_by_email}, use_account_email: {use_account_email}, custom_email: {custom_email}, notify_before: {notify_before}, email_sent: {email_sent}, time_calc_correct: {time_calculation_correct}"
                
                self.log_test(
                    "Create Reminder - Custom Email 1hour", 
                    success, 
                    details,
                    {
                        "reminder_id": reminder_id,
                        "notify_by_email": notify_by_email,
                        "use_account_email": use_account_email,
                        "custom_email": custom_email,
                        "notify_before": notify_before,
                        "email_notification_time": email_notification_time,
                        "email_sent": email_sent
                    }
                )
                return success
            else:
                error_data = response.json() if response.content else {}
                self.log_test("Create Reminder - Custom Email 1hour", False, f"HTTP {response.status_code}", error_data)
                return False
                
        except Exception as e:
            self.log_test("Create Reminder - Custom Email 1hour", False, f"Exception: {str(e)}")
            return False

    def test_create_reminder_email_off(self) -> bool:
        """Test creating reminder with email notification OFF"""
        try:
            if not self.auth_token:
                self.log_test("Create Reminder - Email OFF", False, "No auth token available")
                return False
            
            # Calculate reminder date (30 minutes from now for testing)
            from datetime import datetime, timezone, timedelta
            reminder_time = datetime.now(timezone.utc) + timedelta(minutes=30)
            reminder_date_str = reminder_time.isoformat()
            
            reminder_data = {
                "title": "Test Reminder - No Email",
                "description": "Testing reminder with email notification disabled",
                "reminder_date": reminder_date_str,
                "notify_by_email": False,
                "use_account_email": True,
                "notify_before": "5min"
            }
            
            url = f"{self.base_url}/reminders"
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.session.post(url, json=reminder_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                reminder_id = data.get("id")
                self.created_reminders.append(reminder_id)
                
                # Verify response fields
                notify_by_email = data.get("notify_by_email", True)  # Should be False
                email_notification_time = data.get("email_notification_time")
                email_sent = data.get("email_sent", True)  # Should be False
                
                # When email notification is OFF, email_notification_time should be None or empty
                success = (
                    notify_by_email == False and
                    email_sent == False and
                    (email_notification_time is None or email_notification_time == "")
                )
                
                details = f"ID: {reminder_id}, notify_by_email: {notify_by_email}, email_notification_time: {email_notification_time}, email_sent: {email_sent}"
                
                self.log_test(
                    "Create Reminder - Email OFF", 
                    success, 
                    details,
                    {
                        "reminder_id": reminder_id,
                        "notify_by_email": notify_by_email,
                        "email_notification_time": email_notification_time,
                        "email_sent": email_sent
                    }
                )
                return success
            else:
                error_data = response.json() if response.content else {}
                self.log_test("Create Reminder - Email OFF", False, f"HTTP {response.status_code}", error_data)
                return False
                
        except Exception as e:
            self.log_test("Create Reminder - Email OFF", False, f"Exception: {str(e)}")
            return False

    def test_update_reminder_email_settings(self) -> bool:
        """Test updating an existing reminder's email settings"""
        try:
            if not self.auth_token or not self.created_reminders:
                self.log_test("Update Reminder Email Settings", False, "No auth token or created reminders available")
                return False
            
            # Use the first created reminder
            reminder_id = self.created_reminders[0]
            
            # Update email settings
            update_data = {
                "notify_by_email": True,
                "use_account_email": False,
                "custom_email": "updated@test.com",
                "notify_before": "5min"
            }
            
            url = f"{self.base_url}/reminders/{reminder_id}"
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.session.put(url, json=update_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify updated fields
                notify_by_email = data.get("notify_by_email", False)
                use_account_email = data.get("use_account_email", True)
                custom_email = data.get("custom_email", "")
                notify_before = data.get("notify_before", "")
                email_notification_time = data.get("email_notification_time")
                
                success = (
                    notify_by_email == True and
                    use_account_email == False and
                    custom_email == "updated@test.com" and
                    notify_before == "5min" and
                    email_notification_time is not None
                )
                
                details = f"ID: {reminder_id}, notify_by_email: {notify_by_email}, use_account_email: {use_account_email}, custom_email: {custom_email}, notify_before: {notify_before}"
                
                self.log_test(
                    "Update Reminder Email Settings", 
                    success, 
                    details,
                    {
                        "reminder_id": reminder_id,
                        "notify_by_email": notify_by_email,
                        "use_account_email": use_account_email,
                        "custom_email": custom_email,
                        "notify_before": notify_before,
                        "email_notification_time": email_notification_time
                    }
                )
                return success
            else:
                error_data = response.json() if response.content else {}
                self.log_test("Update Reminder Email Settings", False, f"HTTP {response.status_code}", error_data)
                return False
                
        except Exception as e:
            self.log_test("Update Reminder Email Settings", False, f"Exception: {str(e)}")
            return False

    def test_notification_time_calculation_now(self) -> bool:
        """Test email_notification_time calculation for 'now' option"""
        try:
            if not self.auth_token:
                self.log_test("Notification Time Calculation - Now", False, "No auth token available")
                return False
            
            # Calculate reminder date (1 hour from now for testing)
            from datetime import datetime, timezone, timedelta
            reminder_time = datetime.now(timezone.utc) + timedelta(hours=1)
            reminder_date_str = reminder_time.isoformat()
            
            reminder_data = {
                "title": "Test Reminder - Now Notification",
                "description": "Testing email notification time calculation for 'now'",
                "reminder_date": reminder_date_str,
                "notify_by_email": True,
                "use_account_email": True,
                "notify_before": "now"
            }
            
            url = f"{self.base_url}/reminders"
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.session.post(url, json=reminder_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                reminder_id = data.get("id")
                self.created_reminders.append(reminder_id)
                
                email_notification_time = data.get("email_notification_time")
                notify_before = data.get("notify_before", "")
                
                # For 'now', notification time should equal reminder time
                expected_notification_time = reminder_time
                
                # Parse actual notification time
                actual_notification_time = None
                if email_notification_time:
                    try:
                        actual_notification_time = datetime.fromisoformat(email_notification_time.replace('Z', '+00:00'))
                    except:
                        pass
                
                # Check if notification time equals reminder time (within 1 minute tolerance)
                time_calculation_correct = False
                if actual_notification_time:
                    time_diff = abs((actual_notification_time - expected_notification_time).total_seconds())
                    time_calculation_correct = time_diff < 60  # Within 1 minute
                
                success = (
                    notify_before == "now" and
                    time_calculation_correct
                )
                
                details = f"ID: {reminder_id}, notify_before: {notify_before}, time_calc_correct: {time_calculation_correct}, expected: {expected_notification_time}, actual: {actual_notification_time}"
                
                self.log_test(
                    "Notification Time Calculation - Now", 
                    success, 
                    details,
                    {
                        "reminder_id": reminder_id,
                        "notify_before": notify_before,
                        "email_notification_time": email_notification_time,
                        "time_calculation_correct": time_calculation_correct
                    }
                )
                return success
            else:
                error_data = response.json() if response.content else {}
                self.log_test("Notification Time Calculation - Now", False, f"HTTP {response.status_code}", error_data)
                return False
                
        except Exception as e:
            self.log_test("Notification Time Calculation - Now", False, f"Exception: {str(e)}")
            return False

    def test_get_reminders_with_email_fields(self) -> bool:
        """Test GET /api/reminders returns email notification fields"""
        try:
            if not self.auth_token:
                self.log_test("GET Reminders with Email Fields", False, "No auth token available")
                return False
            
            url = f"{self.base_url}/reminders"
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.session.get(url, headers=headers)
            
            if response.status_code == 200:
                reminders = response.json()
                
                if not reminders:
                    self.log_test("GET Reminders with Email Fields", False, "No reminders found")
                    return False
                
                # Check if at least one reminder has email notification fields
                has_email_fields = False
                sample_reminder = None
                
                for reminder in reminders:
                    if (
                        "notify_by_email" in reminder and
                        "use_account_email" in reminder and
                        "notify_before" in reminder and
                        "email_sent" in reminder
                    ):
                        has_email_fields = True
                        sample_reminder = reminder
                        break
                
                success = has_email_fields
                
                details = f"Total reminders: {len(reminders)}, has_email_fields: {has_email_fields}"
                if sample_reminder:
                    details += f", sample_reminder_id: {sample_reminder.get('id')}"
                
                self.log_test(
                    "GET Reminders with Email Fields", 
                    success, 
                    details,
                    {
                        "total_reminders": len(reminders),
                        "has_email_fields": has_email_fields,
                        "sample_fields": {
                            "notify_by_email": sample_reminder.get("notify_by_email") if sample_reminder else None,
                            "use_account_email": sample_reminder.get("use_account_email") if sample_reminder else None,
                            "notify_before": sample_reminder.get("notify_before") if sample_reminder else None,
                            "email_sent": sample_reminder.get("email_sent") if sample_reminder else None
                        } if sample_reminder else None
                    }
                )
                return success
            else:
                error_data = response.json() if response.content else {}
                self.log_test("GET Reminders with Email Fields", False, f"HTTP {response.status_code}", error_data)
                return False
                
        except Exception as e:
            self.log_test("GET Reminders with Email Fields", False, f"Exception: {str(e)}")
            return False

    def cleanup_test_reminders(self):
        """Clean up test reminders"""
        try:
            if not self.auth_token:
                return
            
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            for reminder_id in self.created_reminders:
                try:
                    delete_url = f"{self.base_url}/reminders/{reminder_id}"
                    self.session.delete(delete_url, headers=headers)
                except:
                    pass  # Ignore cleanup errors
            
            if self.created_reminders:
                print(f"🧹 Cleaned up {len(self.created_reminders)} test reminders")
        except Exception as e:
            print(f"Warning: Could not clean up test reminders: {e}")

    def run_comprehensive_test(self):
        """Run all reminder email notification tests in sequence"""
        print("=" * 80)
        print("📧 MINDORA REMINDERS EMAIL NOTIFICATION TESTING")
        print("=" * 80)
        print(f"Base URL: {self.base_url}")
        print(f"User: {ADMIN_CREDENTIALS['username']}")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Step 1: Get authentication token
        print("🔍 Getting Authentication Token...")
        if not self.get_auth_token():
            print("❌ Cannot proceed without authentication token")
            self.print_summary()
            return
        
        # Step 2: Test create reminder with account email, 15 min before
        print("🔍 Testing Create Reminder - Account Email 15min...")
        self.test_create_reminder_with_account_email_15min()
        
        # Step 3: Test create reminder with custom email, 1 hour before
        print("🔍 Testing Create Reminder - Custom Email 1hour...")
        self.test_create_reminder_with_custom_email_1hour()
        
        # Step 4: Test create reminder with email notification OFF
        print("🔍 Testing Create Reminder - Email OFF...")
        self.test_create_reminder_email_off()
        
        # Step 5: Test notification time calculation for 'now'
        print("🔍 Testing Notification Time Calculation - Now...")
        self.test_notification_time_calculation_now()
        
        # Step 6: Test update reminder email settings
        print("🔍 Testing Update Reminder Email Settings...")
        self.test_update_reminder_email_settings()
        
        # Step 7: Test GET reminders includes email fields
        print("🔍 Testing GET Reminders with Email Fields...")
        self.test_get_reminders_with_email_fields()
        
        # Cleanup
        print("🔍 Cleaning up test data...")
        self.cleanup_test_reminders()
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("📊 REMINDER EMAIL NOTIFICATION TEST SUMMARY")
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
    # Run reminder email notification tests
    print("Starting Reminder Email Notification Tests...")
    reminder_tester = ReminderEmailNotificationTester()
    reminder_tester.run_comprehensive_test()