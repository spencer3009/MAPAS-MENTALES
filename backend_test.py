#!/usr/bin/env python3
"""
Backend API Testing for MindoraMap Collision Detection Feature
Testing MindHybrid layout support and node positioning APIs that enable collision detection
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, List, Optional

# Test Configuration
BASE_URL = "https://recover-vault.preview.emergentagent.com/api"
TEST_CREDENTIALS = {
    "username": "spencer3009",
    "password": "Socios3009"
}

class CollisionDetectionTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.auth_token = None
        self.test_results = []
        self.test_project_id = None
        
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

    def authenticate(self) -> bool:
        """Test authentication and get token"""
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
                    self.log_test(
                        "Authentication", 
                        True, 
                        f"Successfully logged in as {user_info.get('username')} ({user_info.get('full_name')})",
                        {"token_received": bool(self.auth_token), "user": user_info}
                    )
                    return True
                else:
                    self.log_test("Authentication", False, "No access token received", data)
                    return False
            else:
                self.log_test("Authentication", False, f"HTTP {response.status_code}", response.json())
                return False
                
        except Exception as e:
            self.log_test("Authentication", False, f"Exception: {str(e)}")
            return False

    def test_get_projects(self) -> List[dict]:
        """Test GET /api/projects - get active projects"""
        try:
            url = f"{self.base_url}/projects"
            response = self.session.get(url)
            
            if response.status_code == 200:
                projects = response.json()
                self.log_test(
                    "GET /api/projects", 
                    True, 
                    f"Retrieved {len(projects)} active projects",
                    {"project_count": len(projects), "projects": [{"id": p.get("id"), "name": p.get("name")} for p in projects[:3]]}
                )
                return projects
            else:
                self.log_test("GET /api/projects", False, f"HTTP {response.status_code}", response.json())
                return []
                
        except Exception as e:
            self.log_test("GET /api/projects", False, f"Exception: {str(e)}")
            return []

    def test_get_trash_initial(self) -> List[dict]:
        """Test GET /api/projects/trash - should return empty or existing deleted projects"""
        try:
            url = f"{self.base_url}/projects/trash"
            response = self.session.get(url)
            
            if response.status_code == 200:
                trash_projects = response.json()
                
                # Verify response format
                format_valid = True
                required_fields = ["id", "name", "username", "deletedAt", "nodeCount", "layoutType"]
                
                for project in trash_projects:
                    for field in required_fields:
                        if field not in project:
                            format_valid = False
                            break
                
                self.log_test(
                    "GET /api/projects/trash (Initial)", 
                    True, 
                    f"Retrieved {len(trash_projects)} projects in trash. Format valid: {format_valid}",
                    {
                        "trash_count": len(trash_projects), 
                        "format_valid": format_valid,
                        "sample_project": trash_projects[0] if trash_projects else None
                    }
                )
                return trash_projects
            else:
                self.log_test("GET /api/projects/trash (Initial)", False, f"HTTP {response.status_code}", response.json())
                return []
                
        except Exception as e:
            self.log_test("GET /api/projects/trash (Initial)", False, f"Exception: {str(e)}")
            return []

    def test_soft_delete_project(self, projects: List[dict]) -> Optional[str]:
        """Test DELETE /api/projects/{project_id} - soft delete"""
        if not projects:
            self.log_test("Soft Delete Project", False, "No projects available to delete")
            return None
            
        try:
            # Pick the first project to delete
            project_to_delete = projects[0]
            project_id = project_to_delete["id"]
            project_name = project_to_delete["name"]
            
            url = f"{self.base_url}/projects/{project_id}"
            response = self.session.delete(url)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response includes required fields
                has_message = "message" in data
                has_deleted_at = "deletedAt" in data
                expected_message = "Proyecto enviado a la papelera"
                message_correct = data.get("message") == expected_message
                
                self.log_test(
                    "Soft Delete Project", 
                    True, 
                    f"Successfully deleted project '{project_name}' (ID: {project_id})",
                    {
                        "project_id": project_id,
                        "project_name": project_name,
                        "has_message": has_message,
                        "has_deleted_at": has_deleted_at,
                        "message_correct": message_correct,
                        "deleted_at": data.get("deletedAt")
                    }
                )
                
                self.test_project_id = project_id
                return project_id
            else:
                self.log_test("Soft Delete Project", False, f"HTTP {response.status_code}", response.json())
                return None
                
        except Exception as e:
            self.log_test("Soft Delete Project", False, f"Exception: {str(e)}")
            return None

    def test_project_removed_from_active(self, deleted_project_id: str):
        """Verify deleted project no longer appears in GET /api/projects"""
        try:
            url = f"{self.base_url}/projects"
            response = self.session.get(url)
            
            if response.status_code == 200:
                projects = response.json()
                project_ids = [p["id"] for p in projects]
                
                project_not_in_active = deleted_project_id not in project_ids
                
                self.log_test(
                    "Verify Project Removed from Active", 
                    project_not_in_active, 
                    f"Project {deleted_project_id} {'not found' if project_not_in_active else 'still found'} in active projects",
                    {"project_in_active": not project_not_in_active, "active_project_count": len(projects)}
                )
            else:
                self.log_test("Verify Project Removed from Active", False, f"HTTP {response.status_code}", response.json())
                
        except Exception as e:
            self.log_test("Verify Project Removed from Active", False, f"Exception: {str(e)}")

    def test_project_appears_in_trash(self, deleted_project_id: str):
        """Verify deleted project appears in GET /api/projects/trash"""
        try:
            url = f"{self.base_url}/projects/trash"
            response = self.session.get(url)
            
            if response.status_code == 200:
                trash_projects = response.json()
                trash_project_ids = [p["id"] for p in trash_projects]
                
                project_in_trash = deleted_project_id in trash_project_ids
                
                # Find the specific project in trash
                trash_project = None
                for p in trash_projects:
                    if p["id"] == deleted_project_id:
                        trash_project = p
                        break
                
                self.log_test(
                    "Verify Project Appears in Trash", 
                    project_in_trash, 
                    f"Project {deleted_project_id} {'found' if project_in_trash else 'not found'} in trash",
                    {
                        "project_in_trash": project_in_trash, 
                        "trash_project_count": len(trash_projects),
                        "trash_project_data": trash_project
                    }
                )
            else:
                self.log_test("Verify Project Appears in Trash", False, f"HTTP {response.status_code}", response.json())
                
        except Exception as e:
            self.log_test("Verify Project Appears in Trash", False, f"Exception: {str(e)}")

    def test_restore_project(self, project_id: str):
        """Test POST /api/projects/{project_id}/restore"""
        try:
            url = f"{self.base_url}/projects/{project_id}/restore"
            response = self.session.post(url)
            
            if response.status_code == 200:
                data = response.json()
                
                has_message = "message" in data
                has_id = "id" in data
                message_correct = "restaurado" in data.get("message", "").lower()
                id_correct = data.get("id") == project_id
                
                self.log_test(
                    "Restore Project", 
                    True, 
                    f"Successfully restored project {project_id}",
                    {
                        "project_id": project_id,
                        "has_message": has_message,
                        "has_id": has_id,
                        "message_correct": message_correct,
                        "id_correct": id_correct,
                        "response": data
                    }
                )
            else:
                self.log_test("Restore Project", False, f"HTTP {response.status_code}", response.json())
                
        except Exception as e:
            self.log_test("Restore Project", False, f"Exception: {str(e)}")

    def test_project_returns_to_active(self, restored_project_id: str):
        """Verify restored project returns to GET /api/projects"""
        try:
            url = f"{self.base_url}/projects"
            response = self.session.get(url)
            
            if response.status_code == 200:
                projects = response.json()
                project_ids = [p["id"] for p in projects]
                
                project_in_active = restored_project_id in project_ids
                
                self.log_test(
                    "Verify Project Returns to Active", 
                    project_in_active, 
                    f"Project {restored_project_id} {'found' if project_in_active else 'not found'} in active projects",
                    {"project_in_active": project_in_active, "active_project_count": len(projects)}
                )
            else:
                self.log_test("Verify Project Returns to Active", False, f"HTTP {response.status_code}", response.json())
                
        except Exception as e:
            self.log_test("Verify Project Returns to Active", False, f"Exception: {str(e)}")

    def test_project_removed_from_trash(self, restored_project_id: str):
        """Verify restored project removed from GET /api/projects/trash"""
        try:
            url = f"{self.base_url}/projects/trash"
            response = self.session.get(url)
            
            if response.status_code == 200:
                trash_projects = response.json()
                trash_project_ids = [p["id"] for p in trash_projects]
                
                project_not_in_trash = restored_project_id not in trash_project_ids
                
                self.log_test(
                    "Verify Project Removed from Trash", 
                    project_not_in_trash, 
                    f"Project {restored_project_id} {'not found' if project_not_in_trash else 'still found'} in trash",
                    {"project_in_trash": not project_not_in_trash, "trash_project_count": len(trash_projects)}
                )
            else:
                self.log_test("Verify Project Removed from Trash", False, f"HTTP {response.status_code}", response.json())
                
        except Exception as e:
            self.log_test("Verify Project Removed from Trash", False, f"Exception: {str(e)}")

    def test_permanent_delete(self, projects: List[dict]):
        """Test DELETE /api/projects/{project_id}/permanent"""
        if not projects:
            self.log_test("Permanent Delete Project", False, "No projects available to permanently delete")
            return
            
        try:
            # First, soft delete a project to put it in trash
            project_to_delete = projects[0] if len(projects) > 0 else None
            if not project_to_delete:
                self.log_test("Permanent Delete Project", False, "No project available for permanent delete test")
                return
                
            project_id = project_to_delete["id"]
            project_name = project_to_delete["name"]
            
            # Step 1: Soft delete the project
            soft_delete_url = f"{self.base_url}/projects/{project_id}"
            soft_delete_response = self.session.delete(soft_delete_url)
            
            if soft_delete_response.status_code != 200:
                self.log_test("Permanent Delete Project", False, f"Failed to soft delete project first: HTTP {soft_delete_response.status_code}")
                return
            
            # Step 2: Permanently delete the project
            permanent_delete_url = f"{self.base_url}/projects/{project_id}/permanent"
            response = self.session.delete(permanent_delete_url)
            
            if response.status_code == 200:
                data = response.json()
                
                has_message = "message" in data
                message_correct = "permanentemente" in data.get("message", "").lower()
                
                self.log_test(
                    "Permanent Delete Project", 
                    True, 
                    f"Successfully permanently deleted project '{project_name}' (ID: {project_id})",
                    {
                        "project_id": project_id,
                        "project_name": project_name,
                        "has_message": has_message,
                        "message_correct": message_correct,
                        "response": data
                    }
                )
                
                # Step 3: Verify project is completely gone
                self.verify_project_completely_gone(project_id)
                
            else:
                self.log_test("Permanent Delete Project", False, f"HTTP {response.status_code}", response.json())
                
        except Exception as e:
            self.log_test("Permanent Delete Project", False, f"Exception: {str(e)}")

    def verify_project_completely_gone(self, project_id: str):
        """Verify project is not in active projects or trash"""
        try:
            # Check active projects
            active_url = f"{self.base_url}/projects"
            active_response = self.session.get(active_url)
            
            # Check trash
            trash_url = f"{self.base_url}/projects/trash"
            trash_response = self.session.get(trash_url)
            
            if active_response.status_code == 200 and trash_response.status_code == 200:
                active_projects = active_response.json()
                trash_projects = trash_response.json()
                
                active_ids = [p["id"] for p in active_projects]
                trash_ids = [p["id"] for p in trash_projects]
                
                not_in_active = project_id not in active_ids
                not_in_trash = project_id not in trash_ids
                completely_gone = not_in_active and not_in_trash
                
                self.log_test(
                    "Verify Project Completely Gone", 
                    completely_gone, 
                    f"Project {project_id} completely removed: Active={not_in_active}, Trash={not_in_trash}",
                    {
                        "not_in_active": not_in_active,
                        "not_in_trash": not_in_trash,
                        "completely_gone": completely_gone
                    }
                )
            else:
                self.log_test("Verify Project Completely Gone", False, "Failed to check active projects or trash")
                
        except Exception as e:
            self.log_test("Verify Project Completely Gone", False, f"Exception: {str(e)}")

    def run_comprehensive_test(self):
        """Run all recycle bin tests in sequence"""
        print("=" * 80)
        print("🗑️  MINDORAMAP RECYCLE BIN (PAPELERA) SYSTEM TESTING")
        print("=" * 80)
        print(f"Base URL: {self.base_url}")
        print(f"Test User: {TEST_CREDENTIALS['username']}")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Step 1: Authentication
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return
        
        # Step 2: Get initial state
        initial_projects = self.test_get_projects()
        initial_trash = self.test_get_trash_initial()
        
        if not initial_projects:
            print("⚠️  No active projects found. Some tests may be limited.")
        
        # Step 3: Test soft delete workflow
        if initial_projects:
            deleted_project_id = self.test_soft_delete_project(initial_projects)
            
            if deleted_project_id:
                # Verify soft delete worked correctly
                self.test_project_removed_from_active(deleted_project_id)
                self.test_project_appears_in_trash(deleted_project_id)
                
                # Test restore workflow
                self.test_restore_project(deleted_project_id)
                self.test_project_returns_to_active(deleted_project_id)
                self.test_project_removed_from_trash(deleted_project_id)
        
        # Step 4: Test permanent delete (uses a different project)
        current_projects = self.test_get_projects()
        if current_projects:
            self.test_permanent_delete(current_projects)
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
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
    tester = RecycleBinTester()
    tester.run_comprehensive_test()