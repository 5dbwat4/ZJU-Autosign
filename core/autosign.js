import { COURSES, ZJUAM } from "login-zju";
import "dotenv/config";

import { CONFIG, RADAR_INFO } from "./constants.js";
import { batchNumberRollCall } from "./rollcall-number.js";
import { notify } from "./notifications.js";
import { answerRadarRollcall } from "./rollcall-radar.js";

const courses = new COURSES(
  new ZJUAM(process.env.ZJU_USERNAME, process.env.ZJU_PASSWORD)
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let requestCount = 0;
let isShuttingDown = false;

async function notifyShutdown(reason, exitCode, error = null) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  const errorText = error ? `\nError: ${error.stack || error}` : "";
  try {
    await notify("default", `[Auto Sign-in] Logged out (${reason}).${errorText}`);
  } catch (notifyError) {
    console.error("[Auto Sign-in] Failed to send shutdown notification:", notifyError);
  }

  process.exit(exitCode);
}

function registerLifecycleNotifications() {
  process.on("SIGINT", () => {
    void notifyShutdown("SIGINT", 0);
  });

  process.on("SIGTERM", () => {
    void notifyShutdown("SIGTERM", 0);
  });

  process.on("uncaughtException", (error) => {
    console.error("[Auto Sign-in] Uncaught exception:", error);
    void notifyShutdown("uncaughtException", 1, error);
  });

  process.on("unhandledRejection", (reason) => {
    console.error("[Auto Sign-in] Unhandled rejection:", reason);
    void notifyShutdown("unhandledRejection", 1, reason);
  });
}

function isAlreadyOnCall(rollcall) {
  return (
    rollcall.status === "on_call_fine" ||
    rollcall.status === "on_call" ||
    rollcall.status_name === "on_call_fine" ||
    rollcall.status_name === "on_call"
  );
}

registerLifecycleNotifications();
void notify("default", `[Auto Sign-in] Logged in as ${process.env.ZJU_USERNAME}`);

async function handleRollcall(rollcall) {
  const rollcallId = rollcall.rollcall_id;

  if (isAlreadyOnCall(rollcall)) {
    console.log(`[Auto Sign-in] Note that #${rollcallId} is on call.`);
    return;
  }

  console.log(`[Auto Sign-in] Now answering rollcall #${rollcallId}`);

  if (rollcall.is_radar) {
    notify("default",
      `[Auto Sign-in] Answering new radar rollcall #${rollcallId}: ${rollcall.title} @ ${rollcall.course_title} by ${rollcall.created_by_name} (${rollcall.department_name})`
    );
    await answerRadarRollcall(courses, rollcallId, RADAR_INFO[CONFIG.raderAt]);
    return;
  }

  if (rollcall.is_number) {
    notify("default",
      `[Auto Sign-in] Bruteforcing new number rollcall #${rollcallId}: ${rollcall.title} @ ${rollcall.course_title} by ${rollcall.created_by_name} (${rollcall.department_name})`
    );

    await batchNumberRollCall(courses, rollcallId);
    return;
  }

  notify("default",
  `[Auto Sign-in] Rollcall #${rollcallId} has an unknown type and we cannot handle it yet.
   Rollcall details: \n${JSON.stringify(rollcall, null, 4)}\n"
   If you see this message, please consider submitting an issue with the rollcall details above, with other necessary information, so that we can support this type in the future. Thank you!`
  );
}

;(async function pollForever() {
  while (true) {
    requestCount += 1;
    try {
      const data = await courses
        .fetch("https://courses.zju.edu.cn/api/radar/rollcalls")
        .then((v) => v.text())
        .then(async (fa) => {
          try {
            return await JSON.parse(fa)
          } catch (e) {
            notify("default","[-][Auto Sign-in] Something went wrong: " + fa+"\nError: "+e.toString());
          }
        });

      if (!data || !Array.isArray(data.rollcalls)) {
        console.log(`[Auto Sign-in](Req #${requestCount}) Invalid rollcalls response.`);
      } else if (data.rollcalls.length === 0) {
        console.log(`[Auto Sign-in](Req #${requestCount}) No rollcalls found.`);
      } else {
        console.log(`[Auto Sign-in](Req #${requestCount}) Found ${data.rollcalls.length} rollcalls.`);

        for (const rollcall of data.rollcalls) {
          await handleRollcall(rollcall);
        }
      }
    } catch (error) {
      
      console.log(`[Auto Sign-in](Req #${requestCount}) Failed to fetch rollcalls: `, error);
    }

    await sleep(CONFIG.coldDownTime);
  }
})();
