# QuickReply AI — LinkedIn Capability Matrix

## Official Scopes & Capability Derivation

| Capability Key | Human Label | Required Scopes | Required Organization Role | Degradation State |
| :--- | :--- | :--- | :--- | :--- |
| `CAN_PUBLISH_MEMBER_POST` | Member Profile Publishing | `w_member_social` | N/A | `DENIED` if scope ungranted |
| `CAN_PUBLISH_ORGANIZATION_POST` | Company Page Publishing | `w_organization_social` | `ADMINISTRATOR` or `CONTENT_ADMIN` | `UNAVAILABLE` without Page ACL |
| `CAN_READ_ORGANIZATION_POSTS` | Company Feed Sync | `r_organization_social` | Any Org Role | `DENIED` if scope ungranted |
| `CAN_COMMENT` | Comment Reply Actions | `w_member_social` or `w_organization_social` | Member / Org Admin | `DENIED` if ungranted |
| `CAN_REACT` | Post Reactions | `w_member_social` | Member | `DENIED` if ungranted |
| `CAN_READ_SOCIAL_ACTIONS` | Social Inbox Sync | `r_organization_social` | Any Org Role | `DENIED` if ungranted |
| `CAN_RECEIVE_ORGANIZATION_NOTIFICATIONS` | Real-time Webhooks | `rw_organization_admin` | Developer App Partner Tier | `UNAVAILABLE` on standard tier |
| `CAN_READ_PAGE_ANALYTICS` | Page & Post Metrics | `r_organization_social` | Org Admin / Analyst | `DENIED` if ungranted |
