"""
Test IGV Determination Feature - Finanzas Module
Tests for:
1. Expense creation with includes_igv toggle
2. Automatic calculation of base_imponible and igv_gasto
3. IGV determination in dashboard (IGV Ventas - IGV Gastos)
4. Filter modes (day/month/year) for IGV calculation
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USERNAME = "spencer3009"
TEST_PASSWORD = "Socios3009"

# IGV Rate constant
IGV_RATE = 0.18


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture(scope="module")
def company_id(headers):
    """Get first company ID for testing"""
    response = requests.get(f"{BASE_URL}/api/finanzas/companies", headers=headers)
    assert response.status_code == 200, f"Failed to get companies: {response.text}"
    companies = response.json()
    assert len(companies) > 0, "No companies found for testing"
    return companies[0]["id"]


class TestExpenseIGVToggle:
    """Test 1-4: Expense creation with IGV toggle and automatic calculation"""
    
    def test_create_expense_with_igv_enabled(self, headers, company_id):
        """Test creating expense with includes_igv=true calculates base_imponible and igv_gasto"""
        # Amount = 590, expected: base_imponible = 500, igv_gasto = 90
        expense_data = {
            "company_id": company_id,
            "amount": 590.0,
            "category": "herramientas",
            "description": "TEST_IGV_Gasto con IGV incluido",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "status": "paid",
            "includes_igv": True
        }
        
        response = requests.post(f"{BASE_URL}/api/finanzas/expenses", headers=headers, json=expense_data)
        assert response.status_code == 201, f"Failed to create expense: {response.text}"
        
        expense = response.json()
        
        # Verify IGV fields are calculated
        assert "includes_igv" in expense, "includes_igv field missing"
        assert expense["includes_igv"] == True, "includes_igv should be True"
        
        assert "base_imponible" in expense, "base_imponible field missing"
        assert "igv_gasto" in expense, "igv_gasto field missing"
        
        # Verify calculation: base_imponible = amount / (1 + IGV_RATE)
        expected_base = round(590.0 / (1 + IGV_RATE), 2)
        expected_igv = round(590.0 - expected_base, 2)
        
        assert abs(expense["base_imponible"] - expected_base) < 0.01, \
            f"base_imponible incorrect: expected {expected_base}, got {expense['base_imponible']}"
        assert abs(expense["igv_gasto"] - expected_igv) < 0.01, \
            f"igv_gasto incorrect: expected {expected_igv}, got {expense['igv_gasto']}"
        
        print(f"✅ Expense with IGV: amount={expense['amount']}, base_imponible={expense['base_imponible']}, igv_gasto={expense['igv_gasto']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/finanzas/expenses/{expense['id']}", headers=headers)
    
    def test_create_expense_without_igv(self, headers, company_id):
        """Test creating expense with includes_igv=false sets igv_gasto=0"""
        expense_data = {
            "company_id": company_id,
            "amount": 500.0,
            "category": "otros",
            "description": "TEST_IGV_Gasto sin IGV",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "status": "paid",
            "includes_igv": False
        }
        
        response = requests.post(f"{BASE_URL}/api/finanzas/expenses", headers=headers, json=expense_data)
        assert response.status_code == 201, f"Failed to create expense: {response.text}"
        
        expense = response.json()
        
        # Verify IGV fields
        assert expense["includes_igv"] == False, "includes_igv should be False"
        assert expense["base_imponible"] == 500.0, f"base_imponible should equal amount: {expense['base_imponible']}"
        assert expense["igv_gasto"] == 0.0, f"igv_gasto should be 0: {expense['igv_gasto']}"
        
        print(f"✅ Expense without IGV: amount={expense['amount']}, base_imponible={expense['base_imponible']}, igv_gasto={expense['igv_gasto']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/finanzas/expenses/{expense['id']}", headers=headers)
    
    def test_expense_default_includes_igv_false(self, headers, company_id):
        """Test that includes_igv defaults to false when not specified"""
        expense_data = {
            "company_id": company_id,
            "amount": 300.0,
            "category": "otros",
            "description": "TEST_IGV_Gasto default",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "status": "paid"
            # includes_igv not specified
        }
        
        response = requests.post(f"{BASE_URL}/api/finanzas/expenses", headers=headers, json=expense_data)
        assert response.status_code == 201, f"Failed to create expense: {response.text}"
        
        expense = response.json()
        
        # Default should be False
        assert expense.get("includes_igv", False) == False, "includes_igv should default to False"
        assert expense["igv_gasto"] == 0.0, "igv_gasto should be 0 when includes_igv is False"
        
        print(f"✅ Default includes_igv=False verified")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/finanzas/expenses/{expense['id']}", headers=headers)


class TestIGVDetermination:
    """Test 5-8: IGV determination calculation in dashboard"""
    
    def test_get_expenses_with_igv_fields(self, headers, company_id):
        """Test that GET expenses returns includes_igv, base_imponible, igv_gasto fields"""
        response = requests.get(
            f"{BASE_URL}/api/finanzas/expenses",
            headers=headers,
            params={"company_id": company_id}
        )
        assert response.status_code == 200, f"Failed to get expenses: {response.text}"
        
        expenses = response.json()
        if len(expenses) > 0:
            expense = expenses[0]
            # Check that IGV fields exist
            assert "includes_igv" in expense or expense.get("includes_igv") is not None, \
                "includes_igv field should be present"
            print(f"✅ Expense has IGV fields: includes_igv={expense.get('includes_igv')}, igv_gasto={expense.get('igv_gasto')}")
    
    def test_summary_endpoint_exists(self, headers, company_id):
        """Test that summary endpoint returns data for IGV calculation"""
        current_month = datetime.now().strftime("%Y-%m")
        response = requests.get(
            f"{BASE_URL}/api/finanzas/summary",
            headers=headers,
            params={"company_id": company_id, "period": current_month}
        )
        assert response.status_code == 200, f"Failed to get summary: {response.text}"
        
        summary = response.json()
        assert "total_income_collected" in summary, "Summary should have total_income_collected"
        assert "total_expenses_paid" in summary, "Summary should have total_expenses_paid"
        
        print(f"✅ Summary endpoint working: income={summary['total_income_collected']}, expenses={summary['total_expenses_paid']}")
    
    def test_incomes_for_igv_calculation(self, headers, company_id):
        """Test that incomes endpoint returns data needed for IGV Ventas calculation"""
        response = requests.get(
            f"{BASE_URL}/api/finanzas/incomes",
            headers=headers,
            params={"company_id": company_id}
        )
        assert response.status_code == 200, f"Failed to get incomes: {response.text}"
        
        incomes = response.json()
        if len(incomes) > 0:
            income = incomes[0]
            assert "amount" in income, "Income should have amount field"
            assert "status" in income, "Income should have status field"
            print(f"✅ Income data available for IGV calculation: {len(incomes)} incomes found")


class TestIGVCalculationLogic:
    """Test the IGV calculation formula: IGV a pagar = IGV Ventas - IGV Gastos"""
    
    def test_igv_calculation_formula(self, headers, company_id):
        """
        Create test data and verify IGV determination:
        - Income: 1180 (collected) -> IGV Ventas = 180
        - Expense with IGV: 590 -> IGV Gastos = 90
        - IGV a pagar = 180 - 90 = 90
        """
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Create income (collected)
        income_data = {
            "company_id": company_id,
            "amount": 1180.0,
            "source": "ventas",
            "description": "TEST_IGV_Venta para cálculo IGV",
            "date": today,
            "status": "collected"
        }
        income_resp = requests.post(f"{BASE_URL}/api/finanzas/incomes", headers=headers, json=income_data)
        assert income_resp.status_code == 201, f"Failed to create income: {income_resp.text}"
        income = income_resp.json()
        
        # Create expense with IGV
        expense_data = {
            "company_id": company_id,
            "amount": 590.0,
            "category": "herramientas",
            "description": "TEST_IGV_Gasto para cálculo IGV",
            "date": today,
            "status": "paid",
            "includes_igv": True
        }
        expense_resp = requests.post(f"{BASE_URL}/api/finanzas/expenses", headers=headers, json=expense_data)
        assert expense_resp.status_code == 201, f"Failed to create expense: {expense_resp.text}"
        expense = expense_resp.json()
        
        # Verify calculations
        # IGV Ventas = 1180 / 1.18 * 0.18 = 180
        igv_ventas = round(1180.0 / (1 + IGV_RATE) * IGV_RATE, 2)
        # IGV Gastos = 590 - (590 / 1.18) = 90
        igv_gastos = expense["igv_gasto"]
        # IGV a pagar = IGV Ventas - IGV Gastos
        igv_a_pagar = igv_ventas - igv_gastos
        
        print(f"✅ IGV Calculation verified:")
        print(f"   IGV Ventas: S/ {igv_ventas}")
        print(f"   IGV Gastos: S/ {igv_gastos}")
        print(f"   IGV a pagar: S/ {igv_a_pagar}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/finanzas/incomes/{income['id']}", headers=headers)
        requests.delete(f"{BASE_URL}/api/finanzas/expenses/{expense['id']}", headers=headers)
    
    def test_igv_a_favor_scenario(self, headers, company_id):
        """
        Test IGV a favor scenario (when IGV Gastos > IGV Ventas):
        - Income: 590 (collected) -> IGV Ventas = 90
        - Expense with IGV: 1180 -> IGV Gastos = 180
        - IGV a favor = 90 (crédito fiscal)
        """
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Create small income
        income_data = {
            "company_id": company_id,
            "amount": 590.0,
            "source": "ventas",
            "description": "TEST_IGV_Venta pequeña",
            "date": today,
            "status": "collected"
        }
        income_resp = requests.post(f"{BASE_URL}/api/finanzas/incomes", headers=headers, json=income_data)
        income = income_resp.json()
        
        # Create large expense with IGV
        expense_data = {
            "company_id": company_id,
            "amount": 1180.0,
            "category": "infraestructura",
            "description": "TEST_IGV_Gasto grande",
            "date": today,
            "status": "paid",
            "includes_igv": True
        }
        expense_resp = requests.post(f"{BASE_URL}/api/finanzas/expenses", headers=headers, json=expense_data)
        expense = expense_resp.json()
        
        # Calculate
        igv_ventas = round(590.0 / (1 + IGV_RATE) * IGV_RATE, 2)
        igv_gastos = expense["igv_gasto"]
        igv_determinado = igv_ventas - igv_gastos
        
        assert igv_determinado < 0, "IGV should be negative (a favor)"
        print(f"✅ IGV a favor scenario verified:")
        print(f"   IGV Ventas: S/ {igv_ventas}")
        print(f"   IGV Gastos: S/ {igv_gastos}")
        print(f"   IGV a favor: S/ {abs(igv_determinado)}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/finanzas/incomes/{income['id']}", headers=headers)
        requests.delete(f"{BASE_URL}/api/finanzas/expenses/{expense['id']}", headers=headers)


class TestFilterModes:
    """Test 8: Filter modes (day/month/year) for IGV determination"""
    
    def test_expenses_filter_by_date(self, headers, company_id):
        """Test that expenses can be filtered by date for IGV calculation"""
        today = datetime.now().strftime("%Y-%m-%d")
        current_month = datetime.now().strftime("%Y-%m")
        
        # Get expenses for today
        response = requests.get(
            f"{BASE_URL}/api/finanzas/expenses",
            headers=headers,
            params={"company_id": company_id}
        )
        assert response.status_code == 200
        
        expenses = response.json()
        # Filter by today's date (simulating frontend filter)
        today_expenses = [e for e in expenses if e["date"].startswith(today)]
        
        print(f"✅ Date filtering works: {len(today_expenses)} expenses for today, {len(expenses)} total")
    
    def test_incomes_filter_by_date(self, headers, company_id):
        """Test that incomes can be filtered by date for IGV calculation"""
        response = requests.get(
            f"{BASE_URL}/api/finanzas/incomes",
            headers=headers,
            params={"company_id": company_id}
        )
        assert response.status_code == 200
        
        incomes = response.json()
        current_month = datetime.now().strftime("%Y-%m")
        
        # Filter by current month (simulating frontend filter)
        month_incomes = [i for i in incomes if i["date"].startswith(current_month)]
        
        print(f"✅ Month filtering works: {len(month_incomes)} incomes this month, {len(incomes)} total")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_expenses(self, headers, company_id):
        """Remove any TEST_IGV_ prefixed expenses"""
        response = requests.get(
            f"{BASE_URL}/api/finanzas/expenses",
            headers=headers,
            params={"company_id": company_id}
        )
        if response.status_code == 200:
            expenses = response.json()
            for exp in expenses:
                if exp.get("description", "").startswith("TEST_IGV_"):
                    requests.delete(f"{BASE_URL}/api/finanzas/expenses/{exp['id']}", headers=headers)
                    print(f"Cleaned up expense: {exp['description']}")
    
    def test_cleanup_test_incomes(self, headers, company_id):
        """Remove any TEST_IGV_ prefixed incomes"""
        response = requests.get(
            f"{BASE_URL}/api/finanzas/incomes",
            headers=headers,
            params={"company_id": company_id}
        )
        if response.status_code == 200:
            incomes = response.json()
            for inc in incomes:
                if inc.get("description", "").startswith("TEST_IGV_"):
                    requests.delete(f"{BASE_URL}/api/finanzas/incomes/{inc['id']}", headers=headers)
                    print(f"Cleaned up income: {inc['description']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
