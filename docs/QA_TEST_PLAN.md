# QA Test Plan — Centro de Comando Ministerial

**Tester:** Vicent
**Environment:** Production — <https://hoclaespa.com/>
**Prepared:** August 2026

---

## 1. Purpose and scope

End-to-end acceptance testing of the ministerial document management system
before handover. The system digitises the paper lifecycle of ministerial
correspondence: mail arrives, is stamped and registered, scanned, routed
("decreed") by the Minister, answered, signed, acknowledged and archived.

Test the system **as the ministry will use it** — in Spanish, in a browser.
API-level testing is optional and noted where useful.

### Build identification

Every bug report must state which build you tested. Get it from the browser:

1. Open <https://hoclaespa.com/>
2. Press `F12` → **Network** → reload the page
3. Find the file named `index-XXXXXXXX-<digits>.js`

Report that filename. Builds change during the test window, and a bug fixed in
one build will still reproduce on an older cached one. Hard-reload with
`Ctrl+Shift+R` before starting a session.

---

## 2. Credentials

**Login details are delivered separately — they are deliberately not in this
document.**

Four accounts exist, one per role:

| Role | Email | Represents |
|---|---|---|
| `ADMIN` | admin@mttsia.gob.gq | The Minister — full access **and the only account that can sign** |
| `GABINETE` | gabinete@mttsia.gob.gq | Cabinet staff — create and route documents |
| `REVISOR` | revisor@mttsia.gob.gq | Reviewer — edit and progress documents |
| `LECTOR` | lector@mttsia.gob.gq | Read only |

Ask Elliot for the passwords through a private channel. Please do not paste them
into group chats, screenshots, or bug reports.

If you need an extra account, register one at `/register` — self-registration
always produces a **LECTOR** account by design.

---

## 3. Known limitations — do NOT raise these as bugs

These are configuration decisions, not defects.

| Area | Status | Effect |
|---|---|---|
| **AI features** | Disabled (no OpenAI key) | AI summaries, AI document generation, the virtual assistant, article generation, translation and multimedia transcription will fail or return nothing. **Out of scope.** |
| **Email notifications** | No SMTP configured | No email for assignments, deadlines or signature requests. In-app notifications still work. **Out of scope.** |
| **WhatsApp bot** | Not connected | The WhatsApp page shows a disconnected state / QR prompt. **Out of scope.** |
| **File storage** | Local disk on the server | Files upload and download normally; cloud storage is not in use. |
| **Backups** | Not configured | Assume anything you enter may be wiped. Do not store anything you need to keep. |
| **HTTPS on the raw IP** | Not covered by the certificate | Always test via `https://hoclaespa.com`, never the IP address. |

**Report anything else.**

---

## 4. Starting data

The database is seeded but has **no documents yet** — you will create them.

| Data | Count |
|---|---|
| Users | 4 |
| Departments | 68 (real structure: 33 ministries, 24 secretaries of state) |
| Entities | 43 |
| Templates | 3 |
| Documents | 0 |
| Expedientes | 0 |

---

## 5. Roles and permissions

Verified against the source code. Test each row from an account that **should be
denied** as well as one that should be allowed — a permission that is too
permissive is a high-severity bug in a government system.

| Action | ADMIN | GABINETE | REVISOR | LECTOR |
|---|---|---|---|---|
| View documents, inbox, outbox, search | ✅ | ✅ | ✅ | ✅ |
| Create document | ✅ | ✅ | ❌ | ❌ |
| Edit document / change status / change stage | ✅ | ✅ | ✅ | ❌ |
| Decree (route) a document | ✅ | ✅ | ❌ | ❌ |
| Assign a document | ✅ | ✅ | ✅ | ❌ |
| Manual entry stamp / acknowledgment | ✅ | ✅ | ✅ | ❌ |
| **Sign a document** | ✅ | ❌ *(see note)* | ❌ | ❌ |
| Permanently delete a document | ✅ | ❌ | ❌ | ❌ |
| Create / delete / activate users | ✅ | ❌ | ❌ | ❌ |
| Edit users | ✅ | ✅ | ❌ | ❌ |
| View flagged files / security stats | ✅ | ✅ | ❌ | ❌ |

