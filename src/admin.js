import AdminJS from "adminjs";
import AdminJSExpress from "@adminjs/express";
import * as AdminJSMongoose from "@adminjs/mongoose";

import User from "./models/User.js";
import Payment from "./models/Payment.js";

AdminJS.registerAdapter(AdminJSMongoose);

export async function createAdminPanel(app) {
  const admin = new AdminJS({
    rootPath: "/admin",
    resources: [
      { resource: User,
        options: {
          listProperties: ["name", "email", "phone", "eventValue", "createdAt"],
          filterProperties: ["name", "email", "eventValue", "phone"],
          editProperties: ["name", "email", "phone", "eventValue"],
          showProperties: ["_id", "name", "email", "phone", "eventValue", "createdAt", "updatedAt"]
        }
      },
      { resource: Payment,
        options: {
          listProperties: ["paymentReference", "transactionReference", "amount", "amountPaid", "status", "selectedNumbers", "eventValue", "createdAt"],
          filterProperties: ["paymentReference", "transactionReference", "status", "eventValue"],
          showProperties: ["paymentReference", "transactionReference", "amount", "amountPaid", "status", "selectedNumbers", "eventValue"],
          editProperties: ["status"],
          actions: {
            new: { isAccessible: false },
            edit: { isAccessible: false }
          }
        }
       }
    ],
    branding: {
      companyName: "Nicket",
      logo: true,
      favicon: "/favicon.ico",
      theme: {
        colors: {
          primary100: "#4F46E5"
        }
      }
    }
  });

  const router = AdminJSExpress.buildRouter(admin);

  app.use(admin.options.rootPath, router);

  console.log(`🔥 AdminJS available at: ${admin.options.rootPath}`);
}
