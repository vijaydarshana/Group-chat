const cron = require("node-cron");
const { archiveOldMessages } = require("./archiveMessages");

// Runs every day at 2:00 AM
cron.schedule("0 2 * * *", async () => {
  console.log("🌙 Nightly archive job started");
  await archiveOldMessages();
});
