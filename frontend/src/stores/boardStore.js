import { create } from 'zustand';
import api from '../lib/api';

const useBoardStore = create((set) => ({
  boards: [],
  isLoading: false,

  fetchBoards: async (projectId) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/projects/${projectId}/boards`);
      set({ boards: data.data, isLoading: false });
      return data.data;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  createBoard: async (projectId, boardData) => {
    const { data } = await api.post(`/projects/${projectId}/boards`, boardData);
    set((state) => ({ boards: [...state.boards, data.data] }));
    return data.data;
  },

  updateBoard: async (projectId, boardId, updates) => {
    const { data } = await api.put(`/projects/${projectId}/boards/${boardId}`, updates);
    set((state) => ({
      boards: state.boards.map((b) => (b.id === boardId ? { ...b, ...data.data } : b)),
    }));
    return data.data;
  },

  deleteBoard: async (projectId, boardId) => {
    await api.delete(`/projects/${projectId}/boards/${boardId}`);
    set((state) => ({ boards: state.boards.filter((b) => b.id !== boardId) }));
  },

  // Task operations on boards
  addTaskToBoard: (boardId, task) => {
    set((state) => ({
      boards: state.boards.map((b) =>
        b.id === boardId ? { ...b, tasks: [...(b.tasks || []), task] } : b
      ),
    }));
  },

  updateTaskInBoard: (taskId, updatedTask) => {
    set((state) => ({
      boards: state.boards.map((b) => ({
        ...b,
        tasks: (b.tasks || []).map((t) => (t.id === taskId ? updatedTask : t)),
      })),
    }));
  },

  removeTaskFromBoard: (taskId) => {
    set((state) => ({
      boards: state.boards.map((b) => ({
        ...b,
        tasks: (b.tasks || []).filter((t) => t.id !== taskId),
      })),
    }));
  },

  moveTask: (taskId, fromBoardId, toBoardId, newStatus) => {
    set((state) => {
      const fromBoard = state.boards.find((b) => b.id === fromBoardId);
      const task = fromBoard?.tasks?.find((t) => t.id === taskId);
      if (!task) return state;

      const updatedTask = { ...task, boardId: toBoardId, status: newStatus || task.status };

      return {
        boards: state.boards.map((b) => {
          if (b.id === fromBoardId && fromBoardId !== toBoardId) {
            return { ...b, tasks: b.tasks.filter((t) => t.id !== taskId) };
          }
          if (b.id === toBoardId && fromBoardId !== toBoardId) {
            return { ...b, tasks: [...b.tasks, updatedTask] };
          }
          if (b.id === fromBoardId && fromBoardId === toBoardId) {
            return { ...b, tasks: b.tasks.map((t) => (t.id === taskId ? updatedTask : t)) };
          }
          return b;
        }),
      };
    });
  },
}));

export default useBoardStore;
