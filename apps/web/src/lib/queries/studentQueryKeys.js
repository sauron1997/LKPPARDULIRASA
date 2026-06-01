export const studentQueryKeys = {
  all: ['student'],
  dashboard: () => [...studentQueryKeys.all, 'dashboard'],
  profile: () => [...studentQueryKeys.all, 'profile'],
  modules: () => [...studentQueryKeys.all, 'modules'],
  schedule: () => [...studentQueryKeys.all, 'schedule'],
  messages: () => [...studentQueryKeys.all, 'messages'],
  messageThread: (threadId) => [...studentQueryKeys.messages(), String(threadId)],
  certificate: () => [...studentQueryKeys.all, 'certificate'],
  assessments: () => [...studentQueryKeys.all, 'assessments'],
  assessmentProgress: () => [...studentQueryKeys.assessments(), 'progress'],
  assessmentSubmissions: () => [...studentQueryKeys.assessments(), 'submissions'],
};
