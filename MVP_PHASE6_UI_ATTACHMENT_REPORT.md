# MVP Phase 6 Report — Attachment URL UI

## Summary ✅
This phase updates the Student submission UI so tasks that require attachments (URL-based) show a required `Attachment URL` field with contextual help, and the backend is seeded to mark demo tasks requiring attachments.

## Files changed 🔧
- **frontend/src/pages/student/StudentTaskSubmitPage.tsx**
  - Show `Attachment URL` as required when `task.metadata.requires_attachment === true`.
  - Use `task.metadata.attachment_hint` for help text when present (fallback to existing message).
  - Input uses `required` attribute and includes an asterisk marker in the label when required.
- **backend/database/seeders/TaskSeeder.php**
  - For demo tasks (`beginner-frontend-1`, `intermediate-frontend-1`) set:
    - `metadata.requires_attachment = true`
    - `metadata.attachment_type = 'url'`
    - `metadata.attachment_hint = 'Public GitHub repo or downloadable zip link'`
- **backend/tests/Feature/Learning/TaskSubmissionTest.php**
  - Added `test_requires_attachment_allows_submission_when_attachment_provided()` asserting that providing `attachment_url` creates a submission and queues an evaluation.

## UI visibility rules / screenshot notes 🖼️
- When `task.metadata.requires_attachment === true`:
  - The form shows a labeled input: **Attachment URL*** (red asterisk)
  - Help text below the field uses `task.metadata.attachment_hint` when present (e.g., "Public GitHub repo or downloadable zip link")
  - The field is marked required and client-side validation prevents submit with an empty `attachment_url` (error message: "Attachment is required for this task.")
- When `requires_attachment` is false or absent:
  - The field shows as **Attachment URL (optional)** with the previous help text: "Must start with https:// if provided."

## Example submit request (attachment required)

POST /api/student/tasks/12/submit

```json
{
  "answer_text": "My solution here",
  "attachment_url": "https://github.com/my/repo/archive/main.zip"
}
```

## Commands & outputs (captured)

### Backend: TaskSubmissionTest

```
PASS  Tests\Feature\Learning\TaskSubmissionTest
  ✓ student can submit task                                               7.83s
  ✓ requires attachment validation                                        0.04s
  ✓ get submission returns semantic status and user message               0.08s
  ✓ requires attachment allows submission when attachment provided        0.06s

Tests:    4 passed (23 assertions)
Duration: 8.33s
```

### Frontend: build

```
vite v7.3.0 building client environment for production...
✓ 53 modules transformed.
public/build/manifest.json             0.33 kB │ gzip:  0.17 kB
public/build/assets/app-ClSZl8Cv.css  39.28 kB │ gzip:  9.35 kB
public/build/assets/app-CAiCLEjY.js   36.35 kB │ gzip: 14.71 kB
✓ built in 2.07s
```

---

If you want, I can also:
- Add a small visual indicator on the task list showing which tasks require attachments, or
- Add an explanatory tooltip to the submit form explaining why attachments are required for certain tasks.

Which would you prefer next? 🎯