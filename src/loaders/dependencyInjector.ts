import { Container } from "typedi";
import LoggerInstance from "./logger";
import mysql2 from "mysql2/promise";
import config from "../config";

export default ({
  pool,
  models,
}: {
  pool: mysql2.Pool;
  models: { name: string; model: any }[];
}) => {
  try {
    models.forEach((m) => {
      Container.set(m.name, m.model);
    });

    Container.set("pool", pool);
    Container.set("logger", LoggerInstance);
    LoggerInstance.info("🔥 logger and pool injected into container!");
  } catch (e) {
    LoggerInstance.error("🔥 Error on dependency injector loader: %o", e);
    throw e;
  }
};

// export default ({
//   mongoConnection,
//   models,
// }: {
//   mongoConnection;
//   models: { name: string; model: any }[];
// }) => {
//   try {
//     models.forEach((m) => {
//       Container.set(m.name, m.model);
//     });

//     const agendaInstance = agendaFactory({ mongoConnection });
//     const mgInstance = new Mailgun(formData);

//     Container.set("agendaInstance", agendaInstance);
//     Container.set("logger", LoggerInstance);
//     Container.set(
//       "emailClient",
//       mgInstance.client({
//         key: config.emails.apiKey,
//         username: config.emails.apiUsername,
//       })
//     );
//     Container.set("emailDomain", config.emails.domain);

//     LoggerInstance.info("✌️ Agenda injected into container");

//     return { agenda: agendaInstance };
//   } catch (e) {
//     LoggerInstance.error("🔥 Error on dependency injector loader: %o", e);
//     throw e;
//   }
// };
