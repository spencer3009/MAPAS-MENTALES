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

    def test_find_problema_project(self) -> Optional[dict]:
        """Find the 'problema' project with MindHybrid layout"""
        try:
            url = f"{self.base_url}/projects"
            response = self.session.get(url)
            
            if response.status_code == 200:
                projects = response.json()
                
                # Look for project named "problema"
                problema_project = None
                for project in projects:
                    if project.get("name", "").lower() == "problema":
                        problema_project = project
                        break
                
                if problema_project:
                    # Verify it's a MindHybrid project
                    layout_type = problema_project.get("layoutType", "")
                    is_mindhybrid = layout_type == "mindhybrid"
                    
                    # Analyze node structure
                    nodes = problema_project.get("nodes", [])
                    node_analysis = self.analyze_project_structure(nodes)
                    
                    self.log_test(
                        "Find 'problema' Project", 
                        True, 
                        f"Found project 'problema' with {len(nodes)} nodes. Layout: {layout_type}",
                        {
                            "project_id": problema_project.get("id"),
                            "layout_type": layout_type,
                            "is_mindhybrid": is_mindhybrid,
                            "node_count": len(nodes),
                            "structure": node_analysis
                        }
                    )
                    return problema_project
                else:
                    self.log_test("Find 'problema' Project", False, "Project 'problema' not found", {"available_projects": [p.get("name") for p in projects[:5]]})
                    return None
            else:
                self.log_test("Find 'problema' Project", False, f"HTTP {response.status_code}", response.json())
                return None
                
        except Exception as e:
            self.log_test("Find 'problema' Project", False, f"Exception: {str(e)}")
            return None

    def analyze_project_structure(self, nodes: List[dict]) -> dict:
        """Analyze the structure of nodes in the project"""
        analysis = {
            "total_nodes": len(nodes),
            "nodes_by_name": {},
            "nodes_with_child_direction": 0,
            "horizontal_children": 0,
            "vertical_children": 0,
            "root_nodes": 0,
            "hierarchy_depth": 0
        }
        
        # Analyze each node
        for node in nodes:
            name = node.get("text", "unnamed")
            analysis["nodes_by_name"][name] = {
                "id": node.get("id"),
                "x": node.get("x"),
                "y": node.get("y"),
                "parentId": node.get("parentId"),
                "childDirection": node.get("childDirection")
            }
            
            if node.get("childDirection"):
                analysis["nodes_with_child_direction"] += 1
                if node.get("childDirection") == "horizontal":
                    analysis["horizontal_children"] += 1
                elif node.get("childDirection") == "vertical":
                    analysis["vertical_children"] += 1
            
            if not node.get("parentId"):
                analysis["root_nodes"] += 1
        
        return analysis

    def test_create_mindhybrid_project(self) -> Optional[str]:
        """Test creating a new MindHybrid project for collision testing"""
        try:
            # Create a test project with MindHybrid layout
            project_data = {
                "name": "Collision Test Project",
                "layoutType": "mindhybrid",
                "nodes": [
                    {
                        "id": "central-node",
                        "text": "Idea Central",
                        "x": 400,
                        "y": 300,
                        "color": "blue",
                        "parentId": None,
                        "width": 160,
                        "height": 64
                    }
                ]
            }
            
            url = f"{self.base_url}/projects"
            response = self.session.post(url, json=project_data)
            
            if response.status_code == 200:
                created_project = response.json()
                project_id = created_project.get("id")
                
                # Verify the project was created correctly
                layout_correct = created_project.get("layoutType") == "mindhybrid"
                nodes_correct = len(created_project.get("nodes", [])) == 1
                
                self.log_test(
                    "Create MindHybrid Project", 
                    True, 
                    f"Created test project with ID: {project_id}",
                    {
                        "project_id": project_id,
                        "layout_type": created_project.get("layoutType"),
                        "layout_correct": layout_correct,
                        "nodes_correct": nodes_correct,
                        "node_count": len(created_project.get("nodes", []))
                    }
                )
                return project_id
            else:
                self.log_test("Create MindHybrid Project", False, f"HTTP {response.status_code}", response.json())
                return None
                
        except Exception as e:
            self.log_test("Create MindHybrid Project", False, f"Exception: {str(e)}")
            return None

    def test_add_nodes_with_child_direction(self, project_id: str) -> bool:
        """Test adding nodes with childDirection property (horizontal and vertical)"""
        try:
            # First, get the current project
            get_url = f"{self.base_url}/projects/{project_id}"
            get_response = self.session.get(get_url)
            
            if get_response.status_code != 200:
                self.log_test("Add Nodes with childDirection", False, "Failed to get project", get_response.json())
                return False
            
            project = get_response.json()
            current_nodes = project.get("nodes", [])
            central_node = current_nodes[0]  # Should be the central node
            
            # Add nodes that simulate the "problema" project structure
            new_nodes = [
                # Keep the central node
                central_node,
                # Add "Nuevo Nodo" as horizontal child
                {
                    "id": "nuevo-nodo",
                    "text": "Nuevo Nodo",
                    "x": central_node["x"] + 280,
                    "y": central_node["y"],
                    "color": "blue",
                    "parentId": central_node["id"],
                    "childDirection": "horizontal",
                    "width": 160,
                    "height": 64
                },
                # Add "hijo" as vertical child of "Nuevo Nodo"
                {
                    "id": "hijo-node",
                    "text": "hijo",
                    "x": central_node["x"] + 280,
                    "y": central_node["y"] + 150,
                    "color": "blue",
                    "parentId": "nuevo-nodo",
                    "childDirection": "vertical",
                    "width": 160,
                    "height": 64
                },
                # Add two vertical children of "hijo"
                {
                    "id": "hijo-child-1",
                    "text": "Nuevo Nodo",
                    "x": central_node["x"] + 200,
                    "y": central_node["y"] + 250,
                    "color": "blue",
                    "parentId": "hijo-node",
                    "childDirection": "vertical",
                    "width": 160,
                    "height": 64
                },
                {
                    "id": "hijo-child-2",
                    "text": "Nuevo Nodo",
                    "x": central_node["x"] + 360,
                    "y": central_node["y"] + 250,
                    "color": "blue",
                    "parentId": "hijo-node",
                    "childDirection": "vertical",
                    "width": 160,
                    "height": 64
                },
                # Add "paneton" node that could cause collision
                {
                    "id": "paneton-node",
                    "text": "paneton",
                    "x": central_node["x"] + 100,
                    "y": central_node["y"] + 250,
                    "color": "green",
                    "parentId": central_node["id"],
                    "childDirection": "vertical",
                    "width": 160,
                    "height": 64
                }
            ]
            
            # Update the project with the new nodes
            update_data = {
                "nodes": new_nodes
            }
            
            url = f"{self.base_url}/projects/{project_id}"
            response = self.session.put(url, json=update_data)
            
            if response.status_code == 200:
                updated_project = response.json()
                updated_nodes = updated_project.get("nodes", [])
                
                # Verify the nodes were added correctly
                node_count_correct = len(updated_nodes) == 6
                child_directions_preserved = True
                
                # Check that childDirection properties are preserved
                for node in updated_nodes:
                    expected_direction = None
                    if node.get("id") == "nuevo-nodo":
                        expected_direction = "horizontal"
                    elif node.get("id") in ["hijo-node", "hijo-child-1", "hijo-child-2", "paneton-node"]:
                        expected_direction = "vertical"
                    
                    if expected_direction and node.get("childDirection") != expected_direction:
                        child_directions_preserved = False
                        break
                
                self.log_test(
                    "Add Nodes with childDirection", 
                    True, 
                    f"Added {len(new_nodes)} nodes with childDirection properties",
                    {
                        "node_count": len(updated_nodes),
                        "node_count_correct": node_count_correct,
                        "child_directions_preserved": child_directions_preserved,
                        "nodes_summary": [{"id": n.get("id"), "text": n.get("text"), "childDirection": n.get("childDirection")} for n in updated_nodes]
                    }
                )
                return True
            else:
                self.log_test("Add Nodes with childDirection", False, f"HTTP {response.status_code}", response.json())
                return False
                
        except Exception as e:
            self.log_test("Add Nodes with childDirection", False, f"Exception: {str(e)}")
            return False

    def test_collision_detection_scenario(self, project_id: str) -> bool:
        """Test a collision detection scenario by adding a new vertical child to 'hijo'"""
        try:
            # Get the current project
            get_url = f"{self.base_url}/projects/{project_id}"
            get_response = self.session.get(get_url)
            
            if get_response.status_code != 200:
                self.log_test("Collision Detection Scenario", False, "Failed to get project", get_response.json())
                return False
            
            project = get_response.json()
            current_nodes = project.get("nodes", [])
            
            # Find the "hijo" node and "paneton" node
            hijo_node = None
            paneton_node = None
            
            for node in current_nodes:
                if node.get("text") == "hijo":
                    hijo_node = node
                elif node.get("text") == "paneton":
                    paneton_node = node
            
            if not hijo_node or not paneton_node:
                self.log_test("Collision Detection Scenario", False, "Could not find 'hijo' or 'paneton' nodes")
                return False
            
            # Calculate where a new vertical child would be placed
            # This simulates the frontend collision detection logic
            hijo_x = hijo_node.get("x", 0)
            hijo_y = hijo_node.get("y", 0)
            hijo_width = hijo_node.get("width", 160)
            hijo_height = hijo_node.get("height", 64)
            
            paneton_x = paneton_node.get("x", 0)
            paneton_width = paneton_node.get("width", 160)
            paneton_right = paneton_x + paneton_width
            
            # Calculate new child position (centered under hijo)
            new_child_x = hijo_x + (hijo_width / 2) - 80  # Center under parent
            new_child_y = hijo_y + hijo_height + 100  # Below parent
            
            # Check if there would be a collision with paneton
            collision_detected = (new_child_x < paneton_right + 20)  # 20px margin
            
            # If collision detected, calculate push amount
            push_amount = 0
            if collision_detected:
                push_amount = paneton_right - new_child_x + 40  # 40px margin
            
            # Add the new vertical child node
            new_child_node = {
                "id": "new-vertical-child",
                "text": "New Vertical Child",
                "x": new_child_x + push_amount,  # Apply collision avoidance
                "y": new_child_y,
                "color": "blue",
                "parentId": hijo_node.get("id"),
                "childDirection": "vertical",
                "width": 160,
                "height": 64
            }
            
            # If collision was detected, also push the hijo node and its children
            updated_nodes = []
            for node in current_nodes:
                if collision_detected and (node.get("id") == "hijo-node" or node.get("parentId") == "hijo-node"):
                    # Push this node to the right
                    updated_node = node.copy()
                    updated_node["x"] = node.get("x", 0) + push_amount
                    updated_nodes.append(updated_node)
                else:
                    updated_nodes.append(node)
            
            # Add the new child
            updated_nodes.append(new_child_node)
            
            # Update the project
            update_data = {"nodes": updated_nodes}
            
            url = f"{self.base_url}/projects/{project_id}"
            response = self.session.put(url, json=update_data)
            
            if response.status_code == 200:
                updated_project = response.json()
                final_nodes = updated_project.get("nodes", [])
                
                # Verify the collision detection worked
                new_child_found = any(n.get("id") == "new-vertical-child" for n in final_nodes)
                collision_avoided = True
                
                # Check that the new child doesn't overlap with paneton
                for node in final_nodes:
                    if node.get("id") == "new-vertical-child":
                        child_x = node.get("x", 0)
                        if child_x < paneton_right + 20:  # Still too close
                            collision_avoided = False
                        break
                
                self.log_test(
                    "Collision Detection Scenario", 
                    True, 
                    f"Added new vertical child. Collision detected: {collision_detected}, Push amount: {push_amount}px",
                    {
                        "collision_detected": collision_detected,
                        "push_amount": push_amount,
                        "new_child_found": new_child_found,
                        "collision_avoided": collision_avoided,
                        "final_node_count": len(final_nodes),
                        "paneton_position": {"x": paneton_x, "right": paneton_right},
                        "new_child_position": {"x": new_child_x + push_amount, "y": new_child_y}
                    }
                )
                return True
            else:
                self.log_test("Collision Detection Scenario", False, f"HTTP {response.status_code}", response.json())
                return False
                
        except Exception as e:
            self.log_test("Collision Detection Scenario", False, f"Exception: {str(e)}")
            return False

    def test_node_persistence_after_collision(self, project_id: str) -> bool:
        """Test that node positions persist correctly after collision detection"""
        try:
            # Get the project twice to verify persistence
            get_url = f"{self.base_url}/projects/{project_id}"
            
            # First fetch
            response1 = self.session.get(get_url)
            if response1.status_code != 200:
                self.log_test("Node Persistence After Collision", False, "Failed to get project (first fetch)", response1.json())
                return False
            
            project1 = response1.json()
            nodes1 = project1.get("nodes", [])
            
            # Wait a moment and fetch again
            import time
            time.sleep(1)
            
            # Second fetch
            response2 = self.session.get(get_url)
            if response2.status_code != 200:
                self.log_test("Node Persistence After Collision", False, "Failed to get project (second fetch)", response2.json())
                return False
            
            project2 = response2.json()
            nodes2 = project2.get("nodes", [])
            
            # Compare the two fetches
            positions_match = True
            child_directions_match = True
            
            if len(nodes1) != len(nodes2):
                positions_match = False
            else:
                # Create lookup dictionaries
                nodes1_dict = {n.get("id"): n for n in nodes1}
                nodes2_dict = {n.get("id"): n for n in nodes2}
                
                for node_id in nodes1_dict:
                    if node_id not in nodes2_dict:
                        positions_match = False
                        break
                    
                    node1 = nodes1_dict[node_id]
                    node2 = nodes2_dict[node_id]
                    
                    # Check position persistence
                    if (node1.get("x") != node2.get("x") or 
                        node1.get("y") != node2.get("y")):
                        positions_match = False
                    
                    # Check childDirection persistence
                    if node1.get("childDirection") != node2.get("childDirection"):
                        child_directions_match = False
            
            self.log_test(
                "Node Persistence After Collision", 
                positions_match and child_directions_match, 
                f"Verified persistence: positions={positions_match}, childDirections={child_directions_match}",
                {
                    "node_count_consistent": len(nodes1) == len(nodes2),
                    "positions_match": positions_match,
                    "child_directions_match": child_directions_match,
                    "node_count": len(nodes1)
                }
            )
            return positions_match and child_directions_match
            
        except Exception as e:
            self.log_test("Node Persistence After Collision", False, f"Exception: {str(e)}")
            return False

    def test_layout_type_persistence(self, project_id: str) -> bool:
        """Test that MindHybrid layoutType persists correctly"""
        try:
            get_url = f"{self.base_url}/projects/{project_id}"
            response = self.session.get(get_url)
            
            if response.status_code == 200:
                project = response.json()
                layout_type = project.get("layoutType")
                
                layout_correct = layout_type == "mindhybrid"
                
                self.log_test(
                    "Layout Type Persistence", 
                    layout_correct, 
                    f"Layout type: {layout_type}",
                    {
                        "layout_type": layout_type,
                        "is_mindhybrid": layout_correct,
                        "project_id": project_id
                    }
                )
                return layout_correct
            else:
                self.log_test("Layout Type Persistence", False, f"HTTP {response.status_code}", response.json())
                return False
                
        except Exception as e:
            self.log_test("Layout Type Persistence", False, f"Exception: {str(e)}")
            return False

    def cleanup_test_project(self, project_id: str):
        """Clean up the test project"""
        try:
            url = f"{self.base_url}/projects/{project_id}"
            response = self.session.delete(url)
            
            if response.status_code == 200:
                self.log_test("Cleanup Test Project", True, f"Deleted test project {project_id}")
            else:
                self.log_test("Cleanup Test Project", False, f"Failed to delete test project: HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Cleanup Test Project", False, f"Exception: {str(e)}")

    def run_comprehensive_test(self):
        """Run all collision detection tests in sequence"""
        print("=" * 80)
        print("🎯 MINDORAMAP COLLISION DETECTION FEATURE TESTING")
        print("=" * 80)
        print(f"Base URL: {self.base_url}")
        print(f"Test User: {TEST_CREDENTIALS['username']}")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Step 1: Authentication
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return
        
        # Step 2: Look for existing "problema" project
        problema_project = self.test_find_problema_project()
        
        # Step 3: Create a test MindHybrid project for collision testing
        test_project_id = self.test_create_mindhybrid_project()
        
        if test_project_id:
            # Step 4: Add nodes with childDirection properties
            if self.test_add_nodes_with_child_direction(test_project_id):
                # Step 5: Test collision detection scenario
                self.test_collision_detection_scenario(test_project_id)
                
                # Step 6: Test persistence
                self.test_node_persistence_after_collision(test_project_id)
                self.test_layout_type_persistence(test_project_id)
            
            # Step 7: Cleanup
            self.cleanup_test_project(test_project_id)
        
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
    tester = CollisionDetectionTester()
    tester.run_comprehensive_test()