# Agent context

The server in `PassThingsCharity-server` owns the business flow. The app in `PassThingsCharity-mobile` is a client. When a screen shows a number, status, or rule the server does not store, keep the server and change the screen. Do not add a route, field, or enum value so a mock screen can render.

The current API-call diagram is in `README.md`. That diagram shows what the client calls today. It is not a spec for changing the server.

## Server model

MongoDB through Mongoose. Fourteen models live in `PassThingsCharity-server/models`.

`Role.name` is ADMIN, STATION_MANAGER, STAFF, VOLUNTEER, or USER. Each user has one role.

`User` stores email, username, password, fullName, role, phone, and status. Status is lowercase: active, inactive, or banned.

`Organization` records the submitter in `submittedBy`. `isVerified` defaults to false. An ADMIN sets it to true with `PATCH /admin/organizations/:id/approve`.

`Station` belongs to one organization. Stored fields are organizationId, name, address, and isActive. `isActive` defaults to false. An ADMIN sets it to true only after the organization is verified, with `PATCH /admin/stations/:id/approve`.

`StationStaff` links a user to a station. The pair stationId and userId is unique.

`ItemCategory` comes before `ItemType`. The unit lives on the item type. The enum is KG, PAIR, BOX, PACK. `isActive` defaults to true.

`Campaign` belongs to one organization. Duration is 5 to 7 days. Status is DRAFT, PUBLISHED, ACTIVE, COMPLETED, or CANCELLED.

`CampaignItem` stores targetQuantity of at least 1 and currentQuantity defaulting to 0. One campaign has one row per item type. Priority is LOW, MEDIUM, or HIGH.

`CampaignStation` links a station to a campaign. The pair campaignId and stationId is unique.

`PointTransaction` adds points for one user. Type is DONATION, VOLUNTEER_TASK, BONUS, or SYSTEM. Points are a positive integer. `sourceId` is optional.

`Achievement` defines a milestone. The schema allows DONATION_COUNT, DONATION_WEIGHT_KG, VOLUNTEER_HOURS, CAMPAIGN_COUNT, and POINTS_ACCUMULATED. Create and unlock in `controller/gamification.js` accept only DONATION_COUNT and POINTS_ACCUMULATED.

`UserAchievement` records which milestone a user has unlocked.

`Certificate` is issued by an authorized role. Type is VOLUNTEER or DONOR. It may reference a campaignId.

The server has no collection for intake, receipts, transfers, distribution, volunteer shifts, QR, OTP, inbox, or citizen receive-requests. Those app screens are drawings. Do not treat on-screen copy as work the server must do.

## Server flow

`POST /auth/register` creates a user with role USER. Phone must be exactly 10 digits. `POST /auth/login` takes username and password and returns a JWT that expires in 1 hour. The payload contains only userId. Changing your own password requires a token. Resetting another user's password is ADMIN only, and the new password must be at least 8 characters.

A new organization is unverified. A new station is inactive. Approve the organization first, then approve the station. Create a station under its organization with `POST /organizations/:organizationId/stations`. `POST /stations` calls the same handler, and that handler reads `req.params.organizationId`. That param exists only on the organization route.

Assign an existing staff user with `POST /stations/:id/staff/:userId`. The user must already have role STAFF. A station manager creates a staff account for their own station with `POST /stationmanager/:stationId/staff`. `GET` and `DELETE` on that prefix also require the STATION_MANAGER of that station.

An ADMIN promotes a USER to STATION_MANAGER with `PATCH /users/:id/station-manager`. An ADMIN changes user status with `PATCH /users/:id/status`. `GET /users` is ADMIN only.

The catalog is public at `GET /catalog/categories` and `GET /catalog/items`. Creating, updating, and deleting categories and item types requires ADMIN or STATION_MANAGER. An item type with `isActive` false cannot be added to a campaign.

ADMIN or STATION_MANAGER creates a campaign. The new status is DRAFT. `GET /campaigns` and `GET /campaigns/:id` hide DRAFT. The public list also filters by status, organizationId, and a title search of at most 100 characters. Valid public statuses are PUBLISHED, ACTIVE, COMPLETED, and CANCELLED.

Status changes follow the table in `updateCampaignStatus`. DRAFT goes to PUBLISHED or CANCELLED. PUBLISHED goes to ACTIVE or CANCELLED. ACTIVE goes to COMPLETED or CANCELLED. COMPLETED and CANCELLED stop. Sending the current status again is allowed. Completing a campaign is one status command. The server has no handover lot, so completion is not tied to a signature.

