import { IgApiClient } from "instagram-private-api";
import { config } from "dotenv";

config();

const ig = new IgApiClient();

try {
  console.log("Trying to generate device...")
  ig.state.generateDevice(process.env.IG_USERNAME);
} catch (e) {
  console.log(e);
  process.exit(1);
}

const repliedThreads = new Set();

(async () => {
  // Login
  // await ig.simulate.preLoginFlow();
  const loggedInUser = await ig.account.login(
    process.env.IG_USERNAME,
    process.env.IG_PASSWORD
  );

  console.log("Logged in as " + loggedInUser.username);
  console.log(loggedInUser.full_name);

  // process.nextTick(async () => await ig.simulate.postLoginFlow());

  console.log("Polling for DMs...");

  // Poll for DMs every 10 seconds
  setInterval(async () => {
    console.log("Polling...");
    console.log(repliedThreads);
    // For every new DM check if it says "GREENLIGHT"
    try {
      const threads = await ig.feed.directInbox().items();
      threads.forEach(async (thread) => {
        const threadId = thread.thread_id;
        const threadTitle = thread.thread_title;
        const threadItems = await ig.feed
          .directThread({ thread_id: threadId })
          .items();
        const lastItem = threadItems[0];

        // TESTS
        console.log(threadTitle.toString());
        console.log(
          JSON.stringify(
            threadItems
              .filter((item) => item.item_type === "text")
              .map((item) => item.text)
          )
        );
        console.log(lastItem.text);

        if (
          lastItem.item_type === "text" &&
          lastItem.text === "FOO" &&
          !repliedThreads.has(threadId)
        ) {
          console.log(`Received "FOO" from ${threadTitle}`);
          await ig.entity.directThread(threadId).broadcastText("BAR");
          repliedThreads.add(threadId);
        }
      });
    } catch (e) {
      console.log(e);
    }
  }, 30000);
})();
