#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
RUN_ID="$(date +%s)"
ADMIN_DEPARTMENT_NAME="Operations-${RUN_ID}"
ADMIN_DEPARTMENT_ZONE="Central"
ADMIN_DEPARTMENT_EMAIL="ops.${RUN_ID}@civicpulse.local"
USER_EMAIL="citizen.${RUN_ID}@civicpulse.local"
ADMIN_EMAIL="admin.${RUN_ID}@civicpulse.local"
PASSWORD="password123"

PASS_COUNT=0
FAIL_COUNT=0

log_pass() {
  echo "PASS: $1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

log_fail() {
  echo "FAIL: $1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

check_status() {
  local description="$1"
  local actual="$2"
  local expected="$3"

  if [[ "$actual" == "$expected" ]]; then
    log_pass "$description ($actual)"
    return 0
  fi

  log_fail "$description (expected $expected, got $actual)"
  return 0
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_command curl
require_command node
require_command docker

extract_json_field() {
  local json="$1"
  local expr="$2"
  JSON_INPUT="$json" node -e '
const expr = (process.argv[1] || "").split(".");
let data = JSON.parse(process.env.JSON_INPUT || "null");
for (const part of expr) {
  data = Array.isArray(data) ? data[Number(part)] : data?.[part];
}
process.stdout.write(data == null ? "" : String(data));
' "$expr"
}

register_response_file=$(mktemp)
register_status=$(curl -s -o "$register_response_file" -w "%{http_code}" -X POST "${BASE_URL}/api/v1/users/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${USER_EMAIL}\",\"password\":\"${PASSWORD}\"}")
register_payload=$(cat "$register_response_file")
rm -f "$register_response_file"

check_status "Register citizen user" "$register_status" "201"

login_response_file=$(mktemp)
login_status=$(curl -s -o "$login_response_file" -w "%{http_code}" -X POST "${BASE_URL}/api/v1/users/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${USER_EMAIL}\",\"password\":\"${PASSWORD}\"}")
login_payload=$(cat "$login_response_file")
rm -f "$login_response_file"
check_status "Login citizen user" "$login_status" "200"
USER_TOKEN=$(extract_json_field "$login_payload" "accessToken")
USER_ID=$(extract_json_field "$login_payload" "user.id")

complaint_response_file=$(mktemp)
complaint_status=$(curl -s -o "$complaint_response_file" -w "%{http_code}" -X POST "${BASE_URL}/api/v1/complaints" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"category":"POTHOLE","description":"Large pothole on main road causing damage","lat":19.0760,"lng":72.8777,"priority":"HIGH"}')
complaint_payload=$(cat "$complaint_response_file")
rm -f "$complaint_response_file"
check_status "Create complaint" "$complaint_status" "201"
COMPLAINT_ID=$(extract_json_field "$complaint_payload" "id")

get_complaint_file=$(mktemp)
get_complaint_status=$(curl -s -o "$get_complaint_file" -w "%{http_code}" -X GET "${BASE_URL}/api/v1/complaints/${COMPLAINT_ID}" \
  -H "Authorization: Bearer ${USER_TOKEN}")
get_complaint_payload=$(cat "$get_complaint_file")
rm -f "$get_complaint_file"
check_status "Fetch complaint by ID" "$get_complaint_status" "200"

admin_register_file=$(mktemp)
admin_register_status=$(curl -s -o "$admin_register_file" -w "%{http_code}" -X POST "${BASE_URL}/api/v1/users/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${PASSWORD}\"}")
rm -f "$admin_register_file"
check_status "Register admin user shell account" "$admin_register_status" "201"

docker compose exec -T postgres-users psql -U civicpulse -d users_db -c "UPDATE \"User\" SET role = 'ADMIN' WHERE email = '${ADMIN_EMAIL}';" >/dev/null
log_pass "Promote admin user in users_db"

admin_login_file=$(mktemp)
admin_login_status=$(curl -s -o "$admin_login_file" -w "%{http_code}" -X POST "${BASE_URL}/api/v1/users/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${PASSWORD}\"}")
admin_login_payload=$(cat "$admin_login_file")
rm -f "$admin_login_file"
check_status "Login admin user" "$admin_login_status" "200"
ADMIN_TOKEN=$(extract_json_field "$admin_login_payload" "accessToken")

department_file=$(mktemp)
department_status=$(curl -s -o "$department_file" -w "%{http_code}" -X POST "${BASE_URL}/api/v1/admin/departments" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"${ADMIN_DEPARTMENT_NAME}\",\"zone\":\"${ADMIN_DEPARTMENT_ZONE}\",\"contactEmail\":\"${ADMIN_DEPARTMENT_EMAIL}\"}")
department_payload=$(cat "$department_file")
rm -f "$department_file"
check_status "Create department" "$department_status" "201"
DEPARTMENT_ID=$(extract_json_field "$department_payload" "id")

assign_file=$(mktemp)
assign_status=$(curl -s -o "$assign_file" -w "%{http_code}" -X POST "${BASE_URL}/api/v1/admin/complaints/${COMPLAINT_ID}/assign" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"departmentId\":\"${DEPARTMENT_ID}\"}")
rm -f "$assign_file"
check_status "Assign complaint to department" "$assign_status" "200"

in_progress_file=$(mktemp)
in_progress_status=$(curl -s -o "$in_progress_file" -w "%{http_code}" -X PATCH "${BASE_URL}/api/v1/complaints/${COMPLAINT_ID}/status" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"status":"IN_PROGRESS","reason":"Assigned to department"}')
in_progress_payload=$(cat "$in_progress_file")
rm -f "$in_progress_file"
check_status "Move complaint to IN_PROGRESS" "$in_progress_status" "200"

history_file=$(mktemp)
history_status=$(curl -s -o "$history_file" -w "%{http_code}" -X GET "${BASE_URL}/api/v1/complaints/${COMPLAINT_ID}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}")
history_payload=$(cat "$history_file")
rm -f "$history_file"
check_status "Verify complaint history after IN_PROGRESS" "$history_status" "200"

resolved_file=$(mktemp)
resolved_status=$(curl -s -o "$resolved_file" -w "%{http_code}" -X PATCH "${BASE_URL}/api/v1/complaints/${COMPLAINT_ID}/status" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"status":"RESOLVED","reason":"Issue closed"}')
resolved_payload=$(cat "$resolved_file")
rm -f "$resolved_file"
check_status "Move complaint to RESOLVED" "$resolved_status" "200"

FINAL_STATUS=$(extract_json_field "$resolved_payload" "status")
if [[ "$FINAL_STATUS" == "RESOLVED" ]]; then
  log_pass "Final complaint status is RESOLVED"
else
  log_fail "Final complaint status is RESOLVED"
fi

sleep 2
NOTIFICATION_COUNT=$(docker compose exec -T postgres-notifications psql -U civicpulse -d notifications_db -tAc "SELECT COUNT(*) FROM \"NotificationLog\" WHERE \"userId\" = '${USER_ID}';" | tr -d '[:space:]')
if [[ "${NOTIFICATION_COUNT:-0}" -gt 0 ]]; then
  log_pass "Notification log has entries for reporter (${NOTIFICATION_COUNT})"
else
  log_fail "Notification log has entries for reporter"
fi

echo
echo "Smoke test complete: ${PASS_COUNT} PASS / ${FAIL_COUNT} FAIL"

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  exit 1
fi
