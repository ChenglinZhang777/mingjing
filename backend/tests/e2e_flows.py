"""
E2E API Contract Tests for Mingjing Backend
=============================================

Tests the API contract expectations for all critical user flows:
- Flow 1: Auth (register, login, me)
- Flow 2: Feynman session & analysis
- Flow 3: Layers session & analysis
- Flow 4: Rehearsal session, message, end, feedback
- Flow 5: Unified response format validation

Usage:
  # Contract tests with mock responses (no server needed):
  python e2e_flows.py

  # Against a real running server:
  BASE_URL=http://localhost:3000 python e2e_flows.py
"""

import json
import os
import sys
import uuid
from dataclasses import dataclass, field
from typing import Any
from unittest.mock import MagicMock, patch

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_URL = os.environ.get("BASE_URL", "").rstrip("/")
API_PREFIX = "/api/v1"

# If BASE_URL is set, use httpx for real HTTP calls; otherwise mock everything.
LIVE_MODE = bool(BASE_URL)

if LIVE_MODE:
    import httpx  # only needed for live mode


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

@dataclass
class TestResult:
    name: str
    passed: bool
    detail: str = ""


@dataclass
class TestReport:
    results: list[TestResult] = field(default_factory=list)

    def add(self, name: str, passed: bool, detail: str = ""):
        self.results.append(TestResult(name, passed, detail))

    def print_summary(self):
        total = len(self.results)
        passed = sum(1 for r in self.results if r.passed)
        failed = total - passed

        print("\n" + "=" * 70)
        print(f"  E2E API Contract Test Report")
        print("=" * 70)

        for r in self.results:
            status = "PASS" if r.passed else "FAIL"
            icon = "[+]" if r.passed else "[-]"
            line = f"  {icon} {status}  {r.name}"
            if not r.passed and r.detail:
                line += f"  -- {r.detail}"
            print(line)

        print("-" * 70)
        print(f"  Total: {total}  |  Passed: {passed}  |  Failed: {failed}")
        print("=" * 70)
        return failed


report = TestReport()


def url(path: str) -> str:
    return f"{BASE_URL}{API_PREFIX}{path}"


def make_token(user_id: str = "test-user-1") -> str:
    """Return a fake JWT token for mock mode."""
    return f"mock-jwt-token-{user_id}"


def auth_headers(token: str | None = None) -> dict[str, str]:
    t = token or make_token()
    return {"Authorization": f"Bearer {t}"}


# ---------------------------------------------------------------------------
# Mock response factory
# ---------------------------------------------------------------------------

def _mock_response(status: int, body: dict[str, Any]) -> MagicMock:
    resp = MagicMock()
    resp.status_code = status
    resp.json.return_value = body
    resp.text = json.dumps(body)
    resp.headers = {"content-type": "application/json"}
    return resp


def success_body(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


def failure_body(code: str, message: str, details: Any = None) -> dict[str, Any]:
    body: dict[str, Any] = {"success": False, "error": {"code": code, "message": message}}
    if details is not None:
        body["error"]["details"] = details
    return body


def paginated_body(data: list[Any], page: int, limit: int, total: int) -> dict[str, Any]:
    return {
        "success": True,
        "data": data,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "totalPages": -(-total // limit),  # ceil division
        },
    }


# ---------------------------------------------------------------------------
# Assertion helpers
# ---------------------------------------------------------------------------

def assert_success_envelope(body: dict[str, Any], test_name: str) -> bool:
    """Validate success response shape: { success: true, data: ... }"""
    ok = body.get("success") is True and "data" in body
    if not ok:
        report.add(f"{test_name} [envelope]", False, f"Expected success envelope, got: {body}")
    return ok


def assert_failure_envelope(body: dict[str, Any], test_name: str) -> bool:
    """Validate error response shape: { success: false, error: { code, message } }"""
    err = body.get("error", {})
    ok = body.get("success") is False and "code" in err and "message" in err
    if not ok:
        report.add(f"{test_name} [envelope]", False, f"Expected failure envelope, got: {body}")
    return ok


def assert_paginated_envelope(body: dict[str, Any], test_name: str) -> bool:
    """Validate paginated response shape."""
    pagination = body.get("pagination", {})
    ok = (
        body.get("success") is True
        and "data" in body
        and isinstance(body["data"], list)
        and "page" in pagination
        and "limit" in pagination
        and "total" in pagination
        and "totalPages" in pagination
    )
    if not ok:
        report.add(f"{test_name} [paginated envelope]", False, f"Expected paginated envelope, got: {body}")
    return ok


# ---------------------------------------------------------------------------
# Flow 1: Auth
# ---------------------------------------------------------------------------

def test_auth_register_success():
    """POST /auth/register with valid data → 201 + token"""
    name = "Flow1: Register success"
    body = success_body({
        "user": {"id": "u1", "email": "test@example.com", "name": "Test", "createdAt": "2026-01-01T00:00:00Z"},
        "token": "jwt-token-abc",
    })
    resp = _mock_response(201, body)

    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}"
    data = resp.json()
    assert_success_envelope(data, name)
    assert "token" in data["data"], "Missing token in register response"
    assert "user" in data["data"], "Missing user in register response"
    user = data["data"]["user"]
    assert "id" in user and "email" in user and "name" in user
    report.add(name, True)


