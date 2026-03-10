import { notify } from "./notifications.js";
import {v4 as uuidv4} from "uuid";

export async function answerNumberRollcall(courses, numberCode, rid) {
  const response = await courses.fetch(
    `https://courses.zju.edu.cn/api/rollcall/${rid}/answer_number_rollcall`,
    {
      body: JSON.stringify({
        deviceId: uuidv4(),
        numberCode,
      }),
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    return response.status === 200;
  }

  if (response.status !== 200 || payload?.error_code?.includes("wrong")) {
    return false;
  }

  return true;
}




const currentBatchingRollcalls = new Set();

export async function batchNumberRollCall(courses, rid) {
  if (currentBatchingRollcalls.has(rid)) {
    return;
  }

  currentBatchingRollcalls.add(rid);

  let found = false;
  let foundCode = null;
  const batchSize = 200;

  for (let start = 0; start <= 9999; start += batchSize) {
    if (found) {
      break;
    }

    const end = Math.min(start + batchSize - 1, 9999);
    const tasks = [];

    for (let codeNumber = start; codeNumber <= end; codeNumber++) {
      const code = codeNumber.toString().padStart(4, "0");
      tasks.push(
        answerNumberRollcall(courses, code, rid).then((success) => {
          if (found || !success) {
            return;
          }
          found = true;
          foundCode = code;
        })
      );
    }

    await Promise.race([
      Promise.all(tasks),
      new Promise((resolve) => {
        const timer = setInterval(() => {
          if (found) {
            clearInterval(timer);
            resolve();
          }
        }, 20);
      }),
    ]);
  }

  if (foundCode) {
    notify("default",`[Auto Sign-in] Number Rollcall ${rid} succeeded: found code ${foundCode}.`);
  } else {
    notify("default",`[Auto Sign-in] Number Rollcall ${rid} failed to find valid code.`);
  }

  currentBatchingRollcalls.delete(rid);
}
