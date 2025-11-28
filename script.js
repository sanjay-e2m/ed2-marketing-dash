/**
 * Ed2-Marketing - Main Script
 * Handles task management, rendering, and API interactions.
 */

'use strict';

// Constants
const API_ENDPOINT = 'https://n8n.sitepreviews.dev/webhook/v1/ed2-market-client-tasks';
const TOAST_DURATION = 3000;

// Global variable to store meeting title
let meetingTitle = '';

let tasks = [];

/**
 * Toast Notification System
 * Displays a temporary notification message to the user
 * @param {string} message - The message to display
 * @param {string} type - Type of toast: 'success', 'error', 'info'
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ'
    };

    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, TOAST_DURATION);
}

/**
 * Displays the meeting title if available
 */
function displayMeetingTitle() {
    if (meetingTitle) {
        const container = document.getElementById('meetingTitleContainer');
        const titleElement = document.getElementById('meetingTitleDisplay');

        if (container && titleElement) {
            titleElement.textContent = meetingTitle;
            container.style.display = 'block';
        }
    }
}

/**
 * Show/Hide Loader Overlay
 * Controls the visibility of the loading spinner overlay
 * @param {boolean} show - Whether to show or hide the loader
 */
function toggleLoader(show) {
    const loader = document.getElementById('loaderOverlay');
    if (show) {
        loader.classList.add('active');
    } else {
        loader.classList.remove('active');
    }
}

/**
 * Load tasks from URL
 * Parses task data from URL parameters and initializes the tasks array
 */
function loadTasksFromURL() {
    const params = new URLSearchParams(window.location.search);
    const encodedData = params.get("data");
    if (!encodedData) return;

    try {
        const decoded = decodeURIComponent(encodedData);
        const parsed = JSON.parse(decoded);

        // Extract meeting title if present
        if (parsed.meeting_title) {
            meetingTitle = parsed.meeting_title;
        }

        // Extract tasks array
        const tasksArray = parsed.tasks || parsed;

        tasks = tasksArray.map((item, index) => ({
            id: Date.now() + index,
            task: item.task || "",
            owner: item.owner || ""
        }));

        // Display meeting title if available
        displayMeetingTitle();
    } catch (err) {
        console.error("Invalid task data in URL", err);
    }
}

/**
 * Renders the list of tasks to the DOM.
 */
function renderTasks() {
    const container = document.getElementById("taskList");
    container.innerHTML = "";

    tasks.forEach((t, index) => {
        // Create task row element
        const taskRow = document.createElement('div');
        taskRow.className = 'task-item-row';

        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-task-btn';
        deleteBtn.title = 'Delete Task';
        deleteBtn.textContent = '🗑️';
        deleteBtn.addEventListener('click', () => deleteTask(t.id));

        // Create task name field
        const taskNameField = document.createElement('div');
        taskNameField.className = 'task-item-field';

        const taskNameLabel = document.createElement('label');
        taskNameLabel.textContent = `Task ${index + 1}`;

        const taskNameInput = document.createElement('input');
        taskNameInput.type = 'text';
        taskNameInput.id = `task-name-${t.id}`;
        taskNameInput.value = t.task;
        taskNameInput.placeholder = 'Task Name';

        taskNameField.appendChild(taskNameLabel);
        taskNameField.appendChild(taskNameInput);

        // Create owner field
        const ownerField = document.createElement('div');
        ownerField.className = 'task-item-field';

        const ownerLabel = document.createElement('label');
        ownerLabel.textContent = 'Assigned To';

        const ownerInput = document.createElement('input');
        ownerInput.type = 'text';
        ownerInput.id = `owner-${t.id}`;
        ownerInput.value = t.owner;
        ownerInput.placeholder = 'Owner';

        ownerField.appendChild(ownerLabel);
        ownerField.appendChild(ownerInput);

        // Assemble the row
        taskRow.appendChild(deleteBtn);
        taskRow.appendChild(taskNameField);
        taskRow.appendChild(ownerField);

        container.appendChild(taskRow);
    });
}

/**
 * Saves all tasks to the webhook.
 * Collects task data from the UI and sends it to the backend API
 */
async function saveAllTasks() {
    // Get Global Meeting Type
    const globalMeetingType = document.getElementById("globalMeetingType").value;

    // Collect current state of tasks from the DOM
    const currentTasks = tasks.map(t => {
        const taskName = document.getElementById(`task-name-${t.id}`).value.trim();
        const owner = document.getElementById(`owner-${t.id}`).value.trim();

        return {
            id: t.id,
            task: taskName,
            owner: owner
        };
    });

    // Update local state
    currentTasks.forEach((newT, i) => {
        tasks[i].task = newT.task;
        tasks[i].owner = newT.owner;
    });

    // Create the main JSON structure with meeting title and meeting type
    const jsonData = {
        meeting_title: meetingTitle,
        meetingType: globalMeetingType,
        tasks: currentTasks
    };

    // Show loader
    toggleLoader(true);

    try {
        const response = await fetch(API_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(jsonData)
        });

        if (response.ok) {
            showToast('All tasks saved successfully!', 'success');
        } else {
            const errorMessage = await response.text();
            throw new Error(`Server responded with status ${response.status}: ${errorMessage}`);
        }
    } catch (error) {
        console.error("Error saving tasks:", error);
        if (error instanceof TypeError) {
            showToast('Network error. Please check your connection.', 'error');
        } else {
            showToast('Error saving tasks. Please try again.', 'error');
        }
    } finally {
        // Hide loader
        toggleLoader(false);
    }
}

/**
 * Modal Functions
 * Controls the visibility of the add task modal
 */
function openModal() {
    document.getElementById("modal").style.display = "flex";
    document.getElementById("newTask").focus();
}

function closeModal() {
    document.getElementById("modal").style.display = "none";

    // Reset the form
    const taskForm = document.getElementById("taskForm");
    if (taskForm) {
        taskForm.reset();
    }
}

/**
 * Adds a new task to the task list
 * Validates input and updates the UI
 */
function addTask() {
    const taskInput = document.getElementById("newTask");
    const ownerInput = document.getElementById("newOwner");
    const newTask = taskInput.value.trim();
    const newOwner = ownerInput.value.trim();

    if (!newTask || !newOwner) {
        showToast('Please fill in the Task Name and Owner fields.', 'error');
        return;
    }

    tasks.push({
        id: Date.now(),
        task: newTask,
        owner: newOwner
    });

    // Reset form and close modal
    taskInput.value = '';
    ownerInput.value = '';
    closeModal();
    renderTasks();
    showToast('Task added successfully!', 'success');
}

/**
 * Deletes a task by ID
 * @param {number} taskId - The ID of the task to delete
 */
function deleteTask(taskId) {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
        showToast('Task not found!', 'error');
        return;
    }

    const taskName = tasks[taskIndex].task;
    tasks.splice(taskIndex, 1);
    renderTasks();
    showToast(`Task deleted successfully!`, 'success');
}

// Event Listeners
window.addEventListener('click', function (event) {
    if (event.target.id === "modal") closeModal();
});

// Initialize
loadTasksFromURL();
renderTasks();
