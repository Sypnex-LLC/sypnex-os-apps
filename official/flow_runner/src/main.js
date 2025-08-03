// Flow Runner App functionality
class FlowRunner {
    constructor() {
        this.jobs = new Map();
        this.stats = {};
        this.isLoading = false;
        this.flowRunnerUrl = '{{FLOW_RUNNER_API}}'; // Will be templated by Sypnex OS
        this.refreshInterval = null;
        
        this.init();
    }

    async init() {
        // Check if SypnexAPI is available
        if (typeof sypnexAPI !== 'undefined' && sypnexAPI) {
            this.setupEventListeners();
            this.startAutoRefresh();
            this.loadJobs();
        } else {
            console.error('SypnexAPI not available');
            this.showError('SypnexAPI not available. Flow Runner cannot function properly.');
        }
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('refresh-jobs').addEventListener('click', () => {
            this.loadJobs();
        });

        // Submit job buttons
        document.getElementById('submit-job').addEventListener('click', () => {
            this.showJobSubmitModal();
        });
        
        document.getElementById('empty-submit-job').addEventListener('click', () => {
            this.showJobSubmitModal();
        });

        // Retry button
        document.getElementById('retry-button').addEventListener('click', () => {
            this.loadJobs();
        });

        // Modal controls
        document.getElementById('close-modal').addEventListener('click', () => {
            this.hideJobSubmitModal();
        });
        
        document.getElementById('cancel-submit').addEventListener('click', () => {
            this.hideJobSubmitModal();
        });
        
        document.getElementById('confirm-submit').addEventListener('click', () => {
            this.submitNewJob();
        });

        // Job details modal
        document.getElementById('close-details-modal').addEventListener('click', () => {
            this.hideJobDetailsModal();
        });
        
        document.getElementById('close-details').addEventListener('click', () => {
            this.hideJobDetailsModal();
        });

        // Close modals when clicking outside
        document.getElementById('job-submit-modal').addEventListener('click', (e) => {
            if (e.target.id === 'job-submit-modal') {
                this.hideJobSubmitModal();
            }
        });
        
        document.getElementById('job-details-modal').addEventListener('click', (e) => {
            if (e.target.id === 'job-details-modal') {
                this.hideJobDetailsModal();
            }
        });

        // Form submit
        document.getElementById('job-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitNewJob();
        });
    }

    startAutoRefresh() {
        // Refresh every 5 seconds
        this.refreshInterval = setInterval(() => {
            this.loadJobs(false); // Don't show loading state for auto-refresh
        }, 5000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    async loadJobs(showLoading = true) {
        if (this.isLoading) return;

        this.isLoading = true;

        if (showLoading) {
            this.showLoading();
        }

        try {
            // Load jobs and stats in parallel
            const [jobsResponse, statsResponse] = await Promise.all([
                this.fetchJobs(),
                this.fetchStats()
            ]);

            this.jobs = jobsResponse;
            this.stats = statsResponse;

            this.updateStats();

            if (this.jobs.size === 0) {
                this.showEmpty();
            } else {
                this.renderJobs();
            }

        } catch (error) {
            console.error('Error loading jobs:', error);
            this.showError(`Failed to load jobs: ${error.message}`);
        } finally {
            this.isLoading = false;
        }
    }

    async fetchJobs() {
        try {
            const response = await sypnexAPI.proxyGET(`${this.flowRunnerUrl}/api/jobs`);
            
            // Handle different response formats
            let jobsData;
            
            // If response has content field, parse it as JSON
            if (response.content) {
                try {
                    jobsData = JSON.parse(response.content);
                } catch (e) {
                    console.warn('Failed to parse jobs response content as JSON:', e);
                    jobsData = response;
                }
            } else if (response.success && response.data) {
                // Format: { success: true, data: { jobs: [...] } }
                jobsData = response.data;
            } else if (response.jobs) {
                // Format: { jobs: [...] }
                jobsData = response;
            } else if (Array.isArray(response)) {
                // Format: [...]
                jobsData = { jobs: response };
            } else {
                // Assume the response itself is the data
                jobsData = response;
            }


            const jobsMap = new Map();
            if (jobsData && jobsData.jobs && Array.isArray(jobsData.jobs)) {
                jobsData.jobs.forEach(job => {
                    jobsMap.set(job.id, job);
                });
            } else if (Array.isArray(jobsData)) {
                // If jobsData is directly an array of jobs
                jobsData.forEach(job => {
                    jobsMap.set(job.id, job);
                });
            }

            return jobsMap;
        } catch (error) {
            console.error('Error fetching jobs:', error);
            throw new Error(`Failed to fetch jobs: ${error.message}`);
        }
    }

    async fetchStats() {
        try {
            const response = await sypnexAPI.proxyGET(`${this.flowRunnerUrl}/api/stats`);
            
            // Handle different response formats
            let statsData;
            
            // If response has content field, parse it as JSON
            if (response.content) {
                try {
                    statsData = JSON.parse(response.content);
                } catch (e) {
                    console.warn('Failed to parse stats response content as JSON:', e);
                    statsData = response;
                }
            } else if (response.success && response.data) {
                // Format: { success: true, data: { total_jobs: 0, ... } }
                statsData = response.data;
            } else if (response.total_jobs !== undefined) {
                // Format: { total_jobs: 0, queued: 0, ... }
                statsData = response;
            } else {
                // Assume the response itself is the data
                statsData = response;
            }

            return statsData || {
                total_jobs: 0,
                queued: 0,
                running: 0,
                completed: 0,
                failed: 0,
                cancelled: 0
            };
        } catch (error) {
            console.error('Error fetching stats:', error);
            return {
                total_jobs: 0,
                queued: 0,
                running: 0,
                completed: 0,
                failed: 0,
                cancelled: 0
            };
        }
    }

    updateStats() {
        const statsElement = document.getElementById('job-stats');
        if (statsElement && this.stats) {
            const { queued = 0, running = 0, completed = 0, failed = 0, cancelled = 0 } = this.stats;
            statsElement.textContent = `Q:${queued} R:${running} C:${completed} F:${failed} X:${cancelled}`;
        }
    }

    renderJobs() {
        const container = document.getElementById('jobs-grid');
        const jobsContainer = document.getElementById('jobs-container');
        
        // Clear existing content
        container.innerHTML = '';
        
        // Sort jobs by created date (newest first)
        const sortedJobs = Array.from(this.jobs.values()).sort((a, b) => {
            return new Date(b.created_at) - new Date(a.created_at);
        });

        sortedJobs.forEach(job => {
            const jobCard = this.createJobCard(job);
            container.appendChild(jobCard);
        });

        this.showJobs();
    }

    createJobCard(job) {
        const card = document.createElement('div');
        card.className = 'job-card';
        card.innerHTML = `
            <div class="job-header">
                <div>
                    <div class="job-title">
                        <i class="fas fa-cog"></i>
                        ${this.getJobDisplayName(job.workflow_path)}
                    </div>
                    <div class="job-id">${job.id}</div>
                </div>
                <div class="job-status ${job.status}">${job.status}</div>
            </div>
            
            <div class="job-details">
                <div class="job-detail-row">
                    <span class="job-detail-label">Workflow:</span>
                    <span class="job-detail-value job-workflow-path">${job.workflow_path}</span>
                </div>
                <div class="job-detail-row">
                    <span class="job-detail-label">Created:</span>
                    <span class="job-detail-value">${this.formatDateTime(job.created_at)}</span>
                </div>
                ${job.started_at ? `
                <div class="job-detail-row">
                    <span class="job-detail-label">Started:</span>
                    <span class="job-detail-value">${this.formatDateTime(job.started_at)}</span>
                </div>
                ` : ''}
                ${job.completed_at ? `
                <div class="job-detail-row">
                    <span class="job-detail-label">Completed:</span>
                    <span class="job-detail-value">${this.formatDateTime(job.completed_at)}</span>
                </div>
                ` : ''}
                ${job.started_at && !job.completed_at ? `
                <div class="job-detail-row">
                    <span class="job-detail-label">Duration:</span>
                    <span class="job-detail-value">${this.calculateDuration(job.started_at)}</span>
                </div>
                ` : ''}
            </div>

            <div class="job-actions">
                <button class="btn btn-info btn-details" data-job-id="${job.id}">
                    <i class="fas fa-info-circle"></i> Details
                </button>
                ${job.status === 'running' || job.status === 'queued' ? `
                <button class="btn btn-danger btn-cancel" data-job-id="${job.id}">
                    <i class="fas fa-stop"></i> Cancel
                </button>
                ` : ''}
                ${job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled' ? `
                <button class="btn btn-danger btn-delete" data-job-id="${job.id}">
                    <i class="fas fa-trash"></i> Delete
                </button>
                ` : ''}
            </div>
        `;

        // Add event listeners for job actions
        const detailsBtn = card.querySelector('.btn-details');
        detailsBtn.addEventListener('click', () => {
            this.showJobDetails(job.id);
        });

        const cancelBtn = card.querySelector('.btn-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.cancelJob(job.id);
            });
        }

        const deleteBtn = card.querySelector('.btn-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.deleteJob(job.id);
            });
        }

        return card;
    }

    getJobDisplayName(workflowPath) {
        // Extract filename from path
        const parts = workflowPath.split('/');
        return parts[parts.length - 1] || 'Unknown Workflow';
    }

    formatDateTime(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleString();
        } catch (error) {
            return dateString;
        }
    }

    calculateDuration(startTime) {
        if (!startTime) return 'N/A';
        
        try {
            const start = new Date(startTime);
            const now = new Date();
            const diffMs = now - start;
            
            const minutes = Math.floor(diffMs / 60000);
            const seconds = Math.floor((diffMs % 60000) / 1000);
            
            return `${minutes}m ${seconds}s`;
        } catch (error) {
            return 'N/A';
        }
    }

    async cancelJob(jobId) {
        try {
            const response = await sypnexAPI.proxyDELETE(`${this.flowRunnerUrl}/api/jobs/${jobId}`);
            
            // Handle different response formats
            let success = false;
            let responseData = response;
            
            // If response has content field, parse it as JSON
            if (response.content) {
                try {
                    responseData = JSON.parse(response.content);
                } catch (e) {
                    console.warn('Failed to parse cancel response content as JSON:', e);
                    responseData = response;
                }
            }
            
            // Check for success indicators
            if (responseData.success) {
                success = responseData.success;
            } else if (responseData.message) {
                // If there's a message, assume success
                success = true;
            } else if (responseData.job_id) {
                // If job_id is returned, assume success
                success = true;
            } else if (response.status_code >= 200 && response.status_code < 300) {
                // If HTTP status is 2xx, assume success
                success = true;
            }
            
            if (success) {
                sypnexAPI.showNotification(`Job ${jobId} cancelled successfully`, 'success');
                this.loadJobs(false); // Refresh jobs without loading state
            } else {
                throw new Error(responseData.error || response.content || 'Failed to cancel job');
            }
        } catch (error) {
            console.error('Error cancelling job:', error);
            sypnexAPI.showNotification(`Failed to cancel job: ${error.message}`, 'error');
        }
    }

    async deleteJob(jobId) {
        // Show confirmation dialog
        if (!confirm(`Are you sure you want to permanently delete job ${jobId}?`)) {
            return;
        }

        try {
            const response = await sypnexAPI.proxyDELETE(`${this.flowRunnerUrl}/api/jobs/${jobId}/delete`);
            
            // Handle different response formats
            let success = false;
            let responseData = response;
            
            // If response has content field, parse it as JSON
            if (response.content) {
                try {
                    responseData = JSON.parse(response.content);
                } catch (e) {
                    console.warn('Failed to parse delete response content as JSON:', e);
                    responseData = response;
                }
            }
            
            // Check for success indicators
            if (responseData.success) {
                success = responseData.success;
            } else if (responseData.message) {
                // If there's a message, assume success
                success = true;
            } else if (responseData.job_id) {
                // If job_id is returned, assume success
                success = true;
            } else if (response.status_code >= 200 && response.status_code < 300) {
                // If HTTP status is 2xx, assume success
                success = true;
            }
            
            if (success) {
                sypnexAPI.showNotification(`Job ${jobId} deleted successfully`, 'success');
                this.loadJobs(false); // Refresh jobs without loading state
            } else {
                throw new Error(responseData.error || response.content || 'Failed to delete job');
            }
        } catch (error) {
            console.error('Error deleting job:', error);
            sypnexAPI.showNotification(`Failed to delete job: ${error.message}`, 'error');
        }
    }

    showJobDetails(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) {
            sypnexAPI.showNotification('Job not found', 'error');
            return;
        }

        const content = document.getElementById('job-details-content');
        content.innerHTML = `
            <div class="detail-section">
                <h4><i class="fas fa-info-circle"></i> Job Information</h4>
                <div class="detail-grid">
                    <span class="detail-label">ID:</span>
                    <span class="detail-value">${job.id}</span>
                    <span class="detail-label">Status:</span>
                    <span class="detail-value">
                        <span class="job-status ${job.status}">${job.status}</span>
                    </span>
                    <span class="detail-label">Workflow Path:</span>
                    <span class="detail-value">${job.workflow_path}</span>
                    <span class="detail-label">Sypnex OS URL:</span>
                    <span class="detail-value">${job.sypnex_os_url}</span>
                </div>
            </div>

            <div class="detail-section">
                <h4><i class="fas fa-clock"></i> Timing</h4>
                <div class="detail-grid">
                    <span class="detail-label">Created:</span>
                    <span class="detail-value">${this.formatDateTime(job.created_at)}</span>
                    <span class="detail-label">Started:</span>
                    <span class="detail-value">${this.formatDateTime(job.started_at) || 'Not started'}</span>
                    <span class="detail-label">Completed:</span>
                    <span class="detail-value">${this.formatDateTime(job.completed_at) || 'Not completed'}</span>
                </div>
            </div>

            ${job.error ? `
            <div class="detail-section">
                <h4><i class="fas fa-exclamation-triangle"></i> Error</h4>
                <div class="output-container">${job.error}</div>
            </div>
            ` : ''}

            <div class="detail-section">
                <h4><i class="fas fa-terminal"></i> Output</h4>
                <div class="output-container">
                    ${job.output ? job.output : '<div class="no-output">No output available</div>'}
                </div>
            </div>
        `;

        document.getElementById('job-details-modal').style.display = 'flex';
    }

    showJobSubmitModal() {
        document.getElementById('job-submit-modal').style.display = 'flex';
        document.getElementById('workflow-path').focus();
    }

    hideJobSubmitModal() {
        document.getElementById('job-submit-modal').style.display = 'none';
        document.getElementById('job-form').reset();
    }

    hideJobDetailsModal() {
        document.getElementById('job-details-modal').style.display = 'none';
    }

    async submitNewJob() {
        const workflowPath = document.getElementById('workflow-path').value.trim();
        const sypnexOsUrl = document.getElementById('sypnex-os-url').value.trim();

        if (!workflowPath || !sypnexOsUrl) {
            sypnexAPI.showNotification('Please fill in all required fields', 'error');
            return;
        }

        const submitBtn = document.getElementById('confirm-submit');
        const originalText = submitBtn.innerHTML;
        
        try {
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

            const response = await sypnexAPI.proxyJSON(`${this.flowRunnerUrl}/api/jobs`, {
                method: 'POST',
                data: {
                    workflow_path: workflowPath,
                    sypnex_os_url: sypnexOsUrl
                }
            });

            // Handle different response formats
            let success = false;
            let responseData = response;
            
            // If response has content field, parse it as JSON
            if (response.content) {
                try {
                    responseData = JSON.parse(response.content);
                } catch (e) {
                    console.warn('Failed to parse response content as JSON:', e);
                    responseData = response;
                }
            }
            
            // Check for success indicators
            if (responseData.success) {
                success = responseData.success;
            } else if (responseData.job_id || responseData.id) {
                // If job_id or id is returned, assume success
                success = true;
            } else if (responseData.created_at) {
                // If created_at is present, assume success
                success = true;
            } else if (response.status_code >= 200 && response.status_code < 300) {
                // If HTTP status is 2xx, assume success
                success = true;
            }

            if (success) {
                const jobId = responseData.job_id || responseData.id || 'unknown';
                sypnexAPI.showNotification(`Job ${jobId} submitted successfully!`, 'success');
                this.hideJobSubmitModal();
                this.loadJobs(false); // Refresh jobs without loading state
            } else {
                throw new Error(responseData.error || response.content || 'Failed to submit job');
            }
        } catch (error) {
            console.error('Error submitting job:', error);
            sypnexAPI.showNotification(`Failed to submit job: ${error.message}`, 'error');
        } finally {
            // Restore button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    showLoading() {
        this.hideAllViews();
        document.getElementById('loading-state').style.display = 'flex';
    }

    showError(message) {
        this.hideAllViews();
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-state').style.display = 'flex';
    }

    showEmpty() {
        this.hideAllViews();
        document.getElementById('empty-state').style.display = 'flex';
    }

    showJobs() {
        this.hideAllViews();
        document.getElementById('jobs-container').style.display = 'flex';
    }

    hideAllViews() {
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('error-state').style.display = 'none';
        document.getElementById('empty-state').style.display = 'none';
        document.getElementById('jobs-container').style.display = 'none';
    }
}

// Initialize the Flow Runner app
const flowRunner = new FlowRunner();
