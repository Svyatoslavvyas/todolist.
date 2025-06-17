// Храним список задач и данные UI
const tasks = [];
let lastTaskId = 0;

// Ссылки на DOM-элементы
let taskList, addTaskButton, loginButton, registerButton, logoutButton;
let usernameInput, passwordInput, firstnameInput, lastnameInput;
let connectionStatus, taskInput;

// URL сервера API
const API_BASE_URL = 'https://demo2.z-bit.ee';

// Ключи для хранения токена и имени пользователя в localStorage
const AUTH_TOKEN_KEY = 'todo_app_auth_token';
const USER_KEY = 'todo_app_user';

// Загружаем токен из localStorage, если есть
let authToken = localStorage.getItem(AUTH_TOKEN_KEY) || null;

// Инициализация после загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
  initializeElements();
  setupEventListeners();
  checkAuthState();
});

// Получаем все элементы из DOM
function initializeElements() {
  taskList = document.getElementById('task-list');
  addTaskButton = document.getElementById('add-task');
  loginButton = document.getElementById('login');
  registerButton = document.getElementById('register');
  logoutButton = document.getElementById('logout');
  usernameInput = document.getElementById('username');
  passwordInput = document.getElementById('password');
  firstnameInput = document.getElementById('firstname');
  lastnameInput = document.getElementById('lastname');
  connectionStatus = document.getElementById('connection-status');
  taskInput = document.getElementById('task-input');
}

// Назначаем обработчики событий
function setupEventListeners() {
  addTaskButton.addEventListener('click', handleAddTask);
  loginButton.addEventListener('click', handleLogin);
  registerButton.addEventListener('click', handleRegister);
  logoutButton.addEventListener('click', handleLogout);

  // Добавление задачи по Enter
  taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddTask();
  });

  // Убираем сообщение о соединении при вводе
  taskInput.addEventListener('input', () => {
    if (connectionStatus.style.display === 'block') {
      connectionStatus.style.display = 'none';
    }
  });
}

// Показываем сообщение (ошибка, инфо, успех)
function showConnectionStatus(message, type = 'error') {
  connectionStatus.style.display = 'block';
  connectionStatus.textContent = message;
  connectionStatus.className = `ant-alert ant-alert-${type}`;
  if (type !== 'error') {
    setTimeout(() => { connectionStatus.style.display = 'none'; }, 3000);
  }
}

// Обновляем видимость элементов UI в зависимости от авторизации
function updateAuthUI(isAuthenticated) {
  const authInputs = [usernameInput, passwordInput, firstnameInput, lastnameInput, registerButton, loginButton];
  authInputs.forEach(el => el.style.display = isAuthenticated ? 'none' : 'inline-block');
  logoutButton.style.display = isAuthenticated ? 'inline-block' : 'none';
  taskInput.style.display = isAuthenticated ? 'inline-block' : 'none';
  addTaskButton.style.display = isAuthenticated ? 'inline-block' : 'none';
  taskList.innerHTML = '';
}

// Проверяем, авторизован ли пользователь
function checkAuthState() {
  const user = localStorage.getItem(USER_KEY);
  if (authToken && user) {
    updateAuthUI(true);
    loadTasks(); // загружаем задачи
  } else {
    updateAuthUI(false);
  }
}

// Обработка входа в систему
async function handleLogin() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    showConnectionStatus('Username and password required', 'error');
    return;
  }

  try {
    showConnectionStatus('Logging in...', 'info');
    const response = await fetch(`${API_BASE_URL}/users/get-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) throw new Error('Invalid credentials');

    const data = await response.json();
    authToken = data.access_token;

    // Сохраняем токен и имя пользователя
    localStorage.setItem(AUTH_TOKEN_KEY, authToken);
    localStorage.setItem(USER_KEY, username);

    updateAuthUI(true);
    await loadTasks();
    showConnectionStatus('Login successful!', 'success');
  } catch (error) {
    showConnectionStatus(`Login failed: ${error.message}`, 'error');
  }
}

// Регистрация нового пользователя
async function handleRegister() {
  const username = usernameInput.value.trim();
  const firstname = firstnameInput.value.trim();
  const lastname = lastnameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !firstname || !lastname || !password) {
    showConnectionStatus('Fill in all registration fields', 'error');
    return;
  }

  try {
    showConnectionStatus('Registering...', 'info');
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, firstname, lastname, newPassword: password })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Registration error');

    authToken = data.access_token;
    localStorage.setItem(AUTH_TOKEN_KEY, authToken);
    localStorage.setItem(USER_KEY, username);
    updateAuthUI(true);
    await loadTasks();
    showConnectionStatus('Registered & logged in!', 'success');
  } catch (error) {
    showConnectionStatus(`Register failed: ${error.message}`, 'error');
  }
}

// Выход из системы
function handleLogout() {
  authToken = null;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  tasks.length = 0;
  updateAuthUI(false);
  showConnectionStatus('Logged out', 'success');
}

// Загрузка задач с сервера
async function loadTasks() {
  try {
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) throw new Error('Failed to load tasks');

    const loadedTasks = await response.json();
    tasks.length = 0;
    tasks.push(...loadedTasks);
    taskList.innerHTML = '';
    loadedTasks.forEach(renderTask);
  } catch (error) {
    showConnectionStatus(error.message, 'error');
  }
}

// Отображение задачи на экране
function renderTask(task) {
  const template = document.getElementById('task-template');
  const taskRow = template.content.cloneNode(true).firstElementChild;

  const nameInput = taskRow.querySelector("[name='name']");
  const completedCheckbox = taskRow.querySelector("[name='completed']");
  const deleteButton = taskRow.querySelector('.delete-task');

  nameInput.value = task.name || task.title;
  completedCheckbox.checked = task.completed;

  nameInput.addEventListener('change', () => updateTask(task.id, { name: nameInput.value }));
  completedCheckbox.addEventListener('change', () => updateTask(task.id, { marked_as_done: completedCheckbox.checked }));
  deleteButton.addEventListener('click', () => deleteTask(task.id, taskRow));

  taskList.appendChild(taskRow);
}

// Обновление задачи на сервере
async function updateTask(id, updates) {
  const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(updates)
  });

  if (!response.ok) showConnectionStatus('Failed to update task', 'error');
}

// Удаление задачи с сервера и из списка
async function deleteTask(id, taskElement) {
  const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${authToken}` }
  });

  if (!response.ok) {
    showConnectionStatus('Failed to delete task', 'error');
    return;
  }
  taskList.removeChild(taskElement);
  showConnectionStatus('Task deleted', 'success');
}

// Обработка добавления новой задачи
async function handleAddTask() {
  const taskName = taskInput.value.trim();
  if (!taskName) {
    showConnectionStatus('Enter a task name', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ title: taskName, marked_as_done: false })
    });

    if (!response.ok) throw new Error('Failed to add task');
    const savedTask = await response.json();
    tasks.push(savedTask);
    renderTask(savedTask);
    taskInput.value = '';
  } catch (error) {
    showConnectionStatus(error.message, 'error');
  }
}
