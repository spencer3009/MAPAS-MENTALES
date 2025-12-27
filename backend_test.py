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