> **Note on signing.** A `GABINETE` user passes the endpoint's role check but is
> then rejected by the Minister validation, with a message along the lines of
> *"Solo el Ministro puede firmar documentos"*. That rejection is **correct
> behaviour** — please confirm it happens. If a GABINETE user ever completes a
> signature, that is a **Critical** bug.

---

## 6. Test suites

Priority: **P1** = blocks handover · **P2** = important · **P3** = polish.

### TS-01 · Authentication and session

| ID | Steps | Expected | P |
|---|---|---|---|
| 01-01 | Log in with each of the 4 accounts | All succeed, land on the dashboard, name and role shown | P1 |
| 01-02 | Log in with a wrong password | Clear error in Spanish, no login, no stack trace | P1 |
| 01-03 | Log in with an unknown email | Same generic error as 01-02 — must not reveal whether the account exists | P2 |
| 01-04 | Log in, then reload the page | Still logged in | P1 |
| 01-05 | Log out, then press the browser Back button | Not logged in; redirected to login | P1 |
| 01-06 | Open `/dashboard` in a private window without logging in | Redirected to login; no data visible | P1 |
| 01-07 | Register a new account at `/register` | Succeeds; new account is **LECTOR**; no role selector is offered | P1 |
| 01-08 | Register with an email that already exists | Clear error; no duplicate account | P2 |
| 01-09 | Register with a password under 8 characters | Rejected with a clear message | P2 |
| 01-10 | Change your password in Settings, log out, log back in with the new one | Works; the old password is rejected | P1 |
| 01-11 | Stay logged in and idle ~20 minutes, then perform an action | Session still valid (the token refreshes silently) | P2 |

### TS-02 · Access control

| ID | Steps | Expected | P |
|---|---|---|---|
| 02-01 | As LECTOR, try to create a document | Blocked — button hidden/disabled, or a clear permission error | P1 |
| 02-02 | As LECTOR, open a document | Can read; cannot edit, decree, assign or delete | P1 |
| 02-03 | As REVISOR, try to create a document | Blocked (REVISOR may edit but not create) | P1 |
| 02-04 | As REVISOR or LECTOR, open `/users` | Blocked, or read-only with no create/delete | P1 |
| 02-05 | As GABINETE, attempt to sign a document | Rejected with the Minister-only message | P1 |
| 02-06 | As ADMIN, perform every action above | All permitted | P1 |
| 02-07 | As LECTOR, edit the URL to an admin page such as `/admin/security` | Blocked or empty — no admin data leaks | P1 |

### TS-03 · Incoming document lifecycle — the core flow

The most important suite. Run it end to end at least once.

| ID | Steps | Expected | P |
|---|---|---|---|
| 03-01 | As GABINETE, create an incoming document: title, type, entity, responsible, priority | Saved; appears in Inbox; receives a correlative number | P1 |
| 03-02 | Create several and compare correlative numbers | Sequential and unique; no duplicates | P1 |
| 03-03 | Apply the manual entry stamp with a date and time | Recorded and visible on the document | P1 |
| 03-04 | Attach a scanned PDF | Uploads; appears in the file list; size shown correctly (not `NaN` or `undefined`) | P1 |
| 03-05 | As ADMIN, decree the document to one or more departments, with a note | Routed; the decree note is saved and visible | P1 |
| 03-06 | Check the department list in the decree dialog | All 68 departments selectable and searchable | P2 |
| 03-07 | Assign the document to a user | Assignment saved; the assignee sees it under their documents | P1 |
| 03-08 | Advance the document through each workflow stage | Each stage records who completed it and when; the timeline updates | P1 |
| 03-09 | Try to skip a stage | Either blocked or requires a reason — never skipped silently | P2 |
| 03-10 | Record an acknowledgment of receipt (MANUAL / STAMP / DIGITAL) | Saved with date and type | P2 |
| 03-11 | Archive the document | Moves to Archive; no longer in the active inbox | P1 |
| 03-12 | Review the audit trail for the whole document | Every action above listed with user and timestamp | P1 |

