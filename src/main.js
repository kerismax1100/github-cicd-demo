import {
  addTodo,
  clearDone,
  countActive,
  filterTodos,
  removeTodo,
  toggleTodo,
  validateTitle,
} from './todo.js';

const STORAGE_KEY = 'cicd-demo-todos';

const form = document.querySelector('#todo-form');
const input = document.querySelector('#todo-input');
const errorText = document.querySelector('#form-error');
const list = document.querySelector('#todo-list');
const count = document.querySelector('#todo-count');
const clearButton = document.querySelector('#clear-done');
const filterButtons = document.querySelectorAll('[data-filter]');

let todos = load();
let currentFilter = 'all';

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function update(next) {
  todos = next;
  save();
  render();
}

function render() {
  list.replaceChildren(
    ...filterTodos(todos, currentFilter).map((todo) => {
      const item = document.createElement('li');
      item.className = todo.done ? 'todo done' : 'todo';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = todo.done;
      checkbox.id = `todo-${todo.id}`;
      checkbox.addEventListener('change', () => update(toggleTodo(todos, todo.id)));

      const label = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.textContent = todo.title;

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'remove';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `Xoá ${todo.title}`);
      remove.addEventListener('click', () => update(removeTodo(todos, todo.id)));

      item.append(checkbox, label, remove);
      return item;
    }),
  );

  const active = countActive(todos);
  count.textContent = `${active} việc chưa xong`;
  filterButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.filter === currentFilter));
  });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const error = validateTitle(input.value);
  errorText.textContent = error ?? '';
  if (error) return;
  update(addTodo(todos, input.value));
  input.value = '';
  input.focus();
});

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;
    render();
  });
});

clearButton.addEventListener('click', () => update(clearDone(todos)));

render();
