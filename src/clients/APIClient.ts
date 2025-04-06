export const APIClient = {
  helloWorld: async (): Promise<{ message: string }> => {
    return { message: "Hello World" };
  },
};
