# QuickReply AI — Instagram Dynamic Capability Matrix

| Capability ID | Name | Required Meta Permissions | Required Account Type | Production Status |
| :--- | :--- | :--- | :--- | :--- |
| `ACCOUNT_CONNECTION` | Account Identity & Graph Link | `instagram_basic` | Business / Creator | ✅ Ready |
| `PROFILE_READ` | Profile & Follower Metadata | `instagram_basic` | Business / Creator | ✅ Ready |
| `CONTENT_PUBLISH` | Single Image & Video Publishing | `instagram_content_publish`, `pages_show_list` | Business / Creator | ✅ Ready |
| `MEDIA_PUBLISH` | Container Media Pipeline | `instagram_content_publish` | Business / Creator | ✅ Ready |
| `REEL_RELATED_CAPABILITY` | Reels Publishing | `instagram_content_publish` | Business / Creator | ✅ Ready |
| `STORY_RELATED_CAPABILITY` | Stories Publishing | `instagram_content_publish` | Business / Creator | ✅ Ready |
| `COMMENT_READ` | Comment Ingestion & Webhooks | `instagram_manage_comments` | Business / Creator | ✅ Ready |
| `COMMENT_REPLY` | Public Comment Replies | `instagram_manage_comments` | Business / Creator | ✅ Ready |
| `COMMENT_MODERATION` | Comment Hiding & Deletion | `instagram_manage_comments` | Business | ✅ Ready |
| `MENTION_EVENTS` | Mention & Tag Webhooks | `instagram_basic`, `instagram_manage_comments` | Business / Creator | ✅ Ready |
| `DM_RECEIVE` | Direct Message Ingestion | `instagram_manage_messages`, `pages_manage_metadata` | Business / Creator | ✅ Ready |
| `DM_REPLY` | Direct Message Replies (24h Window) | `instagram_manage_messages` | Business / Creator | ✅ Ready |
| `MESSAGE_TEMPLATES` | Quick Replies & Ice Breakers | `instagram_manage_messages` | Business | ✅ Ready |
| `INSIGHTS` | Account & Post Insights | `instagram_basic`, `pages_read_engagement` | Business / Creator | ✅ Ready |
| `AUDIENCE_ANALYTICS` | Audience Demographics | `pages_read_engagement` | Business | ✅ Ready |
| `CONTENT_ANALYTICS` | Media Performance Tracking | `instagram_basic`, `pages_read_engagement` | Business / Creator | ✅ Ready |
| `HASHTAG_DISCOVERY` | Hashtag Search API | `instagram_basic` | Business | ✅ Ready |
| `LEAD_EVENTS` | Lead Generation Webhooks | `pages_manage_ads`, `leads_retrieval` | Business | ✅ Ready |
