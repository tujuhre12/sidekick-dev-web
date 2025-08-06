#!/usr/bin/env python3
"""
Simple test script to verify the Sidekick Dev API is working correctly.
"""

import requests
import json
import time
import sys
from pathlib import Path

API_BASE_URL = "http://localhost:8000"

def test_health_endpoint():
    """Test the health endpoint."""
    print("🩺 Testing health endpoint...")
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=10)
        if response.status_code == 200:
            print("✅ Health endpoint working")
            return True
        else:
            print(f"❌ Health endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health endpoint error: {e}")
        return False

def test_generate_endpoint():
    """Test the generate endpoint with a sample repository."""
    print("🤖 Testing generate endpoint...")
    
    payload = {
        "github_url": "https://github.com/octocat/Hello-World",
        "selected_agents": ["claude"]
    }
    
    try:
        print(f"📤 Sending request to {API_BASE_URL}/api/generate")
        print(f"📋 Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(
            f"{API_BASE_URL}/api/generate",
            json=payload,
            timeout=60,
            stream=True
        )
        
        if response.status_code == 200:
            # Save the response to a file
            filename = "test_claude.md"
            with open(filename, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            file_size = Path(filename).stat().st_size
            print(f"✅ Generate endpoint working")
            print(f"📁 Generated file: {filename} ({file_size} bytes)")
            
            # Show first few lines of the generated file
            with open(filename, "r", encoding="utf-8") as f:
                lines = f.readlines()[:10]
                print("📖 First 10 lines of generated file:")
                for i, line in enumerate(lines, 1):
                    print(f"   {i:2}: {line.rstrip()}")
                if len(lines) == 10:
                    print("   ...")
            
            return True
        else:
            print(f"❌ Generate endpoint failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data}")
            except:
                print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Generate endpoint error: {e}")
        return False

def test_validation():
    """Test input validation."""
    print("🔒 Testing input validation...")
    
    # Test invalid GitHub URL
    invalid_payload = {
        "github_url": "not-a-github-url",
        "selected_agents": ["claude"]
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/generate",
            json=invalid_payload,
            timeout=60
        )
        
        if response.status_code == 422:  # Validation error
            print("✅ Input validation working (invalid URL rejected)")
            return True
        else:
            print(f"❌ Input validation failed: expected 422, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Validation test error: {e}")
        return False

def main():
    """Run all tests."""
    print("🧪 Starting Sidekick Dev API Tests")
    print("=" * 50)
    
    # Check if server is running
    print("🔍 Checking if server is running...")
    try:
        response = requests.get(f"{API_BASE_URL}/", timeout=10)
        print("✅ Server is responding")
    except Exception as e:
        print(f"❌ Server not responding: {e}")
        print("💡 Make sure to start the backend server first:")
        print("   cd backend && python run.py")
        sys.exit(1)
    
    print()
    
    # Run tests
    tests = [
        ("Health Check", test_health_endpoint),
        ("Generate Endpoint", test_generate_endpoint),
        ("Input Validation", test_validation),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n🔬 Running: {test_name}")
        print("-" * 30)
        result = test_func()
        results.append((test_name, result))
        time.sleep(1)  # Brief pause between tests
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Results Summary")
    print("=" * 50)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Tests passed: {passed}/{len(results)}")
    
    if passed == len(results):
        print("🎉 All tests passed! The API is working correctly.")
        return 0
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
        return 1

if __name__ == "__main__":
    sys.exit(main())