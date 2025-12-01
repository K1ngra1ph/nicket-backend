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
      { resource: User },
      { resource: Payment }
    ],
    branding: {
      companyName: "Nicket Admin Panel",
      logo: false,
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
