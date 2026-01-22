# Clockify MCP Server

Time tracking via the Clockify API using the Model Context Protocol.

## Setup

1. Get your Clockify API key from [Clockify Profile Settings](https://app.clockify.me/user/settings)

2. Configure your MCP client with the API key (see MCP Client Configuration below)

3. Deploy to Vercel or run locally:
   ```bash
   pnpm install
   pnpm dev
   ```

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

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CLOCKIFY_API_KEY` | No | Fallback API key (if not passed via header) |

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/patrikmichi/clockify-mcp)

No environment variables required - API key is passed via Authorization header.

## MCP Client Configuration

Add to your `~/.claude/mcp.json` or project's `.mcp.json`:

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

Replace `YOUR_CLOCKIFY_API_KEY` with your actual Clockify API key.

### Security Note

The API key is sent over HTTPS (encrypted in transit). The Authorization header is a standard and secure way to pass credentials. Your API key stays on your machine in mcp.json and is only sent to the MCP server, which forwards it to Clockify.

### Example mcp.json

See the included `mcp.json` file for a template configuration.
