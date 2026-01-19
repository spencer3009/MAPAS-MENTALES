"""
Test Company Deletion and Health Status Bug Fix
Tests:
1. Bug Fix: Health status should show 'good' for new companies with 0 income/expenses
2. Feature: Company deletion with confirmation (name or 'ELIMINAR')
3. Feature: Rejection of deletion with incorrect confirmation
4. Feature: Cascade deletion of all associated data
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthStatusBugFix:
    """Test that health_status returns 'good' for new companies with no activity"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "spencer3009",
            "password": "Socios3009"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_health_status_good_for_new_company(self):
        """
        BUG FIX TEST: New company with 0 income and 0 expenses should show 'good' health status
        Previously showed 'critical' which was incorrect
        """
        # Create a new test company
        company_name = f"TEST_HealthCheck_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/finanzas/companies",
            headers=self.headers,
            json={"name": company_name, "currency": "PEN"}
        )
        assert create_response.status_code == 200, f"Failed to create company: {create_response.text}"
        company = create_response.json()
        company_id = company["id"]
        
        try:
            # Get financial summary for the new company (should have 0 income, 0 expenses)
            summary_response = requests.get(
                f"{BASE_URL}/api/finanzas/summary",
                headers=self.headers,
                params={"company_id": company_id}
            )
            assert summary_response.status_code == 200, f"Failed to get summary: {summary_response.text}"
            summary = summary_response.json()
            
            # Verify the bug fix: health_status should be 'good' for new company
            assert summary["health_status"] == "good", \
                f"BUG: health_status should be 'good' for new company with 0 income/expenses, got '{summary['health_status']}'"
            
            # Verify the values are indeed 0
            assert summary["total_income"] == 0, f"Expected 0 income, got {summary['total_income']}"
            assert summary["total_expenses"] == 0, f"Expected 0 expenses, got {summary['total_expenses']}"
            
            print(f"✅ Health status correctly shows 'good' for new company with S/ 0 income and S/ 0 expenses")
            
        finally:
            # Cleanup: Delete the test company
            requests.delete(
                f"{BASE_URL}/api/finanzas/companies/{company_id}",
                headers=self.headers,
                params={"confirmation": "ELIMINAR"}
            )


