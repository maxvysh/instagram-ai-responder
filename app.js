import { IgApiClient } from "instagram-private-api";
import { config } from "dotenv";
import fs from "fs";
import { aiMessage } from "./ai.js";

config();
main();

async function main() {
  const ig = new IgApiClient();

  try {
    console.log("Generating device...");
    ig.state.generateDevice(process.env.IG_USERNAME);
  } catch (e) {
    console.log(e);
    process.exit(1);
  }

  let repliedThreads;
  try {
    const data = fs.readFileSync("repliedThreads.json", "utf8");
    repliedThreads = new Set(JSON.parse(data));
  } catch (err) {
    if (err.code === "ENOENT") {
      console.log("File does not exist, creating a new one...");
      fs.writeFileSync("repliedThreads.json", JSON.stringify([]), "utf8");
      repliedThreads = new Set();
    } else {
      console.log("Error reading file from disk:", err);
      process.exit(1);
    }
  }

  (async () => {
    // Login
    // await ig.simulate.preLoginFlow();
    const loggedInUser = await ig.account.login(
      process.env.IG_USERNAME,
      process.env.IG_PASSWORD
    );

    console.log("Logged in as " + loggedInUser.username);

    // process.nextTick(async () => await ig.simulate.postLoginFlow());

    // Poll for DMs every 10 seconds
    setInterval(async () => {
      console.log("Polling...");
      // For every new DM check if it says "FOO"
      try {
        const inbox = await ig.feed.directInbox().items();
        const pendingInbox = await ig.feed.directPending().items();
        const threads = inbox.concat(pendingInbox);

        threads.forEach(async (thread) => {
          const threadId = thread.thread_id;
          const threadTitle = thread.thread_title;
          let threadItems = await ig.feed
            .directThread({ thread_id: threadId })
            .items();
          threadItems = threadItems
            .filter((item) => item.item_type === "text")
            // .map((item) => item.text)
            .slice(0, 5);
          const lastItem = threadItems[0];

          // Create message objects and add them to array
          const messages = threadItems.map((item) => {
            return createMessage(
              item.is_sent_by_viewer ? "user" : "assistant",
              item.text
            );
          });

          // TESTS
          // console.log(threadId);
          // console.log(threadTitle.toString());
          // console.log(
          //   JSON.stringify(
          //     threadItems
          //       .filter((item) => item.is_sent_by_viewer === false)
          //       .filter((item) => item.item_type === "text")
          //       .map((item) => item.text)
          //       .slice(0, 5)
          //   )
          // );
          // console.log("LAST ITEM: " + lastItem.text);
          // // console.log(threadItems.forEach((item) => item.text));
          // console.log(messages);
          // END TESTS

          if (
            lastItem.is_sent_by_viewer === false &&
            lastItem.text === process.env.IN_TEXT &&
            !repliedThreads.has(threadId)
          ) {
            console.log(`Received ${process.env.IN_TEXT} from ${threadTitle}`);
            await ig.entity
              .directThread(threadId)
              .broadcastText(process.env.OUT_TEXT);
            repliedThreads.add(threadId);
            try {
              fs.writeFileSync(
                "repliedThreads.json",
                JSON.stringify(Array.from(repliedThreads))
              );
            } catch (err) {
              console.log("Error writing file to disk:", err);
            }
          } else if (
            lastItem.is_sent_by_viewer === false &&
            repliedThreads.has(threadId)
          ) {
            console.log(`Already replied to ${threadTitle}`);
            const aiResponse = await aiMessage(messages);
            await ig.entity
              .directThread(threadId)
              .broadcastText(aiResponse);
            console.log(`Sent AI response to ${threadTitle}`);
          }
          else {
            console.log(`No new text received from ${threadTitle}`);
          }
        });
      } catch (e) {
        console.log(e);
        main();
      }
    }, process.env.POLLING_RATE);
  })();
}

function createMessage(role, content) {
  return { role, content };
}