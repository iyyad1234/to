class TaskManager {
    constructor() {
        this.tasks = [];
        this.xp = 0;
        this.level = 1;
        this.xpPerLevel = 100;
        this.lastLevelPopup = 1; // Track last level popup was shown
        
        // DOM Elements
        this.taskInput = document.getElementById('task-input');
        this.addTaskBtn = document.getElementById('add-task-btn');
        this.todoTasks = document.getElementById('todo-tasks');
        this.inProgressTasks = document.getElementById('in-progress-tasks');
        this.completedTasks = document.getElementById('completed-tasks');
        this.xpProgress = document.getElementById('xp-progress');
        this.xpCount = document.getElementById('xp-count');
        this.userLevel = document.getElementById('user-level');
        this.levelUpAnimation = document.getElementById('level-up-animation');
        this.newLevel = document.getElementById('new-level');
        this.resetBtn = document.getElementById('reset-btn');
        
        this.init();
    }
    
    init() {
        // Load saved data
        this.loadData();
        
        // Event Listeners
        this.addTaskBtn.addEventListener('click', () => this.addTask());
        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => this.resetProgress());
        }
        // Initialize drag and drop
        this.initializeDragAndDrop();
    }
    
    loadData() {
        const savedData = localStorage.getItem('taskManagerData');
        if (savedData) {
            const data = JSON.parse(savedData);
            this.tasks = data.tasks;
            this.xp = data.xp;
            this.level = data.level;
            // Always sync lastLevelPopup to the loaded level, ignore saved value
            this.lastLevelPopup = this.level;
            this.updateUI();
        } else {
            this.lastLevelPopup = this.level;
        }
    }
    
    saveData() {
        const data = {
            tasks: this.tasks,
            xp: this.xp,
            level: this.level,
            lastLevelPopup: this.lastLevelPopup
        };
        localStorage.setItem('taskManagerData', JSON.stringify(data));
    }
    
    addTask() {
        const taskText = this.taskInput.value.trim();
        if (taskText) {
            const task = {
                id: Date.now(),
                text: taskText,
                status: 'todo'
            };
            
            this.tasks.push(task);
            this.taskInput.value = '';
            this.updateUI();
            this.saveData();
        }
    }
    
    updateUI() {
        // Clear all task lists
        this.todoTasks.innerHTML = '';
        this.inProgressTasks.innerHTML = '';
        this.completedTasks.innerHTML = '';
        
        // Calculate XP needed for next level
        const xpForCurrentLevel = this.getXPForLevel(this.level);
        const xpForNextLevel = this.getXPForLevel(this.level + 1);
        const xpIntoLevel = Math.max(0, this.xp - xpForCurrentLevel);
        const xpNeeded = xpForNextLevel - xpForCurrentLevel;
        const progressPercent = xpNeeded > 0 ? (xpIntoLevel / xpNeeded) * 100 : 0;
        
        // Update XP and level display
        this.xpProgress.style.width = `${progressPercent}%`;
        this.xpCount.textContent = `${xpIntoLevel}/${xpNeeded} XP`;
        this.userLevel.textContent = this.level;
        
        // Add tasks to their respective columns
        this.tasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            switch (task.status) {
                case 'todo':
                    this.todoTasks.appendChild(taskElement);
                    break;
                case 'in-progress':
                    this.inProgressTasks.appendChild(taskElement);
                    break;
                case 'completed':
                    this.completedTasks.appendChild(taskElement);
                    break;
            }
        });
    }
    
    createTaskElement(task) {
        const taskElement = document.createElement('div');
        taskElement.className = 'task';
        taskElement.draggable = true;
        taskElement.dataset.id = task.id;
        taskElement.textContent = task.text;
        
        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.className = 'delete-task-btn';
        deleteBtn.style.marginLeft = '10px';
        deleteBtn.style.background = 'none';
        deleteBtn.style.border = 'none';
        deleteBtn.style.color = '#e53e3e';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteTask(task.id);
        });
        taskElement.appendChild(deleteBtn);
        
        // Add 'Mark as Completed' button only for tasks in 'In Progress'
        if (task.status === 'in-progress') {
            const completeBtn = document.createElement('button');
            completeBtn.textContent = 'Mark as Completed';
            completeBtn.className = 'mark-completed-btn';
            completeBtn.style.marginLeft = '10px';
            completeBtn.style.background = '#4CAF50';
            completeBtn.style.color = '#fff';
            completeBtn.style.border = 'none';
            completeBtn.style.borderRadius = '5px';
            completeBtn.style.cursor = 'pointer';
            completeBtn.style.padding = '2px 8px';
            completeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.markTaskAsCompleted(task.id);
            });
            taskElement.appendChild(completeBtn);
        }
        
        taskElement.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', task.id);
            taskElement.classList.add('dragging');
        });
        
        taskElement.addEventListener('dragend', () => {
            taskElement.classList.remove('dragging');
        });
        
        return taskElement;
    }
    
    initializeDragAndDrop() {
        const columns = document.querySelectorAll('.tasks');
        
        columns.forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
            });
            
            column.addEventListener('drop', (e) => {
                e.preventDefault();
                const taskId = e.dataTransfer.getData('text/plain');
                const task = this.tasks.find(t => t.id === parseInt(taskId));
                
                if (task) {
                    let newStatus;
                    switch (column.parentElement.id) {
                        case 'todo-column':
                            newStatus = 'todo';
                            break;
                        case 'in-progress-column':
                            newStatus = 'in-progress';
                            break;
                        case 'completed-column':
                            newStatus = 'completed';
                            break;
                        default:
                            newStatus = 'todo';
                    }
                    const oldStatus = task.status;
                    task.status = newStatus;
                    // Add XP when moving to completed
                    if (newStatus === 'completed' && oldStatus !== 'completed') {
                        const xpReward = this.level * 10;
                        console.log(`Task moved to completed. Adding XP: ${xpReward}`);
                        this.addXP(xpReward);
                    }
                    this.updateUI();
                    this.saveData();
                }
            });
        });
    }
    
    addXP(amount) {
        const prevLevel = this.level;
        this.xp += amount;
        console.log(`XP added: ${amount}, total XP: ${this.xp}`);
        // Calculate new level based on increasing XP requirements
        let newLevel = this.level;
        while (this.xp >= this.getXPForLevel(newLevel + 1)) {
            newLevel++;
        }
        if (newLevel > this.level) {
            this.level = newLevel;
        }
        // Only show popup if we just reached a new level by gaining XP
        if (this.level > prevLevel) {
            this.showLevelUpAnimation();
            this.lastLevelPopup = this.level;
        }
        this.updateUI();
        this.saveData();
    }
    
    showLevelUpAnimation() {
        // Award skill points: (level - 1) * 5
        const user = getCurrentUser();
        if (user) {
            const userSkills = getUserSkills(user.username);
            userSkills.points += (this.level - 1) * 5;
            setUserSkills(user.username, userSkills);
        }
        this.newLevel.textContent = this.level;
        this.levelUpAnimation.classList.remove('hidden');
        setTimeout(() => {
            this.levelUpAnimation.classList.add('hidden');
        }, 2000);
    }
    
    resetProgress() {
        localStorage.removeItem('taskManagerData');
        // Also remove skills for the current user
        const user = getCurrentUser();
        if (user) {
            const allSkills = JSON.parse(localStorage.getItem('todoAppSkills') || '{}');
            delete allSkills[user.username];
            localStorage.setItem('todoAppSkills', JSON.stringify(allSkills));
        }
        window.location.reload();
    }
    
    deleteTask(taskId) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        this.updateUI();
        this.saveData();
    }
    
    markTaskAsCompleted(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.status !== 'completed') {
            const oldStatus = task.status;
            task.status = 'completed';
            if (oldStatus !== 'completed') {
                const xpReward = this.level * 10;
                console.log(`Task marked as completed. Adding XP: ${xpReward}`);
                this.addXP(xpReward);
            }
            this.updateUI();
            this.saveData();
        }
    }
    
    // Returns the total XP required to reach a given level
    getXPForLevel(level) {
        if (level <= 1) return 0;
        return ((level - 1) * level * 50);
    }
}

