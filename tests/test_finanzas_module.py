"""
Test suite for Finanzas Module - Financial Management for Mindora
Tests: Incomes, Expenses, Investments, Categories, Summary, Receivables, Payables
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USERNAME = "spencer3009"
TEST_PASSWORD = "Socios3009"


class TestFinanzasAuth:
    """Test authentication for finanzas endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"✅ Login successful, token received")


class TestFinanzasSummary:
    """Test financial summary endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_summary_current_month(self, auth_headers):
        """Test getting financial summary for current month"""
        response = requests.get(f"{BASE_URL}/api/finanzas/summary", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify summary structure
        assert "period" in data
        assert "total_income" in data
        assert "total_income_collected" in data
        assert "total_income_pending" in data
        assert "total_expenses" in data
        assert "total_expenses_paid" in data
        assert "total_expenses_pending" in data
        assert "total_investments" in data
        assert "net_result" in data
        assert "estimated_cash" in data
        assert "health_status" in data
        assert data["health_status"] in ["good", "warning", "critical"]
        
        print(f"✅ Summary retrieved: period={data['period']}, health={data['health_status']}")
    
    def test_get_summary_specific_period(self, auth_headers):
        """Test getting financial summary for specific period"""
        period = "2025-01"
        response = requests.get(f"{BASE_URL}/api/finanzas/summary?period={period}", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["period"] == period
        print(f"✅ Summary for {period} retrieved successfully")


class TestFinanzasCategories:
    """Test expense categories and income sources"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_expense_categories(self, auth_headers):
        """Test getting expense categories"""
        response = requests.get(f"{BASE_URL}/api/finanzas/categories", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "categories" in data
        categories = data["categories"]
        assert len(categories) > 0, "No categories returned"
        
        # Check default categories exist
        category_ids = [c["id"] for c in categories]
        assert "nomina" in category_ids
        assert "marketing" in category_ids
        assert "otros" in category_ids
        
        print(f"✅ {len(categories)} expense categories retrieved")
    
    def test_get_income_sources(self, auth_headers):
        """Test getting income sources"""
        response = requests.get(f"{BASE_URL}/api/finanzas/income-sources", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "sources" in data
        sources = data["sources"]
        assert len(sources) > 0, "No income sources returned"
        
        # Check default sources exist
        source_ids = [s["id"] for s in sources]
        assert "ventas" in source_ids
        assert "servicios" in source_ids
        
        print(f"✅ {len(sources)} income sources retrieved")


class TestFinanzasIncomes:
    """Test income CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_incomes_list(self, auth_headers):
        """Test getting list of incomes"""
        response = requests.get(f"{BASE_URL}/api/finanzas/incomes", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ {len(data)} incomes retrieved")
    
    def test_create_income(self, auth_headers):
        """Test creating a new income"""
        today = datetime.now().strftime("%Y-%m-%d")
        income_data = {
            "amount": 1000.00,
            "source": "ventas",
            "description": "TEST_Income from pytest",
            "date": today,
            "status": "pending",
            "client_name": "Test Client"
        }
        
        response = requests.post(f"{BASE_URL}/api/finanzas/incomes", 
                                json=income_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data["amount"] == 1000.00
        assert data["source"] == "ventas"
        assert data["status"] == "pending"
        
        # Store ID for cleanup
        TestFinanzasIncomes.created_income_id = data["id"]
        print(f"✅ Income created with ID: {data['id']}")
    
    def test_get_income_by_id(self, auth_headers):
        """Test getting specific income"""
        income_id = getattr(TestFinanzasIncomes, 'created_income_id', None)
        if not income_id:
            pytest.skip("No income created to fetch")
        
        response = requests.get(f"{BASE_URL}/api/finanzas/incomes/{income_id}", 
                               headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["id"] == income_id
        print(f"✅ Income {income_id} retrieved successfully")
    
    def test_update_income_status(self, auth_headers):
        """Test updating income status to collected"""
        income_id = getattr(TestFinanzasIncomes, 'created_income_id', None)
        if not income_id:
            pytest.skip("No income created to update")
        
        response = requests.put(f"{BASE_URL}/api/finanzas/incomes/{income_id}",
                               json={"status": "collected"}, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["status"] == "collected"
        print(f"✅ Income status updated to 'collected'")
    
    def test_delete_income(self, auth_headers):
        """Test deleting income"""
        income_id = getattr(TestFinanzasIncomes, 'created_income_id', None)
        if not income_id:
            pytest.skip("No income created to delete")
        
        response = requests.delete(f"{BASE_URL}/api/finanzas/incomes/{income_id}",
                                  headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"✅ Income {income_id} deleted successfully")


class TestFinanzasExpenses:
    """Test expense CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_expenses_list(self, auth_headers):
        """Test getting list of expenses"""
        response = requests.get(f"{BASE_URL}/api/finanzas/expenses", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ {len(data)} expenses retrieved")
    
    def test_create_expense(self, auth_headers):
        """Test creating a new expense"""
        today = datetime.now().strftime("%Y-%m-%d")
        expense_data = {
            "amount": 500.00,
            "category": "otros",
            "description": "TEST_Expense from pytest",
            "date": today,
            "status": "pending",
            "priority": "medium",
            "is_recurring": False
        }
        
        response = requests.post(f"{BASE_URL}/api/finanzas/expenses",
                                json=expense_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data["amount"] == 500.00
        assert data["category"] == "otros"
        assert data["status"] == "pending"
        assert data["priority"] == "medium"
        
        TestFinanzasExpenses.created_expense_id = data["id"]
        print(f"✅ Expense created with ID: {data['id']}")
    
    def test_update_expense_status(self, auth_headers):
        """Test updating expense status to paid"""
        expense_id = getattr(TestFinanzasExpenses, 'created_expense_id', None)
        if not expense_id:
            pytest.skip("No expense created to update")
        
        response = requests.put(f"{BASE_URL}/api/finanzas/expenses/{expense_id}",
                               json={"status": "paid"}, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["status"] == "paid"
        print(f"✅ Expense status updated to 'paid'")
    
    def test_duplicate_expense(self, auth_headers):
        """Test duplicating an expense"""
        expense_id = getattr(TestFinanzasExpenses, 'created_expense_id', None)
        if not expense_id:
            pytest.skip("No expense created to duplicate")
        
        response = requests.post(f"{BASE_URL}/api/finanzas/expenses/{expense_id}/duplicate",
                                headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data["id"] != expense_id  # New ID
        assert data["status"] == "pending"  # Reset to pending
        
        TestFinanzasExpenses.duplicated_expense_id = data["id"]
        print(f"✅ Expense duplicated with new ID: {data['id']}")
    
    def test_delete_expenses(self, auth_headers):
        """Test deleting expenses"""
        expense_id = getattr(TestFinanzasExpenses, 'created_expense_id', None)
        dup_id = getattr(TestFinanzasExpenses, 'duplicated_expense_id', None)
        
        for eid in [expense_id, dup_id]:
            if eid:
                response = requests.delete(f"{BASE_URL}/api/finanzas/expenses/{eid}",
                                          headers=auth_headers)
                assert response.status_code == 200, f"Failed to delete {eid}: {response.text}"
                print(f"✅ Expense {eid} deleted")


class TestFinanzasInvestments:
    """Test investment CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_investments_list(self, auth_headers):
        """Test getting list of investments"""
        response = requests.get(f"{BASE_URL}/api/finanzas/investments", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ {len(data)} investments retrieved")
    
    def test_create_investment(self, auth_headers):
        """Test creating a new investment"""
        today = datetime.now().strftime("%Y-%m-%d")
        investment_data = {
            "amount": 2000.00,
            "description": "TEST_Investment from pytest",
            "date": today,
            "status": "active",
            "objective": "Test objective",
            "expected_return": 2500.00
        }
        
        response = requests.post(f"{BASE_URL}/api/finanzas/investments",
                                json=investment_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data["amount"] == 2000.00
        assert data["status"] == "active"
        
        TestFinanzasInvestments.created_investment_id = data["id"]
        print(f"✅ Investment created with ID: {data['id']}")
    
    def test_update_investment(self, auth_headers):
        """Test updating investment"""
        inv_id = getattr(TestFinanzasInvestments, 'created_investment_id', None)
        if not inv_id:
            pytest.skip("No investment created to update")
        
        response = requests.put(f"{BASE_URL}/api/finanzas/investments/{inv_id}",
                               json={"status": "recovered", "actual_return": 2600.00},
                               headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["status"] == "recovered"
        assert data["actual_return"] == 2600.00
        print(f"✅ Investment updated to 'recovered'")
    
    def test_delete_investment(self, auth_headers):
        """Test deleting investment"""
        inv_id = getattr(TestFinanzasInvestments, 'created_investment_id', None)
        if not inv_id:
            pytest.skip("No investment created to delete")
        
        response = requests.delete(f"{BASE_URL}/api/finanzas/investments/{inv_id}",
                                  headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"✅ Investment {inv_id} deleted")


class TestFinanzasReceivablesPayables:
    """Test receivables and payables endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_receivables(self, auth_headers):
        """Test getting receivables (pending incomes)"""
        response = requests.get(f"{BASE_URL}/api/finanzas/receivables", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "receivables" in data
        assert "total" in data
        assert "count" in data
        assert isinstance(data["receivables"], list)
        
        print(f"✅ Receivables: {data['count']} items, total: {data['total']}")
    
    def test_get_payables(self, auth_headers):
        """Test getting payables (pending expenses)"""
        response = requests.get(f"{BASE_URL}/api/finanzas/payables", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "payables" in data
        assert "total" in data
        assert "count" in data
        assert isinstance(data["payables"], list)
        
        print(f"✅ Payables: {data['count']} items, total: {data['total']}")


class TestFinanzasProjectSummary:
    """Test project-based financial summary"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_summary_by_project(self, auth_headers):
        """Test getting financial summary grouped by project"""
        response = requests.get(f"{BASE_URL}/api/finanzas/summary/by-project", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "projects" in data
        assert isinstance(data["projects"], list)
        
        print(f"✅ Project summaries: {len(data['projects'])} projects")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
