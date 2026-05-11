const TOKEN_KEY = "leave_management_token";
const LEAVE_TYPES = [
  "Casual Leave",
  "Medical Leave",
  "Earned Leave"
];

const ROLE_LABELS = {
  faculty: "Faculty",
  hod: "Head of Department",
  admin: "Admin Office",
  principal: "Principal"
};

const PROOF_ACCEPT = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp";
const PROOF_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp"
];
const MAX_PROOF_SIZE_BYTES = 2.5 * 1024 * 1024;

const ENGINEERING_DEPARTMENTS = [
  "Al & DS Engineering",
  "Civil Engineering",
  "Computer Engineering",
  "Electronics & Telecommunication Engineering",
  "Electronics and Communication Engineering",
  "Electronics Engineering (VLSI Design and Technology)",
  "First Year Engineering",
  "Information Technology",
  "Mechanical Engineering (NBA Accredited)"
];

const ROLE_DEFAULTS = {
  faculty: { department: "", designation: "Assistant Professor" },
  hod: { department: "", designation: "Head of Department" },
  admin: { department: "Administration Office", designation: "Administrative Officer" },
  principal: { department: "Principal Office", designation: "Principal" }
};

const appState = {
  token: localStorage.getItem(TOKEN_KEY) || "",
  loading: true,
  view: "landing",
  authMode: "login",
  apiUnavailable: false,
  message: null,
  user: null,
  users: [],
  leaves: [],
  tab: "overview",
  selectedRequestId: null,
  principalDepartment: "All Departments",
  facultySummary: null,
  managementSummary: null
};

const app = document.getElementById("app");

document.addEventListener("DOMContentLoaded", init);

function init() {
  app.addEventListener("submit", handleSubmit);
  app.addEventListener("click", handleClick);
  app.addEventListener("change", handleChange);

  if (appState.token) {
    appState.view = "app";
    loadSession();
    return;
  }

  appState.loading = false;
  render();
}

async function apiRequest(path, options = {}) {
  const config = {
    method: options.method || "GET",
    headers: {},
    body: undefined
  };

  if (options.body !== undefined) {
    config.headers["Content-Type"] = "application/json";
    config.body = JSON.stringify(options.body);
  }

  if (options.auth !== false && appState.token) {
    config.headers.Authorization = `Bearer ${appState.token}`;
  }

  try {
    const response = await fetch(path, config);
    const data = await readJson(response);
    appState.apiUnavailable = false;

    if (!response.ok) {
      const error = new Error(data.error || "Request failed.");
      error.status = response.status;
      throw error;
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      appState.apiUnavailable = true;
      throw new Error("Unable to reach the server. Start the project with npm install, then npm start, and open http://localhost:3000.");
    }

    throw error;
  }
}

async function readJson(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (_error) {
    return {};
  }
}

async function loadSession() {
  appState.loading = true;
  render();

  try {
    const data = await apiRequest("/api/bootstrap");
    appState.user = data.user;
    appState.users = data.users;
    appState.leaves = data.leaves;

    const tabs = getTabsForUser(appState.user);
    if (!tabs.some((tab) => tab.id === appState.tab)) {
      appState.tab = "overview";
    }
  } catch (error) {
    if (error.status === 401) {
      clearSession();
      setMessage("error", "Your session ended. Please log in again.");
    } else {
      setMessage("error", error.message);
    }
  } finally {
    appState.loading = false;
    render();
  }
}

function clearSession() {
  appState.token = "";
  appState.user = null;
  appState.users = [];
  appState.leaves = [];
  appState.facultySummary = null;
  appState.managementSummary = null;
  appState.selectedRequestId = null;
  localStorage.removeItem(TOKEN_KEY);
}

function render() {
  if (appState.loading) {
    app.innerHTML = renderLoading();
    return;
  }

  if (appState.view === "landing") {
    app.innerHTML = renderLandingPage();
    return;
  }

  if (!appState.user) {
    app.innerHTML = renderAuthPage();
    return;
  }

  app.innerHTML = renderDashboard();
}

function renderLoading() {
  return `
    <div class="loading-shell">
      <div class="loading-card">
        <div class="crest crest-large"></div>
        <h1>Loading...</h1>
      </div>
    </div>
  `;
}