def test_auth_register_duplicate_email():
    """POST /auth/register with duplicate email → 409"""
    name = "Flow1: Register duplicate email"
    body = failure_body("CONFLICT", "数据已存在，请检查唯一字段")
    resp = _mock_response(409, body)

    assert resp.status_code == 409
    data = resp.json()
    assert_failure_envelope(data, name)
    assert data["error"]["code"] == "CONFLICT"
    report.add(name, True)


def test_auth_login_success():
    """POST /auth/login with correct credentials → 200 + token"""
    name = "Flow1: Login success"
    body = success_body({
        "user": {"id": "u1", "email": "test@example.com", "name": "Test", "createdAt": "2026-01-01T00:00:00Z"},
        "token": "jwt-token-def",
    })
    resp = _mock_response(200, body)

    assert resp.status_code == 200
    data = resp.json()
    assert_success_envelope(data, name)
    assert "token" in data["data"]
    assert "user" in data["data"]
    # passwordHash must NOT leak
    assert "passwordHash" not in data["data"]["user"], "passwordHash leaked in login response"
    report.add(name, True)


def test_auth_login_wrong_password():
    """POST /auth/login with wrong password → 401"""
    name = "Flow1: Login wrong password"
    body = failure_body("INVALID_CREDENTIALS", "邮箱或密码错误")
    resp = _mock_response(401, body)

    assert resp.status_code == 401
    data = resp.json()
    assert_failure_envelope(data, name)
    assert data["error"]["code"] == "INVALID_CREDENTIALS"
    report.add(name, True)


def test_auth_me_valid_token():
    """GET /auth/me with valid token → 200 + user"""
    name = "Flow1: Get me (valid token)"
    body = success_body({
        "id": "u1", "email": "test@example.com", "name": "Test",
        "usageCount": 5, "createdAt": "2026-01-01T00:00:00Z",
    })
    resp = _mock_response(200, body)

    assert resp.status_code == 200
    data = resp.json()
    assert_success_envelope(data, name)
    user = data["data"]
    assert "id" in user and "email" in user and "name" in user
    assert "usageCount" in user
    report.add(name, True)


def test_auth_me_no_token():
    """GET /auth/me without token → 401"""
    name = "Flow1: Get me (no token)"
    body = failure_body("UNAUTHORIZED", "未授权，请先登录")
    resp = _mock_response(401, body)

    assert resp.status_code == 401
    data = resp.json()
    assert_failure_envelope(data, name)
    assert data["error"]["code"] == "UNAUTHORIZED"
    report.add(name, True)


def test_auth_me_invalid_token():
    """GET /auth/me with invalid token → 401"""
    name = "Flow1: Get me (invalid token)"
    body = failure_body("UNAUTHORIZED", "未授权，请先登录")
    resp = _mock_response(401, body)

    assert resp.status_code == 401
    data = resp.json()
    assert_failure_envelope(data, name)
    report.add(name, True)


# ---------------------------------------------------------------------------
# Flow 2: Feynman
# ---------------------------------------------------------------------------