A campaign item stores the requested `targetQuantity` and the recorded `currentQuantity`. There is no holding column and no delivered column. No code increments `currentQuantity` beyond the default 0. The unit comes from `ItemType.unit`. Publish does not lock a separate unit.

A station joins a campaign through `POST /campaigns/:id/stations`. A station with `isActive` false is rejected. `GET /campaigns/:id/stations` returns only active stations.

Points do not increase automatically per kilogram. ADMIN, STATION_MANAGER, or STAFF calls `POST /gamification/points/award`. After the transaction is saved, the server checks active milestones. Enough total points unlocks POINTS_ACCUMULATED. Enough DONATION transactions unlocks DONATION_COUNT. A milestone with pointsReward above 0 adds one BONUS transaction. The unlock function ignores the other three criteria in the schema. A certificate is not created when a campaign becomes COMPLETED. ADMIN or STATION_MANAGER calls `POST /gamification/certificates`.

## Routes the client calls

Every app HTTP call goes through `PassThingsCharity-mobile/src/api/backend.ts`. The base URL is `EXPO_PUBLIC_API_URL`, default `http://localhost:8080`. Errors are read from the `error` field.

`/` and `/search` read `GET /campaigns`. `/campaign` reads `GET /campaigns/:id`, then `GET /campaigns/:id/stations`, and renders targetQuantity and currentQuantity.

`/stations/list` reads `GET /stations` when a token exists. Without a token the app shows sample stations. Those samples are not server data.

`/profile/full` reads the signed-in user's points, achievements, and certificates when a token exists. The hardcoded name and kilogram block in `src/screens/profile.tsx` does not come from the server.

`/login`, `/account`, and `/desk` call the remaining routes. `/desk` is a form that calls the API. It is not a business screen. `user_test_01` receives 403 from `GET /users` because that route is ADMIN only. The seed password is `123456`.

`POST /users` in `controller/user.js` reads an undeclared `stationId`, so the request usually returns 500. That is a controller bug. It is not a reason to change the request body to match an app screen.

## App screens outside the server flow

These paths only change local UI. Their numbers live in `src/screens`. Ignore them when working on the server.

`/home/loading`, `/home/offline`, `/home/none`, `/home/results`, `/home/empty`.

`/board/active`, `/board/draft`, `/board/window`, `/board/completed`, `/board/cancelled`, `/board/loading`, `/board/error`.

`/ledger/content`, `/ledger/empty`, `/ledger/loading`, `/ledger/error`.

`/report/content`, `/report/empty`, `/report/loading`, `/report/error`.

`/intake/review`, `/intake/loading`, `/intake/empty`, `/intake/guest`, `/intake/accepted`, `/intake/rejected`, `/intake/failed`.

`/receipt/pending`, `/receipt/done`, `/receipt/rejected`, `/receipt/loading`, `/receipt/error`.

`/feedback`, `/feedback/sent`, `/feedback/invalid`.

`/transfer/create`, `/transfer/empty`, `/transfer/loading`, `/transfer/error`, `/transfer/preparing`, `/transfer/transit`, `/transfer/received`, `/transfer/short`, `/transfer/cancelled`.

`/distribution/lots`, `/distribution/empty`, `/distribution/handover`, `/distribution/exception`, `/distribution/done`, `/distribution/loading`, `/distribution/error`.

`/volunteer/form`, `/volunteer/form-error`, `/volunteer/loading`, `/volunteer/error`, `/volunteer/tasks`, `/volunteer/pending`, `/volunteer/revision`, `/volunteer/rejected`, `/volunteer/cancelled`, `/volunteer/approved`, `/volunteer/empty`, `/volunteer/assigned`, `/volunteer/active`, `/volunteer/done`.

`/qr/scan`, `/qr/checking`, `/qr/success`, `/qr/error`, `/qr/expired`.

`/shift/detail`, `/shift/confirm`, `/shift/reason`, `/shift/cancelled`, `/shift/success`, `/shift/missing`.

`/history/content`, `/history/empty`, `/history/loading`, `/history/error`.

`/otp/enter`, `/otp/resend`, `/otp/error`, `/otp/locked`.

`/inbox/content`, `/inbox/empty`, `/inbox/loading`, `/inbox/error`, `/notifications`.

`/receive/form`, `/receive/sending`, `/receive/stock`, `/receive/error`, `/receive/success`.

`/staff/roster`, `/staff/empty`, `/staff/loading`, `/staff/error`.

`/settings`, `/settings/off`, `/settings/save-error`.

`/menu` only navigates. `/atlas` lists paths from `src/screens/coverage.tsx`.
