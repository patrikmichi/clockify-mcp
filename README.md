# Clockify MCP Server

Time tracking via the Clockify API using the Model Context Protocol.

## Quick Start (Use Public Server)

No deployment needed. Just add your API key to your MCP client config:

1. Get your Clockify API key from [Clockify Profile Settings](https://app.clockify.me/user/settings)
2. Add to `~/.claude/mcp.json` or `.mcp.json`:

```json
{
  "mcpServers": {
    "clockify": {
      "url": "https://clockify-mcp.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_CLOCKIFY_API_KEY"
      }
    }
  }
}
```

That's it. Your API key is sent securely over HTTPS and is never stored on the server.

## Self-Hosted (Deploy Your Own)

If you prefer to run your own instance:

1. Click the deploy button below or clone and deploy manually
2. Add the same mcp.json config but with your deployment URL

## Available Tools

### User & Workspace
- `get_current_user` - Get authenticated user info
- `list_workspaces` - List all workspaces
- `list_workspace_users` - List users in a workspace

### Projects
- `list_projects` - List projects in a workspace
- `get_project` - Get project details
- `create_project` - Create a new project
- `update_project` - Update a project
- `delete_project` - Delete a project

### Time Entries
- `list_time_entries` - List time entries
- `create_time_entry` - Create entry or start timer
- `stop_timer` - Stop running timer
- `update_time_entry` - Update an entry
- `delete_time_entry` - Delete an entry

### Clients
- `list_clients` - List clients
- `create_client` - Create a client
- `update_client` - Update a client
- `delete_client` - Delete a client

### Tags
- `list_tags` - List tags
- `create_tag` - Create a tag
- `update_tag` - Update a tag
- `delete_tag` - Delete a tag

### Tasks
- `list_tasks` - List tasks in a project
- `create_task` - Create a task
- `update_task` - Update a task
- `delete_task` - Delete a task

## Usage Examples

### Start a timer
```
Create a time entry for "Working on feature X" in project abc123, starting now
```

### Stop current timer
```
Stop my current timer
```

### List today's entries
```
Show my time entries from today
```

### Create a project
```
Create a new project called "Website Redesign" for client xyz456
```

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/patrikmichi/clockify-mcp)

No environment variables required - API key is passed via Authorization header.

## Security

- API key is sent over HTTPS (encrypted in transit)
- Your key stays local in mcp.json and is only forwarded to Clockify
- You can regenerate your API key at any time in Clockify settings
