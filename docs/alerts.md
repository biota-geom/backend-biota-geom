# Alerts API

All endpoints require an access token. The tenant is the JWT subject; `customer`
in the response is a company owned by that tenant. No administrator bypass applies.

| Endpoint                       | Behavior                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `GET /api/alerts`              | Defaults to `status=OPEN,READ`, `page=1`, `page_size=10`; maximum page size is 100.                     |
| `GET /api/alerts/unread-count` | Returns `{ "count": number }` for visible `OPEN` alerts.                                                |
| `PATCH /api/alerts/:id`        | Accepts only `{ "status": "READ" }` or `{ "status": "RESOLVED" }` and returns the updated notification. |

List responses contain `items`, `total`, `page`, and `page_size`. Status filters
accept comma-separated values, including `RESOLVED`. Ordering is severity
descending (`HIGH`, `MEDIUM`, `LOW`), due date ascending, then ID ascending.
Ordering and pagination happen in PostgreSQL. Repeating an update to the same
status is safe. The endpoint accepts either target status from any current state;
it does not offer a transition back to `OPEN`.

Unknown alerts and alerts outside the tenant both return 404. Deleted companies
are excluded from all three endpoints. Related licenses and conditions are also
checked against the tenant before exposing their data.

## Supported records and presentation

This API exposes `LICENSE_EXPIRATION` and `CONDITION_DUE`. A visible alert must
have a due date and a license; condition alerts must also have a condition.
Legacy `NEW_LEGISLATION` records and incomplete records remain in the database
but are outside this contract. License alerts have `condition: null`.

The response mapper builds titles and messages using templates in the existing
auth presentation message catalog. Persisted titles/messages are not used.
Remaining days use `Math.ceil` of the timestamp difference, matching the existing
license calculators; zero means due in zero days. Dates are serialized as ISO UTC.

`dedupe_key` is unique and nullable to preserve legacy records. New seed records
always supply `<type>:<recordId>:<severity>:<UTC YYYY-MM-DD>`. The record ID is
the license ID for expiration alerts and the condition ID for condition alerts.
Future producers must supply this key and maintain consistent company, license,
and condition relationships.

## Demo data and verification

Run `npx prisma db seed` after applying migrations and generating Prisma Client.
The existing seed now creates notification examples for its demo licenses and
conditions, across both active tenant accounts. It reuses the license/risk
calculators. Re-running on the same day preserves read/resolved states and avoids
duplicate keys. When demo deadlines change, older keyed examples for that record
are resolved. Long-range conditions provide low-severity reminder examples.
This is demo preparation, not the production notification-generation schedule.

Swagger is available at `/api/docs`. Run `npm run lint`, `npm run build`, and
`npm test` for the standard checks. With `TEST_DATABASE_URL` pointing at a dedicated
PostgreSQL database, run `npm run test:e2e -- --runInBand alerts.e2e-spec.ts` for
HTTP contracts, tenant isolation, ordering, deduplication, Swagger and seed behavior.

Automatic generation, email delivery, and resolution triggered by license renewal
or condition fulfillment belong to subsequent notification tasks. `AlertsModule`
does not import `LicensesModule`; it exports the repository port for integration.