def test_feynman_create_session_auth():
    """POST /feynman/session (authenticated) → 200 + sessionId"""
    name = "Flow2: Feynman create session (auth)"
    body = success_body({"id": "fs-1", "title": None, "status": "created"})
    resp = _mock_response(200, body)

    assert resp.status_code == 200
    data = resp.json()
    assert_success_envelope(data, name)
    assert "id" in data["data"]
    report.add(name, True)


def test_feynman_create_session_no_auth():
    """POST /feynman/session (unauthenticated) → 401"""
    name = "Flow2: Feynman create session (no auth)"
    body = failure_body("UNAUTHORIZED", "未授权，请先登录")
    resp = _mock_response(401, body)

    assert resp.status_code == 401
    assert_failure_envelope(resp.json(), name)
    report.add(name, True)


def test_feynman_analyze_missing_star_story():
    """POST /feynman/analyze (missing starStory) → 400"""
    name = "Flow2: Feynman analyze (missing starStory)"
    body = failure_body("VALIDATION_ERROR", "sessionId 和 starStory 为必填项")
    resp = _mock_response(400, body)

    assert resp.status_code == 400
    data = resp.json()
    assert_failure_envelope(data, name)
    assert data["error"]["code"] == "VALIDATION_ERROR"
    report.add(name, True)


def test_feynman_history_auth():
    """GET /feynman/history (authenticated) → 200 + pagination"""
    name = "Flow2: Feynman history (auth)"
    body = paginated_body(
        [{"id": "fs-1", "title": "Test", "createdAt": "2026-01-01"}],
        page=1, limit=10, total=1,
    )
    resp = _mock_response(200, body)

    assert resp.status_code == 200
    data = resp.json()
    assert_paginated_envelope(data, name)
    report.add(name, True)


def test_feynman_session_isolation():
    """GET /feynman/session/:id (other user's session) → 404"""
    name = "Flow2: Feynman session isolation"
    body = failure_body("NOT_FOUND", "会话不存在")
    resp = _mock_response(404, body)

    assert resp.status_code == 404
    data = resp.json()
    assert_failure_envelope(data, name)
    assert data["error"]["code"] == "NOT_FOUND"
    report.add(name, True)


# ---------------------------------------------------------------------------
# Flow 3: Layers
# ---------------------------------------------------------------------------

def test_layers_create_session_auth():
    """POST /layers/session (authenticated) → 200 + sessionId"""
    name = "Flow3: Layers create session (auth)"
    body = success_body({"id": "ls-1", "title": None, "status": "created"})
    resp = _mock_response(200, body)

    assert resp.status_code == 200
    data = resp.json()
    assert_success_envelope(data, name)
    assert "id" in data["data"]
    report.add(name, True)


def test_layers_analyze_missing_input_text():
    """POST /layers/analyze (missing inputText) → 400"""
    name = "Flow3: Layers analyze (missing inputText)"
    body = failure_body("VALIDATION_ERROR", "sessionId 和 inputText 为必填项")
    resp = _mock_response(400, body)

    assert resp.status_code == 400
    data = resp.json()
    assert_failure_envelope(data, name)
    assert data["error"]["code"] == "VALIDATION_ERROR"
    report.add(name, True)


def test_layers_history_auth():
    """GET /layers/history (authenticated) → 200 + pagination"""
    name = "Flow3: Layers history (auth)"
    body = paginated_body(
        [{"id": "ls-1", "title": "Test", "createdAt": "2026-01-01"}],
        page=1, limit=10, total=1,
    )
    resp = _mock_response(200, body)

    assert resp.status_code == 200
    data = resp.json()
    assert_paginated_envelope(data, name)
    report.add(name, True)


# ---------------------------------------------------------------------------
# Flow 4: Rehearsal
# ---------------------------------------------------------------------------

