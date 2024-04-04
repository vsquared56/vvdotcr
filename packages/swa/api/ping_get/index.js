export default async (context, req) => {
  context.res = {
    status: 200,
    body: "pong"
  };
};