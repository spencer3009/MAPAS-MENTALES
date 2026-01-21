"""
Test suite for Products/Services Module in Finanzas
Tests CRUD operations, filters, status toggle, and integration with Income modal
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://invoice-manager-292.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_USERNAME = "spencer3009"
TEST_PASSWORD = "Socios3009"
COMPANY_ID = "b9fe9962-ea98-4f99-9c1a-983bffbe5660"


class TestProductsModule:
    """Test suite for Products/Services CRUD and filters"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        token = response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.token = token
        
        # Store created product IDs for cleanup
        self.created_product_ids = []
        
        yield
        
        # Cleanup: Delete test products
        for product_id in self.created_product_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/finanzas/products/{product_id}")
            except:
                pass
    
    # ==========================================
    # TEST 1: Products Tab exists in Finanzas
    # ==========================================
    def test_01_products_endpoint_exists(self):
        """Verify GET /api/finanzas/products endpoint exists and returns data"""
        response = self.session.get(f"{BASE_URL}/api/finanzas/products?company_id={COMPANY_ID}")
        
        assert response.status_code == 200, f"Products endpoint failed: {response.text}"
        products = response.json()
        assert isinstance(products, list), "Products should be a list"
        print(f"✅ Products endpoint working - Found {len(products)} products")
    
    # ==========================================
    # TEST 2: CRUD - Create Product
    # ==========================================
    def test_02_create_product(self):
        """Test creating a new product with all fields"""
        test_product = {
            "name": f"TEST_Producto_{uuid.uuid4().hex[:8]}",
            "type": "producto",
            "base_price": 299.99,
            "includes_igv": True,
            "description": "Producto de prueba para testing",
            "category": "Testing",
            "status": "activo"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/finanzas/products?company_id={COMPANY_ID}",
            json=test_product
        )
        
        assert response.status_code == 200, f"Create product failed: {response.text}"
        created = response.json()
        
        # Verify all fields
        assert created["name"] == test_product["name"]
        assert created["type"] == "producto"
        assert created["base_price"] == 299.99
        assert created["includes_igv"] == True
        assert created["description"] == test_product["description"]
        assert created["category"] == "Testing"
        assert created["status"] == "activo"
        assert "id" in created
        
        self.created_product_ids.append(created["id"])
        print(f"✅ Product created successfully: {created['name']} (ID: {created['id']})")
        
        return created["id"]
    
    # ==========================================
    # TEST 3: CRUD - Create Service
    # ==========================================
    def test_03_create_service(self):
        """Test creating a new service"""
        test_service = {
            "name": f"TEST_Servicio_{uuid.uuid4().hex[:8]}",
            "type": "servicio",
            "base_price": 150.00,
            "includes_igv": False,
            "description": "Servicio de prueba",
            "category": "Consultoría",
            "status": "activo"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/finanzas/products?company_id={COMPANY_ID}",
            json=test_service
        )
        
        assert response.status_code == 200, f"Create service failed: {response.text}"
        created = response.json()
        
        assert created["type"] == "servicio"
        assert created["includes_igv"] == False
        
        self.created_product_ids.append(created["id"])
        print(f"✅ Service created successfully: {created['name']}")
        
        return created["id"]
    
    # ==========================================
    # TEST 4: CRUD - Read/List Products
    # ==========================================
    def test_04_list_products(self):
        """Test listing all products"""
        response = self.session.get(f"{BASE_URL}/api/finanzas/products?company_id={COMPANY_ID}")
        
        assert response.status_code == 200
        products = response.json()
        
        # Should have at least the 3 seed products
        assert len(products) >= 3, f"Expected at least 3 products, got {len(products)}"
        
        # Verify product structure
        for product in products:
            assert "id" in product
            assert "name" in product
            assert "type" in product
            assert "base_price" in product
            assert "status" in product
        
        print(f"✅ Listed {len(products)} products successfully")
    
    # ==========================================
    # TEST 5: CRUD - Read Single Product
    # ==========================================
    def test_05_get_single_product(self):
        """Test getting a single product by ID"""
        # First create a product
        test_product = {
            "name": f"TEST_Single_{uuid.uuid4().hex[:8]}",
            "type": "producto",
            "base_price": 100.00,
            "includes_igv": True,
            "description": "Test single get",
            "category": "Test",
            "status": "activo"
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/finanzas/products?company_id={COMPANY_ID}",
            json=test_product
        )
        assert create_response.status_code == 200
        product_id = create_response.json()["id"]
        self.created_product_ids.append(product_id)
        
        # Get the product
        get_response = self.session.get(f"{BASE_URL}/api/finanzas/products/{product_id}")
        
        assert get_response.status_code == 200, f"Get product failed: {get_response.text}"
        product = get_response.json()
        
        assert product["id"] == product_id
        assert product["name"] == test_product["name"]
        
        print(f"✅ Single product retrieved successfully: {product['name']}")
    
    # ==========================================
    # TEST 6: CRUD - Update Product
    # ==========================================
    def test_06_update_product(self):
        """Test updating a product"""
        # Create a product first
        test_product = {
            "name": f"TEST_Update_{uuid.uuid4().hex[:8]}",
            "type": "producto",
            "base_price": 200.00,
            "includes_igv": True,
            "description": "Original description",
            "category": "Original",
            "status": "activo"
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/finanzas/products?company_id={COMPANY_ID}",
            json=test_product
        )
        assert create_response.status_code == 200
        product_id = create_response.json()["id"]
        self.created_product_ids.append(product_id)
        
        # Update the product
        update_data = {
            "name": "TEST_Updated_Name",
            "base_price": 350.00,
            "description": "Updated description",
            "category": "Updated Category"
        }
        
        update_response = self.session.put(
            f"{BASE_URL}/api/finanzas/products/{product_id}",
            json=update_data
        )
        
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated = update_response.json()
        
        assert updated["name"] == "TEST_Updated_Name"
        assert updated["base_price"] == 350.00
        assert updated["description"] == "Updated description"
        assert updated["category"] == "Updated Category"
        
        # Verify persistence with GET
        get_response = self.session.get(f"{BASE_URL}/api/finanzas/products/{product_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["name"] == "TEST_Updated_Name"
        
        print(f"✅ Product updated and verified successfully")
    
    # ==========================================
    # TEST 7: CRUD - Delete Product
    # ==========================================
    def test_07_delete_product(self):
        """Test deleting a product"""
        # Create a product first
        test_product = {
            "name": f"TEST_Delete_{uuid.uuid4().hex[:8]}",
            "type": "producto",
            "base_price": 50.00,
            "includes_igv": True,
            "description": "To be deleted",
            "category": "Delete",
            "status": "activo"
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/finanzas/products?company_id={COMPANY_ID}",
            json=test_product
        )
        assert create_response.status_code == 200
        product_id = create_response.json()["id"]
        
        # Delete the product
        delete_response = self.session.delete(f"{BASE_URL}/api/finanzas/products/{product_id}")
        
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify deletion with GET (should return 404)
        get_response = self.session.get(f"{BASE_URL}/api/finanzas/products/{product_id}")
        assert get_response.status_code == 404, "Product should not exist after deletion"
        
        print(f"✅ Product deleted and verified successfully")
    
    # ==========================================
    # TEST 8: Filter by Type (producto/servicio)
    # ==========================================
    def test_08_filter_by_type(self):
        """Test filtering products by type"""
        # Filter by 'producto'
        response_products = self.session.get(
            f"{BASE_URL}/api/finanzas/products?company_id={COMPANY_ID}&type=producto"
        )
        assert response_products.status_code == 200
        products = response_products.json()
        
        for p in products:
            assert p["type"] == "producto", f"Expected type 'producto', got '{p['type']}'"
        
        print(f"✅ Filter by type 'producto': {len(products)} products")
        
        # Filter by 'servicio'
        response_services = self.session.get(
            f"{BASE_URL}/api/finanzas/products?company_id={COMPANY_ID}&type=servicio"
        )
        assert response_services.status_code == 200
        services = response_services.json()
        
        for s in services:
            assert s["type"] == "servicio", f"Expected type 'servicio', got '{s['type']}'"
        
        print(f"✅ Filter by type 'servicio': {len(services)} services")
    
    # ==========================================
    # TEST 9: Filter by Status (activo/inactivo)
    # ==========================================
    def test_09_filter_by_status(self):
        """Test filtering products by status"""
        # Create an inactive product for testing
        inactive_product = {
            "name": f"TEST_Inactive_{uuid.uuid4().hex[:8]}",
            "type": "producto",
            "base_price": 100.00,
            "includes_igv": True,
            "description": "Inactive product",
            "category": "Test",
            "status": "inactivo"
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/finanzas/products?company_id={COMPANY_ID}",
            json=inactive_product
        )
        assert create_response.status_code == 200
        inactive_id = create_response.json()["id"]
        self.created_product_ids.append(inactive_id)
        
        # Filter by 'activo'
        response_active = self.session.get(
            f"{BASE_URL}/api/finanzas/products?company_id={COMPANY_ID}&status=activo"
        )
        assert response_active.status_code == 200
        active_products = response_active.json()
        
        for p in active_products:
            assert p["status"] == "activo", f"Expected status 'activo', got '{p['status']}'"
        
        print(f"✅ Filter by status 'activo': {len(active_products)} products")
        
        # Filter by 'inactivo'
        response_inactive = self.session.get(
            f"{BASE_URL}/api/finanzas/products?company_id={COMPANY_ID}&status=inactivo"
        )
        assert response_inactive.status_code == 200
        inactive_products = response_inactive.json()
        
        assert len(inactive_products) >= 1, "Should have at least 1 inactive product"
        for p in inactive_products:
            assert p["status"] == "inactivo", f"Expected status 'inactivo', got '{p['status']}'"
        
        print(f"✅ Filter by status 'inactivo': {len(inactive_products)} products")
    
    # ==========================================
    # TEST 10: Toggle Status (activo <-> inactivo)
    # ==========================================
    def test_10_toggle_status(self):
        """Test toggling product status between activo and inactivo"""
        # Create an active product
        test_product = {
            "name": f"TEST_Toggle_{uuid.uuid4().hex[:8]}",
            "type": "servicio",
            "base_price": 200.00,
            "includes_igv": True,
            "description": "Toggle test",
            "category": "Test",
            "status": "activo"
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/finanzas/products?company_id={COMPANY_ID}",
            json=test_product
        )
        assert create_response.status_code == 200
        product_id = create_response.json()["id"]
        self.created_product_ids.append(product_id)
        
        # Toggle to inactive
        toggle_response = self.session.put(
            f"{BASE_URL}/api/finanzas/products/{product_id}",
            json={"status": "inactivo"}
        )
        assert toggle_response.status_code == 200
        assert toggle_response.json()["status"] == "inactivo"
        
        print(f"✅ Status toggled to 'inactivo'")
        
        # Toggle back to active
        toggle_response2 = self.session.put(
            f"{BASE_URL}/api/finanzas/products/{product_id}",
            json={"status": "activo"}
        )
        assert toggle_response2.status_code == 200
        assert toggle_response2.json()["status"] == "activo"
        
        print(f"✅ Status toggled back to 'activo'")
    
    # ==========================================
    # TEST 11: Verify seed products exist
    # ==========================================
    def test_11_verify_seed_products(self):
        """Verify the 3 seed products exist: Clases de Piano, Diseño de Logo, Pack Mensual Piano"""
        response = self.session.get(f"{BASE_URL}/api/finanzas/products?company_id={COMPANY_ID}")
        assert response.status_code == 200
        products = response.json()
        
        product_names = [p["name"] for p in products]
        
        # Check seed products
        assert "Clases de Piano" in product_names, "Seed product 'Clases de Piano' not found"
        assert "Diseño de Logo" in product_names, "Seed product 'Diseño de Logo' not found"
        assert "Pack Mensual Piano" in product_names, "Seed product 'Pack Mensual Piano' not found"
        
        # Verify their details
        clases_piano = next(p for p in products if p["name"] == "Clases de Piano")
        assert clases_piano["base_price"] == 150.0
        assert clases_piano["type"] == "servicio"
        assert clases_piano["status"] == "activo"
        
        diseno_logo = next(p for p in products if p["name"] == "Diseño de Logo")
        assert diseno_logo["base_price"] == 500.0
        assert diseno_logo["type"] == "servicio"
        
        pack_piano = next(p for p in products if p["name"] == "Pack Mensual Piano")
        assert pack_piano["base_price"] == 480.0
        assert pack_piano["type"] == "producto"
        
        print(f"✅ All 3 seed products verified: Clases de Piano (S/150), Diseño de Logo (S/500), Pack Mensual Piano (S/480)")
    
    # ==========================================
    # TEST 12: Only active products in income selector
    # ==========================================
    def test_12_only_active_products_for_income(self):
        """Verify that only active products are returned when filtering by status=activo"""
        # This simulates what the Income modal does - fetch only active products
        response = self.session.get(
            f"{BASE_URL}/api/finanzas/products?company_id={COMPANY_ID}&status=activo"
        )
        assert response.status_code == 200
        active_products = response.json()
        
        # All returned products should be active
        for p in active_products:
            assert p["status"] == "activo", f"Inactive product '{p['name']}' should not appear in income selector"
        
        print(f"✅ Income selector would show {len(active_products)} active products only")
    
    # ==========================================
    # TEST 13: Product validation - required fields
    # ==========================================
    def test_13_validation_required_fields(self):
        """Test that required fields are validated"""
        # Missing name
        response = self.session.post(
            f"{BASE_URL}/api/finanzas/products?company_id={COMPANY_ID}",
            json={
                "type": "producto",
                "base_price": 100.00
            }
        )
        assert response.status_code == 422, "Should fail without name"
        
        # Missing type
        response = self.session.post(
            f"{BASE_URL}/api/finanzas/products?company_id={COMPANY_ID}",
            json={
                "name": "Test",
                "base_price": 100.00
            }
        )
        assert response.status_code == 422, "Should fail without type"
        
        # Missing base_price
        response = self.session.post(
            f"{BASE_URL}/api/finanzas/products?company_id={COMPANY_ID}",
            json={
                "name": "Test",
                "type": "producto"
            }
        )
        assert response.status_code == 422, "Should fail without base_price"
        
        print(f"✅ Validation working for required fields")
    
    # ==========================================
    # TEST 14: Product validation - price must be positive
    # ==========================================
    def test_14_validation_positive_price(self):
        """Test that base_price must be positive"""
        # Zero price
        response = self.session.post(
            f"{BASE_URL}/api/finanzas/products?company_id={COMPANY_ID}",
            json={
                "name": "Test Zero Price",
                "type": "producto",
                "base_price": 0
            }
        )
        assert response.status_code == 422, "Should fail with zero price"
        
        # Negative price
        response = self.session.post(
            f"{BASE_URL}/api/finanzas/products?company_id={COMPANY_ID}",
            json={
                "name": "Test Negative Price",
                "type": "producto",
                "base_price": -100
            }
        )
        assert response.status_code == 422, "Should fail with negative price"
        
        print(f"✅ Validation working for positive price requirement")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
