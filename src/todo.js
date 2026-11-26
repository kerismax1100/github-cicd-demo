// Pure functions: no DOM, no storage. Easy to unit test.

export const MAX_TITLE_LENGTH = 100;
export const FILTERS = ['all', 'active', 'done'];

export function validateTitle(title) {
  const value = String(title ?? '').trim();
  if (value.length === 0) return 'Vui lòng nhập tên công việc.';
  if (value.length > MAX_TITLE_LENGTH) {
    return `Tên công việc tối đa ${MAX_TITLE_LENGTH} ký tự.`;
  }
  return null;
}

export function addTodo(todos, title, id = crypto.randomUUID()) {
  if (validateTitle(title)) return todos;
  return [...todos, { id, title: title.trim(), done: false }];
}

export function toggleTodo(todos, id) {
  return todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo));
}

export function removeTodo(todos, id) {
  return todos.filter((todo) => todo.id !== id);
}

export function clearDone(todos) {
  return todos.filter((todo) => !todo.done);
}

export function filterTodos(todos, filter) {
  if (filter === 'active') return todos.filter((todo) => !todo.done);
  if (filter === 'done') return todos.filter((todo) => todo.done);
  return todos;
}

export function countActive(todos) {
  return todos.filter((todo) => !todo.done).length;
}