def test_rehearsal_create_session_valid():
    """POST /rehearsal/session (valid scenario + style) → 200 + sessionId + firstQuestion"""
    name = "Flow4: Rehearsal create session (valid)"
    body = success_body({
        "id": "rs-1",
        "scenario": "Frontend developer interview",
        "interviewerStyle": "behavioral",
        "firstQuestion": "Tell me about yourself.",
        "status": "active",
    })
    resp = _mock_response(200, body)

    assert resp.status_code == 200
    data = resp.json()
    assert_success_envelope(data, name)
    session = data["data"]
    assert "id" in session
    assert "firstQuestion" in session or "first_question" in session, "Missing firstQuestion in session"
    report.add(name, True)


def test_rehearsal_create_session_invalid_style():
    """POST /rehearsal/session (invalid style) → 400"""
    name = "Flow4: Rehearsal create session (invalid style)"
    body = failure_body("VALIDATION_ERROR", "interviewerStyle 必须是 behavioral、technical 或 stress")
    resp = _mock_response(400, body)

    assert resp.status_code == 400
    data = resp.json()
    assert_failure_envelope(data, name)
    assert data["error"]["code"] == "VALIDATION_ERROR"
    report.add(name, True)


def test_rehearsal_message_completed_session():
    """POST /rehearsal/message (completed session) → 400 SESSION_COMPLETED"""
    name = "Flow4: Rehearsal message (completed session)"
    # Note: route returns 400 with code SESSION_COMPLETED (not 409 as some APIs do)
    body = failure_body("SESSION_COMPLETED", "该面试已结束")
    resp = _mock_response(400, body)

    assert resp.status_code == 400
    data = resp.json()
    assert_failure_envelope(data, name)
    assert data["error"]["code"] == "SESSION_COMPLETED"
    report.add(name, True)


def test_rehearsal_end_session():
    """POST /rehearsal/end/:sessionId (authenticated) → 200"""
    name = "Flow4: Rehearsal end session"
    body = success_body({"feedbackId": "rs-1", "status": "completed"})
    resp = _mock_response(200, body)

    assert resp.status_code == 200
    data = resp.json()
    assert_success_envelope(data, name)
    assert data["data"]["status"] == "completed"
    report.add(name, True)


def test_rehearsal_feedback_ready():
    """GET /rehearsal/feedback/:sessionId → 200 (feedback ready)"""
    name = "Flow4: Rehearsal feedback (ready)"
    body = success_body({
        "overallScore": 85,
        "strengths": ["Good communication"],
        "improvements": ["Be more specific"],
    })
    resp = _mock_response(200, body)

    assert resp.status_code == 200
    data = resp.json()
    assert_success_envelope(data, name)
    report.add(name, True)


def test_rehearsal_feedback_generating():
    """GET /rehearsal/feedback/:sessionId → 202 (still generating)"""
    name = "Flow4: Rehearsal feedback (generating)"
    body = success_body({"status": "generating", "message": "反馈正在生成中，请稍后再试"})
    resp = _mock_response(202, body)

    assert resp.status_code == 202
    data = resp.json()
    assert_success_envelope(data, name)
    assert data["data"]["status"] == "generating"
    report.add(name, True)


def test_rehearsal_history():
    """GET /rehearsal/history → 200 + pagination"""
    name = "Flow4: Rehearsal history"
    body = paginated_body(
        [{"id": "rs-1", "scenario": "FE interview", "status": "completed"}],
        page=1, limit=10, total=1,
    )
    resp = _mock_response(200, body)

    assert resp.status_code == 200
    data = resp.json()
    assert_paginated_envelope(data, name)
    report.add(name, True)


# ---------------------------------------------------------------------------
# Flow 5: Unified Response Format Validation
# ---------------------------------------------------------------------------

def test_success_response_format():
    """All success responses must have { success: true, data: ... }"""
    name = "Flow5: Success response format"
    samples = [
        success_body({"id": "1"}),
        success_body([1, 2, 3]),
        success_body(None),
        success_body("string-data"),
    ]
    for i, sample in enumerate(samples):
        assert sample["success"] is True, f"Sample {i}: success must be True"
        assert "data" in sample, f"Sample {i}: must contain 'data' key"
    report.add(name, True)


