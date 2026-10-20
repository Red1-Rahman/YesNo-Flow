// Hello world Inngest function triggered by the app/hello event.

export const helloWorld = {
  // $FlowFixMe[incompatible-type] - [Symbol.toStringTag] must be exactly "Inngest.Function"
  [Symbol.toStringTag]: "Inngest.Function" as const,
  name: "hello-world",
  event: "app/hello",
  run: async ({ event, step }: { event: unknown; step: unknown }) => {
    return { greeted: true }
  },

  // getConfig method required by Inngest serve handler
  getConfig() {
    return {
      id: "hello-world",
      name: "hello-world",
      triggers: [
        {
          event: "app/hello",
        },
      ],
      steps: {},
    }
  },
}