class TestCompanyDeletion:
    """Test company deletion feature with confirmation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "spencer3009",
            "password": "Socios3009"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_delete_company_requires_confirmation(self):
        """Test that deletion without confirmation fails"""
        # Create a test company
        company_name = f"TEST_DeleteNoConfirm_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/finanzas/companies",
            headers=self.headers,
            json={"name": company_name, "currency": "PEN"}
        )
        assert create_response.status_code == 200
        company_id = create_response.json()["id"]
        
        try:
            # Try to delete without confirmation - should fail
            delete_response = requests.delete(
                f"{BASE_URL}/api/finanzas/companies/{company_id}",
                headers=self.headers
            )
            assert delete_response.status_code == 400, \
                f"Expected 400 for deletion without confirmation, got {delete_response.status_code}"
            
            error_detail = delete_response.json().get("detail", "")
            assert "Confirmación incorrecta" in error_detail or "ELIMINAR" in error_detail, \
                f"Expected confirmation error message, got: {error_detail}"
            
            print("✅ Deletion correctly rejected without confirmation")
            
        finally:
            # Cleanup
            requests.delete(
                f"{BASE_URL}/api/finanzas/companies/{company_id}",
                headers=self.headers,
                params={"confirmation": "ELIMINAR"}
            )
    
    def test_delete_company_wrong_confirmation_fails(self):
        """Test that deletion with wrong confirmation fails"""
        # Create a test company
        company_name = f"TEST_DeleteWrongConfirm_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/finanzas/companies",
            headers=self.headers,
            json={"name": company_name, "currency": "PEN"}
        )
        assert create_response.status_code == 200
        company_id = create_response.json()["id"]
        
        try:
            # Try to delete with wrong confirmation - should fail
            delete_response = requests.delete(
                f"{BASE_URL}/api/finanzas/companies/{company_id}",
                headers=self.headers,
                params={"confirmation": "WRONG_CONFIRMATION"}
            )
            assert delete_response.status_code == 400, \
                f"Expected 400 for wrong confirmation, got {delete_response.status_code}"
            
            error_detail = delete_response.json().get("detail", "")
            assert "Confirmación incorrecta" in error_detail, \
                f"Expected confirmation error message, got: {error_detail}"
            
            print("✅ Deletion correctly rejected with wrong confirmation")
            
        finally:
            # Cleanup
            requests.delete(
                f"{BASE_URL}/api/finanzas/companies/{company_id}",
                headers=self.headers,
                params={"confirmation": "ELIMINAR"}
            )
    
    def test_delete_company_with_eliminar_keyword(self):
        """Test that deletion works with 'ELIMINAR' keyword"""
        # Create a test company
        company_name = f"TEST_DeleteEliminar_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/finanzas/companies",
            headers=self.headers,
            json={"name": company_name, "currency": "PEN"}
        )
        assert create_response.status_code == 200
        company = create_response.json()
        company_id = company["id"]
        
        # Delete with 'ELIMINAR' keyword
        delete_response = requests.delete(
            f"{BASE_URL}/api/finanzas/companies/{company_id}",
            headers=self.headers,
            params={"confirmation": "ELIMINAR"}
        )
        assert delete_response.status_code == 200, \
            f"Expected 200 for deletion with ELIMINAR, got {delete_response.status_code}: {delete_response.text}"
        
        result = delete_response.json()
        assert "message" in result, "Expected message in response"
        assert company_name in result["message"], f"Expected company name in message, got: {result['message']}"
        
        # Verify company is deleted
        get_response = requests.get(
            f"{BASE_URL}/api/finanzas/companies",
            headers=self.headers
        )
        companies = get_response.json()
        company_ids = [c["id"] for c in companies]
        assert company_id not in company_ids, "Company should be deleted"
        
        print("✅ Company successfully deleted with 'ELIMINAR' keyword")
    
    def test_delete_company_with_exact_name(self):
        """Test that deletion works with exact company name"""
        # Create a test company
        company_name = f"TEST_DeleteExactName_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/finanzas/companies",
            headers=self.headers,
            json={"name": company_name, "currency": "PEN"}
        )
        assert create_response.status_code == 200
        company = create_response.json()
        company_id = company["id"]
        
        # Delete with exact company name
        delete_response = requests.delete(
            f"{BASE_URL}/api/finanzas/companies/{company_id}",
            headers=self.headers,
            params={"confirmation": company_name}
        )
        assert delete_response.status_code == 200, \
            f"Expected 200 for deletion with exact name, got {delete_response.status_code}: {delete_response.text}"
        
        result = delete_response.json()
        assert "message" in result, "Expected message in response"
        
        # Verify company is deleted
        get_response = requests.get(
            f"{BASE_URL}/api/finanzas/companies",
            headers=self.headers
        )
        companies = get_response.json()
        company_ids = [c["id"] for c in companies]
        assert company_id not in company_ids, "Company should be deleted"
        
        print("✅ Company successfully deleted with exact company name")
    
    def test_delete_company_cascades_financial_data(self):
        """Test that deleting a company also deletes all associated financial data"""
        # Create a test company
        company_name = f"TEST_CascadeDelete_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/finanzas/companies",
            headers=self.headers,
            json={"name": company_name, "currency": "PEN"}
        )
        assert create_response.status_code == 200
        company = create_response.json()
        company_id = company["id"]
        
        # Add some financial data
        # 1. Create an income
        income_response = requests.post(
            f"{BASE_URL}/api/finanzas/incomes",
            headers=self.headers,
            json={
                "company_id": company_id,
                "amount": 1000,
                "source": "ventas",
                "description": "Test income for cascade delete",
                "date": "2025-01-19",
                "status": "collected"
            }
        )
        assert income_response.status_code == 200, f"Failed to create income: {income_response.text}"
        income_id = income_response.json()["id"]
        
        # 2. Create an expense
        expense_response = requests.post(
            f"{BASE_URL}/api/finanzas/expenses",
            headers=self.headers,
            json={
                "company_id": company_id,
                "amount": 500,
                "category": "otros",
                "description": "Test expense for cascade delete",
                "date": "2025-01-19",
                "status": "paid"
            }
        )
        assert expense_response.status_code == 200, f"Failed to create expense: {expense_response.text}"
        expense_id = expense_response.json()["id"]
        
        # 3. Create an investment
        investment_response = requests.post(
            f"{BASE_URL}/api/finanzas/investments",
            headers=self.headers,
            json={
                "company_id": company_id,
                "amount": 2000,
                "description": "Test investment for cascade delete",
                "date": "2025-01-19",
                "status": "active"
            }
        )
        assert investment_response.status_code == 200, f"Failed to create investment: {investment_response.text}"
        investment_id = investment_response.json()["id"]
        
        # Delete the company
        delete_response = requests.delete(
            f"{BASE_URL}/api/finanzas/companies/{company_id}",
            headers=self.headers,
            params={"confirmation": "ELIMINAR"}
        )
        assert delete_response.status_code == 200, f"Failed to delete company: {delete_response.text}"
        
        result = delete_response.json()
        
        # Verify deleted_data stats are returned
        assert "deleted_data" in result, "Expected deleted_data in response"
        deleted_data = result["deleted_data"]
        assert deleted_data["incomes"] >= 1, f"Expected at least 1 income deleted, got {deleted_data['incomes']}"
        assert deleted_data["expenses"] >= 1, f"Expected at least 1 expense deleted, got {deleted_data['expenses']}"
        assert deleted_data["investments"] >= 1, f"Expected at least 1 investment deleted, got {deleted_data['investments']}"
        
        print(f"✅ Company deleted with cascade: {deleted_data['incomes']} incomes, {deleted_data['expenses']} expenses, {deleted_data['investments']} investments")
    
    def test_delete_nonexistent_company_returns_404(self):
        """Test that deleting a non-existent company returns 404"""
        fake_company_id = f"company_{uuid.uuid4().hex[:12]}"
        
        delete_response = requests.delete(
            f"{BASE_URL}/api/finanzas/companies/{fake_company_id}",
            headers=self.headers,
            params={"confirmation": "ELIMINAR"}
        )
        assert delete_response.status_code == 404, \
            f"Expected 404 for non-existent company, got {delete_response.status_code}"
        
        print("✅ Correctly returns 404 for non-existent company")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