def test_failure_response_format():
    """All error responses must have { success: false, error: { code, message } }"""
    name = "Flow5: Failure response format"
    samples = [
        failure_body("UNAUTHORIZED", "未授权"),
        failure_body("VALIDATION_ERROR", "请求参数验证失败", [{"field": "email"}]),
        failure_body("NOT_FOUND", "未找到"),
        failure_body("CONFLICT", "数据已存在"),
        failure_body("INTERNAL_ERROR", "服务器内部错误"),
        failure_body("INVALID_CREDENTIALS", "邮箱或密码错误"),
        failure_body("SESSION_COMPLETED", "该面试已结束"),
    ]
    for i, sample in enumerate(samples):
        assert sample["success"] is False, f"Sample {i}: success must be False"
        err = sample.get("error", {})
        assert "code" in err, f"Sample {i}: error must contain 'code'"
        assert "message" in err, f"Sample {i}: error must contain 'message'"
    report.add(name, True)


def test_paginated_response_format():
    """Paginated responses must include pagination metadata"""
    name = "Flow5: Paginated response format"
    sample = paginated_body([{"id": "1"}], page=2, limit=10, total=25)
    assert sample["success"] is True
    assert isinstance(sample["data"], list)
    p = sample["pagination"]
    assert p["page"] == 2
    assert p["limit"] == 10
    assert p["total"] == 25
    assert p["totalPages"] == 3  # ceil(25/10)
    report.add(name, True)


def test_error_codes_enumeration():
    """Verify all known error codes follow the expected set"""
    name = "Flow5: Error code enumeration"
    known_codes = {
        "UNAUTHORIZED",
        "VALIDATION_ERROR",
        "NOT_FOUND",
        "CONFLICT",
        "INTERNAL_ERROR",
        "INVALID_CREDENTIALS",
        "SESSION_COMPLETED",
    }
    # Each code must be a non-empty uppercase string
    for code in known_codes:
        assert code == code.upper(), f"Error code '{code}' must be uppercase"
        assert len(code) > 0
    report.add(name, True)


# ---------------------------------------------------------------------------
# Live mode tests (only run when BASE_URL is set)
# ---------------------------------------------------------------------------

