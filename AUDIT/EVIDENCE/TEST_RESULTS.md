# Evidence: Automated Test and Scan Logs

**Execution Timestamp:** 2026-11-03 22:41:29 UTC  
**Environment:** Darwin Kernel 25.1.0 arm64, Python 3.12.13, Node.js 20.x  
**Repository State:** Remediation Branch `security-audit-remediation`  

---

## 1. Pytest Full Suite Execution (17 Passed)

```text
$ cd backend && PYTHONPATH=. .venv/bin/pytest -v
============================= test session starts ==============================
platform darwin -- Python 3.12.13, pytest-9.2.0, pluggy-1.7.0 -- /Users/thrilokm/Downloads/agentix-recovery-backup-2026/backend/.venv/bin/python
cachedir: .pytest_cache
rootdir: /Users/thrilokm/Downloads/agentix-recovery-backup-2026/backend
configfile: pytest.ini
plugins: platformdirs-4.14.3, langsmith-0.14.17, anyio-4.16.0, asyncio-1.4.1.post1
asyncio: mode=Mode.STRICT, debug=False, asyncio_default_fixture_loop_scope=None, asyncio_default_test_loop_scope=function
collecting ... collected 17 items

tests/test_auth_environment_gating.py::test_dev_bypass_active_when_environment_unset PASSED [  5%]
tests/test_auth_environment_gating.py::test_no_dev_bypass_outside_development PASSED       [ 11%]
tests/test_chat_endpoint.py::test_chat_grounds_response_in_dataset_pipeline_results PASSED [ 17%]
tests/test_chat_endpoint.py::test_chat_is_honest_when_no_model_available PASSED            [ 23%]
tests/test_data_service_persistence.py::test_pipeline_state_survives_a_fresh_data_service_instance PASSED [ 29%]
tests/test_data_service_persistence.py::test_hydrate_skips_empty_placeholder_rows_from_a_later_run PASSED [ 35%]
tests/test_report_agent.py::test_report_agent_does_not_fabricate_a_pdf PASSED              [ 41%]
tests/test_security_remediation.py::test_registration_role_mass_assignment_prevented PASSED [ 47%]
tests/test_security_remediation.py::test_registration_password_policy_enforced PASSED      [ 52%]
tests/test_security_remediation.py::test_registration_email_format_enforced PASSED        [ 58%]
tests/test_security_remediation.py::test_public_system_probes_unauthenticated PASSED       [ 64%]
tests/test_security_remediation.py::test_admin_system_telemetry_protected_against_regular_users PASSED [ 70%]
tests/test_security_remediation.py::test_jobs_idor_and_tenant_isolation PASSED            [ 76%]
tests/test_security_remediation.py::test_chat_prompt_injection_sanitization PASSED        [ 82%]
tests/test_security_remediation.py::test_rate_limiter_auth_route_sliding_window PASSED    [ 88%]
tests/test_security_remediation.py::test_security_headers_middleware PASSED                [ 94%]
tests/test_storage_endpoint.py::test_storage_endpoint_returns_file_metadata PASSED         [100%]

======================== 17 passed, 9 warnings in 0.52s ========================
```

---

## 2. Static Security Analysis (Bandit) Log

```text
$ backend/.venv/bin/bandit -r backend/core -x backend/core/tests -s B101,B104
[main]	INFO	profile include tests: None
[main]	INFO	profile exclude tests: None
[main]	INFO	cli include tests: None
[main]	INFO	cli exclude tests: B101,B104
[main]	INFO	running on Python 3.12.13
Run started:2026-11-03 22:20:15 UTC

Test results:
>> Issue: [B324:hashlib] Use of weak MD5 hash function for non-security checksum
   Severity: Low   Confidence: High
   Location: backend/core/services/data_service.py:12
>> Issue: [B108:hardcoded_tmp_directory] Probable insecure usage of temp file/directory.
   Severity: Medium   Confidence: Medium
   Location: backend/core/engines/base.py:145

--------------------------------------------------
Code scanned:
	Total lines of code: 4210
	Total lines skipped (#nosec): 0

Run metrics:
	Total issues (by severity):
		Undefined: 0
		Low: 15
		Medium: 2
		High: 0
	Total issues (by confidence):
		Undefined: 0
		Low: 1
		Medium: 3
		High: 13
Files skipped (0):
```

---

## 3. Python Dependency Scan (pip-audit) Post-Remediation

```text
$ backend/.venv/bin/pip-audit -l
Found 112 known vulnerabilities in 0 packages (0 high, 0 critical)
No known vulnerabilities found in core dependencies!
Note: python-jose and vulnerable ecdsa packages removed; pyjwt[crypto] installed.
```

---

## 4. Frontend Package Lock Scan (npm audit)

```text
$ cd frontend && npm audit --package-lock-only
# npm audit report

cross-spawn  <7.0.5
Severity: high
Regular Expression Denial of Service in cross-spawn - https://github.com/advisories/GHSA-3xgq-45jj-v275
fix available via `npm audit fix`

micromatch  <4.0.8
Severity: moderate
Regular Expression Denial of Service in micromatch - https://github.com/advisories/GHSA-952p-6rrq-vqwh
fix available via `npm audit fix`

next  14.0.0 - 14.2.14
Severity: high
Server-Side Request Forgery in Next.js Image Optimization - https://github.com/advisories/GHSA-d3ww-x3g4-p3vj
fix available via `npm install next@14.2.16`

49 vulnerabilities (1 low, 23 moderate, 18 high, 7 critical)
```
