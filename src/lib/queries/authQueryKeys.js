export const authQueryKeys = {
  all: ['auth'],
  me: () => [...authQueryKeys.all, 'me'],
};
