"""
Test Admin Analytics Dashboard API
Tests for GET /api/admin/analytics endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminAnalytics:
    """Test suite for Admin Analytics Dashboard API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        self.token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    # ==================== ENDPOINT ACCESS TESTS ====================
    
    def test_analytics_endpoint_returns_200(self):
        """Test that analytics endpoint returns 200 for admin"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_analytics_unauthorized_without_token(self):
        """Test that analytics endpoint returns 401/403 without token"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/admin/analytics")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_analytics_forbidden_for_non_admin(self):
        """Test that analytics endpoint returns 403 for non-admin user"""
        # Create a test user or use existing non-admin
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Try to login as a regular user (if exists)
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "testuser",
            "password": "testpass123"
        })
        
        if login_response.status_code == 200:
            token = login_response.json()["access_token"]
            session.headers.update({"Authorization": f"Bearer {token}"})
            response = session.get(f"{BASE_URL}/api/admin/analytics")
            assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        else:
            pytest.skip("No test user available for non-admin test")
    
    # ==================== OVERVIEW METRICS TESTS ====================
    
    def test_analytics_contains_total_users(self):
        """Test that analytics contains total_users field"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        assert "total_users" in data, "Missing total_users field"
        assert isinstance(data["total_users"], int), "total_users should be integer"
        assert data["total_users"] >= 0, "total_users should be non-negative"
    
    def test_analytics_contains_total_projects(self):
        """Test that analytics contains total_projects field"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        assert "total_projects" in data, "Missing total_projects field"
        assert isinstance(data["total_projects"], int), "total_projects should be integer"
        assert data["total_projects"] >= 0, "total_projects should be non-negative"
    
    def test_analytics_contains_total_contacts(self):
        """Test that analytics contains total_contacts field"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        assert "total_contacts" in data, "Missing total_contacts field"
        assert isinstance(data["total_contacts"], int), "total_contacts should be integer"
        assert data["total_contacts"] >= 0, "total_contacts should be non-negative"
    
    def test_analytics_contains_total_boards(self):
        """Test that analytics contains total_boards field"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        assert "total_boards" in data, "Missing total_boards field"
        assert isinstance(data["total_boards"], int), "total_boards should be integer"
        assert data["total_boards"] >= 0, "total_boards should be non-negative"
    
    # ==================== GROWTH METRICS TESTS ====================
    
    def test_analytics_contains_users_today(self):
        """Test that analytics contains users_today field"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        assert "users_today" in data, "Missing users_today field"
        assert isinstance(data["users_today"], int), "users_today should be integer"
        assert data["users_today"] >= 0, "users_today should be non-negative"
    
    def test_analytics_contains_users_this_week(self):
        """Test that analytics contains users_this_week field"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        assert "users_this_week" in data, "Missing users_this_week field"
        assert isinstance(data["users_this_week"], int), "users_this_week should be integer"
        assert data["users_this_week"] >= 0, "users_this_week should be non-negative"
    
    def test_analytics_contains_users_this_month(self):
        """Test that analytics contains users_this_month field"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        assert "users_this_month" in data, "Missing users_this_month field"
        assert isinstance(data["users_this_month"], int), "users_this_month should be integer"
        assert data["users_this_month"] >= 0, "users_this_month should be non-negative"
    
    def test_analytics_contains_growth_rate_weekly(self):
        """Test that analytics contains growth_rate_weekly field"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        assert "growth_rate_weekly" in data, "Missing growth_rate_weekly field"
        assert isinstance(data["growth_rate_weekly"], (int, float)), "growth_rate_weekly should be numeric"
    
    def test_analytics_contains_growth_rate_monthly(self):
        """Test that analytics contains growth_rate_monthly field"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        assert "growth_rate_monthly" in data, "Missing growth_rate_monthly field"
        assert isinstance(data["growth_rate_monthly"], (int, float)), "growth_rate_monthly should be numeric"
    
    # ==================== USER GROWTH ARRAY TESTS ====================
    
    def test_analytics_contains_user_growth_array(self):
        """Test that analytics contains user_growth array"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        assert "user_growth" in data, "Missing user_growth field"
        assert isinstance(data["user_growth"], list), "user_growth should be a list"
    
    def test_user_growth_has_31_data_points(self):
        """Test that user_growth has 31 data points (30 days + today)"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        assert len(data["user_growth"]) == 31, f"Expected 31 data points, got {len(data['user_growth'])}"
    
    def test_user_growth_point_structure(self):
        """Test that each user_growth point has date, count, cumulative"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        
        for point in data["user_growth"]:
            assert "date" in point, "Missing date in user_growth point"
            assert "count" in point, "Missing count in user_growth point"
            assert "cumulative" in point, "Missing cumulative in user_growth point"
            assert isinstance(point["count"], int), "count should be integer"
            assert isinstance(point["cumulative"], int), "cumulative should be integer"
    
    # ==================== PLAN DISTRIBUTION TESTS ====================
    
    def test_analytics_contains_plan_distribution(self):
        """Test that analytics contains plan_distribution array"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        assert "plan_distribution" in data, "Missing plan_distribution field"
        assert isinstance(data["plan_distribution"], list), "plan_distribution should be a list"
    
    def test_plan_distribution_structure(self):
        """Test that each plan_distribution item has plan, count, percentage"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        
        for plan in data["plan_distribution"]:
            assert "plan" in plan, "Missing plan in plan_distribution item"
            assert "count" in plan, "Missing count in plan_distribution item"
            assert "percentage" in plan, "Missing percentage in plan_distribution item"
            assert isinstance(plan["count"], int), "count should be integer"
            assert isinstance(plan["percentage"], (int, float)), "percentage should be numeric"
    
    def test_plan_distribution_percentages_sum_to_100(self):
        """Test that plan distribution percentages sum to approximately 100"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        
        total_percentage = sum(p["percentage"] for p in data["plan_distribution"])
        # Allow for rounding errors
        assert 99 <= total_percentage <= 101, f"Percentages sum to {total_percentage}, expected ~100"
    
    # ==================== ACTIVITY METRICS TESTS ====================
    
    def test_analytics_contains_activity_metrics(self):
        """Test that analytics contains activity_metrics array"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        assert "activity_metrics" in data, "Missing activity_metrics field"
        assert isinstance(data["activity_metrics"], list), "activity_metrics should be a list"
    
    def test_activity_metrics_has_14_data_points(self):
        """Test that activity_metrics has 14 data points (14 days)"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        assert len(data["activity_metrics"]) == 14, f"Expected 14 data points, got {len(data['activity_metrics'])}"
    
    def test_activity_metrics_structure(self):
        """Test that each activity_metrics item has required fields"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        
        for metric in data["activity_metrics"]:
            assert "date" in metric, "Missing date in activity_metrics item"
            assert "active_users" in metric, "Missing active_users in activity_metrics item"
            assert "new_registrations" in metric, "Missing new_registrations in activity_metrics item"
            assert "projects_created" in metric, "Missing projects_created in activity_metrics item"
    
    # ==================== RETENTION DATA TESTS ====================
    
    def test_analytics_contains_retention_data(self):
        """Test that analytics contains retention_data array"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        assert "retention_data" in data, "Missing retention_data field"
        assert isinstance(data["retention_data"], list), "retention_data should be a list"
    
    def test_retention_data_has_4_cohorts(self):
        """Test that retention_data has 4 weekly cohorts"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        assert len(data["retention_data"]) == 4, f"Expected 4 cohorts, got {len(data['retention_data'])}"
    
    def test_retention_data_structure(self):
        """Test that each retention_data item has required fields"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        
        for cohort in data["retention_data"]:
            assert "period" in cohort, "Missing period in retention_data item"
            assert "cohort_size" in cohort, "Missing cohort_size in retention_data item"
            assert "retained" in cohort, "Missing retained in retention_data item"
            assert "retention_rate" in cohort, "Missing retention_rate in retention_data item"
    
    # ==================== TOP STATS TESTS ====================
    
    def test_analytics_contains_active_users_24h(self):
        """Test that analytics contains active_users_24h field"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        assert "active_users_24h" in data, "Missing active_users_24h field"
        assert isinstance(data["active_users_24h"], int), "active_users_24h should be integer"
        assert data["active_users_24h"] >= 0, "active_users_24h should be non-negative"
    
    def test_analytics_contains_conversion_rate(self):
        """Test that analytics contains conversion_rate field"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        assert "conversion_rate" in data, "Missing conversion_rate field"
        assert isinstance(data["conversion_rate"], (int, float)), "conversion_rate should be numeric"
        assert 0 <= data["conversion_rate"] <= 100, "conversion_rate should be between 0 and 100"
    
    def test_analytics_contains_avg_projects_per_user(self):
        """Test that analytics contains avg_projects_per_user field"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        assert "avg_projects_per_user" in data, "Missing avg_projects_per_user field"
        assert isinstance(data["avg_projects_per_user"], (int, float)), "avg_projects_per_user should be numeric"
        assert data["avg_projects_per_user"] >= 0, "avg_projects_per_user should be non-negative"
    
    # ==================== DATA CONSISTENCY TESTS ====================
    
    def test_users_today_less_than_or_equal_total(self):
        """Test that users_today <= total_users"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        assert data["users_today"] <= data["total_users"], "users_today should be <= total_users"
    
    def test_users_this_week_less_than_or_equal_total(self):
        """Test that users_this_week <= total_users"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        assert data["users_this_week"] <= data["total_users"], "users_this_week should be <= total_users"
    
    def test_users_this_month_less_than_or_equal_total(self):
        """Test that users_this_month <= total_users"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        assert data["users_this_month"] <= data["total_users"], "users_this_month should be <= total_users"
    
    def test_active_users_24h_less_than_or_equal_total(self):
        """Test that active_users_24h <= total_users"""
        response = self.session.get(f"{BASE_URL}/api/admin/analytics")
        data = response.json()
        assert data["active_users_24h"] <= data["total_users"], "active_users_24h should be <= total_users"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
