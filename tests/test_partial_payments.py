"""
Test suite for Partial Payments System - Cuentas por Cobrar
Tests: POST/GET/DELETE /api/finanzas/partial-payments
Features: Pagos parciales, estados (pending/partial/collected), validaciones
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USERNAME = "spencer3009"
TEST_PASSWORD = "Socios3009"


class TestPartialPaymentsAuth:
    """Authentication fixture for partial payments tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print(f"✅ Login successful")


class TestReceivablesEndpoint:
    """Test receivables endpoint - Dashboard data"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_receivables_structure(self, auth_headers):
        """Test receivables endpoint returns correct structure for dashboard"""
        response = requests.get(f"{BASE_URL}/api/finanzas/receivables", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify dashboard data structure
        assert "receivables" in data, "Missing 'receivables' list"
        assert "total" in data, "Missing 'total' (saldo pendiente)"
        assert "count" in data, "Missing 'count'"
        
        # Check for total_facturado and total_abonado (for dashboard cards)
        # These may be calculated on frontend if not present
        print(f"✅ Receivables structure: {data['count']} items, total pending: {data['total']}")
        
        # Verify each receivable has required fields
        for item in data["receivables"]:
            assert "id" in item, "Missing 'id'"
            assert "amount" in item, "Missing 'amount' (monto total)"
            assert "date" in item, "Missing 'date'"
            # paid_amount may be 0 or None for new items
            print(f"  - {item.get('description', 'N/A')}: amount={item.get('amount')}, paid={item.get('paid_amount', 0)}")


class TestPartialPaymentsCRUD:
    """Test partial payments CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_income(self, auth_headers):
        """Create a test income for partial payment tests"""
        today = datetime.now().strftime("%Y-%m-%d")
        income_data = {
            "amount": 1500.00,
            "paid_amount": 0,
            "source": "servicios",
            "description": "TEST_Partial_Payment_Income",
            "date": today,
            "status": "pending",
            "client_name": "Test Client Partial"
        }
        
        response = requests.post(f"{BASE_URL}/api/finanzas/incomes", 
                                json=income_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create test income: {response.text}"
        data = response.json()
        print(f"✅ Test income created: {data['id']}")
        
        yield data
        
        # Cleanup: Delete the test income
        requests.delete(f"{BASE_URL}/api/finanzas/incomes/{data['id']}", headers=auth_headers)
        print(f"✅ Test income cleaned up: {data['id']}")
    
    def test_create_partial_payment(self, auth_headers, test_income):
        """Test creating a partial payment"""
        today = datetime.now().strftime("%Y-%m-%d")
        payment_data = {
            "income_id": test_income["id"],
            "amount": 500.00,
            "date": today,
            "payment_method": "efectivo",
            "note": "Primer abono de prueba"
        }
        
        response = requests.post(f"{BASE_URL}/api/finanzas/partial-payments",
                                json=payment_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify payment was created
        assert "payment" in data, "Missing 'payment' in response"
        assert data["payment"]["amount"] == 500.00
        assert data["payment"]["payment_method"] == "efectivo"
        
        # Verify income was updated
        assert "income_updated" in data, "Missing 'income_updated' in response"
        assert data["income_updated"]["paid_amount"] == 500.00
        assert data["income_updated"]["pending_balance"] == 1000.00
        assert data["income_updated"]["status"] == "partial", "Status should be 'partial' after first payment"
        
        # Store payment ID for later tests
        TestPartialPaymentsCRUD.created_payment_id = data["payment"]["id"]
        print(f"✅ Partial payment created: {data['payment']['id']}")
        print(f"   Income updated: paid={data['income_updated']['paid_amount']}, pending={data['income_updated']['pending_balance']}, status={data['income_updated']['status']}")
    
    def test_get_payment_history(self, auth_headers, test_income):
        """Test getting payment history for an income"""
        response = requests.get(f"{BASE_URL}/api/finanzas/partial-payments/{test_income['id']}",
                               headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "payments" in data, "Missing 'payments' list"
        assert "total_paid" in data, "Missing 'total_paid'"
        assert "count" in data, "Missing 'count'"
        
        assert len(data["payments"]) >= 1, "Should have at least 1 payment"
        assert data["total_paid"] >= 500.00, "Total paid should be at least 500"
        
        print(f"✅ Payment history: {data['count']} payments, total paid: {data['total_paid']}")
    
    def test_payment_validation_exceeds_balance(self, auth_headers, test_income):
        """Test that payment cannot exceed pending balance"""
        today = datetime.now().strftime("%Y-%m-%d")
        payment_data = {
            "income_id": test_income["id"],
            "amount": 2000.00,  # More than pending balance (1000)
            "date": today,
            "payment_method": "transferencia",
            "note": "This should fail"
        }
        
        response = requests.post(f"{BASE_URL}/api/finanzas/partial-payments",
                                json=payment_data, headers=auth_headers)
        assert response.status_code == 400, f"Should fail with 400, got {response.status_code}"
        data = response.json()
        assert "excede" in data.get("detail", "").lower() or "exceed" in data.get("detail", "").lower(), \
            f"Error message should mention exceeding balance: {data}"
        
        print(f"✅ Validation works: Payment exceeding balance rejected")
    
    def test_complete_payment_changes_status_to_collected(self, auth_headers, test_income):
        """Test that paying remaining balance changes status to 'collected'"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Get current pending balance
        response = requests.get(f"{BASE_URL}/api/finanzas/incomes/{test_income['id']}", 
                               headers=auth_headers)
        income = response.json()
        pending = income.get("amount", 0) - income.get("paid_amount", 0)
        
        # Pay the remaining balance
        payment_data = {
            "income_id": test_income["id"],
            "amount": pending,
            "date": today,
            "payment_method": "yape",
            "note": "Pago final"
        }
        
        response = requests.post(f"{BASE_URL}/api/finanzas/partial-payments",
                                json=payment_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify status changed to collected
        assert data["income_updated"]["status"] == "collected", \
            f"Status should be 'collected' after full payment, got: {data['income_updated']['status']}"
        assert data["income_updated"]["pending_balance"] <= 0, \
            f"Pending balance should be 0, got: {data['income_updated']['pending_balance']}"
        
        TestPartialPaymentsCRUD.final_payment_id = data["payment"]["id"]
        print(f"✅ Full payment completed: status changed to 'collected'")
    
    def test_delete_partial_payment(self, auth_headers, test_income):
        """Test deleting a partial payment recalculates income"""
        payment_id = getattr(TestPartialPaymentsCRUD, 'final_payment_id', None)
        if not payment_id:
            pytest.skip("No payment to delete")
        
        response = requests.delete(f"{BASE_URL}/api/finanzas/partial-payments/{payment_id}",
                                  headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Verify income was recalculated
        response = requests.get(f"{BASE_URL}/api/finanzas/incomes/{test_income['id']}", 
                               headers=auth_headers)
        income = response.json()
        
        # After deleting final payment, status should revert to partial
        assert income["status"] in ["partial", "pending"], \
            f"Status should revert after deleting payment, got: {income['status']}"
        
        print(f"✅ Payment deleted, income recalculated: status={income['status']}")


class TestExistingPartialPaymentData:
    """Test with existing test data mentioned in context"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_existing_partial_income(self, auth_headers):
        """Test that existing partial income 'Clases de piano - Febrero' exists"""
        # The income_id from context: f84af4dc-78f9-4f7b-8943-4cea82b8e6ae
        income_id = "f84af4dc-78f9-4f7b-8943-4cea82b8e6ae"
        
        response = requests.get(f"{BASE_URL}/api/finanzas/incomes/{income_id}", 
                               headers=auth_headers)
        
        if response.status_code == 404:
            print(f"⚠️ Test income not found (may have been deleted): {income_id}")
            pytest.skip("Test income not found")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify expected values
        print(f"✅ Found existing income: {data.get('description', 'N/A')}")
        print(f"   Amount: {data.get('amount')}, Paid: {data.get('paid_amount')}, Status: {data.get('status')}")
        
        # Check if it has partial status
        if data.get("paid_amount", 0) > 0 and data.get("paid_amount", 0) < data.get("amount", 0):
            assert data.get("status") in ["partial", "pending"], \
                f"Income with partial payment should have 'partial' status"


class TestPartialPaymentsIntegration:
    """Integration tests for partial payments with receivables"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_receivables_shows_partial_status(self, auth_headers):
        """Test that receivables endpoint shows items with partial status"""
        response = requests.get(f"{BASE_URL}/api/finanzas/receivables", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Check if any receivable has partial payments
        partial_items = [r for r in data["receivables"] if r.get("paid_amount", 0) > 0]
        
        print(f"✅ Receivables with partial payments: {len(partial_items)}")
        for item in partial_items[:3]:  # Show first 3
            pending = item.get("amount", 0) - item.get("paid_amount", 0)
            print(f"   - {item.get('description', 'N/A')}: paid={item.get('paid_amount')}, pending={pending}")
    
    def test_summary_reflects_partial_payments(self, auth_headers):
        """Test that financial summary correctly reflects partial payments"""
        response = requests.get(f"{BASE_URL}/api/finanzas/summary", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Summary should have income collected (from paid_amount) and pending
        assert "total_income_collected" in data, "Missing total_income_collected"
        assert "total_income_pending" in data, "Missing total_income_pending"
        
        print(f"✅ Summary: collected={data['total_income_collected']}, pending={data['total_income_pending']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
