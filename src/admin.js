import AdminJS from "adminjs";
import AdminJSExpress from "@adminjs/express";
import * as AdminJSMongoose from "@adminjs/mongoose";
import { ComponentLoader } from "adminjs";

import User from "./models/User.js";
import Payment from "./models/Payment.js";
import Event from "./models/Event.js";

AdminJS.registerAdapter(AdminJSMongoose);

const componentLoader = new ComponentLoader();
const Dashboard = componentLoader.add("Dashboard", "./components/Dashboard.jsx");

export async function createAdminPanel(app) {
  const admin = new AdminJS({
    rootPath: "/admin",
    componentLoader,

    dashboard: {
      component: Dashboard
    },

    resources: [
      {
        resource: User,
        options: {
          navigation: "Users",
          listProperties: ["name", "email", "role", "createdAt"],
          filterProperties: ["name", "email", "role"],
          editProperties: ["name", "email", "role"],
          showProperties: [
            "_id",
            "name",
            "email",
            "role",
            "createdAt",
            "updatedAt"
          ]
        }
      },

      {
        resource: Event,
        options: {
          navigation: "Events",
          listProperties: ["name", "location", "date", "active", "createdAt"],
          filterProperties: ["name", "location", "date", "active"],
          editProperties: ["name", "location", "date", "active"],
          showProperties: [
            "_id",
            "name",
            "location",
            "date",
            "active",
            "createdAt",
            "updatedAt"
          ]
        }
      },

      {
        resource: Payment,
        options: {
          navigation: "Payments",
          listProperties: [
            "paymentReference",
            "amountPaid",
            "status",
            "eventValue",
            "phone",
            "createdAt"
          ],
          filterProperties: [
            "paymentReference",
            "transactionReference",
            "status",
            "eventValue"
          ],
          showProperties: [
            "paymentReference",
            "transactionReference",
            "amount",
            "amountPaid",
            "eventValue",
            "name",
            "email",
            "phone",
            "selectedNumbers",
            "status",
            "createdAt",
            "updatedAt"
          ],
          editProperties: ["status"],

          actions: {
            new: { isAccessible: false },
            edit: { isAccessible: true },
            delete: { isAccessible: true }
          }
        }
      }
    ],

    branding: {
      companyName: "Nicket",
      logo: false,
      favicon: "/favicon.ico",
      theme: {
        colors: {
          primary100: "#4F46E5",
          primary80: "#3B82F6",
          grey100: "#F9FAFB"
        }
      }
    }
  });

  const router = AdminJSExpress.buildRouter(admin);
  app.use(admin.options.rootPath, router);

  console.log(`🔥 AdminJS available at: ${admin.options.rootPath}`);
}