### TS-04 · Outgoing documents

| ID | Steps | Expected | P |
|---|---|---|---|
| 04-01 | Create an outgoing document | Appears in Outbox, not Inbox | P1 |
| 04-02 | Mark it as requiring a response, with a deadline | Deadline recorded and shown | P2 |
| 04-03 | Record the response as received | Status updates; reminders stop | P2 |
| 04-04 | Generate the official PDF | Downloads; header, correlative number, department and signature block correct | P1 |
| 04-05 | Generate the Word version | Downloads and opens in Word without corruption | P2 |
| 04-06 | Compare the PDF against a real ministry document | Layout matches the physical format | P2 |

### TS-05 · Files, QR codes and the public view

| ID | Steps | Expected | P |
|---|---|---|---|
| 05-01 | Upload PDF, DOCX, JPG and PNG | All accepted | P1 |
| 05-02 | Upload a file over 50 MB | Rejected with a clear message — not a crash or a silent failure | P1 |
| 05-03 | Upload a disallowed type such as `.exe` | Rejected | P1 |
| 05-04 | Upload more than 10 files to one document | Rejected with a "máximo 10 archivos" message | P2 |
| 05-05 | Download an uploaded file | Downloads intact, opens correctly, correct filename | P1 |
| 05-06 | Replace a file, then open version history | Both versions listed with uploader and date; older version downloadable | P2 |
| 05-07 | Restore a previous version | Restores correctly | P2 |
| 05-08 | Convert a DOCX to PDF | Produces a readable PDF | P2 |
| 05-09 | Open a document's QR code and scan it with a phone | Opens the **public** document page on `hoclaespa.com` | P1 |
| 05-10 | On the public page **while logged out**, review what is visible | Title, correlative number, type, status, entity, responsible name and files. **Must NOT show** the Minister's decree note, AI analysis, internal comments or staff email addresses | P1 |
| 05-11 | On the public page, open an attached file | Opens | P2 |

### TS-06 · Expedientes (case files)

| ID | Steps | Expected | P |
|---|---|---|---|
| 06-01 | Create an expediente | Saved with a unique code | P1 |
| 06-02 | Link several documents to it | All appear under the expediente | P1 |
| 06-03 | Open the expediente detail view | Documents, deadlines and status shown | P1 |
| 06-04 | Close the expediente | Status changes; closing date recorded | P2 |
| 06-05 | Filter expedientes by status and priority | Filters work and combine | P2 |

### TS-07 · Deadlines

| ID | Steps | Expected | P |
|---|---|---|---|
| 07-01 | Create a deadline on a document | Saved and listed | P1 |
| 07-02 | Create one in **business hours** mode | Due date skips weekends and falls inside 08:00–18:00 | P1 |
| 07-03 | Create one in **calendar days** mode | Counts every day | P2 |
| 07-04 | Create one spanning an Equatorial Guinea public holiday | Holiday excluded in business-hours mode | P2 |
| 07-05 | Check times shown across the app | All in Africa/Malabo time, consistent everywhere | P1 |
| 07-06 | Complete a deadline | Marked complete; no longer pending | P1 |
| 07-07 | Set a deadline in the past | Shows as overdue and is visually distinct | P2 |

### TS-08 · Signature protocol

| ID | Steps | Expected | P |
|---|---|---|---|
| 08-01 | As ADMIN, sign a document at the signature stage | Signature recorded with date and signer | P1 |
| 08-02 | As GABINETE, try to sign | Rejected — Minister-only message | P1 |
| 08-03 | As REVISOR or LECTOR, try to sign | Rejected | P1 |
| 08-04 | Try to sign a document that is **not** at the signature stage | Rejected with a clear explanation | P2 |
| 08-05 | Work through the 8 protocol steps, preparation to completion | Each step recorded in order | P2 |
| 08-06 | Upload a scanned seal image | Saved and displayed | P2 |
| 08-07 | Open the signed document's PDF | Signature and seal appear correctly | P1 |
| 08-08 | Verify a signature through the verification view | Reports a valid signature | P2 |

