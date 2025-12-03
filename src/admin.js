import AdminJS from "adminjs";
import AdminJSExpress from "@adminjs/express";
import * as AdminJSMongoose from "@adminjs/mongoose";

import User from "./models/User.js";
import Payment from "./models/Payment.js";
import selectedNumber from "./models/SelectedNumber.js";
import Event from "./models/Event.js";

AdminJS.registerAdapter(AdminJSMongoose);

export async function createAdminPanel(app) {
  const admin = new AdminJS({
    rootPath: "/admin",
    resources: [
      { resource: User,
        options: {
          listProperties: ["name", "email", "phone", "selectedNumber", "eventValue", "createdAt"],
          filterProperties: ["name", "email", "phone", "selectedNumber", "eventValue"],
          editProperties: ["name", "email", "phone", "eventValue"],
          showProperties: ["_id", "name", "email", "phone", "selectedNumber", "eventValue", "createdAt", "updatedAt"]
        }
      },
      { resource: Event,
        options: {
          listProperties: ["name", "location", "date", "active", "createdAt"],
          filterProperties: ["name", "location", "date", "active"],
          editProperties: ["name", "location", "date", "active"],
          showProperties: ["_id", "name", "location", "date", "active", "createdAt", "updatedAt"]
        }
      },
      { resource: Payment,
        options: {
          listProperties: ["paymentReference", "transactionReference", "amount", "amountPaid", "status", "selectedNumber", "eventValue", "createdAt"],
          filterProperties: ["paymentReference", "transactionReference", "status", "eventValue"],
          showProperties: ["paymentReference", "transactionReference", "amount", "amountPaid", "status", "selectedNumber", "eventValue"],
          editProperties: ["status"],
          actions: {
            new: { isAccessible: false },
            edit: { isAccessible: false }
          }
        }
       }
    ],
    dashboard: {
      component: AdminJS.bundle("./components/Dashboard.jsx")
    },
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
