# Flow Runner App

A Sypnex OS application for managing background workflow execution through the Flow Runner API.

## Features

- **Job Monitoring**: Real-time view of all workflow jobs with status tracking
- **Job Submission**: Submit new workflow jobs with custom parameters
- **Job Management**: Cancel running or queued jobs
- **Detailed View**: View job details including output, timing, and error information
- **Auto-refresh**: Automatically updates job status every 5 seconds
- **Statistics**: Live statistics showing job counts by status

## Configuration

The app uses a configurable setting for the Flow Runner API URL:

- **flow_runner_url**: URL of the Flow Runner API service (default: http://localhost:8080)

This setting can be configured through the Sypnex OS settings panel and will be automatically templated into the app.

## Usage

### Viewing Jobs
- Jobs are displayed in a grid layout with status indicators
- Each job card shows key information like workflow path, timing, and current status
- Jobs are automatically sorted by creation time (newest first)

### Submitting Jobs
1. Click the "Submit Job" button
2. Enter the workflow path (VFS path to the workflow JSON file)
3. Enter the Sypnex OS URL (usually http://localhost:5000)
4. Click "Submit Job" to queue the workflow for execution

### Managing Jobs
- **Cancel**: Click the "Cancel" button on running or queued jobs to stop execution
- **Details**: Click "Details" to view comprehensive job information including full output

### Job Statuses
- **Queued**: Job is waiting to start execution
- **Running**: Job is currently executing
- **Completed**: Job finished successfully
- **Failed**: Job encountered an error during execution
- **Cancelled**: Job was manually cancelled

## API Integration

The app communicates with the Flow Runner API using sypnexAPI proxy methods:

- `sypnexAPI.proxyGET()` - Fetch jobs and statistics
- `sypnexAPI.proxyPOST()` - Submit new jobs
- `sypnexAPI.proxyDELETE()` - Cancel jobs

All API requests are automatically proxied through the Sypnex OS proxy system for secure communication.

## Technical Details

### File Structure
```
flow_runner/
├── flow_runner.app          # App metadata and settings
└── src/
    ├── index.html           # HTML structure
    ├── main.js              # JavaScript functionality
    └── style.css            # Styling
```

### Dependencies
- SypnexAPI (automatically injected)
- Font Awesome icons (inherited from OS)
- CSS custom properties for theming

### Auto-refresh
The app automatically refreshes job data every 5 seconds to provide real-time updates without manual intervention.

## Development

The app follows Sypnex OS app development patterns:

1. Uses sypnexAPI for all external communication
2. Implements proper error handling and user notifications
3. Follows the OS design system and CSS custom properties
4. Uses settings templating for configuration
5. Implements responsive design for various screen sizes

## Flow Runner API Endpoints

The app expects the following API endpoints to be available:

- `GET /api/jobs` - List all jobs
- `GET /api/stats` - Get job statistics
- `POST /api/jobs` - Submit new job
- `DELETE /api/jobs/{id}` - Cancel job
- `GET /api/jobs/{id}` - Get job details
