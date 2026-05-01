# Security Specification - Visnova

## Data Invariants
- A `Vision` must belong to a `userId`.
- A `Task` or `VisionElement` must belong to a valid `visionId` that the user has access to.
- A `JournalEntry` is strictly private to the `userId`.
- `Post` content must be within size limits to prevent abuse.
- User `xp` and `level` should ideally be server-controlled, but since we are client-only for now, we'll implement strict validation.

## The Dirty Dozen (Test Cases)
1. **Identity Spoofing**: User A tries to update User B's profile.
2. **Vision Hijack**: User A tries to delete User B's vision.
3. **Element Injection**: User A adds elements to User B's vision.
4. **XP Inflation**: User updates their XP by 1,000,000 in one write.
5. **PII Leak**: User A tries to list all user emails.
6. **Shadow Update**: User tries to add `isAdmin: true` to their profile.
7. **Task Orphanage**: User creates a task with a non-existent vision ID.
8. **Journal Snooping**: User A tries to read User B's journal entries.
9. **Spam Posts**: User tries to create a post with 1MB of text.
10. **Role Escalation**: User tries to update their role to 'Owner' on a shared vision they only have 'Viewer' access to.
11. **Negative Vitals**: User sets their `focus` to -100.
12. **Future Editing**: User tries to update `createdAt` of an existing vision.

## Rule Structure Plan
- `users`: `allow get`: if signed in. `allow list`: only with specific filters or restricted fields. `allow write`: if isOwner.
- `visions`: `allow read, write`: if isOwner.
- `tasks`/`elements`: `allow read, write`: if parent vision isOwner.
- `journal`: `allow read, write`: if isOwner.
- `posts`: `allow read`: if signed in. `allow create`: if authored by self. `allow update`: restricted to likes (unless author).
