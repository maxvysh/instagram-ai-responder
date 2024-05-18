import OpenAI from "openai";
import { config } from "dotenv";

export async function aiMessage(messages) {
  config();
  const returnMessage = await completion(messages);
  return returnMessage;
}

async function completion(messages) {
  console.log("Generating AI response...");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Add the system message with the prompt
  messages.push({
    role: "system",
    content: process.env.AI_PROMPT,
  });

  return openai.chat.completions
    .create({
      messages: messages,
      model: "gpt-3.5-turbo-0125",
    })
    .then((response) => {
      console.log(
        "Generated AI reponse: " + response.choices[0].message.content
      );
      return response.choices[0].message.content;
    })
    .catch((err) => {
      console.error(err);
    });
}

//   const completion = await openai.chat.completions.create({
//     messages: [
//       { role: "system", content: "You are a helpful assistant." },
//       { role: "user", content: "Who won the world series in 2020?" },
//       {
//         role: "assistant",
//         content: "The Los Angeles Dodgers won the World Series in 2020.",
//       },
//       { role: "user", content: "Where was it played?" },
//     ],
//     model: "gpt-3.5-turbo-0125",
//   });
