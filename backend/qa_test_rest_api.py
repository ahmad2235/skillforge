#!/usr/bin/env python3
"""
QA TEST SUITE - REST API VALIDATION

Tests:
1. Student creates conversation with Business
2. Student repeats request (idempotent)
3. Business fetches conversations
4. Admin attempts to fetch (forbidden)
5. Student fetches empty messages
"""

import requests
import json
import sys
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000/api"

# Test Users
USER_A = {
    "id": 57,
    "role": "student",
    "token": "300|9JsHrQSe3BUJVdLeeWSjsupCKgsCJGsmai2L5qcX279946a2"
}

USER_B = {
    "id": 58,
    "role": "business",
    "token": "301|PIz5qrIOza5500CW4lWWlTOJVHWhLJXHyaS3xSJ0527f9eae"
}

USER_C = {
    "id": 59,
    "role": "admin",
    "token": "302|w9b538dLtC0ljKpreHDNQCTWB0CUF4OyFYXnw2XIe84fa631"
}

def log(msg, level="INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] [{level}] {msg}")

def test_headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

def test_1_student_creates_conversation():
    """Test: Student creates conversation with Business Owner"""
    log("TEST 1: Student creates conversation with Business Owner", "TEST")
    
    try:
        response = requests.post(
            f"{BASE_URL}/chat/conversations",
            headers=test_headers(USER_A["token"]),
            json={"target_user_id": USER_B["id"]}
        )
        
        log(f"Status: {response.status_code}", "RESP")
        
        if response.status_code not in [200, 201]:
            log(f"FAIL: Expected 200/201, got {response.status_code}", "FAIL")
            log(f"Response: {response.text}", "FAIL")
            return None
        
        data = response.json()
        conversation_id = data["conversation"]["id"]
        log(f"✓ Conversation created: ID={conversation_id}", "PASS")
        
        return conversation_id
        
    except Exception as e:
        log(f"FAIL: {e}", "FAIL")
        return None

def test_2_student_repeats_request(conv_id):
    """Test: Student repeats request - should get same conversation (idempotent)"""
    log("TEST 2: Student repeats request (idempotency check)", "TEST")
    
    try:
        response = requests.post(
            f"{BASE_URL}/chat/conversations",
            headers=test_headers(USER_A["token"]),
            json={"target_user_id": USER_B["id"]}
        )
        
        if response.status_code not in [200, 201]:
            log(f"FAIL: Expected 200/201, got {response.status_code}", "FAIL")
            return False
        
        data = response.json()
        new_conv_id = data["conversation"]["id"]
        
        if new_conv_id == conv_id:
            log(f"✓ Same conversation returned: ID={new_conv_id}", "PASS")
            return True
        else:
            log(f"FAIL: Got different conversation: {new_conv_id} != {conv_id}", "FAIL")
            return False
            
    except Exception as e:
        log(f"FAIL: {e}", "FAIL")
        return False

def test_3_business_fetches_conversations(conv_id):
    """Test: Business owner sees the conversation"""
    log("TEST 3: Business owner fetches conversations", "TEST")
    
    try:
        response = requests.get(
            f"{BASE_URL}/chat/conversations",
            headers=test_headers(USER_B["token"])
        )
        
        if response.status_code != 200:
            log(f"FAIL: Expected 200, got {response.status_code}", "FAIL")
            return False
        
        data = response.json()
        conversations = data["conversations"]
        
        if any(c["id"] == conv_id for c in conversations):
            log(f"✓ Business sees conversation: ID={conv_id}", "PASS")
            return True
        else:
            log(f"FAIL: Conversation not found in business's list", "FAIL")
            return False
            
    except Exception as e:
        log(f"FAIL: {e}", "FAIL")
        return False

def test_4_admin_forbidden():
    """Test: Admin cannot access chat (403 Forbidden)"""
    log("TEST 4: Admin attempts to access chat (should be forbidden)", "TEST")
    
    try:
        response = requests.get(
            f"{BASE_URL}/chat/conversations",
            headers=test_headers(USER_C["token"])
        )
        
        if response.status_code == 403:
            log(f"✓ Admin correctly forbidden: {response.status_code}", "PASS")
            return True
        else:
            log(f"FAIL: Expected 403, got {response.status_code}", "FAIL")
            return False
            
    except Exception as e:
        log(f"FAIL: {e}", "FAIL")
        return False

def test_5_student_fetches_empty_messages(conv_id):
    """Test: Student fetches messages from new conversation (should be empty)"""
    log("TEST 5: Student fetches messages (should be empty)", "TEST")
    
    try:
        response = requests.get(
            f"{BASE_URL}/chat/conversations/{conv_id}/messages",
            headers=test_headers(USER_A["token"])
        )
        
        if response.status_code != 200:
            log(f"FAIL: Expected 200, got {response.status_code}", "FAIL")
            return False
        
        data = response.json()
        messages = data["messages"]
        pagination = data["pagination"]
        
        if len(messages) == 0:
            log(f"✓ Messages list empty (as expected)", "PASS")
            log(f"  Pagination: page={pagination['current_page']}, total={pagination['total']}", "INFO")
            return True
        else:
            log(f"FAIL: Expected 0 messages, got {len(messages)}", "FAIL")
            return False
            
    except Exception as e:
        log(f"FAIL: {e}", "FAIL")
        return False

def main():
    log("=== SKILLFORGE CHAT - REST API TEST SUITE ===", "START")
    log(f"Base URL: {BASE_URL}", "INFO")
    log(f"User A (Student): ID {USER_A['id']}", "INFO")
    log(f"User B (Business): ID {USER_B['id']}", "INFO")
    log(f"User C (Admin): ID {USER_C['id']}", "INFO")
    
    results = {}
    
    conv_id = test_1_student_creates_conversation()
    results["Test 1: Create conversation"] = "PASS" if conv_id else "FAIL"
    
    if conv_id:
        results["Test 2: Idempotency"] = "PASS" if test_2_student_repeats_request(conv_id) else "FAIL"
        results["Test 3: Business sees conversation"] = "PASS" if test_3_business_fetches_conversations(conv_id) else "FAIL"
        results["Test 5: Fetch empty messages"] = "PASS" if test_5_student_fetches_empty_messages(conv_id) else "FAIL"
    else:
        results["Test 2: Idempotency"] = "SKIP"
        results["Test 3: Business sees conversation"] = "SKIP"
        results["Test 5: Fetch empty messages"] = "SKIP"
    
    results["Test 4: Admin forbidden"] = "PASS" if test_4_admin_forbidden() else "FAIL"
    
    log("\n=== TEST RESULTS ===", "SUMMARY")
    for test, result in results.items():
        emoji = "✓" if result == "PASS" else "✗" if result == "FAIL" else "⊘"
        print(f"{emoji} {test}: {result}")
    
    passed = sum(1 for r in results.values() if r == "PASS")
    total = sum(1 for r in results.values() if r != "SKIP")
    log(f"\nResult: {passed}/{total} tests passed", "FINAL")
    
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())
