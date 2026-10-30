# StudyGroup

StudyGroup is a static GCSE revision site. Firebase Authentication handles accounts (email and password, and Google). Cloud Firestore stores each student's private workspace, the optional nickname-only leaderboard, and private study groups. There is no build step and no custom server.

## Fixing "auth/configuration-not-found"

This error means Firebase Authentication has not been set up for the project. The code is fine. In the Firebase console for `studygroup-b5135`:

1. Open **Build, Authentication** and press **Get started**.
2. Under **Sign-in method**, enable **Email/Password**.
3. Enable **Google** and choose a support email, then save.
4. Under **Settings, Authorized domains**, make sure `localhost` and your live domain are listed.

If the key in `core.js` is restricted in Google Cloud, allow the Identity Toolkit API and Token Service API for it.

## Firestore and hosting

1. Create a **Cloud Firestore** database in the Firebase console.
2. Deploy the site and rules:

   ```sh
   npx firebase-tools login
   npx firebase-tools deploy --only hosting,firestore:rules
   ```

To test locally, serve the folder over HTTP, for example `python3 -m http.server 8000`, and open `http://localhost:8000`. Opening `index.html` as a file does not work with Firebase.

## Features

- Sign up and log in with email or Google, plus password reset.
- Overview: daily goal bar, next exam, tasks due soon, badge progress and a daily quote.
- Planner: tasks with subject and due date, filters, overdue highlighting.
- Focus timer: adjustable focus and break lengths, sound alert, sessions logged automatically, weekly minutes chart and day streak.
- Flashcards: create decks from lines written as `question | answer`, shuffle, and study with a still learning queue.
- Notes: write and search notes by subject.
- Grades: log mock and test scores, see averages per subject and whether you are improving.
- Exams: countdown to each exam date.
- Groups: create private groups, share a six character invite code, and chat in real time.
- Leaderboard tab: daily check-ins and a weekly focus minutes board, nicknames only and opt in.
- Badges: 16 achievements unlocked by using the site.
- Resources: filter free revision sites by subject and search them.
- Download my data: exports your profile, tasks, sessions, decks, exams, notes and scores as JSON.

## How the pages connect

- `index.html` is the landing page. If you are signed in (or you sign up or log in), it sends you to `/dashboard/`.
- `dashboard/index.html` is the dashboard. If you are not signed in, it sends you back to the landing page. Logging out also returns you to the landing page.

## Project files

- `index.html`, `app.js`: landing page, sign up, log in and the Google button.
- `dashboard/index.html`, `dashboard.js`: the signed-in dashboard.
- `workspace.js`: planner, timer, flashcards, groups and exams.
- `insights.js`, `notes.js`, `grades.js`: overview, badges, notes and grade tracking.
- `session.js`: profile creation and saving, shared by both pages.
- `leaderboard.js`, `resources.js`: shared by both pages.
- `core.js`: Firebase setup, shared state and error messages.
- `helpers.js`: pure helper functions covered by `tests/helpers.test.mjs`.
- `styles.css`: styling for both pages.
- `firestore.rules`: security rules for every collection.

Run the tests with `node --test tests/helpers.test.mjs`.

## Data

- `users/{uid}`: nickname and leaderboard setting. Subcollections `tasks`, `sessions`, `decks`, `exams`, `notes` and `scores` hold the workspace. Only that account can read or write them.
- `publicLeaderboard/{uid}`: exists only for students who opt in. It holds a nickname, a check-in score, this week's focus minutes and timestamps, never an email address.
- `groups/{id}`: group name, subject, invite code and member ids. Only members can read it. `messages` inside a group are readable and writable by members only.
- `groupCodes/{code}`: maps an invite code to its group so people can join.

Email addresses are never written to Firestore. Firebase web configuration is not a secret, so security relies on Authentication and the deployed rules. Never put a service account key in this site.

The Spark plan has daily Firestore quotas. Workspace data uses live listeners with small limits, and the leaderboard loads at most eight entries per refresh.