### TS-09 · Search, filters and lists

| ID | Steps | Expected | P |
|---|---|---|---|
| 09-01 | Search by a word in the title | Matching documents returned | P1 |
| 09-02 | Search by correlative number | Exact document found | P1 |
| 09-03 | Search using Spanish accents (á é í ó ú ñ) | Works, including unaccented spellings | P1 |
| 09-04 | Search with punctuation: `test & doc`, `(oficio)`, `100%`, `a!b` | Returns results or "no results" — **must never** show an error or a blank page | P1 |
| 09-05 | Search a term with no matches | Friendly "no results" message | P2 |
| 09-06 | Combine filters: status + entity + priority + classification | Filters combine correctly | P2 |
| 09-07 | Page through a list of 25+ documents | Pagination correct; no repeated or missing rows | P1 |
| 09-08 | Sort a list by each sortable column | Correct in both directions | P3 |

### TS-10 · Administration

| ID | Steps | Expected | P |
|---|---|---|---|
| 10-01 | As ADMIN, create a user for each role | Created; each can log in with that role's permissions | P1 |
| 10-02 | Change a user's role | Takes effect on their next login | P1 |
| 10-03 | Deactivate a user, then try to log in as them | Refused ("Usuario inactivo") | P1 |
| 10-04 | Browse the department hierarchy | 68 departments; parent/child structure correct | P2 |
| 10-05 | Create, edit and deactivate an entity | Works; entity available when creating documents | P2 |
| 10-06 | Open the audit log; filter by user, action and date | Entries present; filters work | P1 |
| 10-07 | Confirm the audit log recorded a login and a document change you just made | Both present, correct user and timestamp | P1 |
| 10-08 | Export the audit log, if offered | Export downloads and opens | P3 |

### TS-11 · Notifications and real time

| ID | Steps | Expected | P |
|---|---|---|---|
| 11-01 | Assign a document to another user, then log in as them | In-app notification received | P1 |
| 11-02 | With two browsers open as two users, decree a document | The other user sees it without a manual refresh | P2 |
| 11-03 | Mark notifications read, and read-all | Count updates and stays correct after reload | P2 |
| 11-04 | Mute notifications | Respected | P3 |

### TS-12 · Agenda

| ID | Steps | Expected | P |
|---|---|---|---|
| 12-01 | Create each event type: trip, visit, meeting, invitation, conference, ceremony | All save and display | P2 |
| 12-02 | Edit and cancel an event | Status updates | P2 |
| 12-03 | Check upcoming events on the dashboard | Correct events, correct order | P3 |

### TS-13 · Interface, language and devices

| ID | Steps | Expected | P |
|---|---|---|---|
| 13-01 | Walk every page with DevTools **Console** open | **No red errors.** Any error is a bug — attach the full text | P1 |
| 13-02 | Check every screen is in Spanish | No English or untranslated placeholder text | P2 |
| 13-03 | Test on a phone in portrait | Usable: no horizontal scrolling, nothing cut off, menus reachable | P2 |
| 13-04 | Test on a tablet and a small laptop | Layout adapts | P3 |
| 13-05 | Test in Chrome, Firefox and Edge | Consistent behaviour | P2 |
| 13-06 | Open every dropdown on every form, including when a list is empty | Opens and closes cleanly; **no blank page**, no console error | P1 |
| 13-07 | Submit each form with required fields empty | Clear validation messages; nothing saved | P1 |
| 13-08 | Enter 500+ characters in title fields | Handled gracefully — no layout break, no crash | P3 |
| 13-09 | Double-click submit buttons | No duplicate records created | P2 |

### TS-14 · Security checks

These protect ministerial records. Any failure here is **Critical**.