// Initialize the app
window.addEventListener('load', () => {
    window._taskManagerInstance = new TaskManager();
});

// Add a reset button to the UI if not present
window.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('reset-btn')) {
        const btn = document.createElement('button');
        btn.id = 'reset-btn';
        btn.textContent = 'Reset Progress';
        btn.style.position = 'fixed';
        btn.style.bottom = '20px';
        btn.style.right = '20px';
        btn.style.padding = '10px 20px';
        btn.style.background = '#e53e3e';
        btn.style.color = '#fff';
        btn.style.border = 'none';
        btn.style.borderRadius = '8px';
        btn.style.cursor = 'pointer';
        btn.style.zIndex = '1000';
        document.body.appendChild(btn);
    }
});

// AUTH LOGIC
function showAuthModal() {
    document.getElementById('auth-modal').classList.remove('hidden');
}
function hideAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
    document.getElementById('auth-message').textContent = '';
}
function switchAuthTab(tab) {
    document.getElementById('signin-form').classList.toggle('hidden', tab !== 'signin');
    document.getElementById('signup-form').classList.toggle('hidden', tab !== 'signup');
    document.getElementById('tab-signin').style.background = tab === 'signin' ? '#4CAF50' : '#eee';
    document.getElementById('tab-signup').style.background = tab === 'signup' ? '#4CAF50' : '#eee';
}
function isAuthenticated() {
    return !!localStorage.getItem('todoAppUser');
}
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('todoAppUser') || 'null');
}
function setCurrentUser(user) {
    localStorage.setItem('todoAppUser', JSON.stringify(user));
}
function signOut() {
    localStorage.removeItem('todoAppUser');
    location.reload();
}
// Modal event listeners
window.addEventListener('DOMContentLoaded', () => {
    const openBtn = document.getElementById('open-auth-modal');
    const closeBtn = document.getElementById('close-auth-modal');
    const tabSignin = document.getElementById('tab-signin');
    const tabSignup = document.getElementById('tab-signup');
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    if (openBtn) openBtn.onclick = showAuthModal;
    if (closeBtn) closeBtn.onclick = hideAuthModal;
    if (tabSignin) tabSignin.onclick = () => switchAuthTab('signin');
    if (tabSignup) tabSignup.onclick = () => switchAuthTab('signup');
    switchAuthTab('signin');
    // Sign Up
    if (signupForm) signupForm.onsubmit = function(e) {
        e.preventDefault();
        const username = document.getElementById('signup-username').value.trim();
        const password = document.getElementById('signup-password').value;
        if (!username || !password) return;
        let users = JSON.parse(localStorage.getItem('todoAppUsers') || '{}');
        if (users[username]) {
            document.getElementById('auth-message').textContent = 'User already exists!';
            return;
        }
        users[username] = { password };
        localStorage.setItem('todoAppUsers', JSON.stringify(users));
        setCurrentUser({ username });
        hideAuthModal();
        location.reload();
    };
    // Sign In
    if (signinForm) signinForm.onsubmit = function(e) {
        e.preventDefault();
        const username = document.getElementById('signin-username').value.trim();
        const password = document.getElementById('signin-password').value;
        let users = JSON.parse(localStorage.getItem('todoAppUsers') || '{}');
        if (!users[username] || users[username].password !== password) {
            document.getElementById('auth-message').textContent = 'Invalid credentials!';
            return;
        }
        setCurrentUser({ username });
        hideAuthModal();
        location.reload();
    };
    // Show modal on load if not authenticated
    if (!isAuthenticated()) {
        showAuthModal();
        document.querySelector('.app-container').style.display = 'none';
        document.getElementById('reset-btn').style.display = 'none';
        document.getElementById('signout-btn').style.display = 'none';
        document.getElementById('current-username').textContent = '';
        document.getElementById('open-auth-modal').style.display = '';
    } else {
        document.querySelector('.app-container').style.display = '';
        if (document.getElementById('reset-btn')) document.getElementById('reset-btn').style.display = '';
        document.getElementById('signout-btn').style.display = '';
        // Show username
        const user = getCurrentUser();
        document.getElementById('current-username').textContent = user && user.username ? user.username : '';
        document.getElementById('open-auth-modal').style.display = 'none';
    }
    // Sign Out button handler
    const signoutBtn = document.getElementById('signout-btn');
    if (signoutBtn) signoutBtn.onclick = signOut;
});

