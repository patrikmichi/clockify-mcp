# Clockify MCP Server

Time tracking via the Clockify API using the Model Context Protocol.

## Setup

1. Get your Clockify API key from [Clockify Profile Settings](https://app.clockify.me/user/settings)

2. Set the environment variable:
   ```bash
   export CLOCKIFY_API_KEY=your-api-key
   ```

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
| `CLOCKIFY_API_KEY` | Yes | Your Clockify API key |

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-repo/clockify-mcp)

Set `CLOCKIFY_API_KEY` in your Vercel project environment variables.

## MCP Client Configuration

After deploying to Vercel, configure your MCP client to connect to the server.

### Claude Code / Cursor

Add to your `~/.claude/mcp.json` or project's `.mcp.json`:

```json
{
  "mcpServers": {
    "clockify": {
      "url": "https://your-deployment.vercel.app/api/mcp"
    }
  }
}
```

### With Authentication (if using Vercel Authentication)

```json
{
  "mcpServers": {
    "clockify": {
      "url": "https://your-deployment.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer your-token"
      }
    }
  }
}
```

### Example mcp.json

See the included `mcp.json` file for a template configuration.