| ID | Steps | Expected | P |
|---|---|---|---|
| 14-01 | Register a new account and inspect its role | **LECTOR**. If any other role can be obtained by self-registration, stop and report immediately | P1 |
| 14-02 | Log out and open a protected URL directly, e.g. `/inbox` | Redirected to login; no ministry data visible | P1 |
| 14-03 | Log out and open the public document page | Only the limited public fields listed in 05-10 | P1 |
| 14-04 | Log out and open `https://hoclaespa.com/api/docs` | **404** — API documentation must not be public | P1 |
| 14-05 | Open `http://hoclaespa.com` without the S | Redirects to `https://` | P1 |
| 14-06 | Check the padlock in the address bar | Valid certificate for `hoclaespa.com` | P1 |
| 14-07 | As LECTOR, open an ADMIN-only URL copied from another session | Blocked | P1 |
| 14-08 | Log in as two different users in two browsers | Neither sees the other's session or data | P1 |

### TS-15 · Regression — recently fixed defects

Fixed during the final week. Please confirm each is genuinely gone.

| ID | What used to happen | Expected now | P |
|---|---|---|---|
| 15-01 | Selecting a department on `/register` crashed to a **blank page**, with `NotFoundError: removeChild` in the console | Selection works; no blank page; no console error | P1 |
| 15-02 | The department dropdown appeared empty | 68 departments listed. If empty, open DevTools → Network → `departments` and report the status code | P1 |
| 15-03 | A failed department load looked identical to "no departments exist" | A failed load now states the reason | P2 |
| 15-04 | A crash anywhere blanked the whole application | An error screen appears offering "Recargar página" and "Ir al inicio" | P1 |
| 15-05 | Anyone could self-register as ADMIN | Registration always yields LECTOR — see 14-01 | P1 |
| 15-06 | Document search errored on punctuation | See 09-04 | P1 |
| 15-07 | The public QR page exposed internal notes | See 05-10 | P1 |
| 15-08 | File sizes displayed as `NaN` or `undefined` | Correct sizes in KB/MB | P2 |

---

## 7. Reporting bugs

One bug per report. Please use this format:

```
ID:        BUG-001
Title:     [one line: what is wrong, and where]
Severity:  Critical | High | Medium | Low
Test case: e.g. TS-03 / 03-05
Build:     index-XXXXXXXX-1787109438892.js
Browser:   Chrome 128 / Windows 11
Account:   role used (never the password)

Steps to reproduce
1.
2.
3.

Expected
Actual

Console errors  (F12 → Console → copy the red text in full)
Screenshot or screen recording
```

### Severity

| Level | Meaning | Examples |
|---|---|---|
| **Critical** | Data loss, a security hole, or the system is unusable | A non-Minister signs a document; role escalation; documents disappear; login broken |
| **High** | A core task cannot be completed and there is no workaround | Cannot create a document; uploads always fail; blank page on a main screen |
| **Medium** | The task is possible but behaves incorrectly or awkwardly | Wrong sort order; a filter ignored; confusing error text |
| **Low** | Cosmetic | Misaligned button; typo; inconsistent spacing |

**Report Critical findings immediately** rather than saving them for the final
report.

### Always include the console

Press `F12` → **Console**. Red text is a real defect even when the screen looks
fine — the blank-page bug in 15-01 announced itself there first. Copy it in
full, including file names and line numbers.

---

## 8. Suggested order

| Day | Focus |
|---|---|
| 1 | TS-01, TS-02, TS-14 — get in, confirm permissions hold |
| 2 | TS-03 end to end, then TS-04 |
| 3 | TS-05, TS-08 — files, QR codes, signing |
| 4 | TS-06, TS-07, TS-09 — cases, deadlines, search |
| 5 | TS-10, TS-11, TS-12 |
| 6 | TS-13, TS-15 — interface sweep and regressions |
| 7 | Re-test fixed bugs; write the summary |

---

## 9. Sign-off

Handover is recommended when:

- [ ] Every **P1** case has been executed
- [ ] No open **Critical** or **High** defects
- [ ] TS-14 fully passed
- [ ] TS-15 fully passed
- [ ] TS-03 completed end to end at least once
- [ ] All Medium and Low defects logged, with severity agreed
- [ ] The final report states what was tested, what passed, what failed, and what was out of scope

Anything listed in §3 (Known limitations) is excluded from sign-off and must
appear in the final report as **not tested** — not as passed.