// SKILLS LOGIC
const DEFAULT_SKILLS = [
    { key: 'productivity', name: 'Productivity', level: 0 },
    { key: 'focus', name: 'Focus', level: 0 },
    { key: 'organization', name: 'Organization', level: 0 }
];
function getUserSkills(username) {
    const allSkills = JSON.parse(localStorage.getItem('todoAppSkills') || '{}');
    if (!allSkills[username]) {
        allSkills[username] = { points: 0, skills: DEFAULT_SKILLS.map(s => ({ ...s })) };
        localStorage.setItem('todoAppSkills', JSON.stringify(allSkills));
    }
    return allSkills[username];
}
function setUserSkills(username, data) {
    const allSkills = JSON.parse(localStorage.getItem('todoAppSkills') || '{}');
    allSkills[username] = data;
    localStorage.setItem('todoAppSkills', JSON.stringify(allSkills));
}
function renderSkills() {
    const user = getCurrentUser();
    if (!user) return;
    const userSkills = getUserSkills(user.username);
    document.getElementById('skill-points').textContent = userSkills.points;
    const skillsList = document.getElementById('skills-list');
    skillsList.innerHTML = '';
    userSkills.skills.forEach((skill, idx) => {
        const skillDiv = document.createElement('div');
        skillDiv.style.display = 'flex';
        skillDiv.style.justifyContent = 'space-between';
        skillDiv.style.alignItems = 'center';
        skillDiv.style.marginBottom = '10px';
        skillDiv.innerHTML = `<span style='font-weight:bold;'>${skill.name}</span> <span>Level: ${skill.level}</span>`;
        const upgradeBtn = document.createElement('button');
        upgradeBtn.textContent = 'Upgrade';
        upgradeBtn.style.marginLeft = '10px';
        upgradeBtn.style.background = '#4CAF50';
        upgradeBtn.style.color = '#fff';
        upgradeBtn.style.border = 'none';
        upgradeBtn.style.borderRadius = '5px';
        upgradeBtn.style.cursor = userSkills.points > 0 ? 'pointer' : 'not-allowed';
        upgradeBtn.disabled = userSkills.points === 0;
        upgradeBtn.onclick = () => {
            if (userSkills.points > 0) {
                userSkills.skills[idx].level++;
                userSkills.points--;
                setUserSkills(user.username, userSkills);
                renderSkills();
                // Check if all skills are at least level 10
                if (userSkills.skills.every(s => s.level >= 10)) {
                    // Level up the user
                    const taskManager = window._taskManagerInstance;
                    if (taskManager) {
                        taskManager.level++;
                        taskManager.showLevelUpAnimation();
                        taskManager.updateUI();
                        taskManager.saveData();
                    }
                }
            }
        };
        skillDiv.appendChild(upgradeBtn);
        skillsList.appendChild(skillDiv);
    });
}
// Modal event listeners for skills
window.addEventListener('DOMContentLoaded', () => {
    const openSkillsBtn = document.getElementById('open-skills-modal');
    const closeSkillsBtn = document.getElementById('close-skills-modal');
    if (openSkillsBtn) openSkillsBtn.onclick = () => {
        renderSkills();
        document.getElementById('skills-modal').classList.remove('hidden');
    };
    if (closeSkillsBtn) closeSkillsBtn.onclick = () => {
        document.getElementById('skills-modal').classList.add('hidden');
    };
}); 