# Admin Inbox Runtime Verification Checklist

Use this checklist in a real browser session to verify admin reply behavior for both inbox channels:

- `Respon Pesan Publik` (`Inbox Publik`)
- `Pesan dari Siswa` (`Inbox Siswa`)

Run the same flow once in each inbox unless a step is marked as shared-only.

## Preconditions

- Admin session is already logged in.
- Browser DevTools can be opened for `Offline` and `Slow 3G` network simulation.
- At least one test thread exists in each inbox:
  - Public inbox: create it from the public contact form.
  - Student inbox: create it from a logged-in student account by opening a message thread.
- Keep one small supported file ready, such as `test.pdf` or `test.png`, under `2.5 MB`.

## Shared Setup

- Open the target inbox page.
- Confirm the page loads without a blocking error state.
- If the amber notice `Mode penyimpanan sementara aktif` appears, mark this run as `memory mode`.
- If the amber notice does not appear, mark this run as `database mode`.
- Pick one existing thread and note:
  - sender name
  - current status chip
  - current `Perlu Balasan` and `Sudah Dibalas` counts
  - latest visible message count in the thread

## Runtime Flow

### 1. Text-only reply

- Type plain text in the composer.
- Click `Kirim`.
- Expected:
  - send button changes to `Mengirim...` while the request is pending
  - composer controls are disabled during the pending state
  - success toast `Balasan terkirim` appears
  - new admin message bubble appears in the thread
  - thread status becomes `Sudah dibalas`
  - `Perlu Balasan` and `Sudah Dibalas` counters update

### 2. Attachment-only reply

- Leave the composer text empty.
- Attach one supported file below `2.5 MB`.
- Click `Kirim`.
- Expected:
  - attachment chip appears before send
  - reply succeeds without typed text
  - new message row shows `Lampiran tanpa teks` or equivalent empty-text reply body
  - attachment card is visible in the sent message
  - attachment can be downloaded from the thread view

### 3. Text + attachment reply

- Type a short reply and attach one supported file.
- Click `Kirim`.
- Expected:
  - both the text bubble and attachment card appear on the new admin reply
  - draft text clears after success
  - pending attachment chip disappears after success

### 4. Validation guardrails

- Try to send with no text and no attachment.
- Expected:
  - send is blocked
  - inline notice explains that text or one attachment is required

- Attach an unsupported file type or a file above `2.5 MB`.
- Expected:
  - file is rejected before send
  - inline notice explains unsupported format or size limit

### 5. Error retry

- With a draft still present, switch DevTools network to `Offline`.
- Click `Kirim`.
- Expected:
  - failure toast appears
  - inline error remains visible in the composer area
  - draft text is preserved
  - selected attachment is preserved
  - no new message is added to the thread

- Restore network to `Online`.
- Click `Kirim` again without retyping the draft.
- Expected:
  - the same draft can be resent successfully
  - preserved attachment is still sent successfully

### 6. Pending state visibility

- Switch DevTools network to `Slow 3G`.
- Send a short reply.
- Expected while request is in flight:
  - send button label is `Mengirim...`
  - textarea and reply actions are disabled
  - duplicate send is not possible

- Restore network after confirming the pending state.

### 7. Status changes

- On a replied thread, click `Tandai perlu balas`.
- Expected:
  - thread status chip changes back to `Perlu balas`
  - the thread moves into the unread or needs-reply bucket
  - dashboard counters update accordingly

- Send another admin reply in the same thread.
- Expected:
  - status returns to `Sudah dibalas`
  - counters reverse back accordingly

### 8. Reload behavior

- Refresh the browser tab after a successful reply and after a status change.
- Expected:
  - the latest message history reloads correctly
  - the latest thread status remains the same after refresh
  - attachment cards for already-sent replies still render after refresh

### 9. Memory-mode notice

- If the amber memory-mode notice is visible:
  - confirm the warning text explains that inbox replies and attachments are only stored in server memory
  - treat restart persistence as a destructive check; do it last

- If the amber notice is not visible:
  - record that the inbox is operating in database-backed mode

### 10. Restart persistence behavior

- Complete this step last, after all other checks succeed.

- In `memory mode`:
  - send a uniquely recognizable reply such as `RUNTIME-CHECK-<timestamp>`
  - restart the backend service
  - refresh the inbox page
  - expected: the warning was accurate, so the latest reply or status change may disappear after restart

- In `database mode`:
  - send a uniquely recognizable reply such as `RUNTIME-CHECK-<timestamp>`
  - restart the backend service
  - refresh the inbox page
  - expected: the latest reply, attachment, and thread status still persist after restart

## Pass Criteria

- All reply paths work in both inboxes:
  - text-only
  - attachment-only
  - text + attachment
- Failure handling keeps operator work intact until retry succeeds.
- Status chips and counters stay in sync with reply actions.
- Refresh behavior matches the current persistence mode.
- Restart behavior matches the visible persistence notice.
