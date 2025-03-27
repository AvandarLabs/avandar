export const APIService = {
  helloWorld: async (): Promise<{ message: string }> => {
    return { message: "Hello World" };
  },
};