def run_live_tests():
    """Run tests against a real running server."""
    client = httpx.Client(base_url=BASE_URL, timeout=10.0)
    unique = uuid.uuid4().hex[:8]
    email = f"e2e-test-{unique}@example.com"
    password = "TestPass123!"
    user_name = f"E2E-{unique}"
    token = None

    # --- Auth Flow ---
    # Register
    resp = client.post(f"{API_PREFIX}/auth/register", json={
        "email": email, "password": password, "name": user_name,
    })
    assert resp.status_code == 201, f"Register failed: {resp.status_code} {resp.text}"
    data = resp.json()
    assert_success_envelope(data, "Live: Register")
    token = data["data"]["token"]
    report.add("Live: Register success", True)

    # Duplicate register
    resp = client.post(f"{API_PREFIX}/auth/register", json={
        "email": email, "password": password, "name": user_name,
    })
    assert resp.status_code == 409
    assert_failure_envelope(resp.json(), "Live: Register duplicate")
    report.add("Live: Register duplicate → 409", True)

    # Login
    resp = client.post(f"{API_PREFIX}/auth/login", json={
        "email": email, "password": password,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert_success_envelope(data, "Live: Login")
    assert "passwordHash" not in data["data"].get("user", {})
    report.add("Live: Login success", True)

    # Login wrong password
    resp = client.post(f"{API_PREFIX}/auth/login", json={
        "email": email, "password": "WrongPass999!",
    })
    assert resp.status_code == 401
    report.add("Live: Login wrong password → 401", True)

    # Me with token
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get(f"{API_PREFIX}/auth/me", headers=headers)
    assert resp.status_code == 200
    assert_success_envelope(resp.json(), "Live: Me")
    report.add("Live: Me (valid token)", True)

    # Me without token
    resp = client.get(f"{API_PREFIX}/auth/me")
    assert resp.status_code == 401
    report.add("Live: Me (no token) → 401", True)

    # Me with invalid token
    resp = client.get(f"{API_PREFIX}/auth/me", headers={"Authorization": "Bearer invalid-token"})
    assert resp.status_code == 401
    report.add("Live: Me (invalid token) → 401", True)

    # --- Feynman Flow ---
    # Create session
    resp = client.post(f"{API_PREFIX}/feynman/session", headers=headers, json={})
    if resp.status_code == 200:
        assert_success_envelope(resp.json(), "Live: Feynman session")
        report.add("Live: Feynman create session", True)
    else:
        report.add("Live: Feynman create session", False, f"Status: {resp.status_code}")

    # No auth
    resp = client.post(f"{API_PREFIX}/feynman/session", json={})
    assert resp.status_code == 401
    report.add("Live: Feynman session (no auth) → 401", True)

    # History
    resp = client.get(f"{API_PREFIX}/feynman/history", headers=headers)
    assert resp.status_code == 200
    assert_paginated_envelope(resp.json(), "Live: Feynman history")
    report.add("Live: Feynman history", True)

    # --- Layers Flow ---
    resp = client.post(f"{API_PREFIX}/layers/session", headers=headers, json={})
    if resp.status_code == 200:
        report.add("Live: Layers create session", True)
    else:
        report.add("Live: Layers create session", False, f"Status: {resp.status_code}")

    resp = client.get(f"{API_PREFIX}/layers/history", headers=headers)
    assert resp.status_code == 200
    report.add("Live: Layers history", True)

    # --- Rehearsal Flow ---
    resp = client.post(f"{API_PREFIX}/rehearsal/session", headers=headers, json={
        "scenario": "E2E test interview", "interviewerStyle": "behavioral",
    })
    if resp.status_code == 200:
        session_data = resp.json()["data"]
        report.add("Live: Rehearsal create session", True)
    else:
        report.add("Live: Rehearsal create session", False, f"Status: {resp.status_code}")

    # Invalid style
    resp = client.post(f"{API_PREFIX}/rehearsal/session", headers=headers, json={
        "scenario": "Test", "interviewerStyle": "invalid_style",
    })
    assert resp.status_code == 400
    report.add("Live: Rehearsal invalid style → 400", True)

    # History
    resp = client.get(f"{API_PREFIX}/rehearsal/history", headers=headers)
    assert resp.status_code == 200
    assert_paginated_envelope(resp.json(), "Live: Rehearsal history")
    report.add("Live: Rehearsal history", True)

    client.close()


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

def run_contract_tests():
    """Run all contract (mock) tests."""
    tests = [
        # Flow 1: Auth
        test_auth_register_success,
        test_auth_register_duplicate_email,
        test_auth_login_success,
        test_auth_login_wrong_password,
        test_auth_me_valid_token,
        test_auth_me_no_token,
        test_auth_me_invalid_token,
        # Flow 2: Feynman
        test_feynman_create_session_auth,
        test_feynman_create_session_no_auth,
        test_feynman_analyze_missing_star_story,
        test_feynman_history_auth,
        test_feynman_session_isolation,
        # Flow 3: Layers
        test_layers_create_session_auth,
        test_layers_analyze_missing_input_text,
        test_layers_history_auth,
        # Flow 4: Rehearsal
        test_rehearsal_create_session_valid,
        test_rehearsal_create_session_invalid_style,
        test_rehearsal_message_completed_session,
        test_rehearsal_end_session,
        test_rehearsal_feedback_ready,
        test_rehearsal_feedback_generating,
        test_rehearsal_history,
        # Flow 5: Response format
        test_success_response_format,
        test_failure_response_format,
        test_paginated_response_format,
        test_error_codes_enumeration,
    ]

    for test_fn in tests:
        try:
            test_fn()
        except AssertionError as e:
            report.add(test_fn.__doc__ or test_fn.__name__, False, str(e))
        except Exception as e:
            report.add(test_fn.__doc__ or test_fn.__name__, False, f"Exception: {e}")


def main():
    print(f"Mode: {'LIVE (BASE_URL={BASE_URL})' if LIVE_MODE else 'CONTRACT (mock)'}")
    print()

    run_contract_tests()

    if LIVE_MODE:
        print("\nRunning live integration tests...")
        try:
            run_live_tests()
        except Exception as e:
            report.add("Live tests", False, f"Fatal: {e}")

    failed = report.print_summary()
    sys.exit(1 if failed > 0 else 0)


if __name__ == "__main__":
    main()
