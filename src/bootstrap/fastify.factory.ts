import Fastify, { type FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";

export type FastifyFactoryOptions = Readonly<{
  logLevel: string;
  trustProxy: false | number;
}>;

const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export const createFastifyApplication = ({
  logLevel,
  trustProxy,
}: FastifyFactoryOptions): FastifyInstance => {
  const app = Fastify({
    logger: { level: logLevel },
    trustProxy: trustProxy === false ? false : (_address: string, hop: number) => hop < trustProxy,
    bodyLimit: 1024 * 1024,
    genReqId: (request) => {
      const candidate = request.headers["x-request-id"];
      return typeof candidate === "string" && requestIdPattern.test(candidate)
        ? candidate
        : randomUUID();
    },
  });

  app.addHook("onRequest", (request, reply, done) => {
    reply.header("x-request-id", request.id);
    done();
  });

  return app;
};
