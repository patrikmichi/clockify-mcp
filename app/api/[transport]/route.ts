/**
 * Clockify MCP Server
 *
 * Provides time tracking capabilities via the Clockify API.
 * Authentication: Set CLOCKIFY_API_KEY environment variable.
 */

import { z } from 'zod';
import { createMcpHandler } from 'mcp-handler';

export const maxDuration = 60;

// ============================================================================
// Configuration
// ============================================================================

const BASE_URL = 'https://api.clockify.me/api/v1';

function getApiKey(): string {
  const key = process.env.CLOCKIFY_API_KEY;
  if (!key) {
    throw new Error('CLOCKIFY_API_KEY environment variable is required');
  }
  return key;
}

// ============================================================================
// API Helper
// ============================================================================

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

async function clockifyApi<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = options;
  const apiKey = getApiKey();

  let url = `${BASE_URL}${endpoint}`;

  // Add query parameters
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const response = await fetch(url, {
    method,
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Clockify API error (${response.status}): ${errorText}`);
  }

  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// ============================================================================
// Types
// ============================================================================

interface User {
  id: string;
  email: string;
  name: string;
  activeWorkspace: string;
  defaultWorkspace: string;
  profilePicture?: string;
  status: string;
}

interface Workspace {
  id: string;
  name: string;
  hourlyRate?: { amount: number; currency: string };
  memberships?: Array<{ userId: string; targetId: string; membershipType: string }>;
}

interface Project {
  id: string;
  name: string;
  clientId?: string;
  clientName?: string;
  color: string;
  archived: boolean;
  billable: boolean;
  public: boolean;
  workspaceId: string;
  note?: string;
  duration?: string;
  estimate?: { estimate: string; type: string };
}

interface TimeEntry {
  id: string;
  description: string;
  projectId?: string;
  taskId?: string;
  tagIds?: string[];
  userId: string;
  workspaceId: string;
  billable: boolean;
  timeInterval: {
    start: string;
    end?: string;
    duration?: string;
  };
}

interface Client {
  id: string;
  name: string;
  email?: string;
  workspaceId: string;
  archived: boolean;
  address?: string;
  note?: string;
}

interface Tag {
  id: string;
  name: string;
  workspaceId: string;
  archived: boolean;
}

interface Task {
  id: string;
  name: string;
  projectId: string;
  assigneeIds?: string[];
  estimate?: string;
  status: string;
  duration?: string;
}

// ============================================================================
// MCP Handler
// ============================================================================

const handler = createMcpHandler(
  (server) => {
    // ========================================================================
    // User Tools
    // ========================================================================

    server.tool(
      'get_current_user',
      'Get information about the currently authenticated user',
      {},
      async () => {
        const user = await clockifyApi<User>('/user');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(user, null, 2),
            },
          ],
        };
      }
    );

    // ========================================================================
    // Workspace Tools
    // ========================================================================

    server.tool(
      'list_workspaces',
      'List all workspaces the user has access to',
      {},
      async () => {
        const workspaces = await clockifyApi<Workspace[]>('/workspaces');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(workspaces, null, 2),
            },
          ],
        };
      }
    );

    // ========================================================================
    // Project Tools
    // ========================================================================

    server.tool(
      'list_projects',
      'List all projects in a workspace',
      {
        workspaceId: z.string().describe('The workspace ID'),
        archived: z.boolean().optional().describe('Filter by archived status'),
        name: z.string().optional().describe('Filter by project name (contains)'),
        page: z.number().optional().describe('Page number (default: 1)'),
        pageSize: z.number().optional().describe('Page size (default: 50, max: 5000)'),
      },
      async ({ workspaceId, archived, name, page, pageSize }) => {
        const projects = await clockifyApi<Project[]>(
          `/workspaces/${workspaceId}/projects`,
          {
            params: {
              archived,
              name,
              page,
              'page-size': pageSize,
            },
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(projects, null, 2),
            },
          ],
        };
      }
    );

    server.tool(
      'get_project',
      'Get a specific project by ID',
      {
        workspaceId: z.string().describe('The workspace ID'),
        projectId: z.string().describe('The project ID'),
      },
      async ({ workspaceId, projectId }) => {
        const project = await clockifyApi<Project>(
          `/workspaces/${workspaceId}/projects/${projectId}`
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(project, null, 2),
            },
          ],
        };
      }
    );

    server.tool(
      'create_project',
      'Create a new project in a workspace',
      {
        workspaceId: z.string().describe('The workspace ID'),
        name: z.string().describe('Project name'),
        clientId: z.string().optional().describe('Client ID to associate'),
        color: z.string().optional().describe('Project color (hex, e.g., #FF5722)'),
        billable: z.boolean().optional().describe('Is the project billable'),
        isPublic: z.boolean().optional().describe('Is the project public'),
        note: z.string().optional().describe('Project notes'),
      },
      async ({ workspaceId, name, clientId, color, billable, isPublic, note }) => {
        const project = await clockifyApi<Project>(
          `/workspaces/${workspaceId}/projects`,
          {
            method: 'POST',
            body: {
              name,
              clientId,
              color: color || '#03A9F4',
              billable,
              public: isPublic,
              note,
            },
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: `Project created:\n${JSON.stringify(project, null, 2)}`,
            },
          ],
        };
      }
    );

    server.tool(
      'update_project',
      'Update an existing project',
      {
        workspaceId: z.string().describe('The workspace ID'),
        projectId: z.string().describe('The project ID'),
        name: z.string().optional().describe('New project name'),
        clientId: z.string().optional().describe('Client ID'),
        color: z.string().optional().describe('Project color'),
        billable: z.boolean().optional().describe('Is billable'),
        archived: z.boolean().optional().describe('Archive the project'),
        note: z.string().optional().describe('Project notes'),
      },
      async ({ workspaceId, projectId, name, clientId, color, billable, archived, note }) => {
        const project = await clockifyApi<Project>(
          `/workspaces/${workspaceId}/projects/${projectId}`,
          {
            method: 'PUT',
            body: {
              name,
              clientId,
              color,
              billable,
              archived,
              note,
            },
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: `Project updated:\n${JSON.stringify(project, null, 2)}`,
            },
          ],
        };
      }
    );

    server.tool(
      'delete_project',
      'Delete a project (cannot be undone)',
      {
        workspaceId: z.string().describe('The workspace ID'),
        projectId: z.string().describe('The project ID'),
      },
      async ({ workspaceId, projectId }) => {
        await clockifyApi(`/workspaces/${workspaceId}/projects/${projectId}`, {
          method: 'DELETE',
        });
        return {
          content: [
            {
              type: 'text',
              text: `Project ${projectId} deleted successfully`,
            },
          ],
        };
      }
    );

    // ========================================================================
    // Time Entry Tools
    // ========================================================================

    server.tool(
      'list_time_entries',
      'List time entries for the current user in a workspace',
      {
        workspaceId: z.string().describe('The workspace ID'),
        userId: z.string().optional().describe('User ID (defaults to current user)'),
        start: z.string().optional().describe('Start date (ISO 8601, e.g., 2024-01-01T00:00:00Z)'),
        end: z.string().optional().describe('End date (ISO 8601)'),
        project: z.string().optional().describe('Filter by project ID'),
        description: z.string().optional().describe('Filter by description (contains)'),
        page: z.number().optional().describe('Page number'),
        pageSize: z.number().optional().describe('Page size (max: 50)'),
      },
      async ({ workspaceId, userId, start, end, project, description, page, pageSize }) => {
        // If no userId provided, get current user
        let uid = userId;
        if (!uid) {
          const user = await clockifyApi<User>('/user');
          uid = user.id;
        }

        const entries = await clockifyApi<TimeEntry[]>(
          `/workspaces/${workspaceId}/user/${uid}/time-entries`,
          {
            params: {
              start,
              end,
              project,
              description,
              page,
              'page-size': pageSize,
            },
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(entries, null, 2),
            },
          ],
        };
      }
    );

    server.tool(
      'create_time_entry',
      'Create a new time entry (completed or start a timer)',
      {
        workspaceId: z.string().describe('The workspace ID'),
        description: z.string().optional().describe('Time entry description'),
        projectId: z.string().optional().describe('Project ID'),
        taskId: z.string().optional().describe('Task ID'),
        tagIds: z.array(z.string()).optional().describe('Array of tag IDs'),
        start: z.string().describe('Start time (ISO 8601, e.g., 2024-01-15T09:00:00Z)'),
        end: z.string().optional().describe('End time (ISO 8601). Omit to start a running timer'),
        billable: z.boolean().optional().describe('Is the entry billable'),
      },
      async ({ workspaceId, description, projectId, taskId, tagIds, start, end, billable }) => {
        const entry = await clockifyApi<TimeEntry>(
          `/workspaces/${workspaceId}/time-entries`,
          {
            method: 'POST',
            body: {
              description,
              projectId,
              taskId,
              tagIds,
              start,
              end,
              billable,
            },
          }
        );

        const status = entry.timeInterval.end ? 'completed' : 'running';
        return {
          content: [
            {
              type: 'text',
              text: `Time entry created (${status}):\n${JSON.stringify(entry, null, 2)}`,
            },
          ],
        };
      }
    );

    server.tool(
      'stop_timer',
      'Stop the currently running timer for the user',
      {
        workspaceId: z.string().describe('The workspace ID'),
        userId: z.string().optional().describe('User ID (defaults to current user)'),
        end: z.string().optional().describe('End time (ISO 8601). Defaults to now'),
      },
      async ({ workspaceId, userId, end }) => {
        // Get current user if not specified
        let uid = userId;
        if (!uid) {
          const user = await clockifyApi<User>('/user');
          uid = user.id;
        }

        const endTime = end || new Date().toISOString();

        const entry = await clockifyApi<TimeEntry>(
          `/workspaces/${workspaceId}/user/${uid}/time-entries`,
          {
            method: 'PATCH',
            body: { end: endTime },
          }
        );

        return {
          content: [
            {
              type: 'text',
              text: `Timer stopped:\n${JSON.stringify(entry, null, 2)}`,
            },
          ],
        };
      }
    );

    server.tool(
      'update_time_entry',
      'Update an existing time entry',
      {
        workspaceId: z.string().describe('The workspace ID'),
        entryId: z.string().describe('The time entry ID'),
        description: z.string().optional().describe('New description'),
        projectId: z.string().optional().describe('Project ID'),
        taskId: z.string().optional().describe('Task ID'),
        tagIds: z.array(z.string()).optional().describe('Tag IDs'),
        start: z.string().optional().describe('Start time (ISO 8601)'),
        end: z.string().optional().describe('End time (ISO 8601)'),
        billable: z.boolean().optional().describe('Is billable'),
      },
      async ({ workspaceId, entryId, description, projectId, taskId, tagIds, start, end, billable }) => {
        const entry = await clockifyApi<TimeEntry>(
          `/workspaces/${workspaceId}/time-entries/${entryId}`,
          {
            method: 'PUT',
            body: {
              description,
              projectId,
              taskId,
              tagIds,
              start,
              end,
              billable,
            },
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: `Time entry updated:\n${JSON.stringify(entry, null, 2)}`,
            },
          ],
        };
      }
    );

    server.tool(
      'delete_time_entry',
      'Delete a time entry (cannot be undone)',
      {
        workspaceId: z.string().describe('The workspace ID'),
        entryId: z.string().describe('The time entry ID'),
      },
      async ({ workspaceId, entryId }) => {
        await clockifyApi(`/workspaces/${workspaceId}/time-entries/${entryId}`, {
          method: 'DELETE',
        });
        return {
          content: [
            {
              type: 'text',
              text: `Time entry ${entryId} deleted successfully`,
            },
          ],
        };
      }
    );

    // ========================================================================
    // Client Tools
    // ========================================================================

    server.tool(
      'list_clients',
      'List all clients in a workspace',
      {
        workspaceId: z.string().describe('The workspace ID'),
        archived: z.boolean().optional().describe('Filter by archived status'),
        name: z.string().optional().describe('Filter by name (contains)'),
        page: z.number().optional().describe('Page number'),
        pageSize: z.number().optional().describe('Page size'),
      },
      async ({ workspaceId, archived, name, page, pageSize }) => {
        const clients = await clockifyApi<Client[]>(
          `/workspaces/${workspaceId}/clients`,
          {
            params: {
              archived,
              name,
              page,
              'page-size': pageSize,
            },
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(clients, null, 2),
            },
          ],
        };
      }
    );

    server.tool(
      'create_client',
      'Create a new client in a workspace',
      {
        workspaceId: z.string().describe('The workspace ID'),
        name: z.string().describe('Client name'),
        email: z.string().optional().describe('Client email'),
        address: z.string().optional().describe('Client address'),
        note: z.string().optional().describe('Notes about the client'),
      },
      async ({ workspaceId, name, email, address, note }) => {
        const client = await clockifyApi<Client>(
          `/workspaces/${workspaceId}/clients`,
          {
            method: 'POST',
            body: { name, email, address, note },
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: `Client created:\n${JSON.stringify(client, null, 2)}`,
            },
          ],
        };
      }
    );

    server.tool(
      'update_client',
      'Update an existing client',
      {
        workspaceId: z.string().describe('The workspace ID'),
        clientId: z.string().describe('The client ID'),
        name: z.string().optional().describe('Client name'),
        email: z.string().optional().describe('Client email'),
        address: z.string().optional().describe('Client address'),
        note: z.string().optional().describe('Notes'),
        archived: z.boolean().optional().describe('Archive the client'),
      },
      async ({ workspaceId, clientId, name, email, address, note, archived }) => {
        const client = await clockifyApi<Client>(
          `/workspaces/${workspaceId}/clients/${clientId}`,
          {
            method: 'PUT',
            body: { name, email, address, note, archived },
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: `Client updated:\n${JSON.stringify(client, null, 2)}`,
            },
          ],
        };
      }
    );

    server.tool(
      'delete_client',
      'Delete a client (cannot be undone)',
      {
        workspaceId: z.string().describe('The workspace ID'),
        clientId: z.string().describe('The client ID'),
      },
      async ({ workspaceId, clientId }) => {
        await clockifyApi(`/workspaces/${workspaceId}/clients/${clientId}`, {
          method: 'DELETE',
        });
        return {
          content: [
            {
              type: 'text',
              text: `Client ${clientId} deleted successfully`,
            },
          ],
        };
      }
    );

    // ========================================================================
    // Tag Tools
    // ========================================================================

    server.tool(
      'list_tags',
      'List all tags in a workspace',
      {
        workspaceId: z.string().describe('The workspace ID'),
        archived: z.boolean().optional().describe('Filter by archived status'),
        name: z.string().optional().describe('Filter by name (contains)'),
        page: z.number().optional().describe('Page number'),
        pageSize: z.number().optional().describe('Page size'),
      },
      async ({ workspaceId, archived, name, page, pageSize }) => {
        const tags = await clockifyApi<Tag[]>(
          `/workspaces/${workspaceId}/tags`,
          {
            params: {
              archived,
              name,
              page,
              'page-size': pageSize,
            },
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(tags, null, 2),
            },
          ],
        };
      }
    );

    server.tool(
      'create_tag',
      'Create a new tag in a workspace',
      {
        workspaceId: z.string().describe('The workspace ID'),
        name: z.string().describe('Tag name'),
      },
      async ({ workspaceId, name }) => {
        const tag = await clockifyApi<Tag>(
          `/workspaces/${workspaceId}/tags`,
          {
            method: 'POST',
            body: { name },
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: `Tag created:\n${JSON.stringify(tag, null, 2)}`,
            },
          ],
        };
      }
    );

    server.tool(
      'update_tag',
      'Update an existing tag',
      {
        workspaceId: z.string().describe('The workspace ID'),
        tagId: z.string().describe('The tag ID'),
        name: z.string().optional().describe('New tag name'),
        archived: z.boolean().optional().describe('Archive the tag'),
      },
      async ({ workspaceId, tagId, name, archived }) => {
        const tag = await clockifyApi<Tag>(
          `/workspaces/${workspaceId}/tags/${tagId}`,
          {
            method: 'PUT',
            body: { name, archived },
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: `Tag updated:\n${JSON.stringify(tag, null, 2)}`,
            },
          ],
        };
      }
    );

    server.tool(
      'delete_tag',
      'Delete a tag (cannot be undone)',
      {
        workspaceId: z.string().describe('The workspace ID'),
        tagId: z.string().describe('The tag ID'),
      },
      async ({ workspaceId, tagId }) => {
        await clockifyApi(`/workspaces/${workspaceId}/tags/${tagId}`, {
          method: 'DELETE',
        });
        return {
          content: [
            {
              type: 'text',
              text: `Tag ${tagId} deleted successfully`,
            },
          ],
        };
      }
    );

    // ========================================================================
    // Task Tools
    // ========================================================================

    server.tool(
      'list_tasks',
      'List all tasks for a project',
      {
        workspaceId: z.string().describe('The workspace ID'),
        projectId: z.string().describe('The project ID'),
        isActive: z.boolean().optional().describe('Filter by active status'),
        name: z.string().optional().describe('Filter by name (contains)'),
        page: z.number().optional().describe('Page number'),
        pageSize: z.number().optional().describe('Page size'),
      },
      async ({ workspaceId, projectId, isActive, name, page, pageSize }) => {
        const tasks = await clockifyApi<Task[]>(
          `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
          {
            params: {
              'is-active': isActive,
              name,
              page,
              'page-size': pageSize,
            },
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(tasks, null, 2),
            },
          ],
        };
      }
    );

    server.tool(
      'create_task',
      'Create a new task in a project',
      {
        workspaceId: z.string().describe('The workspace ID'),
        projectId: z.string().describe('The project ID'),
        name: z.string().describe('Task name'),
        assigneeIds: z.array(z.string()).optional().describe('User IDs to assign'),
        estimate: z.string().optional().describe('Time estimate (e.g., PT1H30M for 1.5 hours)'),
      },
      async ({ workspaceId, projectId, name, assigneeIds, estimate }) => {
        const task = await clockifyApi<Task>(
          `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
          {
            method: 'POST',
            body: { name, assigneeIds, estimate },
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: `Task created:\n${JSON.stringify(task, null, 2)}`,
            },
          ],
        };
      }
    );

    server.tool(
      'update_task',
      'Update an existing task',
      {
        workspaceId: z.string().describe('The workspace ID'),
        projectId: z.string().describe('The project ID'),
        taskId: z.string().describe('The task ID'),
        name: z.string().optional().describe('New task name'),
        assigneeIds: z.array(z.string()).optional().describe('User IDs to assign'),
        estimate: z.string().optional().describe('Time estimate'),
        status: z.enum(['ACTIVE', 'DONE']).optional().describe('Task status'),
      },
      async ({ workspaceId, projectId, taskId, name, assigneeIds, estimate, status }) => {
        const task = await clockifyApi<Task>(
          `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
          {
            method: 'PUT',
            body: { name, assigneeIds, estimate, status },
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: `Task updated:\n${JSON.stringify(task, null, 2)}`,
            },
          ],
        };
      }
    );

    server.tool(
      'delete_task',
      'Delete a task (cannot be undone)',
      {
        workspaceId: z.string().describe('The workspace ID'),
        projectId: z.string().describe('The project ID'),
        taskId: z.string().describe('The task ID'),
      },
      async ({ workspaceId, projectId, taskId }) => {
        await clockifyApi(
          `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
          { method: 'DELETE' }
        );
        return {
          content: [
            {
              type: 'text',
              text: `Task ${taskId} deleted successfully`,
            },
          ],
        };
      }
    );

    // ========================================================================
    // Workspace Users Tool
    // ========================================================================

    server.tool(
      'list_workspace_users',
      'List all users in a workspace',
      {
        workspaceId: z.string().describe('The workspace ID'),
        email: z.string().optional().describe('Filter by email'),
        name: z.string().optional().describe('Filter by name'),
        status: z.enum(['PENDING', 'ACTIVE', 'DECLINED', 'INACTIVE']).optional().describe('Filter by status'),
        page: z.number().optional().describe('Page number'),
        pageSize: z.number().optional().describe('Page size'),
      },
      async ({ workspaceId, email, name, status, page, pageSize }) => {
        const users = await clockifyApi<User[]>(
          `/workspaces/${workspaceId}/users`,
          {
            params: {
              email,
              name,
              status,
              page,
              'page-size': pageSize,
            },
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(users, null, 2),
            },
          ],
        };
      }
    );
  },
  {},
  { basePath: '/api' }
);

export { handler as GET, handler as POST, handler as DELETE };
