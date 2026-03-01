import { create } from 'zustand';
import api from '../lib/api';

const useProjectStore = create((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,

  fetchProjects: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/projects');
      set({ projects: data.data, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  fetchProject: async (projectId) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/projects/${projectId}`);
      set({ currentProject: data.data, isLoading: false });
      return data.data;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  createProject: async (projectData) => {
    const { data } = await api.post('/projects', projectData);
    set((state) => ({ projects: [data.data, ...state.projects] }));
    return data.data;
  },

  updateProject: async (projectId, updates) => {
    const { data } = await api.put(`/projects/${projectId}`, updates);
    set((state) => ({
      projects: state.projects.map((p) => (p.id === projectId ? data.data : p)),
      currentProject: state.currentProject?.id === projectId ? data.data : state.currentProject,
    }));
    return data.data;
  },

  deleteProject: async (projectId) => {
    await api.delete(`/projects/${projectId}`);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== projectId),
      currentProject: state.currentProject?.id === projectId ? null : state.currentProject,
    }));
  },

  inviteMember: async (projectId, email, role) => {
    const { data } = await api.post(`/projects/${projectId}/members`, { email, role });
    await get().fetchProject(projectId);
    return data.data;
  },

  removeMember: async (projectId, memberId) => {
    await api.delete(`/projects/${projectId}/members/${memberId}`);
    await get().fetchProject(projectId);
  },
}));

export default useProjectStore;
