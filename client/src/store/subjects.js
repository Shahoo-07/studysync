import { create } from 'zustand';

export const useSubjectsStore = create((set) => ({
  subjects: [],
  setSubjects: (subjects) => set({ subjects }),

  addSubject: (subject) =>
    set((state) => ({
      subjects: [subject, ...state.subjects],
    })),

  updateSubject: (id, updates) =>
    set((state) => ({
      subjects: state.subjects.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),

  deleteSubject: (id) =>
    set((state) => ({
      subjects: state.subjects.filter((s) => s.id !== id),
    })),

  chapters: {},
  topics: {},

  setChapters: (subjectId, chapters) =>
    set((state) => ({
      chapters: { ...state.chapters, [subjectId]: chapters },
    })),

  setTopics: (chapterId, topics) =>
    set((state) => ({
      topics: { ...state.topics, [chapterId]: topics },
    })),

  addTopic: (chapterId, topic) =>
    set((state) => ({
      topics: {
        ...state.topics,
        [chapterId]: [...(state.topics[chapterId] || []), topic],
      },
    })),

  updateTopic: (chapterId, topicId, updates) =>
    set((state) => ({
      topics: {
        ...state.topics,
        [chapterId]: (state.topics[chapterId] || []).map((t) =>
          t.id === topicId ? { ...t, ...updates } : t
        ),
      },
    })),

  deleteTopic: (chapterId, topicId) =>
    set((state) => ({
      topics: {
        ...state.topics,
        [chapterId]: (state.topics[chapterId] || []).filter(
          (t) => t.id !== topicId
        ),
      },
    })),
}));
