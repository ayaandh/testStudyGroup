# StudyGroup Academy

StudyGroup Academy is a static GCSE learning and student-community app built with Firebase Authentication and Cloud Firestore. It uses the Firebase modular JavaScript SDK from Google's CDN and does not require a bundler.

## New in this upgrade

- Public student profiles at `https://your-domain/<username>` (Firebase Hosting rewrite) with editable username, short bio, colour theme and unlocked achievement badges.
- A GitHub Pages `404.html` fallback for one-segment profile routes. Custom-domain root hosting is recommended for clean URLs.
- Exact username lookup, friend requests, friend lists and friend-only one-to-one direct messages.
- Group and direct messages can include pasted question text or notes as a shareable text attachment. This is intentionally text-based; binary uploads require Firebase Storage and additional privacy/abuse controls.
- Expanded GCSE subject selector including languages, arts, creative subjects, humanities and vocational/technical options.
- An in-app Academy library catalogue for original notes, quizzes, worksheets, videos and past papers.
- A PDF reader using PDF.js that extracts selectable PDF text into accessible HTML and keeps a direct download link to the original PDF.
- New minimal StudyGroup Academy wordmark.

## Firebase setup and deployment

1. In Firebase Authentication, enable Email/Password and Google if required.
2. Create a Firestore database and add your production domain under Authentication → Settings → Authorized domains.
3. Deploy the updated security rules and Hosting configuration:

   ```sh
   npx firebase-tools login
   npx firebase-tools deploy --only hosting,firestore:rules,firestore:indexes
   ```

4. Verify the new public profile, friend-request and direct-message rules in the Firebase Rules Playground before inviting students.
5. For GitHub Pages, publish the repository root and configure the custom domain. `404.html` provides the profile route fallback. Firebase Hosting is the more reliable choice for clean `/<username>` paths.

## Public profiles and community data

- `publicProfiles/{username}` contains only the fields intended to be public: username, display nickname, short bio, theme and unlocked achievement names. It never contains an email address.
- `friendRequests/{senderUid_receiverUid}` stores pending/accepted requests. Only the sender and recipient can read a request.
- `directChats/{sortedUidPair}/messages/{messageId}` is readable only by the two accepted friends in that conversation.
- Group messages remain restricted to group members. Pasted attachments are limited by Firestore rules.
- Students should use a nickname and avoid publishing personal contact details, school, location or other sensitive information in a public bio.

## Content library

The catalogue is `content/catalogue.json`. Add original or properly licensed resources to it using this shape:

```json
{
  "subject": "English Literature",
  "type": "past-papers",
  "title": "Paper 1",
  "topic": "Modern texts",
  "year": 2025,
  "examBoard": "AQA",
  "path": "/content/english-literature/past-papers/2025/paper-1.pdf"
}
```

Supported types: `notes`, `past-papers`, `quizzes`, `worksheets`, `videos`. Suggested paths follow `content/<subject-slug>/<resource-type>/<year>/<filename>.pdf`. The PDF reader URL is `resource.html?file=/content/...`.

**The ZIP does not contain a populated GCSE content library.** It includes the catalogue, directory convention and reader. Actual notes, quizzes and worksheets still need to be written and reviewed; past papers must only be redistributed where the exam board's terms permit it. The parser extracts selectable text, but scanned/image-only pages need OCR and may show a note directing students to download the original.

## Important launch checks

- Deploy `firestore.rules` before using friend requests or direct messages.
- The repository includes the two composite indexes used by pending friend-request queries; deploy them with the command above.
- PDF.js is loaded from a CDN. Production should pin and periodically review the library version.
- Test all profile routes on the actual custom domain and on GitHub Pages before announcing them.
- This is a substantial MVP extension, not a production security audit. Add moderation/reporting, blocking, rate limits, account deletion flows and safeguarding review before opening student-to-student messaging to a large audience.
