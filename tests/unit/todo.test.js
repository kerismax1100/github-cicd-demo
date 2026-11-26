import { describe, expect, it } from 'vitest';
import {
  addTodo,
  clearDone,
  countActive,
  filterTodos,
  removeTodo,
  toggleTodo,
  validateTitle,
} from '../../src/todo.js';

const sample = [
  { id: 1, title: 'Học GitHub Actions', done: false },
  { id: 2, title: 'Viết unit test', done: true },
];


describe('validateTitle', () => {
  it('báo lỗi khi tên trống', () => {
    expect(validateTitle('   ')).toBe('Vui lòng nhập tên công việc.');
  });

  it('báo lỗi khi tên dài hơn 100 ký tự', () => {
    expect(validateTitle('a'.repeat(101))).toMatch(/tối đa 100/);
  });

  it('chấp nhận tên hợp lệ', () => {
    expect(validateTitle('Deploy lên GitHub Pages')).toBeNull();
  });
});

describe('addTodo', () => {
  it('thêm việc mới, bỏ khoảng trắng thừa', () => {
    const result = addTodo([], '  Đọc log CI  ', 42);
    expect(result).toEqual([{ id: 42, title: 'Đọc log CI', done: false }]);
  });
  
  it('không thêm khi tên không hợp lệ', () => {
    expect(addTodo(sample, '')).toBe(sample);
  });

  it('không sửa mảng gốc', () => {
    addTodo(sample, 'Việc mới', 3);
    expect(sample).toHaveLength(2);
  });

  it('kiểm tra số lượng mảng mới', () => {
    const result = addTodo(sample, 'Việc mới', 3);
    expect(result).toHaveLength(3);
  });
});

describe('toggleTodo, removeTodo, clearDone', () => {
  it('đảo trạng thái hoàn thành', () => {
    expect(toggleTodo(sample, 1)[0].done).toBe(true);
  });

  it('xoá đúng việc theo id', () => {
    expect(removeTodo(sample, 1).map((t) => t.id)).toEqual([2]);
  });

  it('xoá mọi việc đã xong', () => {
    expect(clearDone(sample).map((t) => t.id)).toEqual([1]);
  });
});

describe('filterTodos và countActive', () => {
  it.each([
    ['all', [1, 2]],
    ['active', [1]],
    ['done', [2]],
  ])('bộ lọc "%s"', (filter, ids) => {
    expect(filterTodos(sample, filter).map((t) => t.id)).toEqual(ids);
  });

  it('đếm việc chưa xong', () => {
    expect(countActive(sample)).toBe(1);
  });
});