function renderLandingPage() {
  return `
    <div class="land-shell">
      <div class="land-bg-words" aria-hidden="true"></div>

      <div class="land-orb land-orb-1" aria-hidden="true"></div>
      <div class="land-orb land-orb-2" aria-hidden="true"></div>
      <div class="land-orb land-orb-3" aria-hidden="true"></div>

      <div class="land-center">
        <p class="land-subtitle">OFFICIAL LEAVE PORTAL FOR APCOER</p>

        <button class="land-cta" data-action="enter-app">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function renderAuthPage() {
  const isLogin = appState.authMode === "login";
  return `
    <div class="auth-layout">
      <section class="auth-panel auth-panel-centered">
        <div class="auth-panel-header">
          <div class="auth-heading">
            <h2>${isLogin ? "Sign In" : "Register"}</h2>
          </div>
          <div class="auth-toggle">
            <button class="toggle-button ${isLogin ? "active" : ""}" data-action="set-auth-mode" data-mode="login">Login</button>
            <button class="toggle-button ${!isLogin ? "active" : ""}" data-action="set-auth-mode" data-mode="register">Register</button>
          </div>
        </div>
        ${appState.message ? renderMessage(appState.message) : ""}
        ${isLogin ? renderLoginForm() : renderRegisterForm()}
      </section>
    </div>
  `;
}

// Demo accounts removed as per request

function renderLoginForm() {
  return `
    <form id="login-form" class="auth-form">
      <div class="field-group">
        <label for="login-username">Gmail</label>
        <input id="login-username" name="username" type="email" placeholder="Enter your Gmail" autocomplete="email" required />
      </div>
      <div class="field-group">
        <label for="login-password">Password</label>
        <input id="login-password" name="password" type="password" placeholder="Enter your password" required />
      </div>
      <div class="auth-actions-row">
        <button type="button" class="button-secondary" data-action="set-auth-mode" data-mode="register">New Registration</button>
        <button type="submit" class="button-primary">Log In</button>
      </div>
    </form>
  `;
}

function renderRegisterForm() {
  const role = document.getElementById("register-role")?.value || "faculty";
  const defaults = ROLE_DEFAULTS[role] || ROLE_DEFAULTS.faculty;
  const departmentValue = document.getElementById("register-department")?.value || defaults.department;

  return `
    <form id="register-form" class="auth-form">
      <div class="field-row">
        <div class="field-group">
          <label for="register-name">Full Name</label>
          <input id="register-name" name="name" placeholder="Enter full name" required />
        </div>
        <div class="field-group">
          <label for="register-username">Gmail</label>
          <input id="register-username" name="username" type="email" placeholder="Enter your Gmail" autocomplete="email" required />
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label for="register-role">Role</label>
          <select id="register-role" name="role" required>
            <option value="faculty">Faculty</option>
            <option value="hod">Head of Department</option>
            <option value="admin">Admin Office</option>
            <option value="principal">Principal</option>
          </select>
        </div>
        <div class="field-group">
          <label for="register-password">Password</label>
          <input id="register-password" name="password" type="password" placeholder="Min 6 chars, no special characters" required />
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label for="register-department">Department / Office</label>
          <select id="register-department" name="department" required>
            ${renderDepartmentOptions(role, departmentValue)}
          </select>
        </div>
        <div class="field-group">
          <label for="register-designation">Designation</label>
          <select id="register-designation" name="designation" required>
            <option value="Assistant Professor">Assistant Professor</option>
            <option value="Head of Department">Head of Department</option>
            <option value="Clerk">Clerk</option>
            <option value="Professor">Professor</option>
            <option value="Principal">Principal</option>
          </select>
        </div>
      </div>
      <div class="auth-actions-row">
        <button type="button" class="button-secondary" data-action="set-auth-mode" data-mode="login">Back to Login</button>
        <button type="submit" class="button-primary">Create Account</button>
      </div>
    </form>
  `;
}

function renderDashboard() {
  const tabs = getTabsForUser(appState.user);
  const primaryTabs = tabs.filter((tab) => !["analytics", "ai-summary"].includes(tab.id));
  const insightTabs = tabs.filter((tab) => ["analytics", "ai-summary"].includes(tab.id));
  const metrics = getDashboardMetrics(appState.user);

  return `
    <div class="dashboard-shell horizontal-transition">
      <nav class="dashboard-navbar">
        <div class="navbar-left">
          <div class="navbar-summary">
            <div class="navbar-stat">
              <span>Visible</span>
              <strong>${metrics.totalRequests}</strong>
            </div>
            <div class="navbar-stat">
              <span>Pending</span>
              <strong>${metrics.pendingRequests}</strong>
            </div>
            <div class="navbar-stat">
              <span>Action</span>
              <strong>${metrics.pendingApprovals}</strong>
            </div>
          </div>
        </div>

        <div class="navbar-center">
          <div class="navbar-groups">
            <div class="navbar-nav">
              ${primaryTabs.map((tab) => `
                <button class="nav-button nav-${tab.id} ${appState.tab === tab.id ? "active" : ""}" data-action="set-tab" data-tab="${tab.id}">
                  ${tab.label}
                </button>
              `).join("")}
            </div>
            ${insightTabs.length ? `
              <div class="navbar-divider"></div>
              <div class="navbar-nav">
                ${insightTabs.map((tab) => `
                  <button class="nav-button nav-${tab.id} ${appState.tab === tab.id ? "active" : ""}" data-action="set-tab" data-tab="${tab.id}">
                    ${tab.label}
                  </button>
                `).join("")}
              </div>
            ` : ""}
          </div>
        </div>

        <div class="navbar-right">
          <button class="button-secondary button-logout" data-action="logout">Log Out</button>
        </div>
      </nav>

      <div class="dashboard-main">
        ${renderTopBanner()}
        ${appState.message ? renderMessage(appState.message) : ""}
        ${renderCurrentTab()}
      </div>
    </div>
  `;
}

function renderTopBanner() {
  const tabMeta = getCurrentTabMeta();
  return `
    <section class="top-banner">
      <div class="banner-content">
        <div class="banner-user">
          <span class="role-chip">${ROLE_LABELS[appState.user.role]}</span>
          <strong>${escapeHtml(appState.user.name)}</strong>
          <span>${escapeHtml(appState.user.designation)} | ${escapeHtml(appState.user.department)}</span>
        </div>
        <p class="eyebrow">${escapeHtml(tabMeta.section)}</p>
        <h1>${escapeHtml(tabMeta.title)}</h1>
        ${tabMeta.description ? `
          <p class="banner-text">${escapeHtml(tabMeta.description)}</p>
        ` : ""}
      </div>
    </section>
  `;
}

function renderCurrentTab() {
  if (appState.tab === "overview") {
    return renderOverview();
  }
  if (appState.tab === "apply") {
    return renderApply();
  }
  if (appState.tab === "my-leaves") {
    return renderMyLeaves();
  }
  if (appState.tab === "approvals") {
    return renderApprovals();
  }
  if (appState.tab === "analytics") {
    return renderAnalytics();
  }
  if (appState.tab === "ai-summary") {
    return renderAISummary();
  }
  return renderOverview();
}

function renderOverview() {
  const metrics = getDashboardMetrics(appState.user);
  const summaryText = buildOverviewSummary(appState.user);
  const recentLeaves = [...appState.leaves].slice(0, 5);

  const cards = appState.user.role === "faculty"
    ? [
        { title: "My Requests", value: metrics.totalRequests, note: "Leave applications created by this account." },
        { title: "In Progress", value: metrics.pendingRequests, note: "Requests still moving through approvals." },
        { title: "Approved", value: metrics.approvedRequests, note: "Requests fully cleared by all stages." },
        { title: "Balance Left", value: metrics.remainingTotal, note: "Total remaining approved leave balance." }
      ]
    : [
        { title: "Awaiting Action", value: metrics.pendingApprovals, note: "Applications currently on your desk." },
        { title: "Pending", value: metrics.pendingRequests, note: "Requests not yet fully closed." },
        { title: "Approved", value: metrics.approvedRequests, note: "Applications fully sanctioned." },
        { title: "Rejected", value: metrics.rejectedRequests, note: "Applications declined in review." }
      ];

  return `
    <section class="section-card">
      <div class="section-heading compact">
        <div>
          <p class="eyebrow">Overview</p>
          <h2>Today's Snapshot</h2>
        </div>
      </div>
      <div class="metric-grid">
        ${cards.map((card) => renderMetricCard(card.title, card.value, card.note)).join("")}
      </div>
    </section>
    <section class="section-card split-layout">
      <article class="content-panel">
        <p class="eyebrow">At a Glance</p>
        <h2>Concise Role Summary</h2>
        <p class="lead-text">${escapeHtml(summaryText)}</p>
      </article>
      <article class="content-panel">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">Recent Records</p>
            <h2>Latest Leave Activity</h2>
          </div>
        </div>
        ${recentLeaves.length ? `
          <div class="table-wrap">
            <table class="data-table compact-table">
              <thead>
                <tr>
                  <th>Leave ID</th>
                  <th>Applicant</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${recentLeaves.map((leave) => `
                  <tr>
                    <td>${leave.leaveCode}</td>
                    <td>${escapeHtml(leave.applicantName)}</td>
                    <td>${renderStatusChip(getOverallStatus(leave))}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        ` : renderEmptyState("No leave activity is available yet.")}
      </article>
    </section>
  `;
}

function renderApply() {
  if (!canSubmitLeave(appState.user)) {
    return `
      <section class="section-card">
        ${renderEmptyState("This role does not submit leave applications from the portal.")}
      </section>
    `;
  }

  const balanceRows = getBalanceRows(appState.user);
  return `
    <div class="apply-container">
      <section class="section-card split-layout">
        <div class="content-panel form-panel">
          <form id="apply-form">
            <div class="section-heading compact form-header">
              <div>
                <p class="eyebrow">Leave Application</p>
                <h2>Submit a New Request</h2>
              </div>
            </div>

            <div class="form-grid">
              <!-- 1st Row: Leave Type | Department -->
              <div class="form-row-2">
                <div class="field-group">
                  <label for="leave-type">Leave Type</label>
                  <div class="select-wrapper">
                    <select id="leave-type" name="leaveType" required>
                      ${LEAVE_TYPES.map((type) => `<option value="${type}">${type}</option>`).join("")}
                    </select>
                  </div>
                </div>
                <div class="field-group">
                  <label for="leave-department">Department</label>
                  <input id="leave-department" value="${escapeHtml(appState.user.department)}" disabled class="disabled-input" />
                </div>
              </div>

              <!-- 2nd Row: Start Date | End Date -->
              <div class="form-row-2">
                <div class="field-group">
                  <label for="leave-start">Start Date</label>
                  <input id="leave-start" name="startDate" type="date" required />
                </div>
                <div class="field-group">
                  <label for="leave-end">End Date</label>
                  <input id="leave-end" name="endDate" type="date" required />
                </div>
              </div>

              <!-- 3rd Row: Substitute Teacher -->
              <div class="form-group-full">
                <div class="field-group">
                  <label for="substitute-teacher">Substitute Teacher</label>
                  <input id="substitute-teacher" name="substituteTeacher" placeholder="Enter the substitute teacher name" required />
                </div>
              </div>

              <!-- 4th Row: Reason for Leave -->
              <div class="form-group-full">
                <div class="field-group">
                  <label for="leave-reason">Reason for Leave</label>
                  <textarea id="leave-reason" name="reason" placeholder="Provide the formal reason for leave." required></textarea>
                </div>
              </div>

              <!-- 5th Row: Supporting Proof Card -->
              <div class="form-group-full">
                <div class="proof-card">
                  <div class="proof-card-header">
                    <div>
                      <h3 class="proof-title">Supporting Proof</h3>
                      <p class="proof-subtitle">Optional image or document for leave verification.</p>
                    </div>
                    <span class="proof-pill empty">Optional</span>
                  </div>
                  
                  <div class="proof-body">
                    <div class="field-group">
                      <label for="leave-proof" class="inner-label">Upload Proof File</label>
                      <div class="file-input-wrapper">
                        <input id="leave-proof" name="proofFile" type="file" accept="${PROOF_ACCEPT}" />
                      </div>
                    </div>
                    <p class="proof-help-text">
                      Accepted formats: <strong>PDF, DOC, DOCX, JPG, PNG, and WEBP</strong>. Max size: <strong>2.5 MB</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-footer">
              <p class="approval-note">
                Faculty requests begin with HOD approval. HOD self-leave automatically skips the HOD stage and goes directly to the Admin Office.
              </p>
              <div class="form-actions">
                <button type="submit" class="button-primary submit-btn">Submit Leave Request</button>
              </div>
            </div>
          </form>
        </div>

        <article class="content-panel balance-panel">
          <div class="section-heading compact">
            <div>
              <p class="eyebrow">Balance Overview</p>
              <h2>Available Leave Balance</h2>
            </div>
          </div>
          <div class="bar-chart">
            ${balanceRows.map((row) => renderBalanceBar(row.label, row.remaining, row.entitlement)).join("")}
          </div>
        </article>
      </section>
    </div>
  `;
}

function renderMyLeaves() {
  if (!canSubmitLeave(appState.user)) {
    return `
      <section class="section-card">
        ${renderEmptyState("This role does not have a personal leave register in the portal.")}
      </section>
    `;
  }

  const leaves = getLeavesForApplicant(appState.user.id);
  return `
    <section class="section-card">
      <div class="section-heading">
        <div>
          <p class="eyebrow">My Register</p>
          <h2>Leave Status and Records</h2>
        </div>
      </div>
      ${leaves.length ? `
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Leave ID</th>
                <th>Type</th>
                <th>Substitute Teacher</th>
                <th>Proof</th>
                <th>Period</th>
                <th>Days</th>
                <th>Status</th>
                <th>Stage Progress</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${leaves.map((leave) => `
                <tr>
                  <td>${leave.leaveCode}</td>
                  <td>${escapeHtml(leave.leaveType)}</td>
                  <td>${escapeHtml(leave.substituteTeacher)}</td>
                  <td>${renderProofBadge(leave.proof)}</td>
                  <td>${formatDisplayDate(leave.startDate)} to ${formatDisplayDate(leave.endDate)}</td>
                  <td>${leave.days}</td>
                  <td>${renderStatusChip(getOverallStatus(leave))}</td>
                  <td>${escapeHtml(getTimelineSummary(leave))}</td>
                  <td>
                    <div class="table-actions">
                      ${leave.proof ? `<button class="button-ghost" data-action="open-proof" data-id="${leave.id}">Open Proof</button>` : ""}
                      ${canDeleteLeave(leave, appState.user) ? `<button class="button-ghost" data-action="delete-leave" data-id="${leave.id}">Delete</button>` : ""}
                      ${getOverallStatus(leave) === "Approved" ? `<button class="button-secondary" data-action="download-certificate" data-id="${leave.id}">Certificate</button>` : ""}
                    </div>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : renderEmptyState("No leave records are available yet for this account.")}
    </section>
  `;
}

function renderApprovals() {
  const visibleLeaves = [...appState.leaves].sort(sortApprovalLeaves);
  const pendingLeaves = getPendingApprovalsForUser(appState.user);
  const counts = getStatusCounts(visibleLeaves);
  const selectedLeave = visibleLeaves.find((leave) => leave.id === appState.selectedRequestId) || null;

  if (!selectedLeave) {
    appState.selectedRequestId = null;
  }

  return `
    <section class="section-card">
      <div class="section-heading compact">
        <div>
          <p class="eyebrow">Approval Desk</p>
          <h2>Requests Requiring Review</h2>
        </div>
      </div>
      <div class="metric-grid review-metric-grid">
        ${renderMetricCard("Visible Requests", visibleLeaves.length, "Requests available in your current review scope.")}
        ${renderMetricCard("Awaiting Action", pendingLeaves.length, "Requests currently waiting for your decision.")}
        ${renderMetricCard("Approved Visible", counts.approved, "Requests already approved in your visible register.")}
        ${renderMetricCard("Rejected Visible", counts.rejected, "Requests closed with rejection in your visible register.")}
      </div>
    </section>
    <section class="section-card">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Review Register</p>
          <h2>Click a Faculty Name to Review</h2>
        </div>
      </div>
      ${visibleLeaves.length ? `
        <div class="table-wrap">
          <table class="data-table approval-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Department</th>
                <th>Leave Type</th>
                <th>Period</th>
                <th>Days</th>
                <th>Current Stage</th>
                <th>Status</th>
                <th>Proof</th>
              </tr>
            </thead>
            <tbody>
              ${visibleLeaves.map((leave) => `
                <tr>
                  <td>
                    <button type="button" class="link-button applicant-link" data-action="select-request" data-id="${leave.id}">
                      ${escapeHtml(leave.applicantName)}
                    </button>
                    <div class="muted">${escapeHtml(leave.designation)}</div>
                  </td>
                  <td>${escapeHtml(leave.department)}</td>
                  <td>${escapeHtml(leave.leaveType)}</td>
                  <td>${formatDisplayDate(leave.startDate)} to ${formatDisplayDate(leave.endDate)}</td>
                  <td>${leave.days}</td>
                  <td><span class="stage-chip">${escapeHtml(getCurrentStageLabel(leave))}</span></td>
                  <td>${renderStatusChip(getOverallStatus(leave))}</td>
                  <td>${renderProofBadge(leave.proof)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : renderEmptyState("No leave applications are visible for this approval role.")}
    </section>
    ${selectedLeave ? renderApprovalModal(selectedLeave) : ""}
  `;
}

function renderApprovalModal(leave) {
  return `
    <div class="modal-backdrop">
      <div class="review-modal" role="dialog" aria-modal="true" aria-label="Review leave request">
        <div class="review-modal-header">
          <div>
            <p class="eyebrow">Review Request</p>
            <h2>${escapeHtml(leave.applicantName)}</h2>
            <p class="muted">${escapeHtml(leave.designation)} | ${escapeHtml(leave.department)}</p>
          </div>
          <div class="review-modal-actions">
            ${renderStatusChip(getOverallStatus(leave))}
            <span class="stage-chip">${escapeHtml(getCurrentStageLabel(leave))}</span>
            <button type="button" class="button-ghost modal-close" data-action="close-request-modal">Close</button>
          </div>
        </div>
        <div class="review-modal-body">
          ${renderApprovalDetail(leave)}
        </div>
      </div>
    </div>
  `;
}

function renderApprovalDetail(leave) {
  const applicant = getUserById(leave.applicantId);
  const metrics = getApplicantAnalytics(leave.applicantId);
  const canAct = canUserActOnLeave(appState.user, leave);
  const remarksId = `remarks-${leave.id}`;

  return `
    <div class="detail-stack">
      <div class="detail-grid">
        <div class="detail-box"><strong>Leave ID</strong><span>${leave.leaveCode}</span></div>
        <div class="detail-box"><strong>Leave Type</strong><span>${escapeHtml(leave.leaveType)}</span></div>
        <div class="detail-box"><strong>Department</strong><span>${escapeHtml(leave.department)}</span></div>
        <div class="detail-box"><strong>Period</strong><span>${formatDisplayDate(leave.startDate)} to ${formatDisplayDate(leave.endDate)}</span></div>
        <div class="detail-box"><strong>Duration</strong><span>${leave.days} day(s)</span></div>
        <div class="detail-box"><strong>Substitute Teacher</strong><span>${escapeHtml(leave.substituteTeacher)}</span></div>
        <div class="detail-box"><strong>Last Updated</strong><span>${formatDisplayDate(leave.lastUpdated)}</span></div>
      </div>
      <div class="detail-two-column">
        <div class="context-box">
          <strong>Reason for Leave</strong>
          <p>${escapeHtml(leave.reason)}</p>
        </div>
        <div class="context-box">
          <strong>Supporting Proof</strong>
          ${renderProofDetail(leave)}
        </div>
      </div>
      <div class="compact-metrics">
        ${renderMiniMetric("Total Requests", getLeavesForApplicant(leave.applicantId).length)}
        ${renderMiniMetric("Pending", metrics.pending)}
        ${renderMiniMetric("Approved", metrics.approved)}
        ${renderMiniMetric("Rejected", metrics.rejected)}
        ${renderMiniMetric("Approved Days", metrics.approvedDays)}
      </div>
      ${applicant && applicant.leaveEntitlement ? `
        <div class="detail-section">
          <div class="section-heading compact">
            <div>
              <p class="eyebrow">Faculty Analytics</p>
              <h2>Remaining Leave Balance</h2>
            </div>
          </div>
          <div class="bar-chart">
            ${getBalanceRows(applicant).map((row) => renderBalanceBar(row.label, row.remaining, row.entitlement)).join("")}
          </div>
        </div>
      ` : ""}
      <div class="detail-section">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">Workflow</p>
            <h2>Approval Timeline</h2>
          </div>
        </div>
        <div class="timeline-block">
          ${renderTimelineItem("HOD", leave.stage1)}
          ${renderTimelineItem("Admin Office", leave.stage2)}
          ${renderTimelineItem("Principal", leave.stage3)}
        </div>
      </div>
      <div class="field-group">
        <label for="${remarksId}">Review Remarks</label>
        <textarea id="${remarksId}" data-remarks-for="${leave.id}" placeholder="Record an official review note.">${getCurrentRemarks(leave, appState.user.role)}</textarea>
      </div>
      <div class="table-actions">
        <button class="button-success" data-action="approve-request" data-id="${leave.id}" ${canAct ? "" : "disabled"}>Approve</button>
        <button class="button-danger" data-action="reject-request" data-id="${leave.id}" ${canAct ? "" : "disabled"}>Reject</button>
      </div>
    </div>
  `;
}

function renderAnalytics() {
  if (appState.user.role === "principal") {
    return renderPrincipalAnalytics();
  }

  if (!appState.user.leaveEntitlement) {
    return `
      <section class="section-card">
        ${renderEmptyState("Analytics are available for faculty-facing accounts and the Principal dashboard.")}
      </section>
    `;
  }

  const leaves = getLeavesForApplicant(appState.user.id);
  const counts = getStatusCounts(leaves);
  const total = Math.max(leaves.length, 1);
  const approvedDegrees = Math.round((counts.approved / total) * 360);
  const pendingDegrees = Math.round((counts.pending / total) * 360);
  const rejectedDegrees = Math.max(0, 360 - approvedDegrees - pendingDegrees);
  const usage = getLeaveTypeUsage(appState.user.id);
  const monthlyTrend = getMonthlyTrendRows(leaves);
  const leaveTypeRows = getLeaveTypeStatusRows(leaves);
  const stageRows = getPendingStageRows(leaves);

  return `
    <section class="section-card">
      <div class="section-heading compact">
        <div>
          <p class="eyebrow">Faculty Analytics</p>
          <h2>Leave Analytics Dashboard</h2>
        </div>
      </div>
      <div class="metric-grid">
        ${renderMetricCard("Total Requests", leaves.length, "All submitted leave requests from this account.")}
        ${renderMetricCard("Pending Requests", counts.pending, "Requests still moving through the approval process.")}
        ${renderMetricCard("Approved Requests", counts.approved, "Requests that completed all approval stages.")}
        ${renderMetricCard("Rejected Requests", counts.rejected, "Requests closed with a rejection decision.")}
      </div>
    </section>
    <section class="section-card analytics-grid analytics-grid-three">
      <article class="content-panel">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">Status Split</p>
            <h2>Request Status Distribution</h2>
          </div>
        </div>
        <div class="donut-chart" style="--approved:${approvedDegrees}; --pending:${pendingDegrees}; --rejected:${rejectedDegrees};"></div>
        <div class="chart-legend">
          <span><i class="legend-dot approved"></i> Approved: ${counts.approved}</span>
          <span><i class="legend-dot pending"></i> Pending: ${counts.pending}</span>
          <span><i class="legend-dot rejected"></i> Rejected: ${counts.rejected}</span>
        </div>
      </article>
      <article class="content-panel">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">Leave Consumption</p>
            <h2>Approved Usage by Leave Type</h2>
          </div>
        </div>
        <div class="bar-chart">
          ${Object.entries(usage).map(([type, row]) => renderBalanceBar(type, row.approved, row.entitlement, "success")).join("")}
        </div>
      </article>
      <article class="content-panel">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">Workflow Status</p>
            <h2>Pending Stage Load</h2>
          </div>
        </div>
        <div class="bar-chart">
          ${stageRows.map((row) => renderCustomBar(row.label, row.value, row.max || 1, row.variant)).join("")}
        </div>
      </article>
    </section>
    <section class="section-card analytics-grid analytics-grid-two">
      <article class="content-panel">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">Monthly Trend</p>
            <h2>Requests Submitted Over Time</h2>
          </div>
        </div>
        ${renderTrendChart(monthlyTrend)}
      </article>
      <article class="content-panel">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">Status by Type</p>
            <h2>Leave Type Performance</h2>
          </div>
        </div>
        ${leaveTypeRows.length ? renderStackedStatusChart(leaveTypeRows) : renderEmptyState("No leave type activity is available yet.")}
      </article>
    </section>
  `;
}

function renderPrincipalAnalytics() {
  const departments = ["All Departments", ...new Set(
    appState.users.filter((user) => user.role === "faculty").map((user) => user.department)
  )];

  if (!departments.includes(appState.principalDepartment)) {
    appState.principalDepartment = "All Departments";
  }

  const faculty = appState.users.filter((user) => user.role === "faculty" && (
    appState.principalDepartment === "All Departments" || user.department === appState.principalDepartment
  ));

  const facultyLeaves = appState.leaves.filter((leave) => leave.applicantRole === "faculty" && (
    appState.principalDepartment === "All Departments" || leave.department === appState.principalDepartment
  ));

  const maxDays = Math.max(...faculty.map((user) => getApprovedDaysForUser(user.id)), 1);
  const counts = getStatusCounts(facultyLeaves);
  const total = Math.max(facultyLeaves.length, 1);
  const approvedDegrees = Math.round((counts.approved / total) * 360);
  const pendingDegrees = Math.round((counts.pending / total) * 360);
  const rejectedDegrees = Math.max(0, 360 - approvedDegrees - pendingDegrees);
  const totalApprovedDays = faculty.reduce((sum, user) => sum + getApprovedDaysForUser(user.id), 0);
  const monthlyTrend = getMonthlyTrendRows(facultyLeaves);
  const statusRows = appState.principalDepartment === "All Departments"
    ? getDepartmentStatusRows(facultyLeaves)
    : getFacultyStatusRows(facultyLeaves, faculty);
  const leaveTypeRows = getLeaveTypeStatusRows(facultyLeaves);

  return `
    <section class="section-card">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Principal Analytics</p>
          <h2>Department Leave Trends</h2>
        </div>
        <div class="field-group filter-group">
          <label for="department-filter">Department Filter</label>
          <select id="department-filter" data-action="set-department">
            ${departments.map((department) => `
              <option value="${department}" ${department === appState.principalDepartment ? "selected" : ""}>${department}</option>
            `).join("")}
          </select>
        </div>
      </div>
      <div class="metric-grid">
        ${renderMetricCard("Visible Faculty", faculty.length, "Faculty members in the selected scope.")}
        ${renderMetricCard("Visible Requests", facultyLeaves.length, "Faculty leave requests in the selected scope.")}
        ${renderMetricCard("Approved Days", totalApprovedDays, "Approved leave days across the selected scope.")}
        ${renderMetricCard("Pending Requests", counts.pending, "Requests still awaiting final closure.")}
      </div>
    </section>
    <section class="section-card analytics-grid analytics-grid-three">
      <article class="content-panel">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">Approved Days</p>
            <h2>By Faculty Member</h2>
          </div>
        </div>
        ${faculty.length ? `
          <div class="bar-chart">
            ${faculty.map((user) => renderCustomBar(user.name, getApprovedDaysForUser(user.id), maxDays, "success")).join("")}
          </div>
        ` : renderEmptyState("No faculty records are available for the selected department.")}
      </article>
      <article class="content-panel">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">Status View</p>
            <h2>Department Distribution</h2>
          </div>
        </div>
        <div class="donut-chart" style="--approved:${approvedDegrees}; --pending:${pendingDegrees}; --rejected:${rejectedDegrees};"></div>
        <div class="chart-legend">
          <span><i class="legend-dot approved"></i> Approved: ${counts.approved}</span>
          <span><i class="legend-dot pending"></i> Pending: ${counts.pending}</span>
          <span><i class="legend-dot rejected"></i> Rejected: ${counts.rejected}</span>
        </div>
      </article>
      <article class="content-panel">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">Leave Type Mix</p>
            <h2>Status by Leave Type</h2>
          </div>
        </div>
        ${leaveTypeRows.length ? renderStackedStatusChart(leaveTypeRows) : renderEmptyState("No leave type activity is available for this selection.")}
      </article>
    </section>
    <section class="section-card analytics-grid analytics-grid-two">
        <article class="content-panel">
          <div class="section-heading compact">
            <div>
              <p class="eyebrow">Monthly Trend</p>
              <h2>Requests Submitted Over Time</h2>
            </div>
          </div>
          ${renderTrendChart(monthlyTrend)}
        </article>
        <article class="content-panel">
          <div class="section-heading compact">
            <div>
              <p class="eyebrow">Status Table</p>
              <h2>${appState.principalDepartment === "All Departments" ? "Department Request Overview" : "Faculty Request Overview"}</h2>
            </div>
          </div>
          ${statusRows.length ? renderStackedStatusChart(statusRows) : renderEmptyState("No request status data is available for the current selection.")}
        </article>
      </div>
    </section>
  `;
}

function renderAISummary() {
  const isFaculty = appState.user.role === "faculty";
  const summary = isFaculty ? appState.facultySummary : appState.managementSummary;
  const placeholder = isFaculty
    ? "Generate a summary to review your leave requests, current stage, and remaining balance."
    : getManagementSummaryPlaceholder(appState.user);

  return `
    <section class="section-card">
      <div class="section-heading">
        <div>
          <p class="eyebrow">${escapeHtml(isFaculty ? "Faculty Summary" : `${ROLE_LABELS[appState.user.role]} Summary`)}</p>
          <h2>${escapeHtml(isFaculty ? "AI Leave Summary" : "AI Faculty Leave Summary")}</h2>
        </div>
        <button class="button-primary" data-action="${isFaculty ? "generate-faculty-summary" : "generate-management-summary"}">Generate Summary</button>
      </div>
      ${summary ? renderSummaryLayout(summary) : renderEmptyState(placeholder)}
    </section>
  `;
}

function renderMetricCard(title, value, note) {
  return `
    <article class="metric-card">
      <span>${escapeHtml(title)}</span>
      <strong>${value}</strong>
      <p>${escapeHtml(note)}</p>
    </article>
  `;
}

function renderMiniMetric(label, value) {
  return `
    <div class="mini-metric">
      <span>${escapeHtml(label)}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function renderBalanceBar(label, value, total, variant = "") {
  const percentage = total ? Math.round((value / total) * 100) : 0;
  return `
    <div class="bar-row">
      <div class="bar-label">${escapeHtml(label)}</div>
      <div class="bar-track">
        <div class="bar-fill ${variant}" style="width:${percentage}%"></div>
      </div>
      <div class="bar-value">${value}/${total}</div>
    </div>
  `;
}

function renderCustomBar(label, value, max, variant = "") {
  const percentage = max ? Math.round((value / max) * 100) : 0;
  return `
    <div class="bar-row">
      <div class="bar-label">${escapeHtml(label)}</div>
      <div class="bar-track">
        <div class="bar-fill ${variant}" style="width:${Math.max(percentage, value ? 8 : 0)}%"></div>
      </div>
      <div class="bar-value">${value}</div>
    </div>
  `;
}

function renderStatusChip(status) {
  return `<span class="status-chip ${status.toLowerCase()}">${escapeHtml(status)}</span>`;
}

function renderTimelineItem(label, stage) {
  return `
    <div class="timeline-item">
      <strong>${escapeHtml(label)} | ${titleCase(stage.status)}</strong>
      <p>${stage.actedOn ? `${formatDisplayDate(stage.actedOn)} | ` : ""}${escapeHtml(stage.remarks || "No remarks recorded yet.")}</p>
    </div>
  `;
}

function renderMessage(message) {
  return `<div class="message-banner ${message.type}">${escapeHtml(message.text)}</div>`;
}

function renderEmptyState(text) {
  return `<div class="empty-state">${escapeHtml(text)}</div>`;
}

function renderProofBadge(proof) {
  if (!proof) {
    return `<span class="proof-pill empty">Not Added</span>`;
  }

  return `
    <div class="proof-badge">
      <span class="proof-pill">Attached</span>
      <span class="muted">${escapeHtml(shortenText(proof.fileName, 22))}</span>
    </div>
  `;
}

function renderProofDetail(leave) {
  if (!leave.proof) {
    return `<p class="muted">No supporting proof was attached to this leave request.</p>`;
  }

  return `
    <div class="proof-detail">
      <span class="proof-pill">Attached</span>
      <strong>${escapeHtml(leave.proof.fileName)}</strong>
      <p class="muted">${escapeHtml(getProofTypeLabel(leave.proof.mimeType))} | ${formatBytes(leave.proof.size)}</p>
      <button type="button" class="button-ghost" data-action="open-proof" data-id="${leave.id}">Open Proof</button>
    </div>
  `;
}

function renderSummaryLayout(summary) {
  const panels = [];

  if (summary.highlights?.length) {
    panels.push(renderSummaryListPanel("Highlights", summary.highlights));
  }

  if (summary.watchItems?.length) {
    panels.push(renderSummaryListPanel("Attention Points", summary.watchItems));
  }

  return `
    <div class="summary-shell">
      <div class="summary-box summary-intro">
        <strong>${escapeHtml(summary.title)}</strong>
        <p>${escapeHtml(summary.subtitle)}</p>
      </div>
      ${summary.metrics?.length ? `
        <div class="summary-metric-grid">
          ${summary.metrics.map((metric) => `
            <article class="summary-metric-card">
              <span>${escapeHtml(metric.label)}</span>
              <strong>${escapeHtml(metric.value)}</strong>
            </article>
          `).join("")}
        </div>
      ` : ""}
      ${panels.length ? `
        <div class="summary-grid">
          ${panels.join("")}
        </div>
      ` : ""}
      ${summary.cards?.length ? `
        <div class="summary-card-grid">
          ${summary.cards.map((card) => `
            <article class="summary-card">
              <div class="summary-card-head">
                <strong>${escapeHtml(card.title)}</strong>
                ${card.subtitle ? `<span>${escapeHtml(card.subtitle)}</span>` : ""}
              </div>
              <ul class="summary-list">
                ${card.lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
              </ul>
            </article>
          `).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function renderSummaryListPanel(title, items) {
  return `
    <article class="summary-panel">
      <strong>${escapeHtml(title)}</strong>
      <ul class="summary-list">
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </article>
  `;
}

function renderTrendChart(rows) {
  if (!rows.length) {
    return renderEmptyState("No monthly trend data is available yet.");
  }

  const maxTotal = Math.max(...rows.map((row) => row.total), 1);
  return `
    <div class="trend-chart-scroll">
      <div class="trend-chart" style="--trend-columns:${rows.length};">
        ${rows.map((row) => `
          <div class="trend-column">
            <div class="trend-bar">
              <span class="trend-segment approved" style="height:${(row.approved / maxTotal) * 100}%"></span>
              <span class="trend-segment pending" style="height:${(row.pending / maxTotal) * 100}%"></span>
              <span class="trend-segment rejected" style="height:${(row.rejected / maxTotal) * 100}%"></span>
            </div>
            <strong>${row.total}</strong>
            <span>${escapeHtml(row.label)}</span>
          </div>
        `).join("")}
      </div>
    </div>
    <div class="chart-legend">
      <span><i class="legend-dot approved"></i> Approved</span>
      <span><i class="legend-dot pending"></i> Pending</span>
      <span><i class="legend-dot rejected"></i> Rejected</span>
    </div>
  `;
}

function renderStackedStatusChart(rows) {
  return `
    <div class="stacked-status-chart">
      ${rows.map((row) => {
        const total = Math.max(row.approved + row.pending + row.rejected, 1);
        return `
          <div class="stacked-status-row">
            <div class="stacked-status-label">
              <strong>${escapeHtml(row.label)}</strong>
              <span>${total} request(s)</span>
            </div>
            <div class="stacked-status-track">
              <span class="stacked-segment approved" style="width:${(row.approved / total) * 100}%"></span>
              <span class="stacked-segment pending" style="width:${(row.pending / total) * 100}%"></span>
              <span class="stacked-segment rejected" style="width:${(row.rejected / total) * 100}%"></span>
            </div>
            <div class="stacked-status-values">
              <span>A ${row.approved}</span>
              <span>P ${row.pending}</span>
              <span>R ${row.rejected}</span>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

async function handleSubmit(event) {
  const form = event.target;

  if (form.id === "login-form") {
    event.preventDefault();
    const data = new FormData(form);

    try {
      appState.loading = true;
      render();
      const result = await apiRequest("/api/auth/login", {
        method: "POST",
        auth: false,
        body: {
          username: String(data.get("username") || "").trim(),
          password: String(data.get("password") || "")
        }
      });

      appState.token = result.token;
      localStorage.setItem(TOKEN_KEY, result.token);
      setMessage("success", `Welcome, ${result.user.name}.`);
      await loadSession();
    } catch (error) {
      appState.loading = false;
      setMessage("error", error.message);
      render();
    }
    return;
  }

  if (form.id === "register-form") {
    event.preventDefault();
    const data = new FormData(form);

    try {
      appState.loading = true;
      render();
      const result = await apiRequest("/api/auth/register", {
        method: "POST",
        auth: false,
        body: {
          name: String(data.get("name") || "").trim(),
          username: String(data.get("username") || "").trim(),
          password: String(data.get("password") || ""),
          role: String(data.get("role") || ""),
          department: String(data.get("department") || "").trim(),
          designation: String(data.get("designation") || "").trim()
        }
      });

      appState.token = result.token;
      localStorage.setItem(TOKEN_KEY, result.token);
      appState.authMode = "login";
      setMessage("success", `Registration completed for ${result.user.name}.`);
      await loadSession();
    } catch (error) {
      appState.loading = false;
      setMessage("error", error.message);
      render();
    }
    return;
  }

  if (form.id === "apply-form") {
    event.preventDefault();
    const data = new FormData(form);

    try {
      const proof = await readOptionalProofFile(data.get("proofFile"));
      await apiRequest("/api/leaves", {
        method: "POST",
        body: {
          leaveType: String(data.get("leaveType") || ""),
          startDate: String(data.get("startDate") || ""),
          endDate: String(data.get("endDate") || ""),
          substituteTeacher: String(data.get("substituteTeacher") || "").trim(),
          reason: String(data.get("reason") || "").trim(),
          proof
        }
      });

      appState.tab = "my-leaves";
      setMessage("success", "Leave request submitted successfully.");
      await loadSession();
    } catch (error) {
      setMessage("error", error.message);
      render();
    }
  }
}

async function handleClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) {
    return;
  }

  const action = button.dataset.action;

  if (action === "set-auth-mode") {
    appState.authMode = button.dataset.mode || "login";
    appState.message = null;
    render();
    return;
  }

  if (action === "enter-app") {
    appState.view = "auth";
    appState.authMode = "login";
    render();
    return;
  }

  // fill-demo action removed

  if (!appState.user && action !== "set-auth-mode") {
    return;
  }

  if (action === "set-tab") {
    appState.tab = button.dataset.tab || "overview";
    appState.message = null;
    render();
    return;
  }

  if (action === "logout") {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch (_error) {
      // Ignore logout failures and clear the client session anyway.
    }
    clearSession();
    setMessage("success", "You have been logged out.");
    render();
    return;
  }

  if (action === "select-request") {
    appState.selectedRequestId = button.dataset.id || null;
    render();
    return;
  }

  if (action === "close-request-modal") {
    appState.selectedRequestId = null;
    render();
    return;
  }

  if (action === "approve-request" || action === "reject-request") {
    const leaveId = button.dataset.id;
    const remarksField = document.querySelector(`[data-remarks-for="${leaveId}"]`);
    const remarks = remarksField ? remarksField.value.trim() : "";

    try {
      await apiRequest(`/api/leaves/${leaveId}/decision`, {
        method: "POST",
        body: {
          decision: action === "approve-request" ? "approved" : "rejected",
          remarks
        }
      });

      setMessage(
        action === "approve-request" ? "success" : "info",
        action === "approve-request" ? "Leave request approved successfully." : "Leave request rejected successfully."
      );
      await loadSession();
    } catch (error) {
      setMessage("error", error.message);
      render();
    }
    return;
  }

  if (action === "delete-leave") {
    try {
      await apiRequest(`/api/leaves/${button.dataset.id}`, { method: "DELETE" });
      setMessage("success", "Leave record deleted successfully.");
      await loadSession();
    } catch (error) {
      setMessage("error", error.message);
      render();
    }
    return;
  }

  if (action === "download-certificate") {
    const leave = appState.leaves.find((item) => item.id === button.dataset.id);
    if (!leave || getOverallStatus(leave) !== "Approved") {
      setMessage("error", "Certificate is available only after final approval.");
      render();
      return;
    }

    downloadCertificate(leave);
    setMessage("success", "Certificate downloaded successfully.");
    render();
    return;
  }

  if (action === "open-proof") {
    const leave = appState.leaves.find((item) => item.id === button.dataset.id);
    if (!leave?.proof) {
      setMessage("error", "No proof file is attached to this leave request.");
      render();
      return;
    }

    openProofAttachment(leave.proof);
    return;
  }

  if (action === "generate-faculty-summary") {
    appState.facultySummary = buildFacultySummary();
    render();
    return;
  }

  if (action === "generate-management-summary") {
    appState.managementSummary = buildManagementSummary();
    render();
  }
}

function handleChange(event) {
  if (event.target.dataset.action === "set-department") {
    appState.principalDepartment = event.target.value;
    render();
    return;
  }

  if (event.target.id === "register-role") {
    updateRegistrationDepartmentOptions(event.target.form, event.target.value);
    applyRoleDefaults(event.target.value, event.target.form);
    const designationField = event.target.form.querySelector('[name="designation"]');
    const defaults = ROLE_DEFAULTS[event.target.value] || ROLE_DEFAULTS.faculty;
    if (designationField && !designationField.value.trim()) {
      designationField.placeholder = defaults.designation;
    }
  }
}

function applyRoleDefaults(role, form) {
  const defaults = ROLE_DEFAULTS[role] || ROLE_DEFAULTS.faculty;
  const departmentField = form.querySelector('[name="department"]');
  const designationField = form.querySelector('[name="designation"]');

  if (departmentField && !departmentField.value.trim() && defaults.department) {
    departmentField.value = defaults.department;
  }

  if (designationField && !designationField.value.trim()) {
    designationField.value = defaults.designation;
  }
}

function getDepartmentOptionsForRole(role) {
  if (role === "admin") {
    return ["Administration Office"];
  }

  if (role === "principal") {
    return ["Principal Office"];
  }

  return ENGINEERING_DEPARTMENTS;
}

function renderDepartmentOptions(role, selectedValue = "") {
  const options = getDepartmentOptionsForRole(role);
  const requiresSelection = ["faculty", "hod"].includes(role);
  const normalizedSelected = options.includes(selectedValue)
    ? selectedValue
    : (requiresSelection ? "" : (options[0] || ""));

  const placeholderOption = requiresSelection
    ? `<option value="" ${normalizedSelected ? "" : "selected"} disabled>Select Department</option>`
    : "";

  return placeholderOption + options.map((option) => `
    <option value="${escapeHtml(option)}" ${option === normalizedSelected ? "selected" : ""}>${escapeHtml(option)}</option>
  `).join("");
}

function updateRegistrationDepartmentOptions(form, role) {
  const departmentField = form.querySelector("#register-department");
  if (!departmentField) {
    return;
  }

  const currentValue = departmentField.value;
  departmentField.innerHTML = renderDepartmentOptions(role, currentValue);
}

function setMessage(type, text) {
  appState.message = { type, text };
}

function getCurrentTabMeta() {
  const labels = {
    overview: {
      section: "Dashboard",
      title: "Overview",
      description: ""
    },
    apply: {
      section: "Leave Application",
      title: "Create a New Leave Request",
      description: ""
    },
    "my-leaves": {
      section: "Leave Register",
      title: "Track Your Leave Records",
      description: ""
    },
    approvals: {
      section: "Approval Desk",
      title: "Review Department Leave Requests",
      description: "Click a faculty name to open the full review popup."
    },
    analytics: {
      section: "Analytics",
      title: "Leave Trends and Status Charts",
      description: ""
    },
    "ai-summary": {
      section: "AI Summary",
      title: "Narrative Summary View",
      description: ""
    }
  };

  return labels[appState.tab] || labels.overview;
}

function getTabsForUser(user) {
  const tabs = [{ id: "overview", label: "Overview" }];

  if (canSubmitLeave(user)) {
    tabs.push({ id: "apply", label: "Apply Leave" });
    tabs.push({ id: "my-leaves", label: "My Leaves" });
  }

  if (["hod", "admin", "principal"].includes(user.role)) {
    tabs.push({ id: "approvals", label: "Approvals" });
  }

  if (user.leaveEntitlement || user.role === "principal") {
    tabs.push({ id: "analytics", label: "Analytics" });
    tabs.push({ id: "ai-summary", label: "AI Summary" });
  }

  return tabs;
}

function canSubmitLeave(user) {
  return ["faculty", "hod"].includes(user.role);
}

function getLeavesForApplicant(userId) {
  return appState.leaves
    .filter((leave) => leave.applicantId === userId)
    .sort((a, b) => new Date(b.appliedOn) - new Date(a.appliedOn));
}

function getUserById(userId) {
  return appState.users.find((user) => user.id === userId) || null;
}

function getPendingApprovalsForUser(user) {
  return appState.leaves.filter((leave) => canUserActOnLeave(user, leave));
}

function getDashboardMetrics(user) {
  const counts = getStatusCounts(appState.leaves);
  return {
    totalRequests: appState.leaves.length,
    pendingRequests: counts.pending,
    approvedRequests: counts.approved,
    rejectedRequests: counts.rejected,
    pendingApprovals: getPendingApprovalsForUser(user).length,
    remainingTotal: user.leaveEntitlement
      ? Object.values(getLeaveTypeUsage(user.id)).reduce((sum, row) => sum + row.remaining, 0)
      : 0
  };
}

function getStatusCounts(leaves) {
  return leaves.reduce((counts, leave) => {
    const status = getOverallStatus(leave);
    if (status === "Approved") {
      counts.approved += 1;
    } else if (status === "Rejected") {
      counts.rejected += 1;
    } else {
      counts.pending += 1;
    }
    return counts;
  }, { approved: 0, pending: 0, rejected: 0 });
}

function getOverallStatus(leave) {
  if ([leave.stage1.status, leave.stage2.status, leave.stage3.status].includes("rejected")) {
    return "Rejected";
  }

  if (leave.stage3.status === "approved") {
    return "Approved";
  }

  return "Pending";
}

function getCurrentStageLabel(leave) {
  if (getOverallStatus(leave) === "Rejected") {
    if (leave.stage1.status === "rejected") {
      return "Rejected by HOD";
    }
    if (leave.stage2.status === "rejected") {
      return "Rejected by Admin Office";
    }
    return "Rejected by Principal";
  }

  if (leave.stage1.status === "pending") {
    return "Pending at HOD";
  }
  if (leave.stage2.status === "pending") {
    return "Pending at Admin Office";
  }
  if (leave.stage3.status === "pending") {
    return "Pending at Principal";
  }

  return "Approved";
}

function getTimelineSummary(leave) {
  return [
    `HOD: ${titleCase(leave.stage1.status)}`,
    `Admin: ${titleCase(leave.stage2.status)}`,
    `Principal: ${titleCase(leave.stage3.status)}`
  ].join(" | ");
}

function canUserActOnLeave(user, leave) {
  if (getOverallStatus(leave) !== "Pending") {
    return false;
  }

  if (user.role === "hod") {
    return leave.stage1.status === "pending";
  }
  if (user.role === "admin") {
    return ["approved", "skipped"].includes(leave.stage1.status) && leave.stage2.status === "pending";
  }
  if (user.role === "principal") {
    return leave.stage2.status === "approved" && leave.stage3.status === "pending";
  }

  return false;
}

function getLeaveTypeUsage(userId) {
  const user = getUserById(userId);
  const entitlement = user?.leaveEntitlement || {};
  const leaves = getLeavesForApplicant(userId);
  const usage = {};

  LEAVE_TYPES.forEach((type) => {
    const typeLeaves = leaves.filter((leave) => leave.leaveType === type);
    const approved = typeLeaves.filter((leave) => getOverallStatus(leave) === "Approved").reduce((sum, leave) => sum + leave.days, 0);
    const pending = typeLeaves.filter((leave) => getOverallStatus(leave) === "Pending").reduce((sum, leave) => sum + leave.days, 0);

    usage[type] = {
      entitlement: entitlement[type] || 0,
      approved,
      pending,
      remaining: Math.max((entitlement[type] || 0) - approved, 0)
    };
  });

  return usage;
}

function getBalanceRows(user) {
  const usage = getLeaveTypeUsage(user.id);
  return LEAVE_TYPES.map((type) => ({
    label: type,
    entitlement: usage[type].entitlement,
    approved: usage[type].approved,
    pending: usage[type].pending,
    remaining: usage[type].remaining
  }));
}

function getApplicantAnalytics(userId) {
  const leaves = getLeavesForApplicant(userId);
  const counts = getStatusCounts(leaves);
  return {
    pending: counts.pending,
    approved: counts.approved,
    rejected: counts.rejected,
    approvedDays: getApprovedDaysForUser(userId)
  };
}

function getApprovedDaysForUser(userId) {
  return getLeavesForApplicant(userId)
    .filter((leave) => getOverallStatus(leave) === "Approved")
    .reduce((sum, leave) => sum + leave.days, 0);
}

function canDeleteLeave(leave, user) {
  return leave.applicantId === user.id && getOverallStatus(leave) !== "Approved";
}

function getCurrentRemarks(leave, role) {
  if (role === "hod") {
    return leave.stage1.remarks || "";
  }
  if (role === "admin") {
    return leave.stage2.remarks || "";
  }
  if (role === "principal") {
    return leave.stage3.remarks || "";
  }
  return "";
}

function buildOverviewSummary(user) {
  const metrics = getDashboardMetrics(user);

  if (user.role === "faculty") {
    return `${user.name} currently has ${metrics.pendingRequests} leave request(s) in progress, ${metrics.approvedRequests} fully approved request(s), and ${metrics.remainingTotal} total balance day(s) still available across approved leave categories.`;
  }

  return `${ROLE_LABELS[user.role]} dashboard shows ${metrics.pendingApprovals} request(s) waiting for action, ${metrics.pendingRequests} request(s) still open overall, and ${metrics.approvedRequests} completed approval record(s) visible in the system.`;
}

function buildFacultySummary() {
  const leaves = getLeavesForApplicant(appState.user.id);
  const balanceRows = getBalanceRows(appState.user);
  const totalBalance = balanceRows.reduce((sum, row) => sum + row.remaining, 0);

  if (!leaves.length) {
    return {
      title: `${appState.user.name} Leave Summary`,
      subtitle: "No leave requests have been submitted yet.",
      metrics: [
        { label: "Requests", value: 0 },
        { label: "Approved", value: 0 },
        { label: "Pending", value: 0 },
        { label: "Balance Left", value: totalBalance }
      ],
      highlights: [
        "Your leave register is currently empty.",
        "All current entitlement balances remain untouched."
      ],
      watchItems: [
        "Generate a new leave request whenever formal approval is needed."
      ],
      cards: []
    };
  }

  const counts = getStatusCounts(leaves);
  const latest = leaves[0];
  const lowestBalance = [...balanceRows].sort((a, b) => a.remaining - b.remaining)[0];
  const pendingStages = getPendingStageRows(leaves).filter((row) => row.value > 0);

  return {
    title: `${appState.user.name} Leave Summary`,
    subtitle: `Latest request ${latest.leaveCode} is ${getCurrentStageLabel(latest).toLowerCase()}.`,
    metrics: [
      { label: "Requests", value: leaves.length },
      { label: "Approved", value: counts.approved },
      { label: "Pending", value: counts.pending },
      { label: "Balance Left", value: totalBalance }
    ],
    highlights: [
      `${counts.approved} request(s) are fully approved and ${counts.pending} request(s) are still in progress.`,
      `Latest request ${latest.leaveCode} covers ${formatDisplayDate(latest.startDate)} to ${formatDisplayDate(latest.endDate)} for ${latest.leaveType}.`,
      `${lowestBalance.label} is the tightest balance with ${lowestBalance.remaining} day(s) remaining.`
    ],
    watchItems: [
      pendingStages.length
        ? `Current pending stages: ${pendingStages.map((row) => `${row.label} ${row.value}`).join(", ")}.`
        : "No request is currently pending at any approval stage.",
      counts.rejected
        ? `${counts.rejected} request(s) were rejected and may need follow-up or reapplication.`
        : "No rejected requests are affecting your current leave position."
    ],
    cards: [
      {
        title: "Latest Request",
        subtitle: latest.leaveCode,
        lines: [
          `Status: ${getOverallStatus(latest)}`,
          `Substitute: ${latest.substituteTeacher}`,
          `Reason: ${shortenText(latest.reason, 92)}`
        ]
      },
      {
        title: "Balance Watch",
        subtitle: lowestBalance.label,
        lines: [
          `Remaining: ${lowestBalance.remaining} of ${lowestBalance.entitlement} day(s)`,
          `Approved used: ${lowestBalance.approved} day(s)`,
          `Pending booked: ${lowestBalance.pending} day(s)`
        ]
      }
    ]
  };
}

function getManagementSummaryPlaceholder(user) {
  if (user.role === "hod") {
    return `Generate a department summary for faculty leave records in the ${user.department} department.`;
  }

  if (user.role === "admin") {
    return "Generate a faculty leave summary across departments with the current approval and usage patterns.";
  }

  return "Generate a faculty leave summary with department-level patterns, faculty usage, and pending institutional decisions.";
}

function getManagementSummaryScope(user) {
  if (user.role === "hod") {
    return {
      label: `${user.department} department`,
      leaves: appState.leaves.filter((leave) => leave.applicantRole === "faculty" && leave.department === user.department),
      faculty: appState.users.filter((member) => member.role === "faculty" && member.department === user.department)
    };
  }

  if (user.role === "principal" && appState.principalDepartment !== "All Departments") {
    return {
      label: `${appState.principalDepartment} department`,
      leaves: appState.leaves.filter((leave) => leave.applicantRole === "faculty" && leave.department === appState.principalDepartment),
      faculty: appState.users.filter((member) => member.role === "faculty" && member.department === appState.principalDepartment)
    };
  }

  return {
    label: "all departments",
    leaves: appState.leaves.filter((leave) => leave.applicantRole === "faculty"),
    faculty: appState.users.filter((member) => member.role === "faculty")
  };
}

function buildManagementSummary() {
  const scope = getManagementSummaryScope(appState.user);
  const { leaves, faculty, label } = scope;

  if (!leaves.length) {
    return {
      title: `${ROLE_LABELS[appState.user.role]} Faculty Summary`,
      subtitle: `No faculty leave records are visible for ${label} at the moment.`,
      metrics: [
        { label: "Faculty Visible", value: faculty.length },
        { label: "Requests", value: 0 },
        { label: "Approved", value: 0 },
        { label: "Pending", value: 0 }
      ],
      highlights: [
        `No faculty leave requests are currently available in ${label}.`
      ],
      watchItems: [
        "Once faculty requests are submitted in this scope, the summary will show department patterns and pending workflow load."
      ],
      cards: []
    };
  }

  const counts = getStatusCounts(leaves);
  const facultyHighlights = faculty
    .map((member) => {
      const memberLeaves = leaves.filter((leave) => leave.applicantId === member.id);
      if (!memberLeaves.length) {
        return null;
      }

      const latestLeave = [...memberLeaves].sort((a, b) => new Date(b.appliedOn) - new Date(a.appliedOn))[0];
      const approvedDays = memberLeaves
        .filter((leave) => getOverallStatus(leave) === "Approved")
        .reduce((sum, leave) => sum + leave.days, 0);

      return {
        name: member.name,
        department: member.department,
        requests: memberLeaves.length,
        approvedDays,
        latestReason: latestLeave.reason
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.approvedDays !== a.approvedDays) {
        return b.approvedDays - a.approvedDays;
      }
      return b.requests - a.requests;
    })
    .slice(0, 3);

  const pendingAtHod = leaves.filter((leave) => leave.stage1.status === "pending").length;
  const pendingAtAdmin = leaves.filter((leave) => ["approved", "skipped"].includes(leave.stage1.status) && leave.stage2.status === "pending").length;
  const pendingAtPrincipal = leaves.filter((leave) => leave.stage2.status === "approved" && leave.stage3.status === "pending").length;
  const departmentMix = getDepartmentSummarySnippet(leaves);

  return {
    title: `${ROLE_LABELS[appState.user.role]} Faculty Summary`,
    subtitle: `Scope: ${label}. ${leaves.length} faculty leave request(s) across ${faculty.length} faculty member(s).`,
    metrics: [
      { label: "Faculty Visible", value: faculty.length },
      { label: "Requests", value: leaves.length },
      { label: "Approved", value: counts.approved },
      { label: "Pending", value: counts.pending }
    ],
    highlights: [
      `${counts.approved} request(s) are fully approved, ${counts.pending} remain in progress, and ${counts.rejected} were rejected.`,
      departmentMix || "Request activity is currently concentrated in the visible scope.",
      `Pending workflow load stands at HOD ${pendingAtHod}, Admin Office ${pendingAtAdmin}, and Principal ${pendingAtPrincipal}.`
    ],
    watchItems: facultyHighlights.length
      ? facultyHighlights.map((entry) => `${entry.name} (${entry.department}) has ${entry.requests} request(s), ${entry.approvedDays} approved day(s), latest reason: ${shortenText(entry.latestReason, 90)}.`)
      : ["No individual faculty highlight is available yet."],
    cards: facultyHighlights.map((entry) => ({
      title: entry.name,
      subtitle: entry.department,
      lines: [
        `Requests: ${entry.requests}`,
        `Approved days: ${entry.approvedDays}`,
        `Latest reason: ${shortenText(entry.latestReason, 88)}`
      ]
    }))
  };
}

function getDepartmentSummarySnippet(leaves) {
  const departmentCounts = Object.entries(
    leaves.reduce((summary, leave) => {
      summary[leave.department] = (summary[leave.department] || 0) + 1;
      return summary;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  if (!departmentCounts.length) {
    return "";
  }

  if (departmentCounts.length === 1) {
    return `${departmentCounts[0][0]} contributes ${departmentCounts[0][1]} request(s).`;
  }

  return `${departmentCounts[0][0]} contributes ${departmentCounts[0][1]} request(s), followed by ${departmentCounts[1][0]} with ${departmentCounts[1][1]} request(s).`;
}

function shortenText(text, limit) {
  const value = String(text || "").trim();
  if (value.length <= limit) {
    return value;
  }
  return `${value.slice(0, Math.max(limit - 3, 0)).trim()}...`;
}

function sortApprovalLeaves(left, right) {
  const leftAction = canUserActOnLeave(appState.user, left) ? 1 : 0;
  const rightAction = canUserActOnLeave(appState.user, right) ? 1 : 0;

  if (rightAction !== leftAction) {
    return rightAction - leftAction;
  }

  const statusRank = { Pending: 0, Approved: 1, Rejected: 2 };
  const statusDifference = statusRank[getOverallStatus(left)] - statusRank[getOverallStatus(right)];
  if (statusDifference !== 0) {
    return statusDifference;
  }

  return new Date(right.lastUpdated) - new Date(left.lastUpdated);
}

function getPendingStageRows(leaves) {
  const rows = [
    {
      label: "Pending at HOD",
      value: leaves.filter((leave) => leave.stage1.status === "pending").length,
      variant: ""
    },
    {
      label: "Pending at Admin",
      value: leaves.filter((leave) => ["approved", "skipped"].includes(leave.stage1.status) && leave.stage2.status === "pending").length,
      variant: "success"
    },
    {
      label: "Pending at Principal",
      value: leaves.filter((leave) => leave.stage2.status === "approved" && leave.stage3.status === "pending").length,
      variant: ""
    }
  ];

  const max = Math.max(...rows.map((row) => row.value), 1);
  return rows.map((row) => ({ ...row, max }));
}

function getMonthlyTrendRows(leaves, count = 6) {
  const formatter = new Intl.DateTimeFormat("en-IN", { month: "short" });
  const months = [];
  const current = new Date();

  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(current.getFullYear(), current.getMonth() - index, 1);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    months.push({
      key,
      label: `${formatter.format(date)} ${String(date.getFullYear()).slice(-2)}`,
      approved: 0,
      pending: 0,
      rejected: 0,
      total: 0
    });
  }

  const monthMap = Object.fromEntries(months.map((month) => [month.key, month]));

  leaves.forEach((leave) => {
    const date = new Date(leave.appliedOn);
    if (Number.isNaN(date.getTime())) {
      return;
    }

    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (!monthMap[key]) {
      return;
    }

    const status = getOverallStatus(leave).toLowerCase();
    monthMap[key].total += 1;
    if (status === "approved") {
      monthMap[key].approved += 1;
    } else if (status === "rejected") {
      monthMap[key].rejected += 1;
    } else {
      monthMap[key].pending += 1;
    }
  });

  return months;
}

function getLeaveTypeStatusRows(leaves) {
  return LEAVE_TYPES.map((type) => {
    const counts = getStatusCounts(leaves.filter((leave) => leave.leaveType === type));
    return {
      label: type,
      approved: counts.approved,
      pending: counts.pending,
      rejected: counts.rejected
    };
  }).filter((row) => row.approved + row.pending + row.rejected > 0);
}

function getDepartmentStatusRows(leaves) {
  return Object.entries(leaves.reduce((summary, leave) => {
    if (!summary[leave.department]) {
      summary[leave.department] = { label: leave.department, approved: 0, pending: 0, rejected: 0 };
    }

    const status = getOverallStatus(leave);
    if (status === "Approved") {
      summary[leave.department].approved += 1;
    } else if (status === "Rejected") {
      summary[leave.department].rejected += 1;
    } else {
      summary[leave.department].pending += 1;
    }

    return summary;
  }, {}))
    .map(([, row]) => row)
    .sort((left, right) => (right.approved + right.pending + right.rejected) - (left.approved + left.pending + left.rejected));
}

function getFacultyStatusRows(leaves, faculty) {
  return faculty.map((member) => {
    const counts = getStatusCounts(leaves.filter((leave) => leave.applicantId === member.id));
    return {
      label: member.name,
      approved: counts.approved,
      pending: counts.pending,
      rejected: counts.rejected
    };
  })
    .filter((row) => row.approved + row.pending + row.rejected > 0)
    .sort((left, right) => (right.approved + right.pending + right.rejected) - (left.approved + left.pending + left.rejected));
}

async function readOptionalProofFile(file) {
  if (!(file instanceof File) || !file.size) {
    return null;
  }

  const mimeType = normalizeProofMimeType(file);
  if (!PROOF_ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error("Proof must be a PDF, DOC, DOCX, JPG, PNG, or WEBP file.");
  }

  if (file.size > MAX_PROOF_SIZE_BYTES) {
    throw new Error("Proof file must be 2.5 MB or smaller.");
  }

  const dataUrl = await readFileAsDataUrl(file);
  return {
    fileName: file.name,
    mimeType,
    dataUrl,
    size: file.size
  };
}

function normalizeProofMimeType(file) {
  const rawType = String(file.type || "").toLowerCase();
  if (rawType === "image/jpg") {
    return "image/jpeg";
  }
  if (PROOF_ALLOWED_MIME_TYPES.includes(rawType)) {
    return rawType;
  }

  const extension = String(file.name || "").split(".").pop()?.toLowerCase();
  const extensionMap = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp"
  };

  return extensionMap[extension] || rawType;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("The proof file could not be read. Please try again."));
    reader.readAsDataURL(file);
  });
}

function openProofAttachment(proof) {
  const link = document.createElement("a");
  link.href = proof.dataUrl;
  link.target = "_blank";
  link.rel = "noopener";
  link.download = proof.fileName || "leave-proof";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function getProofTypeLabel(mimeType) {
  const labels = {
    "application/pdf": "PDF Document",
    "application/msword": "Word Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
    "image/jpeg": "Image File",
    "image/png": "Image File",
    "image/webp": "Image File"
  };

  return labels[mimeType] || "Attached File";
}

function formatBytes(size) {
  const numericSize = Number(size || 0);
  if (numericSize >= 1024 * 1024) {
    return `${(numericSize / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (numericSize >= 1024) {
    return `${Math.round(numericSize / 1024)} KB`;
  }
  return `${numericSize} B`;
}

function downloadCertificate(leave) {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Leave Sanction Certificate ${leave.leaveCode}</title>
      <style>
        body {
          margin: 0;
          padding: 32px;
          background: #f6f2ea;
          font-family: Georgia, "Times New Roman", serif;
          color: #1f2a3b;
        }
        .certificate {
          max-width: 940px;
          margin: 0 auto;
          background: #fff;
          border: 10px solid #243b64;
          padding: 44px;
          box-shadow: 0 18px 40px rgba(31, 42, 59, 0.12);
        }
        h1, p {
          margin: 0;
        }
        .top {
          text-align: center;
          margin-bottom: 30px;
        }
        .top h1 {
          font-size: 34px;
          margin-bottom: 8px;
        }
        .top p {
          font-family: "Segoe UI", Calibri, sans-serif;
          color: #5b6878;
        }
        .body {
          font-size: 18px;
          line-height: 1.8;
          margin-bottom: 28px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        td {
          border: 1px solid rgba(31, 42, 59, 0.12);
          padding: 12px;
          font-family: "Segoe UI", Calibri, sans-serif;
        }
      </style>
    </head>
    <body>
      <div class="certificate">
        <div class="top">
          <h1>Leave Sanction Certificate</h1>
          <p>Certificate No: ${escapeHtml(leave.certificateNo || leave.leaveCode)}</p>
          <p>College Faculty Leave Management System</p>
        </div>
        <div class="body">
          This is to certify that <strong>${escapeHtml(leave.applicantName)}</strong>, ${escapeHtml(leave.designation)},
          ${escapeHtml(leave.department)}, has been granted <strong>${escapeHtml(leave.leaveType)}</strong> for
          <strong>${leave.days}</strong> day(s), from <strong>${formatDisplayDate(leave.startDate)}</strong> to
          <strong>${formatDisplayDate(leave.endDate)}</strong>, after successful completion of the institutional approval process.
        </div>
        <table>
          <tr><td><strong>Leave ID</strong></td><td>${escapeHtml(leave.leaveCode)}</td></tr>
          <tr><td><strong>Substitute Teacher</strong></td><td>${escapeHtml(leave.substituteTeacher)}</td></tr>
          <tr><td><strong>Proof Attached</strong></td><td>${leave.proof ? escapeHtml(leave.proof.fileName) : "Not attached"}</td></tr>
          <tr><td><strong>Reason</strong></td><td>${escapeHtml(leave.reason)}</td></tr>
          <tr><td><strong>HOD Status</strong></td><td>${escapeHtml(titleCase(leave.stage1.status))}</td></tr>
          <tr><td><strong>Admin Office Status</strong></td><td>${escapeHtml(titleCase(leave.stage2.status))}</td></tr>
          <tr><td><strong>Principal Status</strong></td><td>${escapeHtml(titleCase(leave.stage3.status))}</td></tr>
          <tr><td><strong>Issue Date</strong></td><td>${formatDisplayDate(new Date().toISOString().slice(0, 10))}</td></tr>
        </table>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${leave.leaveCode}-certificate.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatDisplayDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function titleCase(value) {
  if (!value) {
    return "";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
